import React, { useState } from 'react';
import type { AppData, City, HouseAssumptions, Settings } from '../types';
import { projectGoal } from '../logic';
import { affordability, areasFor, averageIncome, cashNeeded } from '../house';
import { INFLATION, MARKETS } from '../market';
import { centsToInput, money0, parseAmount } from '../util';
import { Segmented, Sheet, Switch } from './Sheet';

interface Props {
  data: AppData;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<Settings>) => void;
}

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d).replace(/\.0+$/, '')}%`;

export const HouseSheet: React.FC<Props> = ({ data, onClose, onUpdateSettings }) => {
  const city = data.settings.city;
  const m = MARKETS[city];
  const h = data.settings.houses[city];
  const goal = projectGoal(data);
  const todaySaved = goal?.saved ?? 0;
  const [mode, setMode] = useState<'today' | 'goal'>(todaySaved > 0 ? 'today' : 'goal');
  const savings = mode === 'today' ? todaySaved : data.settings.goalTarget;
  const [priceInput, setPriceInput] = useState(data.settings.goalHomePrice ? centsToInput(data.settings.goalHomePrice) : '200000');
  const [showAssume, setShowAssume] = useState(false);

  const a = affordability(savings, data);
  const income = averageIncome(data);
  const b = a.breakdown;
  const areas = areasFor(a.maxPrice, city);

  const checkPrice = parseAmount(priceInput);
  const check = checkPrice && checkPrice > 0 ? cashNeeded(checkPrice, city, h) : null;

  const setH = (patch: Partial<HouseAssumptions>) =>
    onUpdateSettings({ houses: { ...data.settings.houses, [city]: { ...h, ...patch } } });
  const setCity = (c: City) => onUpdateSettings({ city: c });

  const ltvOptions = city === 'braga'
    ? [{ value: '0.8', label: '80%' }, { value: '0.9', label: '90%' }, { value: '1', label: '100%' }]
    : [{ value: '0.8', label: '80%' }, { value: '0.9', label: '90%' }, { value: '1', label: '100%' }];

  return (
    <Sheet title="What can I buy?" onClose={onClose} left={<button className="link-btn" onClick={onClose}>Done</button>}>
      <div className="city-switch">
        <Segmented value={city} onChange={setCity} label="City"
          options={[{ value: 'braga', label: 'Braga' }, { value: 'madrid', label: 'Madrid' }]} />
      </div>
      <Segmented value={mode} onChange={setMode} label="Savings to use"
        options={[{ value: 'today', label: `Today · ${money0(todaySaved)}` }, { value: 'goal', label: `At goal · ${money0(data.settings.goalTarget)}` }]} />

      <section className="card house-hero">
        <span className="eyebrow">With {money0(savings)} you can buy a home in {m.name} up to</span>
        <span className="goal-amount">{money0(a.maxPrice)}</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {city === 'madrid' && <span className="pill">{h.kind === 'used' ? 'Second-hand' : 'New build'}</span>}
          <span className="pill">{h.mainHome ? 'Main home' : 'Second home'}</span>
          {city === 'braga' && h.youngBuyer && h.mainHome && <span className="pill sage">IMT Jovem</span>}
          <span className="pill">{h.ltv > m.standardLtv ? `${pct(h.ltv, 0)} mortgage (${m.programme.name})` : `${pct(h.ltv, 0)} mortgage`}</span>
          <span className={'pill ' + (a.limitedBy === 'savings' ? 'sage' : 'blush')}>
            {a.limitedBy === 'savings' ? 'Limited by savings' : a.limitedBy === 'income' ? 'Limited by income' : 'Programme price cap'}
          </span>
        </div>
        {a.maxPrice > 0 && (
          <div className="breakdown" style={{ marginTop: 12 }}>
            <div><span>Down payment ({pct(1 - h.ltv, 0)})</span><span>{money0(b.deposit)}</span></div>
            <div><span>{b.taxLabel}</span><span>{money0(b.taxes)}</span></div>
            <div><span>{b.feeLabel}</span><span>{money0(b.fees)}</span></div>
            <div className="total"><span>Cash needed</span><span>{money0(b.total)}</span></div>
            <div><span>Mortgage · {h.years} years at {pct(h.rate, 2)}</span><span>{money0(b.loan)}</span></div>
            <div><span>Monthly payment</span><span>{money0(b.monthlyPayment)}{income ? ` · ${Math.round((b.monthlyPayment / income) * 100)}% of income` : ''}</span></div>
          </div>
        )}
        <p className="small-print" style={{ marginTop: 8 }}>
          {a.limitedBy === 'income' && a.byIncome !== null
            ? `Your savings would cover up to ${money0(a.byCash)}, but banks usually keep the payment under ${pct(h.maxIncomeShare, 0)} of net income. With about ${money0(income ?? 0)} a month that caps the price at ${money0(a.byIncome)}.`
            : a.limitedBy === 'programme'
              ? `${m.programme.name} caps the price at ${money0(m.programme.priceCap)}.`
              : income
                ? `Your income (about ${money0(income)} a month) would support a mortgage for up to ${money0(a.byIncome ?? 0)}, so savings are the limit.`
                : 'Add your income so the app can also check what a bank would lend you.'}
        </p>
      </section>

      <section className="card">
        <div className="card-head">
          <h3 className="card-title">{m.areasTitle}</h3>
        </div>
        <div className="districts">
          {areas.map(d => (
            <div className={'district' + (d.small ? ' dim' : '')} key={d.name}>
              <span className="d-name">{d.name}</span>
              <span className="d-m2">{d.m2Min === d.m2Max ? `${d.m2Max} m²` : `${d.m2Min}–${d.m2Max} m²`}</span>
              <span className="d-sub">{d.perM2High ? `${d.perM2.toLocaleString('en-IE')}–${d.perM2High.toLocaleString('en-IE')}` : d.perM2.toLocaleString('en-IE')} €/m²{d.note ? ` · ${d.note}` : ''}</span>
              <span className="d-type">{d.small ? 'Too small to be realistic' : d.type}</span>
            </div>
          ))}
        </div>
        <p className="small-print" style={{ marginTop: 8 }}>
          {city === 'braga'
            ? 'Portuguese sizes: T0 under 40 m², T1 40–65, T2 65–90, T3 90–120. Braga prices rose about 12.6% in the last year, so area ranges from April are probably low.'
            : 'Average asking prices per district. Sizes: studio under 35 m², 1-bed 35–55, 2-bed 55–75, 3-bed 75–100.'}
        </p>
      </section>

      <section className="card">
        <h3 className="card-title" style={{ marginBottom: 10 }}>Check a specific price</h3>
        <div className="input-euro">
          <input id="house-price" className="input" inputMode="decimal" value={priceInput} aria-label="Home price"
            onChange={e => setPriceInput(e.target.value.replace(/[^\d.,]/g, ''))} />
        </div>
        {check && (
          <>
            <div className="breakdown" style={{ marginTop: 10 }}>
              <div><span>Down payment ({pct(1 - h.ltv, 0)})</span><span>{money0(check.deposit)}</span></div>
              <div><span>{check.taxLabel}</span><span>{money0(check.taxes)}</span></div>
              <div><span>{check.feeLabel}</span><span>{money0(check.fees)}</span></div>
              <div className="total"><span>Cash needed</span><span>{money0(check.total)}</span></div>
            </div>
            <p style={{ margin: '8px 0 12px', fontSize: 14.5 }}>
              Your {money0(todaySaved)} is <b>{Math.round((todaySaved / check.price) * 100)}%</b> of this home's price and <b>{Math.min(100, Math.round((todaySaved / check.total) * 100))}%</b> of the cash you'd need for it.
            </p>
            <button className="btn primary block" onClick={() => onUpdateSettings({ goalTarget: check.total, goalHomePrice: check.price })}>
              Set my goal to {money0(check.total)}
            </button>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h3 className="card-title">Assumptions for {m.name}</h3>
          <button className="card-link" onClick={() => setShowAssume(v => !v)}>{showAssume ? 'Hide' : 'Edit'}</button>
        </div>
        {!showAssume ? (
          <p className="small-print">
            {city === 'braga'
              ? `${h.mainHome ? 'Main home (IMT for own permanent residence)' : 'Second home (higher IMT)'}${h.youngBuyer && h.mainHome ? ', IMT Jovem exemption' : ''} · stamp duty 0.8% · ${pct(h.ltv, 0)} mortgage · ${pct(h.rate, 2)} over ${h.years} years · payment up to ${pct(h.maxIncomeShare, 0)} of income · prices +${pct(h.priceGrowth)} a year.`
              : `${h.kind === 'used' ? 'Second-hand home, ITP 6% (5.4% up to €250k as your main home)' : 'New build, IVA 10% + AJD'} · ${pct(h.ltv, 0)} mortgage · ${pct(h.rate, 2)} over ${h.years} years · payment up to ${pct(h.maxIncomeShare, 0)} of income · prices +${pct(h.priceGrowth)} a year.`}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {city === 'madrid' && (
              <Segmented value={h.kind} onChange={v => setH({ kind: v })} label="Home type"
                options={[{ value: 'used', label: 'Second-hand' }, { value: 'new', label: 'New build' }]} />
            )}
            <div className="toggle-row" style={{ background: 'var(--fill)' }}>
              <div className="label">Main home<small>{city === 'braga' ? 'Lower IMT if it becomes your permanent residence' : 'Reduced ITP up to €250k'}</small></div>
              <Switch id="as-main" checked={h.mainHome} onChange={v => setH({ mainHome: v })} label="Main home" />
            </div>
            {city === 'braga' && (
              <div className="toggle-row" style={{ background: 'var(--fill)' }}>
                <div className="label">IMT Jovem<small>Up to 35, first main home: no IMT or stamp duty up to €330,539</small></div>
                <Switch id="as-young" checked={h.youngBuyer} onChange={v => setH({ youngBuyer: v })} label="IMT Jovem" />
              </div>
            )}
            <div className="field"><span>Mortgage share of the price</span>
              <Segmented value={String(h.ltv)} onChange={v => setH({ ltv: Number(v) })} label="Mortgage share" options={ltvOptions} />
            </div>
            {h.ltv > m.standardLtv && <p className="small-print">Banks normally lend up to {pct(m.standardLtv, 0)} for a main home. {m.programme.summary} Check the current conditions before relying on it.</p>}
            {city === 'braga' && <p className="small-print">If you're not resident in Portugal, banks often lend less (around 70–80%) and IMT Jovem and the Garantia Pública need a Portuguese tax address.</p>}
            <div className="assume">
              <label htmlFor="as-rate">Mortgage rate (% a year)</label>
              <PctInput key={city + 'r'} id="as-rate" value={h.rate} onCommit={v => setH({ rate: v })} />
              <label htmlFor="as-years">Years</label>
              <input key={city + 'y'} id="as-years" className="input" inputMode="numeric" defaultValue={h.years}
                onBlur={e => { const n = Number(e.target.value); if (n >= 5 && n <= 40) setH({ years: n }); }} />
              <label htmlFor="as-share">Max payment (% of income)</label>
              <PctInput key={city + 's'} id="as-share" value={h.maxIncomeShare} onCommit={v => setH({ maxIncomeShare: v })} />
              <label htmlFor="as-growth">House prices rise (% a year)</label>
              <PctInput key={city + 'g'} id="as-growth" value={h.priceGrowth} onCommit={v => setH({ priceGrowth: v })} />
              <label htmlFor="as-infl">Inflation (% a year)</label>
              <PctInput id="as-infl" value={data.settings.inflation} onCommit={v => onUpdateSettings({ inflation: v })} />
            </div>
          </div>
        )}
        <p className="small-print" style={{ marginTop: 10 }}>
          Figures as of {m.asOf}. The app doesn't go online to update them, which keeps your data private, so edit them here when things change. This is an estimate, not financial advice; a bank or mortgage broker will give you a firm number.
        </p>
        <ul className="sources">
          {[...m.sources, { label: `Inflation: ${INFLATION.label}`, url: INFLATION.url }].map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}
        </ul>
      </section>
    </Sheet>
  );
};

const PctInput: React.FC<{ id: string; value: number; onCommit: (v: number) => void }> = ({ id, value, onCommit }) => {
  const [v, setV] = useState((value * 100).toFixed(2).replace(/\.?0+$/, '').replace('.', ','));
  return (
    <input id={id} className="input" inputMode="decimal" value={v}
      onChange={e => setV(e.target.value.replace(/[^\d.,-]/g, ''))}
      onBlur={() => { const n = Number(v.replace(',', '.')); if (isFinite(n) && n > -50 && n < 100) onCommit(n / 100); }} />
  );
};
