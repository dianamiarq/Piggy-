import type { AppData, Cents, ISODate, MonthKey, Transaction } from './types';
import { addMonths, currentMonth, dateInMonth, monthOf, monthRange, today, uid } from './util';

/**
 * Creates the transactions that recurring rules owe, from each rule's start month up to today.
 * Idempotent: a month that already has a transaction for the rule, or that the user skipped, is left alone.
 */
export const generateRecurring = (data: AppData): AppData => {
  const t = today();
  const nowM = currentMonth();
  const existing = new Set(
    data.transactions.filter(x => x.recurringId).map(x => `${x.recurringId}|${monthOf(x.date)}`),
  );
  const added: Transaction[] = [];
  for (const r of data.recurring) {
    if (!r.active) continue;
    for (const m of monthRange(r.startMonth, nowM)) {
      const key = `${r.id}|${m}`;
      if (existing.has(key) || r.skipped.includes(m)) continue;
      const date = dateInMonth(m, r.day);
      if (date > t) continue;
      added.push({
        id: uid(), type: r.type, amount: r.amount, date, description: r.description,
        categoryId: r.categoryId, nature: r.nature, recurringId: r.id, createdAt: Date.now(),
      });
      existing.add(key);
    }
  }
  return added.length ? { ...data, transactions: [...data.transactions, ...added] } : data;
};

export interface MonthSummary {
  month: MonthKey;
  spent: Cents;
  income: Cents;
  saved: Cents;
  fixed: Cents;
  variable: Cents;
  byCategory: Map<string, Cents>;
  /** Variable (flexible) spending only, by category. */
  byVariable: Map<string, Cents>;
  /** Fixed spending only, by category. */
  byFixed: Map<string, Cents>;
  count: number;
}

export const summarize = (txs: Transaction[], month: MonthKey, uptoDay?: number): MonthSummary => {
  const s: MonthSummary = { month, spent: 0, income: 0, saved: 0, fixed: 0, variable: 0, byCategory: new Map(), byVariable: new Map(), byFixed: new Map(), count: 0 };
  const limit = uptoDay ? dateInMonth(month, uptoDay) : null;
  for (const x of txs) {
    if (monthOf(x.date) !== month) continue;
    if (limit && x.date > limit) continue;
    s.count++;
    if (x.type === 'income') {
      s.income += x.amount;
    } else {
      s.spent += x.amount;
      const bucket = x.nature === 'fixed' ? s.byFixed : s.byVariable;
      bucket.set(x.categoryId, (bucket.get(x.categoryId) ?? 0) + x.amount);
      if (x.nature === 'fixed') s.fixed += x.amount;
      else s.variable += x.amount;
      s.byCategory.set(x.categoryId, (s.byCategory.get(x.categoryId) ?? 0) + x.amount);
    }
  }
  s.saved = s.income - s.spent;
  return s;
};

export const summarizeRange = (txs: Transaction[], months: MonthKey[]): MonthSummary[] =>
  months.map(m => summarize(txs, m));

/** First month that has any transaction, or the current month. */
export const firstMonth = (data: AppData): MonthKey => {
  let min = currentMonth();
  for (const x of data.transactions) {
    const m = monthOf(x.date);
    if (m < min) min = m;
  }
  return min;
};

/** Average monthly savings over the last `n` complete months that have activity. */
export const averageSavings = (data: AppData, n = 3): Cents | null => {
  const first = firstMonth(data);
  const months: MonthKey[] = [];
  let m = addMonths(currentMonth(), -1);
  while (months.length < n && m >= first) {
    months.push(m);
    m = addMonths(m, -1);
  }
  const sums = months.map(mm => summarize(data.transactions, mm)).filter(s => s.count > 0 && s.income > 0);
  if (!sums.length) return null;
  return Math.round(sums.reduce((a, s) => a + s.saved, 0) / sums.length);
};

export interface BalanceEstimate {
  /** Last balance the user entered. */
  base: Cents;
  baseDate: ISODate;
  /** Income minus spending recorded after that date. */
  change: Cents;
  estimate: Cents;
}

/** The bank balance the user entered, moved forward by everything recorded since. */
export const estimateBalance = (data: AppData): BalanceEstimate | null => {
  if (!data.balances.length) return null;
  const last = [...data.balances].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))[0];
  const t = today();
  let change = 0;
  for (const x of data.transactions) {
    if (x.date > last.date && x.date <= t) change += x.type === 'income' ? x.amount : -x.amount;
  }
  return { base: last.amount, baseDate: last.date, change, estimate: last.amount + change };
};

/** Estimated bank balance at the end of `month`, reconstructed from the last balance entry. */
/**
 * Balance at the end of `month`. Uses the closest balance the user entered on or before that day,
 * moved forward by what was recorded since; before the first entry it works backwards from it.
 */
export const balanceAtEndOf = (data: AppData, month: MonthKey): Cents | null => {
  if (!data.balances.length) return null;
  const end = `${month}-31`;
  const t = today();
  const limit = end < t ? end : t;
  const sorted = [...data.balances].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
  const before = sorted.filter(b => b.date <= limit).pop();
  const anchor = before ?? sorted[0];
  let v = anchor.amount;
  for (const x of data.transactions) {
    const signed = x.type === 'income' ? x.amount : -x.amount;
    if (before) {
      if (x.date > anchor.date && x.date <= limit) v += signed;
    } else if (x.date > limit && x.date <= anchor.date) {
      v -= signed;
    }
  }
  return v;
};

export interface GoalProjection {
  saved: Cents;
  target: Cents;
  progress: number;
  remaining: Cents;
  monthlyPace: Cents | null;
  /** Month the goal is reached at the current pace, or null if the pace is zero or negative. */
  eta: MonthKey | null;
  monthsLeft: number | null;
  /** Same, if the goal grows with house prices (the deposit for the same home gets bigger). */
  etaWithGrowth: MonthKey | null;
  growth: number;
}

export const projectGoal = (data: AppData): GoalProjection | null => {
  const bal = estimateBalance(data);
  if (!bal) return null;
  const target = data.settings.goalTarget;
  const saved = Math.max(0, bal.estimate);
  const remaining = Math.max(0, target - saved);
  const pace = averageSavings(data);
  let eta: MonthKey | null = null;
  let monthsLeft: number | null = null;
  if (remaining === 0) {
    eta = currentMonth();
    monthsLeft = 0;
  } else if (pace && pace > 0) {
    monthsLeft = Math.ceil(remaining / pace);
    eta = addMonths(currentMonth(), monthsLeft);
  }
  const growth = data.settings.houses?.[data.settings.city]?.priceGrowth ?? 0;
  let etaWithGrowth: MonthKey | null = null;
  if (remaining === 0) etaWithGrowth = currentMonth();
  else if (pace && pace > 0) {
    for (let m = 1; m <= 600; m++) {
      if (saved + pace * m >= target * Math.pow(1 + growth, m / 12)) { etaWithGrowth = addMonths(currentMonth(), m); break; }
    }
  }
  return { saved, target, progress: Math.min(1, target ? saved / target : 0), remaining, monthlyPace: pace, eta, monthsLeft, etaWithGrowth, growth };
};

/** How many days of saving a given amount represents at the current pace. */
export const daysOfSaving = (amount: Cents, monthlyPace: Cents | null): number | null => {
  if (!monthlyPace || monthlyPace <= 0) return null;
  return Math.max(1, Math.round(amount / (monthlyPace / 30)));
};
