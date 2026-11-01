import React, { useState } from 'react';
import type { AppData, Category, Nature, Recurring } from '../types';
import { estimateBalance } from '../logic';
import { centsToInput, fullDate, money, parseAmount, today, uid, currentMonth } from '../util';
import { CATEGORY_COLORS } from '../defaults';
import { Segmented, Sheet, Switch } from './Sheet';
import { CategoryIcon, ICON_CHOICES } from './CategoryIcon';

// ---------- Bank balance ----------

export const BalanceSheet: React.FC<{
  data: AppData;
  onClose: () => void;
  onSave: (date: string, cents: number) => void;
}> = ({ data, onClose, onSave }) => {
  const est = estimateBalance(data);
  const [amount, setAmount] = useState(est ? centsToInput(est.estimate) : '');
  const [date, setDate] = useState(today());
  const cents = parseAmount(amount);
  const ok = cents !== null && cents >= 0;
  const save = () => { if (ok) onSave(date, cents!); };
  return (
    <Sheet title="Savings check-in" onClose={onClose} right={<button className="link-btn" disabled={!ok} onClick={save}>Save</button>}>
      <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
        Add up what's in your accounts today (current account plus savings) and type the total. Each time you do this it becomes a check-in, and Piggy estimates the days in between from what you log.
      </p>
      <div className="amount-entry">
        <span className="sym">€</span>
        <input id="bal-amount" style={{ width: `${Math.max(1, amount.length) * 0.62 + 0.3}em` }} inputMode="decimal" autoFocus placeholder="0" aria-label="Balance in euros" value={amount}
          onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} onKeyDown={e => { if (e.key === 'Enter') save(); }} />
      </div>
      <label className="field">
        <span>As of</span>
        <input id="bal-date" className="input" type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} />
      </label>
      {est && (
        <p className="small-print">
          Piggy's estimate for today: <b className="num">{money(est.estimate)}</b> (last check-in {money(est.base)} on {fullDate(est.baseDate)}, {est.change >= 0 ? '+' : '−'}{money(Math.abs(est.change))} logged since). If your bank shows a different number, enter the real one.
        </p>
      )}
      <button className="btn primary block" disabled={!ok} onClick={save}>Save balance</button>
    </Sheet>
  );
};

// ---------- Recurring ----------

export const RecurringSheet: React.FC<{
  data: AppData;
  rule?: Recurring;
  onClose: () => void;
  onSave: (r: Recurring) => void;
  onDelete: (removePast: boolean) => void;
}> = ({ data, rule, onClose, onSave, onDelete }) => {
  const [type, setType] = useState(rule?.type ?? 'expense');
  const [amount, setAmount] = useState(rule ? centsToInput(rule.amount) : '');
  const [description, setDescription] = useState(rule?.description ?? '');
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '');
  const [day, setDay] = useState(String(rule?.day ?? 1));
  const [nature, setNature] = useState<Nature>(rule?.nature ?? 'fixed');
  const [active, setActive] = useState(rule?.active ?? true);
  const [confirm, setConfirm] = useState(false);
  const cents = parseAmount(amount);
  const cats = data.categories.filter(c => c.kind === type);
  const ok = cents !== null && cents > 0 && categoryId && description.trim();
  const save = () => {
    if (!ok) return;
    onSave({
      id: rule?.id ?? uid(), type, amount: cents!, description: description.trim(), categoryId, nature,
      day: Math.min(31, Math.max(1, Number(day) || 1)), startMonth: rule?.startMonth ?? currentMonth(),
      active, skipped: rule?.skipped ?? [],
    });
  };
  return (
    <Sheet title={rule ? 'Monthly item' : 'New monthly item'} onClose={onClose} right={<button className="link-btn" disabled={!ok} onClick={save}>Save</button>}>
      <Segmented value={type} onChange={v => { setType(v); setCategoryId(''); }} label="Type"
        options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
      <label className="field"><span>Description</span>
        <input id="rec-desc" className="input" value={description} placeholder="e.g. Rent" onChange={e => setDescription(e.target.value)} />
      </label>
      <div className="form-row">
        <label className="field"><span>Amount</span>
          <div className="input-euro"><input id="rec-amount" className="input" inputMode="decimal" value={amount} placeholder="0" onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} /></div>
        </label>
        <label className="field"><span>Day of month</span>
          <input id="rec-day" className="input" inputMode="numeric" value={day} onChange={e => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        </label>
      </div>
      <label className="field"><span>Category</span>
        <select id="rec-cat" className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
          <option value="" disabled>Choose…</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <div className="field"><span>Kind</span>
        <Segmented value={nature} onChange={setNature} label="Fixed or variable" options={[{ value: 'fixed', label: 'Fixed' }, { value: 'variable', label: 'Variable' }]} />
      </div>
      <div className="toggle-row">
        <div className="label">Active<small>Paused items stop adding new months</small></div>
        <Switch id="rec-active" checked={active} onChange={setActive} label="Active" />
      </div>
      <p className="small-print">Changes apply to months added from now on. Past entries keep their amounts.</p>
      <button className="btn primary block" disabled={!ok} onClick={save}>Save</button>
      {rule && (!confirm ? (
        <button className="btn danger block" onClick={() => setConfirm(true)}>Delete monthly item</button>
      ) : (
        <div className="confirm">
          <p>Stop “{rule.description}” from repeating. What about the entries it already added?</p>
          <div className="actions">
            <button className="btn small" onClick={() => onDelete(false)}>Keep past entries</button>
            <button className="btn danger small" onClick={() => onDelete(true)}>Delete them too</button>
            <button className="btn small" onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        </div>
      ))}
    </Sheet>
  );
};

