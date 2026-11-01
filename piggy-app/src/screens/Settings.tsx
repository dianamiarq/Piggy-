import React, { useRef, useState } from 'react';
import type { AppData, Category, Palette, Recurring } from '../types';
import type { Actions } from '../store';
import { estimateBalance } from '../logic';
import { centsToInput, fullDate, money, money0, parseAmount } from '../util';
import { saveFile, stamp, toBackup, toCSV, toXLSX } from '../exporters';
import { IconChevR, IconRepeat } from '../components/Icons';
import { CategoryIcon } from '../components/CategoryIcon';
import { investedToday } from '../invest';
import { CategorySheet, RecurringSheet } from '../components/Sheets';
import { Segmented } from '../components/Sheet';

interface Props {
  data: AppData;
  actions: Actions;
  persisted: boolean;
  notify: (msg: string) => void;
  onSetBalance: () => void;
  onHouse: () => void;
  onInvest: () => void;
}

const PALETTES: Array<{ id: Palette; name: string; note: string; bg: string; surface: string; accent: string }> = [
  { id: 'lagoon', name: 'Lagoon', note: 'White, teal and mint', bg: '#FFFFFF', surface: '#F2F7F8', accent: '#4DABAD' },
  { id: 'blush', name: 'Blush', note: 'Light pink', bg: '#F5CAC3', surface: '#FFF7F5', accent: '#4F7A70' },
  { id: 'sage', name: 'Sage', note: 'Soft green', bg: '#DCE7E3', surface: '#F8FBFA', accent: '#3F6B61' },
  { id: 'mist', name: 'Mist', note: 'Clean, iOS-like', bg: '#F2F2F7', surface: '#FFFFFF', accent: '#4F7A70' },
];

/** Text field that commits on blur or Enter, so typing doesn't thrash the data. */
const MoneyField: React.FC<{ id: string; value: number; onCommit: (c: number) => void; label: string }> = ({ id, value, onCommit, label }) => {
  const [v, setV] = useState(centsToInput(value));
  const commit = () => {
    const c = parseAmount(v);
    if (c !== null && c >= 0) { onCommit(c); setV(centsToInput(c)); } else setV(centsToInput(value));
  };
  return (
    <div className="input-euro" style={{ width: 130 }}>
      <input id={id} className="input" inputMode="decimal" aria-label={label} value={v}
        style={{ textAlign: 'right', background: 'var(--fill)', minHeight: 38, padding: '8px 12px 8px 28px' }}
        onChange={e => setV(e.target.value.replace(/[^\d.,]/g, ''))} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    </div>
  );
};

