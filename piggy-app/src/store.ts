import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, BalanceEntry, Category, Recurring, Settings, Transaction } from './types';
import { demoData, emptyData } from './defaults';
import { generateRecurring } from './logic';
import { loadData, normalize, saveData, storageAvailable } from './storage';
import { monthOf, uid } from './util';

export type TxDraft = Omit<Transaction, 'id' | 'createdAt'>;

const initial = (): AppData => {
  const stored = loadData();
  return generateRecurring(stored ?? demoData());
};

export const useStore = () => {
  const [data, setData] = useState<AppData>(initial);
  const [persisted, setPersisted] = useState<boolean>(() => storageAvailable());
  const first = useRef(true);

  // Save on every change (after the first render, which only reads).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      // Persist demo data too, so reloads show the same examples.
      if (storageAvailable()) saveData(data);
      return;
    }
    setPersisted(saveData(data));
  }, [data]);

  // When the app comes back to the foreground on a new day, catch up recurring items.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setData(d => generateRecurring(d));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const update = useCallback((fn: (d: AppData) => AppData) => setData(d => fn(d)), []);

  const actions = useMemo(() => ({
    addTransaction(draft: TxDraft, repeatMonthly: boolean) {
      update(d => {
        if (!repeatMonthly) {
          return { ...d, transactions: [...d.transactions, { ...draft, id: uid(), createdAt: Date.now() }] };
        }
        const rule: Recurring = {
          id: uid(), type: draft.type, amount: draft.amount, description: draft.description,
          categoryId: draft.categoryId, nature: draft.nature, day: Number(draft.date.slice(8, 10)),
          startMonth: monthOf(draft.date), active: true, skipped: [],
        };
        const tx: Transaction = { ...draft, id: uid(), createdAt: Date.now(), recurringId: rule.id };
        return generateRecurring({ ...d, recurring: [...d.recurring, rule], transactions: [...d.transactions, tx] });
      });
    },
    updateTransaction(id: string, draft: TxDraft) {
      update(d => ({ ...d, transactions: d.transactions.map(t => (t.id === id ? { ...t, ...draft } : t)) }));
    },
    deleteTransaction(id: string) {
      update(d => {
        const tx = d.transactions.find(t => t.id === id);
        if (!tx) return d;
        const recurring = tx.recurringId
          ? d.recurring.map(r => (r.id === tx.recurringId ? { ...r, skipped: [...r.skipped, monthOf(tx.date)] } : r))
          : d.recurring;
        return { ...d, recurring, transactions: d.transactions.filter(t => t.id !== id) };
      });
    },
    restoreTransaction(tx: Transaction) {
      update(d => {
        const recurring = tx.recurringId
          ? d.recurring.map(r => (r.id === tx.recurringId ? { ...r, skipped: r.skipped.filter(m => m !== monthOf(tx.date)) } : r))
          : d.recurring;
        return { ...d, recurring, transactions: [...d.transactions, tx] };
      });
    },
    saveRecurring(rule: Recurring) {
      update(d => {
        const exists = d.recurring.some(r => r.id === rule.id);
        const recurring = exists ? d.recurring.map(r => (r.id === rule.id ? rule : r)) : [...d.recurring, rule];
        return generateRecurring({ ...d, recurring });
      });
    },
    deleteRecurring(id: string, removePast: boolean) {
      update(d => ({
        ...d,
        recurring: d.recurring.filter(r => r.id !== id),
        transactions: removePast
          ? d.transactions.filter(t => t.recurringId !== id)
          : d.transactions.map(t => (t.recurringId === id ? { ...t, recurringId: undefined } : t)),
      }));
    },
    saveCategory(cat: Category) {
      update(d => {
        const exists = d.categories.some(c => c.id === cat.id);
        return { ...d, categories: exists ? d.categories.map(c => (c.id === cat.id ? cat : c)) : [...d.categories, cat] };
      });
    },
    /** Deletes a category and moves its transactions and recurring items to `moveTo`. */
    deleteCategory(id: string, moveTo: string) {
      update(d => ({
        ...d,
        categories: d.categories.filter(c => c.id !== id),
        transactions: d.transactions.map(t => (t.categoryId === id ? { ...t, categoryId: moveTo } : t)),
        recurring: d.recurring.map(r => (r.categoryId === id ? { ...r, categoryId: moveTo } : r)),
      }));
    },
    addBalance(entry: Omit<BalanceEntry, 'id'>) {
      update(d => ({ ...d, balances: [...d.balances.filter(b => b.date !== entry.date), { ...entry, id: uid() }] }));
    },
    deleteBalance(id: string) {
      update(d => ({ ...d, balances: d.balances.filter(b => b.id !== id) }));
    },
    updateSettings(patch: Partial<Settings>) {
      update(d => ({ ...d, settings: { ...d.settings, ...patch } }));
    },
    /** Clears example data but keeps categories and settings. */
    startFresh() {
      update(d => ({ ...emptyData(), categories: d.demo ? emptyData().categories : d.categories, settings: d.settings }));
    },
    loadExamples() {
      update(() => demoData());
    },
    /**
     * A full backup replaces everything. An import file ({ kind: 'import' }) adds its transactions,
     * categories, balances and monthly items to what's here and keeps your settings.
     * Example data is cleared first.
     */
    restore(raw: unknown): { mode: 'backup' | 'import'; count: number } {
      const incoming = { ...normalize(raw), demo: false };
      if ((raw as any)?.kind !== 'import') {
        update(() => generateRecurring(incoming));
        return { mode: 'backup', count: incoming.transactions.length };
      }
      update(d => {
        const base = d.demo ? { ...emptyData(), settings: d.settings } : d;
        const key = (t: Transaction) => `${t.date}|${t.type}|${t.amount}|${t.description}`;
        const have = new Set(base.transactions.map(key));
        const cats = new Map(base.categories.map(c => [c.id, c]));
        for (const c of incoming.categories) if (!cats.has(c.id)) cats.set(c.id, c);
        const balDates = new Set(base.balances.map(b => b.date));
        const recIds = new Set(base.recurring.map(r => r.id));
        return generateRecurring({
          ...base,
          demo: false,
          categories: [...cats.values()],
          transactions: [...base.transactions, ...incoming.transactions.filter(t => !have.has(key(t)))],
          balances: [...base.balances, ...incoming.balances.filter(b => !balDates.has(b.date))],
          recurring: [...base.recurring, ...incoming.recurring.filter(r => !recIds.has(r.id))],
          settings: base.settings.invest || !(raw as any)?.data?.settings?.invest ? base.settings : { ...base.settings, invest: (raw as any).data.settings.invest },
        });
      });
      return { mode: 'import', count: incoming.transactions.length };
    },
  }), [update]);

  return { data, persisted, actions };
};

export type Actions = ReturnType<typeof useStore>['actions'];
