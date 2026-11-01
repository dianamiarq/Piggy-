import React, { useState } from 'react';
import type { Investments } from '../types';
import { currentAge, investedToday, projectInvestments } from '../invest';
import { centsToInput, money0, parseAmount, today, fullDate } from '../util';
import { Segmented, Sheet } from './Sheet';
import { LineChart } from './Charts';

interface Props {
  invest?: Investments;
  onClose: () => void;
  onSave: (inv: Investments | undefined) => void;
}

const blank = (): Investments => ({ name: 'Investments', value: 0, asOf: today(), monthly: 0, rate: 0.06, age: 32, ageAsOf: today(), targetAge: 65 });

export const InvestSheet: React.FC<Props> = ({ invest, onClose, onSave }) => {
  const base = invest ?? blank();
  const [name, setName] = useState(base.name);
  const [value, setValue] = useState(centsToInput(invest ? investedToday(invest) : 0));
  const [monthly, setMonthly] = useState(centsToInput(base.monthly));
  const [rate, setRate] = useState(String(base.rate));
  const [age, setAge] = useState(String(invest ? currentAge(invest) : base.age));
  const [targetAge, setTargetAge] = useState(String(base.targetAge));
  const [confirm, setConfirm] = useState(false);

  const draft: Investments = {
    name: name.trim() || 'Investments',
    value: parseAmount(value) ?? 0,
    asOf: today(),
    monthly: parseAmount(monthly) ?? 0,
    rate: Number(rate) || 0,
    age: Math.min(90, Math.max(15, Number(age) || 32)),
    ageAsOf: today(),
    targetAge: Math.min(100, Math.max(Number(age) || 32, Number(targetAge) || 65)),
  };
  const p = projectInvestments(draft);
  const years = draft.targetAge - p.age;
  const milestones = p.points.filter(x => x.age === p.age + 10 || x.age === p.age + 20 || x.age === draft.targetAge);

  return (
    <Sheet title="Investments" onClose={onClose} right={<button className="link-btn" onClick={() => onSave(draft)}>Save</button>}>
      <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
        Money you're investing for the long term. Piggy keeps it apart from your house deposit and shows what it could grow into.
      </p>
      <label className="field"><span>Name</span>
        <input id="inv-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. S&P 500 ETF" />
      </label>
      <div className="form-row">
        <label className="field"><span>Worth today</span>
          <div className="input-euro"><input id="inv-value" className="input" inputMode="decimal" value={value} onChange={e => setValue(e.target.value.replace(/[^\d.,]/g, ''))} /></div>
        </label>
        <label className="field"><span>Added each month</span>
          <div className="input-euro"><input id="inv-monthly" className="input" inputMode="decimal" value={monthly} onChange={e => setMonthly(e.target.value.replace(/[^\d.,]/g, ''))} /></div>
        </label>
      </div>
      {invest && <p className="small-print" style={{ marginTop: -8 }}>Last updated {fullDate(invest.asOf)}. Check the current value in your broker's app and type it here.</p>}
      <div className="field"><span>If it grows each year by (after inflation)</span>
        <Segmented value={rate} onChange={setRate} label="Yearly growth"
          options={[{ value: '0.04', label: '4%' }, { value: '0.06', label: '6%' }, { value: '0.07', label: '7%' }, { value: '0.08', label: '8%' }]} />
      </div>
      <div className="form-row">
        <label className="field"><span>Your age</span>
          <input id="inv-age" className="input" inputMode="numeric" value={age} onChange={e => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        </label>
        <label className="field"><span>Projection to age</span>
          <input id="inv-target" className="input" inputMode="numeric" value={targetAge} onChange={e => setTargetAge(e.target.value.replace(/\D/g, '').slice(0, 3))} />
        </label>
      </div>

      <section className="card house-hero">
        <span className="eyebrow">At {draft.targetAge}, in {years} {years === 1 ? 'year' : 'years'}, you could have</span>
        <span className="goal-amount">{money0(p.final.value)}</span>
        <span className="small-print">in today's euros, having paid in {money0(p.final.paidIn)}. The rest, {money0(Math.max(0, p.final.value - p.final.paidIn))}, is growth.</span>
        {p.points.length > 1 && (
          <div style={{ marginTop: 12 }}>
            <LineChart ariaLabel="Projected investment value by age" height={170}
              points={p.points.map(x => ({ key: String(x.age), label: String(x.age), value: x.value }))}
              color="var(--sage)" tip={pt => <>Age {pt.key}<br /><b>{money0(pt.value)}</b></>} />
          </div>
        )}
        <div className="breakdown" style={{ marginTop: 8 }}>
          {milestones.map(m => <div key={m.age}><span>At {m.age}</span><span>{money0(m.value)}</span></div>)}
        </div>
      </section>
      <p className="small-print">
        Growth is shown after inflation, so the numbers are in today's money. Over long periods the S&P 500 has averaged roughly 6–7% a year above inflation, but returns vary a lot from year to year and the past doesn't guarantee the future. This is a projection, not financial advice.
      </p>
      <button className="btn primary block" onClick={() => onSave(draft)}>Save</button>
      {invest && (!confirm
        ? <button className="btn danger block" onClick={() => setConfirm(true)}>Remove investments</button>
        : <div className="confirm"><p>Remove the investments line from Piggy?</p><div className="actions">
            <button className="btn danger small" onClick={() => onSave(undefined)}>Remove</button>
            <button className="btn small" onClick={() => setConfirm(false)}>Keep</button></div></div>)}
    </Sheet>
  );
};
