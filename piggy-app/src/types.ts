export type TxType = 'expense' | 'income';
export type Nature = 'fixed' | 'variable';

/** Money is always stored as integer cents to avoid floating-point drift. */
export type Cents = number;

/** Local calendar date, 'YYYY-MM-DD'. */
export type ISODate = string;

/** Calendar month, 'YYYY-MM'. */
export type MonthKey = string;

export interface Category {
  id: string;
  name: string;
  color: string;
  kind: TxType;
  defaultNature: Nature;
  /** Icon key from the category icon set. */
  icon?: string;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: Cents;
  date: ISODate;
  description: string;
  categoryId: string;
  nature: Nature;
  /** Set when the transaction was generated from a recurring rule. */
  recurringId?: string;
  createdAt: number;
}

export interface Recurring {
  id: string;
  type: TxType;
  amount: Cents;
  description: string;
  categoryId: string;
  nature: Nature;
  /** Day of month it lands on (clamped to the month's last day). */
  day: number;
  startMonth: MonthKey;
  active: boolean;
  /** Months whose generated transaction the user deleted on purpose. */
  skipped: MonthKey[];
}

export interface BalanceEntry {
  id: string;
  date: ISODate;
  amount: Cents;
}

export interface Settings {
  monthlyBudget: Cents;
  goalName: string;
  goalTarget: Cents;
  /** Fraction of the budget at which the warning starts (0.8 = 80%). */
  warnAt: number;
  /** City the house calculator and deposit card use. */
  city: City;
  /** Purchase assumptions per city. */
  houses: Record<City, HouseAssumptions>;
  /** General inflation (CPI), yearly. */
  inflation: number;
  /** Home price the goal was calculated from, if the user set it with the calculator. */
  goalHomePrice?: Cents;
  /** Long-term investments, kept apart from the house goal. */
  invest?: Investments;
  /** Light-mode colour theme. */
  palette: Palette;
  /** True once the user picks a theme themselves. */
  paletteSet?: boolean;
}

export interface Investments {
  name: string;
  /** Value at the last check-in. */
  value: Cents;
  asOf: ISODate;
  /** Paid in every month (e.g. a savings plan). */
  monthly: Cents;
  /** Expected yearly growth after inflation, e.g. 0.06. */
  rate: number;
  /** Age on `ageAsOf`. */
  age: number;
  ageAsOf: ISODate;
  targetAge: number;
}

export type Palette = 'blush' | 'sage' | 'mist' | 'lagoon';
export type City = 'braga' | 'madrid';

export interface HouseAssumptions {
  /** Madrid: 'used' = second-hand (ITP), 'new' = new build (IVA + AJD). */
  kind: 'used' | 'new';
  /** Will it be the buyer's main, permanent home (lower taxes in both countries). */
  mainHome: boolean;
  /** Braga: under 35 buying a first main home (IMT Jovem exemption). */
  youngBuyer: boolean;
  /** Share of the price the bank lends. */
  ltv: number;
  /** Annual mortgage rate, e.g. 0.0395. */
  rate: number;
  years: number;
  /** Max share of net monthly income for the mortgage payment. */
  maxIncomeShare: number;
  /** Expected yearly growth of house prices. */
  priceGrowth: number;
}

export interface AppData {
  version: 1;
  transactions: Transaction[];
  categories: Category[];
  recurring: Recurring[];
  balances: BalanceEntry[];
  settings: Settings;
  /** True while the app shows generated example data. */
  demo: boolean;
}
