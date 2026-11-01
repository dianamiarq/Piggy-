import type { AppData, Cents } from './types';
import { averageSavings, estimateBalance, summarize } from './logic';
import { addMonths, currentMonth, daysInMonth, money0, monthOf, today } from './util';

export interface Tip {
  id: string;
  title: string;
  body: string;
  /** Estimated monthly saving in cents, when the tip has one. */
  saving?: Cents;
  /** Days closer to the goal per month, at the current saving pace. */
  goalDays?: number;
  /** True when the saving repeats every month, so the goal effect is shown per year. */
  yearly?: boolean;
  priority: number;
}

/**
 * Spending tips worked out on the device from the user's own records. No data leaves the phone.
 * Each rule only fires when it has something specific to say.
 */
export const buildTips = (data: AppData, month: string = currentMonth()): Tip[] => {
  const tips: Tip[] = [];
  const isCurrent = month === currentMonth();
  const days = daysInMonth(month);
  const dayNow = isCurrent ? Number(today().slice(8, 10)) : days;
  const cat = new Map(data.categories.map(c => [c.id, c]));
  const pace = averageSavings(data);
  const goalDays = (saving: Cents) => (pace && pace > 0 ? Math.max(1, Math.round(saving / (pace / 30))) : undefined);
  const goal = data.settings.goalName.toLowerCase();

  // 1. Flexible categories above their usual level (same point in the month, last 3 months).
  const now = summarize(data.transactions, month, dayNow);
  const past = [1, 2, 3].map(i => summarize(data.transactions, addMonths(month, -i), dayNow)).filter(s => s.count > 0);
  if (past.length >= 2) {
    const over: Array<{ id: string; now: number; usual: number; diff: number }> = [];
    for (const [id, amt] of now.byVariable) {
      const usual = past.reduce((a, s) => a + (s.byVariable.get(id) ?? 0), 0) / past.length;
      const diff = amt - usual;
      if (diff >= 2500 && diff >= usual * 0.3) over.push({ id, now: amt, usual: Math.round(usual), diff: Math.round(diff) });
    }
    over.sort((a, b) => b.diff - a.diff);
    for (const o of over.slice(0, 2)) {
      const name = cat.get(o.id)?.name ?? 'Other';
      tips.push({
        id: 'over-' + o.id,
        title: `${name} is ${money0(o.diff)} above your usual`,
        body: `You've spent ${money0(o.now)} ${isCurrent ? 'so far' : ''} vs about ${money0(o.usual)} by this point in a normal month. Getting back to your usual keeps that money for your ${goal}.`,
        saving: o.diff,
        goalDays: goalDays(o.diff),
        priority: 90 + o.diff / 1000,
      });
    }
  }

  // 2. Projected month end for the current month.
  if (isCurrent && dayNow >= 7 && data.settings.monthlyBudget > 0) {
    const s = summarize(data.transactions, month);
    const projectedVariable = (s.variable / dayNow) * days;
    const pendingFixed = data.recurring
      .filter(r => r.active && r.type === 'expense' && r.day > dayNow && !data.transactions.some(t => t.recurringId === r.id && monthOf(t.date) === month))
      .reduce((a, r) => a + r.amount, 0);
    const projected = Math.round(s.fixed + pendingFixed + projectedVariable);
    const overBy = projected - data.settings.monthlyBudget;
    if (overBy > 2000) {
      const perDay = Math.round(overBy / Math.max(1, days - dayNow));
      tips.push({
        id: 'projection',
        title: `On track to end ${money0(overBy)} over budget`,
        body: `At this pace the month ends near ${money0(projected)}. Spending about ${money0(perDay)} less a day from now on brings you back to ${money0(data.settings.monthlyBudget)}.`,
        saving: overBy,
        goalDays: goalDays(overBy),
        priority: 100,
      });
    }
  }

  // 3. Small, frequent purchases (coffee, snacks) in the last 30 days.
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceISO = since.toISOString().slice(0, 10);
  const small = data.transactions.filter(t => t.type === 'expense' && t.nature === 'variable' && t.date >= sinceISO && t.amount <= 800);
  const smallByCat = new Map<string, { n: number; sum: number }>();
  for (const t of small) {
    const e = smallByCat.get(t.categoryId) ?? { n: 0, sum: 0 };
    e.n++; e.sum += t.amount;
    smallByCat.set(t.categoryId, e);
  }
  const topSmall = [...smallByCat.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  if (topSmall && topSmall[1].n >= 6) {
    const [id, { n, sum }] = topSmall;
    const half = Math.round(sum / 2);
    tips.push({
      id: 'small-' + id,
      title: id === 'other' ? `${n} small purchases in 30 days` : `${n} small ${cat.get(id)?.name.toLowerCase() ?? ''} purchases in 30 days`,
      body: `Each was under €8, but together they came to ${money0(sum)}. Halving them, for example by making coffee at home on office days, saves about ${money0(half)} a month.`,
      saving: half,
      goalDays: goalDays(half * 12),
      yearly: true,
      priority: 70,
    });
  }

  // 4. Subscriptions.
  const subs = data.recurring.filter(r => r.active && r.type === 'expense' && (r.categoryId === 'subscriptions' || /subscri/i.test(cat.get(r.categoryId)?.name ?? '')));
  const subTotal = subs.reduce((a, r) => a + r.amount, 0);
  if (subs.length >= 2 && subTotal >= 1000) {
    const smallest = [...subs].sort((a, b) => a.amount - b.amount)[0];
    tips.push({
      id: 'subs',
      title: `${money0(subTotal)} a month in subscriptions`,
      body: `That's ${money0(subTotal * 12)} a year across ${subs.length} services (${subs.map(s => s.description).join(', ')}). Cancelling one you rarely use, even ${smallest.description}, adds up over time.`,
      saving: smallest.amount,
      goalDays: goalDays(smallest.amount * 12),
      yearly: true,
      priority: 50,
    });
  }

  // 5. Largest flexible category: what a 10% trim is worth.
  const last3 = [1, 2, 3].map(i => summarize(data.transactions, addMonths(currentMonth(), -i))).filter(s => s.count > 0);
  if (last3.length >= 2) {
    const totals = new Map<string, number>();
    for (const s of last3) for (const [k, v] of s.byVariable) totals.set(k, (totals.get(k) ?? 0) + v);
    const variableTotal = [...totals.values()].reduce((a, b) => a + b, 0);
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && variableTotal > 0) {
      const monthly = top[1] / last3.length;
      const trim = Math.round(monthly * 0.1);
      if (trim >= 1000) {
        tips.push({
          id: 'top-' + top[0],
          title: `${cat.get(top[0])?.name ?? 'Other'} is your biggest flexible cost`,
          body: `It averages ${money0(monthly)} a month, ${Math.round((top[1] / variableTotal) * 100)}% of your flexible spending. A 10% trim is ${money0(trim)} a month, or ${money0(trim * 12)} a year toward your ${goal}.`,
          saving: trim,
          goalDays: goalDays(trim * 12),
      yearly: true,
          priority: 40,
        });
      }
    }
  }

  // 6. Inflation eating idle savings.
  const bal = estimateBalance(data);
  const infl = data.settings.inflation ?? 0;
  if (bal && bal.estimate > 500000 && infl > 0) {
    const loss = Math.round(bal.estimate * infl);
    tips.push({
      id: 'inflation',
      title: `Inflation costs your savings about ${money0(loss)} a year`,
      body: `With prices rising ${(infl * 100).toFixed(1)}% a year, ${money0(bal.estimate)} in an account paying 0% buys less each year. It may be worth comparing interest-paying savings accounts or deposits for money you won't need before you buy.`,
      priority: 30,
    });
  }

  return tips.sort((a, b) => b.priority - a.priority);
};
