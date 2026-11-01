import type { AppData, Cents, City, HouseAssumptions } from './types';
import { MARKETS } from './market';
import { addMonths, currentMonth } from './util';
import { summarize } from './logic';

// ---------- Purchase taxes ----------

/** Portugal mainland IMT 2026: [upper limit €, marginal rate, deductible €]. Above the last bracket a flat rate applies. */
const IMT_MAIN: Array<[number, number, number]> = [
  [106346, 0, 0], [145470, 0.02, 2126.92], [198347, 0.05, 6491.02], [330539, 0.07, 10457.96], [660982, 0.08, 13763.35],
];
const IMT_SECOND: Array<[number, number, number]> = [
  [106346, 0.01, 0], [145470, 0.02, 1063.46], [198347, 0.05, 5427.56], [330539, 0.07, 9394.5], [633931, 0.08, 12699.89],
];
const IMT_JOVEM_FULL = 330539;
const IMT_JOVEM_PARTIAL = 660982;

const imt = (euros: number, mainHome: boolean): number => {
  const table = mainHome ? IMT_MAIN : IMT_SECOND;
  for (const [limit, rate, deduct] of table) if (euros <= limit) return Math.max(0, euros * rate - deduct);
  return euros * (euros > 1150853 ? 0.075 : 0.06);
};

interface Taxes { amount: Cents; label: string }

const portugalTaxes = (price: Cents, loan: Cents, h: HouseAssumptions): Taxes => {
  const euros = price / 100;
  let transfer: number, selo: number;
  const young = h.youngBuyer && h.mainHome;
  if (young && euros <= IMT_JOVEM_FULL) { transfer = 0; selo = 0; }
  else if (young && euros <= IMT_JOVEM_PARTIAL) { transfer = (euros - IMT_JOVEM_FULL) * 0.08; selo = (euros - IMT_JOVEM_FULL) * 0.008; }
  else { transfer = imt(euros, h.mainHome); selo = euros * 0.008; }
  const loanSelo = (loan / 100) * 0.006; // stamp duty on loans over 5 years
  return {
    amount: Math.round((transfer + selo + loanSelo) * 100),
    label: young && euros <= IMT_JOVEM_FULL ? 'Stamp duty on the loan (IMT Jovem exempt)' : 'IMT, stamp duty and loan stamp duty',
  };
};

const spainMadridTaxes = (price: Cents, h: HouseAssumptions): Taxes => {
  const euros = price / 100;
  if (h.kind === 'used') {
    const rate = h.mainHome && euros <= 250000 ? 0.054 : 0.06;
    return { amount: Math.round(price * rate), label: `ITP tax (${(rate * 100).toFixed(1).replace('.0', '')}%)` };
  }
  const ajd = euros <= 120000 ? 0.004 : euros <= 180000 ? 0.005 : 0.0075;
  const rate = 0.10 + (h.mainHome && euros <= 250000 ? ajd * 0.9 : ajd);
  return { amount: Math.round(price * rate), label: 'IVA 10% + AJD' };
};

/** Notary or escritura, registry, appraisal and bank fees: typical totals. */
const FEES: Record<City, { amount: Cents; label: string }> = {
  madrid: { amount: 145800, label: 'Notary, registry, gestoría, appraisal' },
  braga: { amount: 120000, label: 'Escritura, registo, appraisal, bank fees' },
};

// ---------- Cash and mortgage ----------

export interface CashBreakdown {
  price: Cents;
  deposit: Cents;
  taxes: Cents;
  taxLabel: string;
  fees: Cents;
  feeLabel: string;
  total: Cents;
  loan: Cents;
  monthlyPayment: Cents;
}

export const monthlyPayment = (loan: Cents, h: HouseAssumptions): Cents => {
  const r = h.rate / 12;
  const n = h.years * 12;
  if (loan <= 0) return 0;
  if (r === 0) return Math.round(loan / n);
  return Math.round((loan * r) / (1 - Math.pow(1 + r, -n)));
};

