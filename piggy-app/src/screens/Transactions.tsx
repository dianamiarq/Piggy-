import React, { useMemo, useState } from 'react';
import type { AppData, Category, Transaction } from '../types';
import { addMonths, currentMonth, dayLabel, money, monthLabel, monthOf, monthRange } from '../util';
import { firstMonth } from '../logic';
import { IconChevDown, IconRepeat, IconSearch, IconX } from '../components/Icons';
import { CategoryIcon } from '../components/CategoryIcon';

export const TxRow: React.FC<{ tx: Transaction; cat?: Category; onClick: () => void; showDate?: boolean }> = ({ tx, cat, onClick, showDate }) => {
  const color = cat?.color ?? '#8B938F';
  return (
    <button className="row" onClick={onClick}>
      <span className="badge" style={{ background: color + '26', color }} aria-hidden="true"><CategoryIcon name={cat?.icon} size={20} /></span>
      <span className="row-main">
        <span className="row-title">{tx.description}</span>
        <span className="row-sub">
          <span>{cat?.name ?? 'Other'}</span>
          {showDate && <span>· {dayLabel(tx.date)}</span>}
          {tx.nature === 'fixed' && <span className="tag">FIXED</span>}
          {tx.recurringId && <IconRepeat width={12} height={12} aria-label="Monthly" />}
        </span>
      </span>
      <span className={'row-amt' + (tx.type === 'income' ? ' income' : '')}>
        {tx.type === 'income' ? '+' : '−'}{money(tx.amount)}
      </span>
    </button>
  );
};

type Kind = 'all' | 'expense' | 'income' | 'fixed' | 'variable';

interface Props {
  data: AppData;
  month: string;
  onEdit: (t: Transaction) => void;
  onAdd: () => void;
  onSelectMonth: (m: string) => void;
}

export const Transactions: React.FC<Props> = ({ data, month, onEdit, onAdd, onSelectMonth }) => {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [cat, setCat] = useState('');
  const [scope, setScope] = useState<'month' | 'all'>('month');

  const catById = useMemo(() => new Map(data.categories.map(c => [c.id, c])), [data.categories]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.transactions
      .filter(t => scope === 'all' || monthOf(t.date) === month)
      .filter(t => {
        if (kind === 'expense' || kind === 'income') return t.type === kind;
        if (kind === 'fixed' || kind === 'variable') return t.type === 'expense' && t.nature === kind;
        return true;
      })
      .filter(t => !cat || t.categoryId === cat)
      .filter(t => {
        if (!needle) return true;
        const c = catById.get(t.categoryId)?.name ?? '';
        const amt = (t.amount / 100).toFixed(2);
        return t.description.toLowerCase().includes(needle) || c.toLowerCase().includes(needle) || amt.includes(needle.replace(',', '.'));
      })
      .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
  }, [data.transactions, q, kind, cat, scope, month, catById]);

  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const arr = m.get(t.date) ?? [];
      arr.push(t);
      m.set(t.date, arr);
    }
    return [...m.entries()];
  }, [filtered]);

  const spent = filtered.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const income = filtered.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const filtersOn = q || kind !== 'all' || cat;

  const kinds: Array<[Kind, string]> = [['all', 'All'], ['expense', 'Expenses'], ['income', 'Income'], ['fixed', 'Fixed'], ['variable', 'Variable']];

  return (
    <div className="screen">
      <div className="search">
        <IconSearch />
        <input id="tx-search" type="search" placeholder="Search description, category or amount" value={q} onChange={e => setQ(e.target.value)} aria-label="Search transactions" />
        {q && <button onClick={() => setQ('')} aria-label="Clear search"><IconX width={16} height={16} /></button>}
      </div>

      <div className="chips" role="toolbar" aria-label="Filters">
        <label className="chip has-select">
          <select id="tx-month-filter" aria-label="Month" value={scope === 'all' ? 'all' : month}
            onChange={e => { if (e.target.value === 'all') setScope('all'); else { setScope('month'); onSelectMonth(e.target.value); } }}>
            <option value="all">All months</option>
            {monthRange(firstMonth(data) < addMonths(currentMonth(), -24) ? addMonths(currentMonth(), -24) : firstMonth(data), currentMonth()).reverse().map(m => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <IconChevDown className="chev-down" />
        </label>
        {kinds.map(([k, label]) => (
          <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>
        ))}
        <label className={'chip has-select' + (cat ? ' active' : '')}>
          <select id="tx-cat-filter" value={cat} onChange={e => setCat(e.target.value)} aria-label="Filter by category">
            <option value="">Any category</option>
            {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <IconChevDown className="chev-down" />
        </label>
      </div>

      <div className="filter-summary">
        <span>{filtered.length} {filtered.length === 1 ? 'item' : 'items'}{filtersOn ? ' match' : ''}</span>
        <span className="num">
          {spent > 0 && <>−{money(spent)}</>}
          {spent > 0 && income > 0 && ' · '}
          {income > 0 && <span style={{ color: 'var(--good)' }}>+{money(income)}</span>}
        </span>
      </div>

      {groups.length ? groups.map(([date, txs]) => {
        const dayTotal = txs.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
        return (
          <div className="day-group" key={date}>
            <div className="day-head"><span>{dayLabel(date)}</span>{dayTotal > 0 && <span className="num">{money(dayTotal)}</span>}</div>
            <div className="list">
              {txs.map(t => <TxRow key={t.id} tx={t} cat={catById.get(t.categoryId)} onClick={() => onEdit(t)} />)}
            </div>
          </div>
        );
      }) : (
        <div className="list empty">
          {filtersOn ? (
            <>
              <strong>No matches</strong>
              <p>Try another word, or clear the filters.</p>
              <button className="btn small" onClick={() => { setQ(''); setKind('all'); setCat(''); }}>Clear filters</button>
            </>
          ) : (
            <>
              <strong>No transactions in {monthLabel(month, { year: false })}</strong>
              <p>Add one, or switch to All months.</p>
              <button className="btn primary small" onClick={onAdd}>Add expense</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
