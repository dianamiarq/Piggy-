import type { AppData } from './types';
import { today } from './util';

// ---------- Saving a file ----------

declare global {
  interface Window {
    claude?: { use: (name: string) => Promise<any> };
  }
}

export type SaveOutcome = 'saved' | 'shared' | 'cancelled' | 'failed';

/**
 * Saves a generated file. Inside a claude.ai artifact it asks the viewer through the platform;
 * on an iPhone home-screen app it opens the share sheet ("Save to Files"); elsewhere it downloads.
 */
export const saveFile = async (filename: string, data: string | Uint8Array, mime: string): Promise<SaveOutcome> => {
  const blob = new Blob([data], { type: mime });

  if (typeof window.claude?.use === 'function') {
    try {
      const downloads = await window.claude.use('downloads');
      if (downloads) {
        await downloads.save({ filename, data: blob });
        return 'saved';
      }
    } catch (e: any) {
      if (e?.code === 'declined') return 'cancelled';
      // fall through to the browser route
    }
  }

  const file = new File([blob], filename, { type: mime });
  const standalone = (navigator as any).standalone === true || matchMedia('(display-mode: standalone)').matches;
  if (standalone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e: any) {
      return e?.name === 'AbortError' ? 'cancelled' : 'failed';
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'saved';
  } catch {
    return 'failed';
  }
};

// ---------- Rows ----------

const rows = (data: AppData) => {
  const catName = new Map(data.categories.map(c => [c.id, c.name]));
  return [...data.transactions]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
    .map(t => ({
      date: t.date,
      type: t.type === 'income' ? 'Income' : 'Expense',
      description: t.description,
      category: catName.get(t.categoryId) ?? 'Other',
      nature: t.nature === 'fixed' ? 'Fixed' : 'Variable',
      amount: (t.type === 'income' ? 1 : -1) * t.amount / 100,
      recurring: t.recurringId ? 'Yes' : 'No',
    }));
};

const HEADERS = ['Date', 'Type', 'Description', 'Category', 'Fixed/Variable', 'Amount (EUR)', 'Recurring'];

// ---------- CSV ----------

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCSV = (data: AppData): string => {
  const lines = [HEADERS.join(',')];
  for (const r of rows(data)) {
    lines.push([r.date, r.type, r.description, r.category, r.nature, r.amount.toFixed(2), r.recurring].map(csvCell).join(','));
  }
  return '﻿' + lines.join('\r\n');
};

// ---------- XLSX (minimal writer, no dependencies) ----------

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** Builds an uncompressed ("stored") zip archive. */
const zip = (files: Array<{ name: string; content: string }>): Uint8Array => {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const body = enc.encode(f.content);
    const crc = crc32(body);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, body.length, true);
    local.setUint32(22, body.length, true);
    local.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(local.buffer), name, body);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, body.length, true);
    cen.setUint32(24, body.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + body.length;
  }
  const cenSize = central.reduce((a, c) => a + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true);
  end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((a, c) => a + c.length, 0));
  let p = 0;
  for (const c of all) { out.set(c, p); p += c.length; }
  return out;
};

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i: number) => String.fromCharCode(65 + i);

export const toXLSX = (data: AppData): Uint8Array => {
  const r = rows(data);
  const strCell = (ref: string, v: string, s = 0) => `<c r="${ref}" t="inlineStr"${s ? ` s="${s}"` : ''}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  const numCell = (ref: string, v: number, s = 0) => `<c r="${ref}"${s ? ` s="${s}"` : ''}><v>${v}</v></c>`;
  // Excel serial date: days since 1899-12-30
  const serial = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
  };

  const sheetRows = [
    `<row r="1">${HEADERS.map((h, i) => strCell(`${colName(i)}1`, h, 1)).join('')}</row>`,
    ...r.map((x, i) => {
      const n = i + 2;
      return `<row r="${n}">` +
        numCell(`A${n}`, serial(x.date), 2) +
        strCell(`B${n}`, x.type) +
        strCell(`C${n}`, x.description) +
        strCell(`D${n}`, x.category) +
        strCell(`E${n}`, x.nature) +
        numCell(`F${n}`, x.amount, 3) +
        strCell(`G${n}`, x.recurring) +
        `</row>`;
    }),
  ];

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols><col min="1" max="1" width="12" customWidth="1"/><col min="2" max="2" width="10" customWidth="1"/><col min="3" max="3" width="32" customWidth="1"/><col min="4" max="4" width="22" customWidth="1"/><col min="5" max="5" width="14" customWidth="1"/><col min="6" max="6" width="14" customWidth="1"/><col min="7" max="7" width="10" customWidth="1"/></cols>
<sheetData>${sheetRows.join('')}</sheetData>
<autoFilter ref="A1:G${r.length + 1}"/>
</worksheet>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="#,##0.00 &quot;€&quot;;[Red]-#,##0.00 &quot;€&quot;"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
</styleSheet>`;

  return zip([
    { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Transactions" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Transactions!$A$1:$G$${r.length + 1}</definedName></definedNames></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', content: styles },
    { name: 'xl/worksheets/sheet1.xml', content: sheet },
  ]);
};

// ---------- Backup ----------

export const toBackup = (data: AppData): string =>
  JSON.stringify({ app: 'piggy', exportedAt: new Date().toISOString(), data }, null, 2);

export const stamp = () => today();
