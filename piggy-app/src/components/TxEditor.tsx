import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Category, Nature, Transaction, TxType } from '../types';
import type { TxDraft } from '../store';
import { centsToInput, parseAmount, today, uid } from '../util';
import { CATEGORY_COLORS } from '../defaults';
import { Segmented, Sheet, Switch } from './Sheet';
import { IconPlus, IconRepeat } from './Icons';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  data: AppData;
  editing?: Transaction;
  onClose: () => void;
  onSave: (draft: TxDraft, repeatMonthly: boolean) => void;
  onDelete?: () => void;
  onCreateCategory: (c: Category) => void;
}

export const TxEditor: React.FC<Props> = ({ data, editing, onClose, onSave, onDelete, onCreateCategory }) => {
  const [type, setType] = useState<TxType>(editing?.type ?? 'expense');
  const [amount, setAmount] = useState(editing ? centsToInput(editing.amount) : '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [date, setDate] = useState(editing?.date ?? today());
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [nature, setNature] = useState<Nature>(editing?.nature ?? 'variable');
  const [natureTouched, setNatureTouched] = useState(Boolean(editing));
  const [repeat, setRepeat] = useState(false);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setTimeout(() => amountRef.current?.focus(), 250);
  }, [editing]);

  const cats = data.categories.filter(c => c.kind === type);
  const cents = parseAmount(amount);

  // Suggestions: past descriptions for this type, most recent first, with their category.
  const pastByDesc = useMemo(() => {
    const m = new Map<string, Transaction>();
    const sorted = [...data.transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
    for (const t of sorted) {
      const k = t.description.trim().toLowerCase();
      if (k && !m.has(k)) m.set(k, t);
    }
    return m;
  }, [data.transactions]);

  const pickCategory = (id: string) => {
    setCategoryId(id);
    const c = data.categories.find(x => x.id === id);
    if (c && !natureTouched) setNature(c.defaultNature);
  };

  const onDescription = (v: string) => {
    setDescription(v);
    const hit = pastByDesc.get(v.trim().toLowerCase());
    if (hit && hit.type === type && !categoryId) {
      pickCategory(hit.categoryId);
      if (!amount) setAmount(centsToInput(hit.amount));
    }
  };

  const switchType = (t: TxType) => {
    setType(t);
    setCategoryId(null);
    if (!natureTouched) setNature(t === 'income' ? 'fixed' : 'variable');
  };

  const addCategory = () => {
    const name = (newCat ?? '').trim();
    if (!name) { setNewCat(null); return; }
    const used = new Set(data.categories.map(c => c.color));
    const color = CATEGORY_COLORS.find(c => !used.has(c)) ?? CATEGORY_COLORS[data.categories.length % CATEGORY_COLORS.length];
    const cat: Category = { id: uid(), name, color, kind: type, defaultNature: 'variable', icon: type === 'income' ? 'coins' : 'tag' };
    onCreateCategory(cat);
    setCategoryId(cat.id);
    setNewCat(null);
  };

  const save = () => {
    if (cents === null || cents <= 0) { setError('Enter an amount above €0.'); amountRef.current?.focus(); return; }
    if (!categoryId) { setError('Pick a category.'); return; }
    if (!date) { setError('Pick a date.'); return; }
    const cat = data.categories.find(c => c.id === categoryId);
    onSave({
      type, amount: cents, date, categoryId, nature,
      description: description.trim() || cat?.name || (type === 'income' ? 'Income' : 'Expense'),
      recurringId: editing?.recurringId,
    }, repeat);
  };

  const recurringRule = editing?.recurringId ? data.recurring.find(r => r.id === editing.recurringId) : undefined;

  return (
    <Sheet
      title={editing ? 'Edit' : type === 'income' ? 'New income' : 'New expense'}
      onClose={onClose}
      right={<button className="link-btn" onClick={save} disabled={!cents}>{editing ? 'Save' : 'Add'}</button>}
    >
      <Segmented value={type} onChange={switchType} label="Type"
        options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />

      <div className={'amount-entry' + (type === 'income' ? ' income' : '')}>
        <span className="sym">€</span>
        <input
          id="tx-amount" style={{ width: `${Math.max(1, amount.length) * 0.62 + 0.3}em` }} ref={amountRef} inputMode="decimal" placeholder="0" value={amount} aria-label="Amount in euros"
          onChange={e => { setAmount(e.target.value.replace(/[^\d.,]/g, '')); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') save(); }}
        />
      </div>

      <label className="field">
        <span>Description</span>
        <input id="tx-desc" className="input" list="past-desc" placeholder={type === 'income' ? 'e.g. Salary' : 'e.g. Mercadona'}
          value={description} onChange={e => onDescription(e.target.value)} autoComplete="off" />
        <datalist id="past-desc">
          {[...pastByDesc.values()].filter(t => t.type === type).slice(0, 40).map(t => <option key={t.id} value={t.description} />)}
        </datalist>
      </label>

      <div className="field">
        <span>Category</span>
        <div className="cat-grid">
          {cats.map(c => (
            <button key={c.id} type="button" className="cat-pick" aria-pressed={categoryId === c.id} onClick={() => { pickCategory(c.id); setError(''); }}>
              <CategoryIcon name={c.icon} size={24} />
              <span>{c.name}</span>
            </button>
          ))}
          {newCat === null ? (
            <button type="button" className="cat-pick add" onClick={() => setNewCat('')}>
              <IconPlus width={16} height={16} /> <span>New</span>
            </button>
          ) : (
            <input id="tx-newcat" className="input" autoFocus placeholder="Category name" value={newCat}
              style={{ gridColumn: 'span 2', minHeight: 44 }}
              onChange={e => setNewCat(e.target.value)} onBlur={addCategory}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } if (e.key === 'Escape') setNewCat(null); }} />
          )}
        </div>
      </div>

      <div className="form-row">
        <label className="field">
          <span>Date</span>
          <input id="tx-date" className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <div className="field">
          <span>Kind</span>
          <Segmented value={nature} onChange={v => { setNature(v); setNatureTouched(true); }} label="Fixed or variable"
            options={[{ value: 'fixed', label: 'Fixed' }, { value: 'variable', label: 'Variable' }]} />
        </div>
      </div>

      {!editing && (
        <div className="toggle-row">
          <div className="label">
            Repeat every month
            <small>Adds it automatically on day {Number(date.slice(8, 10)) || 1} of each month</small>
          </div>
          <Switch id="tx-repeat" checked={repeat} onChange={setRepeat} label="Repeat every month" />
        </div>
      )}
      {recurringRule && (
        <p className="small-print" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <IconRepeat width={14} height={14} /> Part of a monthly item ({recurringRule.description}). Changes here apply to this month only. Edit the rule in Settings.
        </p>
      )}

      {error && <p role="alert" style={{ margin: 0, color: 'var(--bad)', fontSize: 14 }}>{error}</p>}

      <button className="btn primary block" onClick={save}>{editing ? 'Save changes' : type === 'income' ? 'Add income' : 'Add expense'}</button>

      {editing && onDelete && (!confirmDelete ? (
        <button className="btn danger block" onClick={() => setConfirmDelete(true)}>Delete</button>
      ) : (
        <div className="confirm">
          <p>Delete “{editing.description}”?{recurringRule ? ' The monthly rule stays; only this month is removed.' : ''}</p>
          <div className="actions">
            <button className="btn danger small" onClick={onDelete}>Delete</button>
            <button className="btn small" onClick={() => setConfirmDelete(false)}>Keep</button>
          </div>
        </div>
      ))}
    </Sheet>
  );
};
