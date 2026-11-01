import type { Cents, Investments } from './types';
import { today } from './util';

const monthsBetween = (from: string, to: string) => {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0));
};

/** Last value entered plus the monthly contributions made since (growth not counted). */
export const investedToday = (inv: Investments): Cents => inv.value + inv.monthly * monthsBetween(inv.asOf, today());

export const currentAge = (inv: Investments): number => inv.age + Math.floor(monthsBetween(inv.ageAsOf, today()) / 12);

/**
 * Value at each future age, in today's euros: `rate` is growth after inflation,
 * compounded monthly, with the same monthly contribution throughout.
 */
export const projectInvestments = (inv: Investments) => {
  const start = investedToday(inv);
  const age = currentAge(inv);
  const rm = Math.pow(1 + inv.rate, 1 / 12) - 1;
  const points: Array<{ age: number; value: Cents; paidIn: Cents }> = [];
  for (let a = age; a <= Math.max(age, inv.targetAge); a++) {
    const n = (a - age) * 12;
    const growth = Math.pow(1 + rm, n);
    const fromContrib = rm === 0 ? inv.monthly * n : (inv.monthly * (growth - 1)) / rm;
    points.push({ age: a, value: Math.round(start * growth + fromContrib), paidIn: start + inv.monthly * n });
  }
  return { age, start, points, final: points[points.length - 1] };
};
