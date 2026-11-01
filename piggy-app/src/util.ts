import type { Cents, ISODate, MonthKey } from './types';

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date): ISODate =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = (): ISODate => toISODate(new Date());

export const monthOf = (date: ISODate): MonthKey => date.slice(0, 7);

export const currentMonth = (): MonthKey => monthOf(today());

export const parseMonth = (m: MonthKey): [number, number] => {
  const [y, mo] = m.split('-').map(Number);
  return [y, mo];
};

export const addMonths = (m: MonthKey, delta: number): MonthKey => {
  const [y, mo] = parseMonth(m);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const daysInMonth = (m: MonthKey): number => {
  const [y, mo] = parseMonth(m);
  return new Date(y, mo, 0).getDate();
};

export const dateInMonth = (m: MonthKey, day: number): ISODate =>
  `${m}-${pad(Math.min(Math.max(1, day), daysInMonth(m)))}`;

export const monthRange = (from: MonthKey, to: MonthKey): MonthKey[] => {
  const out: MonthKey[] = [];
  let m = from;
  let guard = 0;
  while (m <= to && guard++ < 600) {
    out.push(m);
    m = addMonths(m, 1);
  }
  return out;
};

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const monthLabel = (m: MonthKey, opts: { short?: boolean; year?: boolean } = {}): string => {
  const [y, mo] = parseMonth(m);
  const name = opts.short ? monthNames[mo - 1].slice(0, 3) : monthNames[mo - 1];
  return opts.year === false ? name : `${name} ${y}`;
};

export const dayLabel = (date: ISODate): string => {
  const t = today();
  if (date === t) return 'Today';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (date === toISODate(y)) return 'Yesterday';
  const [yy, mm, dd] = date.split('-').map(Number);
  const d = new Date(yy, mm - 1, dd);
  const wd = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const sameYear = yy === new Date().getFullYear();
  return `${wd}, ${dd} ${monthNames[mm - 1].slice(0, 3)}${sameYear ? '' : ' ' + yy}`;
};

const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const eur0 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/** €1,234.56 */
export const money = (c: Cents): string => eur.format(c / 100);
/** €1,235 */
export const money0 = (c: Cents): string => eur0.format(Math.round(c / 100));
/** Compact for chart axes: €1.2k */
export const moneyAxis = (c: Cents): string => {
  const v = c / 100;
  if (Math.abs(v) >= 1000) return `€${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `€${Math.round(v)}`;
};

/** Accepts "12,50", "12.50", "1.234,50", "1,234.50", "€ 12". Returns cents or null. */
export const parseAmount = (raw: string): Cents | null => {
  let s = raw.replace(/[€\s]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // Whichever comes last is the decimal separator.
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma > -1) {
    // A lone comma followed by exactly 3 digits is ambiguous; treat comma as decimal (European input).
    s = s.replace(/,/g, '.');
    const parts = s.split('.');
    if (parts.length > 2) s = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  }
  if (!/^-?\d*\.?\d*$/.test(s) || s === '.' || s === '-') return null;
  const n = Number(s);
  if (!isFinite(n)) return null;
  return Math.round(n * 100);
};

/** Cents to an editable string in European style: 1234,5 */
export const centsToInput = (c: Cents): string => {
  const v = (c / 100).toFixed(2);
  return v.endsWith('.00') ? v.slice(0, -3) : v.replace('.', ',');
};

export const pct = (part: number, whole: number): number => (whole <= 0 ? 0 : part / whole);

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 31 Oct 2026 */
export const fullDate = (date: ISODate): string => {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${monthNames[m - 1].slice(0, 3)} ${y}`;
};