export const cashNeeded = (price: Cents, city: City, h: HouseAssumptions): CashBreakdown => {
  const loan = Math.round(price * h.ltv);
  const deposit = price - loan;
  const t = city === 'braga' ? portugalTaxes(price, loan, h) : spainMadridTaxes(price, h);
  const f = FEES[city];
  return {
    price, deposit, taxes: t.amount, taxLabel: t.label, fees: f.amount, feeLabel: f.label,
    total: deposit + t.amount + f.amount, loan, monthlyPayment: monthlyPayment(loan, h),
  };
};

/** Highest price whose cash requirement fits `savings` (bisection; cash needed grows with price). */
export const maxPriceForCash = (savings: Cents, city: City, h: HouseAssumptions): Cents => {
  if (savings <= FEES[city].amount) return 0;
  let lo = 0, hi = 500000000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (cashNeeded(mid, city, h).total <= savings) lo = mid; else hi = mid;
  }
  return Math.floor(lo / 100000) * 100000;
};

export const maxPriceForIncome = (netMonthly: Cents, h: HouseAssumptions): Cents => {
  const pay = netMonthly * h.maxIncomeShare;
  const r = h.rate / 12;
  const n = h.years * 12;
  const loan = r === 0 ? pay * n : (pay * (1 - Math.pow(1 + r, -n))) / r;
  return h.ltv > 0 ? Math.floor(loan / h.ltv / 100000) * 100000 : 0;
};

export const averageIncome = (data: AppData): Cents | null => {
  const vals: number[] = [];
  let m = addMonths(currentMonth(), -1);
  for (let i = 0; i < 12 && vals.length < 3; i++) {
    const s = summarize(data.transactions, m);
    if (s.income > 0) vals.push(s.income);
    m = addMonths(m, -1);
  }
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
};

export interface Affordability {
  city: City;
  byCash: Cents;
  byIncome: Cents | null;
  maxPrice: Cents;
  limitedBy: 'savings' | 'income' | 'programme';
  breakdown: CashBreakdown;
}

export const affordability = (savings: Cents, data: AppData, cityOverride?: City): Affordability => {
  const city = cityOverride ?? data.settings.city;
  const h = data.settings.houses[city];
  const m = MARKETS[city];
  const byCash = maxPriceForCash(savings, city, h);
  const income = averageIncome(data);
  const byIncome = income ? maxPriceForIncome(income, h) : null;
  let maxPrice = byIncome !== null ? Math.min(byCash, byIncome) : byCash;
  let limitedBy: Affordability['limitedBy'] = byIncome !== null && byIncome < byCash ? 'income' : 'savings';
  if (h.ltv > m.standardLtv && maxPrice > m.programme.priceCap) { maxPrice = m.programme.priceCap; limitedBy = 'programme'; }
  return { city, byCash, byIncome, maxPrice, limitedBy, breakdown: cashNeeded(maxPrice, city, h) };
};

// ---------- Sizes ----------

export const homeType = (m2: number, city: City): string => {
  if (city === 'braga') return m2 < 40 ? 'T0 (studio)' : m2 < 65 ? 'T1 (1 bedroom)' : m2 < 90 ? 'T2 (2 bedrooms)' : m2 < 120 ? 'T3 (3 bedrooms)' : 'T4 or larger';
  return m2 < 35 ? 'Studio' : m2 < 55 ? '1-bedroom flat' : m2 < 75 ? '2-bedroom flat' : m2 < 100 ? '3-bedroom flat' : 'Large family home';
};

export const areasFor = (price: Cents, city: City) =>
  MARKETS[city].areas.map(a => {
    const max = Math.floor(price / 100 / a.perM2);
    const min = a.perM2High ? Math.floor(price / 100 / a.perM2High) : max;
    const mid = Math.round((min + max) / 2);
    return { ...a, m2Min: min, m2Max: max, type: homeType(mid, city), small: max < 25 };
  });
