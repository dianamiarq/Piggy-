import type { AppData, BalanceEntry, Category, Recurring, Settings, Transaction } from './types';
import { addMonths, currentMonth, dateInMonth, daysInMonth, today, uid } from './util';
import { generateRecurring } from './logic';
import { INFLATION, MARKETS } from './market';
import type { City, HouseAssumptions } from './types';

export const CATEGORY_COLORS = [
  '#8E9AAF', '#84A59D', '#F28482', '#6F9BC4', '#A58BC7', '#E39AB2',
  '#C96B6B', '#5FA8A0', '#F6BD60', '#D9A066', '#9AA3A0', '#B8A898',
];

export const defaultCategories = (): Category[] => [
  { id: 'rent', icon: 'home', name: 'Rent', color: '#8E9AAF', kind: 'expense', defaultNature: 'fixed' },
  { id: 'groceries', icon: 'cart', name: 'Groceries', color: '#84A59D', kind: 'expense', defaultNature: 'variable' },
  { id: 'restaurants', icon: 'cup', name: 'Restaurants & coffee', color: '#F28482', kind: 'expense', defaultNature: 'variable' },
  { id: 'metro', icon: 'metro', name: 'Metro', color: '#6F9BC4', kind: 'expense', defaultNature: 'fixed' },
  { id: 'flights', icon: 'plane', name: 'Flights & trains', color: '#A58BC7', kind: 'expense', defaultNature: 'variable' },
  { id: 'shopping', icon: 'bag', name: 'Shopping', color: '#E39AB2', kind: 'expense', defaultNature: 'variable' },
  { id: 'health', icon: 'health', name: 'Health', color: '#C96B6B', kind: 'expense', defaultNature: 'variable' },
  { id: 'fitness', icon: 'dumbbell', name: 'Fitness', color: '#5FA8A0', kind: 'expense', defaultNature: 'fixed' },
  { id: 'travel', icon: 'suitcase', name: 'Travel', color: '#F6BD60', kind: 'expense', defaultNature: 'variable' },
  { id: 'entertainment', icon: 'ticket', name: 'Entertainment', color: '#D9A066', kind: 'expense', defaultNature: 'variable' },
  { id: 'subscriptions', icon: 'repeat', name: 'Subscriptions', color: '#9AA3A0', kind: 'expense', defaultNature: 'fixed' },
  { id: 'other', icon: 'dots', name: 'Other', color: '#B8A898', kind: 'expense', defaultNature: 'variable' },
  { id: 'salary', icon: 'briefcase', name: 'Salary', color: '#5E8C7F', kind: 'income', defaultNature: 'fixed' },
  { id: 'other-income', icon: 'coins', name: 'Other income', color: '#93B5A0', kind: 'income', defaultNature: 'variable' },
];

export const defaultSettings = (): Settings => ({
  monthlyBudget: 180000,
  goalName: 'House deposit',
  goalTarget: 5000000,
  warnAt: 0.8,
  city: 'braga',
  houses: { braga: defaultHouse('braga'), madrid: defaultHouse('madrid') },
  inflation: INFLATION.value,
  palette: 'lagoon',
});

export const defaultHouse = (city: City): HouseAssumptions => ({
  kind: 'used',
  mainHome: true,
  youngBuyer: false,
  ltv: MARKETS[city].standardLtv,
  rate: MARKETS[city].rate,
  years: 30,
  maxIncomeShare: 0.35,
  priceGrowth: MARKETS[city].growth,
});

export const emptyData = (): AppData => ({
  version: 1,
  transactions: [],
  categories: defaultCategories(),
  recurring: [],
  balances: [],
  settings: defaultSettings(),
  demo: false,
});

/** Small deterministic RNG so the example data looks the same on every load. */
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/** Example data covering the last six months, clearly flagged as `demo`. */
export const demoData = (): AppData => {
  const r = rng(42);
  const now = currentMonth();
  const start = addMonths(now, -5);
  const t = today();
  const txs: Transaction[] = [];

  const rec = (type: Recurring['type'], amount: number, description: string, categoryId: string, day: number): Recurring => ({
    id: uid(), type, amount, description, categoryId, nature: 'fixed', day, startMonth: start, active: true, skipped: [],
  });
  const recurring: Recurring[] = [
    rec('income', 290000, 'Salary', 'salary', 1),
    rec('expense', 95000, 'Flat rent', 'rent', 1),
    rec('expense', 2000, 'Abono transporte', 'metro', 1),
    rec('expense', 3990, 'Gym membership', 'fitness', 3),
    rec('expense', 1199, 'Spotify', 'subscriptions', 12),
    rec('expense', 299, 'iCloud+', 'subscriptions', 15),
  ];

  const variable: Array<[string, string[], number, number, number]> = [
    // categoryId, descriptions, min €, max €, times per month
    ['groceries', ['Mercadona', 'Carrefour Express', 'Fruteria', 'Lidl', 'Mercado de San Fernando'], 18, 72, 6],
    ['restaurants', ['Café con leche', 'Lunch near office', 'Dinner with friends', 'Brunch', 'Tapas', 'Coffee & croissant'], 3, 42, 9],
    ['shopping', ['Zara', 'Books', 'Home supplies', 'Uniqlo', 'Art supplies'], 12, 85, 2],
    ['entertainment', ['Cinema', 'Concert tickets', 'Museum', 'Theatre'], 8, 45, 2],
    ['health', ['Pharmacy', 'Dentist'], 6, 70, 1],
    ['flights', ['Train to Lisbon', 'Flight to Brussels', 'Renfe AVE'], 45, 160, 0.4],
    ['travel', ['Hotel', 'Airbnb weekend'], 90, 260, 0.25],
    ['other', ['Gift', 'Haircut', 'Laundry'], 10, 40, 1],
  ];

  let m = start;
  for (let i = 0; i < 6; i++) {
    const days = daysInMonth(m);
    for (const [cat, descs, min, max, times] of variable) {
      let n = Math.floor(times) + (r() < times % 1 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const date = dateInMonth(m, 1 + Math.floor(r() * days));
        if (date > t) continue;
        const amount = Math.round((min + r() * (max - min)) * 100);
        txs.push({
          id: uid(), type: 'expense', amount, date,
          description: descs[Math.floor(r() * descs.length)],
          categoryId: cat, nature: 'variable', createdAt: Date.now(),
        });
      }
    }
    m = addMonths(m, 1);
  }

  const balances: BalanceEntry[] = [
    { id: uid(), date: dateInMonth(addMonths(now, -3), 1), amount: 2140000 },
  ];

  const data: AppData = {
    version: 1,
    transactions: txs,
    categories: defaultCategories(),
    recurring,
    balances,
    settings: defaultSettings(),
    demo: true,
  };
  return generateRecurring(data);
};