export const SettingsScreen: React.FC<Props> = ({ data, actions, persisted, notify, onSetBalance, onHouse, onInvest }) => {
  const { settings } = data;
  const [rule, setRule] = useState<Recurring | 'new' | null>(null);
  const [cat, setCat] = useState<Category | 'new' | null>(null);
  const [goalName, setGoalName] = useState(settings.goalName);
  const [confirmErase, setConfirmErase] = useState(false);
  const [showAllBal, setShowAllBal] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const est = estimateBalance(data);
  const catById = new Map(data.categories.map(c => [c.id, c]));

  const doExport = async (kind: 'csv' | 'xlsx' | 'backup') => {
    if (kind !== 'backup' && !data.transactions.length) { notify('There are no transactions to export yet.'); return; }
    const res = kind === 'csv'
      ? await saveFile(`piggy-transactions-${stamp()}.csv`, toCSV(data), 'text/csv')
      : kind === 'xlsx'
        ? await saveFile(`piggy-transactions-${stamp()}.xlsx`, toXLSX(data), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        : await saveFile(`piggy-backup-${stamp()}.json`, toBackup(data), 'application/json');
    if (res === 'failed') notify('The file could not be saved here. Try again from the installed app.');
    else if (res === 'saved' || res === 'shared') notify(kind === 'backup' ? 'Backup saved' : 'Export saved');
  };

  const onRestoreFile = async (f: File | undefined) => {
    setRestoreError('');
    if (!f) return;
    try {
      const text = await f.text();
      const res = actions.restore(JSON.parse(text));
      notify(res.mode === 'import' ? `Imported ${res.count} transactions` : `Restored ${res.count} transactions`);
    } catch (e: any) {
      setRestoreError(e?.message?.includes('backup') ? e.message : 'This file could not be read. Choose a .json file made with “Back up data”.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const recurring = [...data.recurring].sort((a, b) => (a.type === b.type ? b.amount - a.amount : a.type === 'income' ? -1 : 1));
  const recurringTotal = data.recurring.filter(r => r.active && r.type === 'expense').reduce((a, r) => a + r.amount, 0);

  return (
    <div className="screen">
      <h2 className="section-label">Colour theme</h2>
      <div className="palettes" role="group" aria-label="Colour theme">
        {PALETTES.map(p => (
          <button key={p.id} className="palette" aria-pressed={(settings.palette ?? 'lagoon') === p.id} onClick={() => actions.updateSettings({ palette: p.id, paletteSet: true })}>
            <span className="palette-prev" style={{ background: p.bg }}>
              <span className="card-mini" style={{ background: p.surface }}><i style={{ width: '45%', background: p.accent }} /><i style={{ width: '20%', background: p.id === 'lagoon' ? '#71F3C2' : '#F6BD60' }} /></span>
              <span className="card-mini" style={{ background: p.surface }}><i style={{ width: '30%', background: p.id === 'lagoon' ? '#E45878' : '#F28482' }} /><i style={{ width: '25%', background: p.id === 'lagoon' ? '#4DABAD' : '#84A59D' }} /></span>
            </span>
            <span className="palette-name">{p.name}<small>{p.note}</small></span>
          </button>
        ))}
      </div>
      <p className="group-foot">Dark mode follows your iPhone setting.</p>

      <h2 className="section-label">Budget & goal</h2>
      <div className="group">
        <div className="group-row">
          <span className="label">Monthly budget<small>Everything you spend, fixed costs included</small></span>
          <MoneyField key={settings.monthlyBudget} id="set-budget" label="Monthly budget" value={settings.monthlyBudget} onCommit={c => actions.updateSettings({ monthlyBudget: c })} />
        </div>
        <div className="group-row" style={{ flexWrap: 'wrap' }}>
          <span className="label">Warn me at</span>
          <div style={{ width: 190 }}>
            <Segmented value={String(settings.warnAt)} onChange={v => actions.updateSettings({ warnAt: Number(v) })} label="Warning threshold"
              options={[{ value: '0.7', label: '70%' }, { value: '0.8', label: '80%' }, { value: '0.9', label: '90%' }]} />
          </div>
        </div>
        <div className="group-row">
          <span className="label">Goal</span>
          <input id="set-goal-name" className="input" aria-label="Goal name" value={goalName} style={{ width: 170, textAlign: 'right', minHeight: 38, padding: '8px 12px' }}
            onChange={e => setGoalName(e.target.value)} onBlur={() => actions.updateSettings({ goalName: goalName.trim() || 'House deposit' })} />
        </div>
        <div className="group-row">
          <span className="label">Target</span>
          <MoneyField key={settings.goalTarget} id="set-goal" label="Goal target" value={settings.goalTarget} onCommit={c => actions.updateSettings({ goalTarget: c, goalHomePrice: undefined })} />
        </div>
        <button className="group-row" onClick={onHouse}>
          <span className="label">House calculator<small>What your savings buy in Braga or Madrid</small></span>
          <IconChevR className="chev" />
        </button>
      </div>

      <h2 className="section-label">Savings balance</h2>
      <p className="group-foot" style={{ padding: '0 16px 8px' }}>
        The total you have in the bank. Add it whenever you check your banking app; once a month is plenty. In between, Piggy estimates it by adding what you earn and subtracting what you spend.
      </p>
      <div className="group">
        <button className="group-row" onClick={onSetBalance}>
          <span className="label">{est ? 'Today, estimated' : 'Add your balance'}
            <small>{est ? `Last check-in ${money(est.base)} on ${fullDate(est.baseDate)}${est.change ? `, ${est.change >= 0 ? '+' : '−'}${money(Math.abs(est.change))} since` : ''}` : 'Used to track progress toward your goal'}</small>
          </span>
          {est && <span className="value">{money0(est.estimate)}</span>}
          <IconChevR className="chev" />
        </button>
        {[...data.balances].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, showAllBal ? undefined : 4).map(b => (
          <div className="group-row" key={b.id}>
            <span className="label" style={{ fontSize: 14.5 }}>{fullDate(b.date)}<small>Check-in</small></span>
            <span className="value" style={{ fontSize: 14.5 }}>{money(b.amount)}</span>
            <button className="link-btn" style={{ color: 'var(--bad)', fontSize: 14 }} onClick={() => actions.deleteBalance(b.id)} aria-label={`Remove balance from ${fullDate(b.date)}`}>Remove</button>
          </div>
        ))}
        {data.balances.length > 4 && (
          <button className="group-row" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15 }} onClick={() => setShowAllBal(v => !v)}>
            <span className="label">{showAllBal ? 'Show fewer' : `Show all ${data.balances.length} check-ins`}</span>
          </button>
        )}
      </div>

      <h2 className="section-label">Investments</h2>
      <div className="group">
        <button className="group-row" onClick={onInvest}>
          <span className="label">{settings.invest ? settings.invest.name : 'Add investments'}
            <small>{settings.invest ? `Kept apart from the house goal · projection to age ${settings.invest.targetAge}` : 'Long-term money, kept apart from your house deposit'}</small>
          </span>
          {settings.invest && <span className="value">{money0(investedToday(settings.invest))}</span>}
          <IconChevR className="chev" />
        </button>
      </div>

      <h2 className="section-label">Monthly items</h2>
      <div className="group">
        {recurring.map(r => (
          <button className="group-row" key={r.id} onClick={() => setRule(r)}>
            <span className="icon-dot" style={{ color: catById.get(r.categoryId)?.color }}><CategoryIcon name={catById.get(r.categoryId)?.icon} size={20} /></span>
            <span className="label">{r.description}
              <small>{r.active ? `Day ${r.day} · ${catById.get(r.categoryId)?.name ?? 'Other'}` : 'Paused'}</small>
            </span>
            <span className="value" style={{ color: r.type === 'income' ? 'var(--good)' : undefined }}>{r.type === 'income' ? '+' : ''}{money(r.amount)}</span>
            <IconChevR className="chev" />
          </button>
        ))}
        <button className="group-row" onClick={() => setRule('new')} style={{ color: 'var(--accent)', fontWeight: 600 }}>
          <IconRepeat width={18} height={18} /> <span className="label">Add monthly item</span>
        </button>
      </div>
      {recurringTotal > 0 && <p className="group-foot">Fixed monthly expenses: <b className="num">{money(recurringTotal)}</b></p>}

      <h2 className="section-label">Categories</h2>
      <div className="group">
        {data.categories.map(c => (
          <button className="group-row" key={c.id} onClick={() => setCat(c)}>
            <span className="icon-dot" style={{ color: c.color }}><CategoryIcon name={c.icon} size={20} /></span>
            <span className="label">{c.name}</span>
            <span className="value" style={{ fontSize: 13 }}>{c.kind === 'income' ? 'Income' : c.defaultNature === 'fixed' ? 'Fixed' : 'Variable'}</span>
            <IconChevR className="chev" />
          </button>
        ))}
        <button className="group-row" onClick={() => setCat('new')} style={{ color: 'var(--accent)', fontWeight: 600 }}>
          <span className="label">Add category</span>
        </button>
      </div>

      <h2 className="section-label">Your data</h2>
      <div className="group">
        <button className="group-row" onClick={() => doExport('xlsx')}><span className="label">Export to Excel<small>.xlsx with every transaction</small></span><IconChevR className="chev" /></button>
        <button className="group-row" onClick={() => doExport('csv')}><span className="label">Export to CSV<small>Opens in Numbers, Sheets or Excel</small></span><IconChevR className="chev" /></button>
        <button className="group-row" onClick={() => doExport('backup')}><span className="label">Back up data<small>One file with everything, to restore later</small></span><IconChevR className="chev" /></button>
        <button className="group-row" onClick={() => fileRef.current?.click()}><span className="label">Import or restore<small>Import file adds transactions; a backup replaces everything</small></span><IconChevR className="chev" /></button>
        <input ref={fileRef} id="restore-file" type="file" accept="application/json,.json" hidden onChange={e => onRestoreFile(e.target.files?.[0])} />
      </div>
      {restoreError && <p className="group-foot" role="alert" style={{ color: 'var(--bad)' }}>{restoreError}</p>}
      <p className="group-foot">Back up once a month and keep the file in iCloud Drive. If you ever clear Safari data or change phones, you can restore from it.</p>

      <div className="group">
        {data.demo ? (
          <button className="group-row" onClick={() => { actions.startFresh(); notify('Example data cleared'); }} style={{ color: 'var(--accent)', fontWeight: 600 }}>
            <span className="label">Clear example data and start fresh</span>
          </button>
        ) : (
          <button className="group-row" onClick={() => setConfirmErase(true)} style={{ color: 'var(--bad)', fontWeight: 500 }}>
            <span className="label">Erase all data</span>
          </button>
        )}
      </div>
      {confirmErase && (
        <div className="confirm">
          <p>Erase every transaction, monthly item and balance on this device? Categories and settings stay. This can't be undone, so back up first if you might need it.</p>
          <div className="actions">
            <button className="btn danger small" onClick={() => { actions.startFresh(); setConfirmErase(false); notify('All data erased'); }}>Erase everything</button>
            <button className="btn small" onClick={() => setConfirmErase(false)}>Cancel</button>
            <button className="btn small" onClick={() => { actions.loadExamples(); setConfirmErase(false); }}>Load example data instead</button>
          </div>
        </div>
      )}

      <p className="storage-note">
        {persisted
          ? 'Everything is stored only on this device. Nothing is sent anywhere.'
          : 'This browser is blocking storage, so changes last only until you close the page.'}
      </p>

      {rule && (
        <RecurringSheet data={data} rule={rule === 'new' ? undefined : rule} onClose={() => setRule(null)}
          onSave={r => { actions.saveRecurring(r); setRule(null); notify('Monthly item saved'); }}
          onDelete={removePast => { if (rule !== 'new') actions.deleteRecurring(rule.id, removePast); setRule(null); notify('Monthly item deleted'); }} />
      )}
      {cat && (
        <CategorySheet data={data} category={cat === 'new' ? undefined : cat} onClose={() => setCat(null)}
          onSave={c => { actions.saveCategory(c); setCat(null); }}
          onDelete={moveTo => { if (cat !== 'new') actions.deleteCategory(cat.id, moveTo); setCat(null); notify('Category deleted'); }} />
      )}
    </div>
  );
};
