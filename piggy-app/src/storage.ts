import type { AppData } from './types';
import { defaultCategories, defaultSettings } from './defaults';

const KEY = 'entrada.data.v1';

let available: boolean | null = null;

/** Whether this browser lets the app keep data between visits. */
export const storageAvailable = (): boolean => {
  if (available !== null) return available;
  try {
    const probe = '__entrada_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    available = true;
  } catch {
    available = false;
  }
  return available;
};

export const loadData = (): AppData | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const saveData = (data: AppData): boolean => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};

/** Ask the browser not to evict our data under storage pressure (honoured for installed PWAs). */
export const requestPersistence = async (): Promise<boolean> => {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* ignore */ }
  return false;
};

/**
 * Validates and fills gaps in data from storage or a backup file.
 * Throws with a readable message when the file is not a Piggy backup.
 */
export const normalize = (input: unknown): AppData => {
  if (!input || typeof input !== 'object') throw new Error('This file is not a Piggy backup.');
  const o = input as Partial<AppData> & { app?: string; data?: unknown };
  // Backups wrap the data: { app: 'piggy' (or 'entrada'), exportedAt, data }
  if ((o.app === 'piggy' || o.app === 'entrada') && o.data) return normalize(o.data);
  if (!Array.isArray(o.transactions)) throw new Error('This file has no transactions in it, so it is not a Piggy backup.');
  // Categories keep the user's own colours, except untouched defaults move to the current palette.
  const defaults = new Map(defaultCategories().map(c => [c.id, c.color]));
  const defaultIcons = new Map(defaultCategories().map(c => [c.id, c.icon]));
  const OLD = new Set(['#6E7FD0', '#4FA37A', '#D58A4A', '#3D8FB8', '#8A6FC4', '#CF6E92', '#D45D5D', '#2E9E9E', '#C9A33C', '#B0659E', '#7B8794', '#A08C78', '#2F8F6B', '#6BA36B']);
  const cats = (Array.isArray(o.categories) && o.categories.length ? o.categories : defaultCategories())
    .map(c => (OLD.has(c.color) && defaults.has(c.id) ? { ...c, color: defaults.get(c.id)! } : c))
    .map(c => (c.icon ? c : { ...c, icon: defaultIcons.get(c.id) ?? (c.kind === 'income' ? 'coins' : 'tag') }));
  const raw = (o.settings ?? {}) as any;
  const base = defaultSettings();
  const settings = { ...base, ...raw };
  // Older versions kept one Madrid-only `house` object; it becomes the Madrid assumptions.
  settings.houses = {
    braga: { ...base.houses.braga, ...(raw.houses?.braga ?? {}) },
    madrid: { ...base.houses.madrid, ...(raw.house ?? {}), ...(raw.houses?.madrid ?? {}) },
  };
  if (raw.house?.inflation !== undefined && raw.inflation === undefined) settings.inflation = raw.house.inflation;
  delete (settings as any).house;
  if (!['braga', 'madrid'].includes(settings.city)) settings.city = base.city;
  if (settings.palette === ('cream' as any)) { settings.palette = base.palette; settings.paletteSet = false; }
  // Until the user picks a theme themselves, follow the current default.
  if (!settings.paletteSet) settings.palette = defaultSettings().palette;
  return {
    version: 1,
    transactions: o.transactions.filter(t => t && typeof t.amount === 'number' && typeof t.date === 'string').map(t => ({
      ...t,
      type: t.type === 'income' ? 'income' : 'expense',
      nature: t.nature === 'fixed' ? 'fixed' : 'variable',
      description: String(t.description ?? ''),
      createdAt: t.createdAt ?? Date.now(),
    })),
    categories: cats,
    recurring: Array.isArray(o.recurring) ? o.recurring.map(r => ({ ...r, skipped: Array.isArray(r.skipped) ? r.skipped : [] })) : [],
    balances: Array.isArray(o.balances) ? o.balances : [],
    settings,
    demo: Boolean(o.demo),
  };
};