// ---------- Category ----------

export const CategorySheet: React.FC<{
  data: AppData;
  category?: Category;
  onClose: () => void;
  onSave: (c: Category) => void;
  onDelete: (moveTo: string) => void;
}> = ({ data, category, onClose, onSave, onDelete }) => {
  const used = new Set(data.categories.map(c => c.color));
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS.find(c => !used.has(c)) ?? CATEGORY_COLORS[0]);
  const [kind, setKind] = useState(category?.kind ?? 'expense');
  const [nature, setNature] = useState<Nature>(category?.defaultNature ?? 'variable');
  const [icon, setIcon] = useState(category?.icon ?? 'tag');
  const [confirm, setConfirm] = useState(false);
  const siblings = data.categories.filter(c => c.kind === kind && c.id !== category?.id);
  const [moveTo, setMoveTo] = useState(siblings.find(c => c.name === 'Other')?.id ?? siblings[0]?.id ?? '');
  const count = category ? data.transactions.filter(t => t.categoryId === category.id).length : 0;
  const ok = name.trim().length > 0;
  const save = () => { if (ok) onSave({ id: category?.id ?? uid(), name: name.trim(), color, kind, defaultNature: nature, icon }); };

  return (
    <Sheet title={category ? 'Edit category' : 'New category'} onClose={onClose} right={<button className="link-btn" disabled={!ok} onClick={save}>Save</button>}>
      <label className="field"><span>Name</span>
        <input id="cat-name" className="input" autoFocus={!category} value={name} placeholder="e.g. Pets" onChange={e => setName(e.target.value)} />
      </label>
      {!category && (
        <div className="field"><span>For</span>
          <Segmented value={kind} onChange={setKind} label="Category type" options={[{ value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]} />
        </div>
      )}
      <div className="field"><span>Usually</span>
        <Segmented value={nature} onChange={setNature} label="Default kind" options={[{ value: 'fixed', label: 'Fixed' }, { value: 'variable', label: 'Variable' }]} />
      </div>
      <div className="field"><span>Icon</span>
        <div className="icon-grid">
          {ICON_CHOICES.map(k => (
            <button key={k} type="button" className="icon-pick" aria-pressed={icon === k} aria-label={k} onClick={() => setIcon(k)}>
              <CategoryIcon name={k} size={22} />
            </button>
          ))}
        </div>
      </div>
      <div className="field"><span>Colour (used in charts)</span>
        <div className="swatches">
          {CATEGORY_COLORS.map(c => <button key={c} type="button" className="swatch" style={{ background: c }} aria-pressed={color === c} aria-label={`Colour ${c}`} onClick={() => setColor(c)} />)}
        </div>
      </div>
      <button className="btn primary block" disabled={!ok} onClick={save}>Save</button>
      {category && siblings.length > 0 && (!confirm ? (
        <button className="btn danger block" onClick={() => setConfirm(true)}>Delete category</button>
      ) : (
        <div className="confirm">
          <p>{count ? `${count} ${count === 1 ? 'entry uses' : 'entries use'} “${category.name}”. Move ${count === 1 ? 'it' : 'them'} to:` : `Delete “${category.name}”?`}</p>
          {count > 0 && (
            <select id="cat-move" className="input" value={moveTo} onChange={e => setMoveTo(e.target.value)}>
              {siblings.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="actions">
            <button className="btn danger small" onClick={() => onDelete(moveTo)}>Delete</button>
            <button className="btn small" onClick={() => setConfirm(false)}>Keep</button>
          </div>
        </div>
      ))}
    </Sheet>
  );
};

