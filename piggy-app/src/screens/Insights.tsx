import React, { useMemo, useState } from 'react';
import type { AppData } from '../types';
import { balanceAtEndOf, firstMonth, projectGoal, summarize } from '../logic';
import { affordability } from '../house';
import { buildTips } from '../tips';
import { addMonths, currentMonth, daysInMonth, money, money0, monthLabel, monthRange, today } from '../util';
import { BarChart, LineChart } from '../components/Charts';
import { Segmented } from '../components/Sheet';
import { TipList } from '../components/Tips';
import { IconAlert, IconHouse, IconLock } from '../components/Icons';

interface Props {
  data: AppData;
  month: string;
  onSelectMonth: (m: string) => void;
  onHouse: () => void;
}

type Range = '6' | '12' | 'all';
const OTHER = '__other';

export const Insights: React.FC<Props> = ({ data, month, onSelectMonth, onHouse }) => {
  const [range, setRange] = useState<Range>('6');
  const nowM = currentMonth();
  const first = firstMonth(data);
  const start = range === 'all' ? first : addMonths(nowM, -(Number(range) - 1));
  const months = monthRange(start, nowM);
  const sums = useMemo(() => months.map(m => summarize(data.transactions, m)), [data.transactions, months.join()]);
  const catById = new Map(data.categories.map(c => [c.id, c]));
  const budget = data.settings.monthlyBudget;
  const goalName = data.settings.goalName;

  // Averages use complete months only, so a half-finished month doesn't drag them down.
  const complete = sums.filter(s => s.month < nowM && s.count > 0);
  const avg = (f: (s: (typeof sums)[number]) => number) => (complete.length ? Math.round(complete.reduce((a, s) => a + f(s), 0) / complete.length) : 0);
  const avgSpent = avg(s => s.spent);
  const avgSaved = avg(s => s.saved);
  const avgFlex = avg(s => s.variable);
  const avgFixed = avg(s => s.fixed);
  const overBudgetMonths = complete.filter(s => budget > 0 && s.spent > budget).length;
  const flexBudget = budget > 0 ? Math.max(0, budget - avgFixed) : 0;

  // Top 4 flexible categories across the range get their own colour; the rest fold into "Other".
  const rangeFlex = new Map<string, number>();
  for (const s of sums) for (const [k, v] of s.byVariable) rangeFlex.set(k, (rangeFlex.get(k) ?? 0) + v);
  const rangeFlexList = [...rangeFlex.entries()].sort((a, b) => b[1] - a[1]);
  const top = rangeFlexList.slice(0, 4).map(([id]) => id);
  const series = [...top, OTHER];
  const seriesColor = (id: string) => (id === OTHER ? 'var(--fg-3)' : catById.get(id)?.color ?? 'var(--fg-3)');
  const seriesName = (id: string) => (id === OTHER ? 'Everything else' : catById.get(id)?.name ?? 'Other');
  const stackFor = (m: string) => {
    const s = sums.find(x => x.month === m)!;
    const vals = top.map(id => s.byVariable.get(id) ?? 0);
    vals.push(s.variable - vals.reduce((a, b) => a + b, 0));
    return vals;
  };
  const rangeFlexTotal = rangeFlexList.reduce((a, [, v]) => a + v, 0);
  const rangeFixedTotal = sums.reduce((a, s) => a + s.fixed, 0);
  const nMonths = Math.max(1, sums.filter(s => s.count > 0).length);

  // Selected month vs usual (average of the 3 months before, up to the same day if this month).
  const isCurrent = month === nowM;
  const dayNow = isCurrent ? Number(today().slice(8, 10)) : daysInMonth(month);
  const sel = summarize(data.transactions, month, dayNow);
  const before = [1, 2, 3].map(i => summarize(data.transactions, addMonths(month, -i), dayNow)).filter(s => s.count > 0);
  const usual = (id: string) => (before.length ? before.reduce((a, s) => a + (s.byVariable.get(id) ?? 0), 0) / before.length : 0);
  const compareIds = [...new Set([...sel.byVariable.keys(), ...before.flatMap(s => [...s.byVariable.keys()])])]
    .map(id => ({ id, now: sel.byVariable.get(id) ?? 0, usual: Math.round(usual(id)) }))
    .sort((a, b) => b.now - b.usual - (a.now - a.usual));
  const usualTotal = compareIds.reduce((a, r) => a + r.usual, 0);

  const shortLabel = (m: string) => (months.length > 8 ? monthLabel(m, { short: true, year: false }).slice(0, 1) : monthLabel(m, { short: true, year: false }));
  const balancePts = months
    .map(m => ({ key: m, label: shortLabel(m), value: balanceAtEndOf(data, m) }))
    .filter((p): p is { key: string; label: string; value: number } => p.value !== null);

  const tips = buildTips(data);

  // Warning zone: this month's spending has reached the user's warning level.
  const nowSum = summarize(data.transactions, nowM);
  const usageNow = budget > 0 ? nowSum.spent / budget : 0;
  const warnZone = budget > 0 && usageNow >= data.settings.warnAt;
  const warnLine = budget * data.settings.warnAt;
  const daysLeftNow = daysInMonth(nowM) - Number(today().slice(8, 10));
  const spendCard = warnZone ? 'card warn-edge' : 'card';
  const goal = projectGoal(data);
  const canBuy = goal ? affordability(goal.saved, data) : null;

  return (
    <div className="screen">
      <Segmented value={range} onChange={setRange} label="Time range"
        options={[{ value: '6', label: '6 months' }, { value: '12', label: '12 months' }, { value: 'all', label: 'All time' }]} />

      <div className="kpis">
        <div className="kpi"><div className="stat-label">Avg. spent / month</div><div className="stat-value">{money0(avgSpent)}</div></div>
        <div className="kpi"><div className="stat-label">Avg. flexible / month</div><div className="stat-value">{money0(avgFlex)}</div></div>
        <div className="kpi"><div className="stat-label">Avg. saved / month</div><div className="stat-value" style={{ color: avgSaved < 0 ? 'var(--bad)' : undefined }}>{money0(avgSaved)}</div></div>
        <div className="kpi"><div className="stat-label">Months over budget</div><div className="stat-value">{overBudgetMonths} of {complete.length}</div></div>
      </div>

      <div className="grid-2">
        {warnZone && (
          <div className="nudge bad span-2" role="status">
            <IconAlert />
            <div>
              <strong>{usageNow >= 1 ? `${money0(nowSum.spent - budget)} over your ${monthLabel(nowM, { year: false })} budget` : `${Math.round(usageNow * 100)}% of your ${monthLabel(nowM, { year: false })} budget used`}</strong>
              <p>{usageNow >= 1
                ? `Anything more this month comes straight out of your ${goalName.toLowerCase()}. The red below shows where the money went.`
                : `${money0(budget - nowSum.spent)} left for ${daysLeftNow} ${daysLeftNow === 1 ? 'day' : 'days'}. The red below shows where you're above your usual.`}</p>
            </div>
          </div>
        )}
        {tips.length > 0 && (
          <section className="span-2" aria-labelledby="h-tips" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="card-head" style={{ margin: '4px 4px 0' }}><h2 className="card-title" id="h-tips">Ways to save</h2></div>
            <TipList tips={tips} goalName={goalName} />
          </section>
        )}

        <section className={spendCard + ' span-2'} aria-labelledby="h-flex">
          <div className="card-head">
            <h2 className="card-title" id="h-flex">Flexible spending by category</h2>
            <span className="faint" style={{ fontSize: 13 }}>Tap a month to select it</span>
          </div>
          <BarChart
            ariaLabel="Flexible spending by category and month"
            data={months.map(m => ({ key: m, label: shortLabel(m), values: stackFor(m) }))}
            colors={series.map(seriesColor)}
            reference={flexBudget > 0 ? { value: flexBudget, label: 'Flexible budget' } : undefined}
            referenceColor={warnZone ? 'var(--coral)' : undefined}
            selectedKey={month}
            onSelect={onSelectMonth}
            tip={d => (
              <>
                {monthLabel(d.key)} · <b>{money0(d.values.reduce((a, b) => a + b, 0))}</b>
                {series.map((id, i) => d.values[i] > 0 ? <div key={id}>{seriesName(id)} <b>{money0(d.values[i])}</b></div> : null)}
              </>
            )}
          />
          <div className="legend">
            {series.map(id => <span key={id}><i style={{ background: seriesColor(id) }} />{seriesName(id)}</span>)}
            {flexBudget > 0 && <span><i className="dash" />Flexible budget {money0(flexBudget)}</span>}
          </div>
          {flexBudget > 0 && (
            <p className="small-print" style={{ marginTop: 10 }}>
              Flexible budget = your {money0(budget)} budget minus about {money0(avgFixed)} of fixed costs a month. Bars above the line are the months you went over.
            </p>
          )}
        </section>

        <section className={spendCard} aria-labelledby="h-usual">
          <div className="card-head">
            <h2 className="card-title" id="h-usual">{monthLabel(month, { year: false })} vs your usual</h2>
            {isCurrent && <span className="faint" style={{ fontSize: 13 }}>Up to day {dayNow}</span>}
          </div>
          {compareIds.length && before.length ? (
            <div className="table-wrap">
              <table className="compare">
                <thead><tr><th>Flexible</th><th>Usual</th><th>{monthLabel(month, { short: true, year: false })}</th><th>±</th></tr></thead>
                <tbody>
                  {compareIds.map(r => {
                    const d = r.now - r.usual;
                    const over = d >= 2000 && d >= r.usual * 0.25;
                    const c = catById.get(r.id);
                    return (
                      <tr key={r.id}>
                        <td><span className="cell-name"><span className="dot" style={{ background: c?.color }} />{c?.name ?? 'Other'}</span></td>
                        <td className="faint">{money0(r.usual)}</td>
                        <td style={over ? { fontWeight: 700, color: warnZone ? 'var(--bad)' : undefined } : undefined}>{money0(r.now)}</td>
                        <td className={Math.abs(d) < 100 ? 'faint' : d > 0 ? 'up' : 'down'}>{Math.abs(d) < 100 ? '—' : `${d > 0 ? '+' : '−'}${money0(Math.abs(d))}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{money0(usualTotal)}</td>
                    <td>{money0(sel.variable)}</td>
                    <td className={sel.variable - usualTotal > 0 ? 'up' : 'down'}>{sel.variable - usualTotal > 0 ? '+' : '−'}{money0(Math.abs(sel.variable - usualTotal))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : <p className="muted" style={{ margin: 0 }}>Once you have a couple of months recorded, this shows where you're above or below your usual.</p>}
          <p className="small-print" style={{ marginTop: 10 }}>Usual = average of the three months before{isCurrent ? ', counted up to the same day' : ''}. Sorted with the biggest overspend first.</p>
        </section>

        <section className="card" aria-labelledby="h-rcat">
          <div className="card-head">
            <h2 className="card-title" id="h-rcat">Where it goes</h2>
            <span className="faint" style={{ fontSize: 13 }}>{range === 'all' ? 'All time' : `Last ${range} months`}</span>
          </div>
          <div className="cat-list">
            {rangeFlexList.map(([id, amt]) => {
              const c = catById.get(id);
              return (
                <div className="cat-row" key={id}>
                  <span className="cat-name"><span className="dot" style={{ background: c?.color }} /><span>{c?.name ?? 'Other'}</span></span>
                  <span className="cat-amt">{money0(amt)}</span>
                  <span className="cat-bar"><i style={{ width: `${(amt / (rangeFlexList[0]?.[1] || 1)) * 100}%`, background: c?.color }} /></span>
                  <span className="cat-meta">
                    <span>{Math.round((amt / Math.max(1, rangeFlexTotal)) * 100)}% of flexible</span>
                    <span>≈ {money(Math.round(amt / nMonths))} / month</span>
                  </span>
                </div>
              );
            })}
            {!rangeFlexList.length && <p className="muted" style={{ margin: 0 }}>No flexible spending in this period.</p>}
          </div>
          {rangeFixedTotal > 0 && (
            <div className="fixed-row" style={{ marginTop: 14 }}>
              <span className="lock" aria-hidden="true"><IconLock /></span>
              <span>Fixed costs, about {money0(rangeFixedTotal / nMonths)} a month</span>
              <span className="num">{money0(rangeFixedTotal)}</span>
            </div>
          )}
        </section>

        <section className={spendCard} aria-labelledby="h-monthly">
          <div className="card-head"><h2 className="card-title" id="h-monthly">Total spending</h2></div>
          <BarChart
            ariaLabel="Total monthly spending"
            height={180}
            data={sums.map(s => ({ key: s.month, label: shortLabel(s.month), values: [s.spent] }))}
            colors={['var(--chart-spend)']}
            colorFor={d => (budget > 0 && d.values[0] >= warnLine ? 'var(--chart-over)' : 'var(--chart-spend)')}
            reference={budget > 0 ? { value: budget, label: 'Budget' } : undefined}
            selectedKey={month}
            onSelect={onSelectMonth}
            tip={d => <>{monthLabel(d.key)}<br /><b>{money0(d.values[0])}</b>{budget > 0 ? ` · ${Math.round((d.values[0] / budget) * 100)}% of budget` : ''}</>}
          />
          <div className="legend">
            <span><i style={{ background: 'var(--chart-spend)' }} />Within budget</span>
            <span><i style={{ background: 'var(--chart-over)' }} />At or over {Math.round(data.settings.warnAt * 100)}% of budget</span>
            {budget > 0 && <span><i className="dash" />Budget {money0(budget)}</span>}
          </div>
        </section>

        <section className="card" aria-labelledby="h-sav">
          <div className="card-head"><h2 className="card-title" id="h-sav">Saved each month</h2></div>
          <BarChart
            ariaLabel="Savings by month"
            height={180}
            data={sums.map(s => ({ key: s.month, label: shortLabel(s.month), values: [s.saved] }))}
            colors={['var(--chart-save)']}
            colorFor={d => (d.values[0] < 0 ? 'var(--chart-over)' : 'var(--chart-save)')}
            selectedKey={month}
            onSelect={onSelectMonth}
            tip={d => {
              const s = sums.find(x => x.month === d.key)!;
              return <>{monthLabel(d.key)}<br />Saved <b>{money0(s.saved)}</b><br />Income {money0(s.income)} · Spent {money0(s.spent)}</>;
            }}
          />
          <p className="small-print" style={{ marginTop: 10 }}>Income minus spending. Months without recorded income show as negative.</p>
        </section>

        {balancePts.length > 0 && (
          <section className="card span-2" aria-labelledby="h-bal">
            <div className="card-head">
              <h2 className="card-title" id="h-bal">Road to your {goalName.toLowerCase()}</h2>
              <span className="faint num" style={{ fontSize: 13 }}>Goal {money0(data.settings.goalTarget)}</span>
            </div>
            <LineChart
              ariaLabel="Estimated balance by month"
              points={balancePts}
              color="var(--sage)"
              goal={{ value: data.settings.goalTarget, label: 'Goal' }}
              tip={p => <>{monthLabel(p.key)}<br />Balance <b>{money0(p.value)}</b></>}
            />
            <p className="small-print" style={{ marginTop: 8 }}>Estimated month-end balance, worked out from the bank balance you entered plus what you recorded since.</p>
            {canBuy && canBuy.maxPrice > 0 && (
              <button className="btn block" style={{ marginTop: 12, justifyContent: 'space-between', textAlign: 'left' }} onClick={onHouse}>
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><IconHouse width={18} height={18} /> What you can buy in {data.settings.city === 'braga' ? 'Braga' : 'Madrid'}</span>
                <span className="num">up to {money0(canBuy.maxPrice)}</span>
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
