import React from 'react';
import type { AppData, Transaction } from '../types';
import { daysOfSaving, projectGoal, summarize } from '../logic';
import { affordability, areasFor } from '../house';
import { MARKETS } from '../market';
import type { City } from '../types';
import { Segmented } from '../components/Sheet';
import { addMonths, currentMonth, daysInMonth, money, money0, monthLabel, today } from '../util';
import { IconAlert, IconArrowDown, IconArrowUp, IconHouse, IconLock } from '../components/Icons';
import { TxRow } from './Transactions';
import { investedToday, projectInvestments } from '../invest';

interface Props {
  data: AppData;
  month: string;
  onAdd: () => void;
  onEdit: (t: Transaction) => void;
  onGo: (tab: 'activity' | 'insights' | 'settings') => void;
  onSetBalance: () => void;
  onHouse: () => void;
  onCity: (c: City) => void;
  onInvest: () => void;
  onStartFresh: () => void;
}

/** "€1,234.56" split so the cents can be set smaller. */
const BigMoney: React.FC<{ cents: number }> = ({ cents }) => {
  const s = money(cents);
  const i = s.lastIndexOf('.');
  return <span className="hero-amount">{s.slice(0, i)}<span className="cents">{s.slice(i)}</span></span>;
};

/** Spending deltas: up is red, down is green. Savings deltas: the reverse. */
export const Delta: React.FC<{ now: number; before: number; goodWhen: 'down' | 'up'; suffix?: string }> = ({ now, before, goodWhen, suffix }) => {
  const diff = now - before;
  if (before === 0 && now === 0) return null;
  if (Math.abs(diff) < 100) return <span className="delta neutral">Same as {suffix ?? 'last month'}</span>;
  const good = goodWhen === 'down' ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? IconArrowUp : IconArrowDown;
  return (
    <span className={'delta ' + (good ? 'down-good' : 'up-bad')}>
      <Icon width={12} height={12} />
      {money0(Math.abs(diff))} {diff > 0 ? 'more' : 'less'} than {suffix ?? 'last month'}
    </span>
  );
};

export const Overview: React.FC<Props> = ({ data, month, onAdd, onEdit, onGo, onSetBalance, onHouse, onCity, onInvest, onStartFresh }) => {
  const { settings } = data;
  const isCurrent = month === currentMonth();
  const days = daysInMonth(month);
  const dayNow = isCurrent ? Number(today().slice(8, 10)) : days;
  const prevMonth = addMonths(month, -1);
  const s = summarize(data.transactions, month);
  const prevFull = summarize(data.transactions, prevMonth);
  // Compare like with like: the current month so far vs the previous month up to the same day.
  const prevSame = isCurrent ? summarize(data.transactions, prevMonth, dayNow) : prevFull;

  const budget = settings.monthlyBudget;
  const remaining = budget - s.spent;
  const usage = budget > 0 ? s.spent / budget : 0;
  const pace = dayNow / days;
  const daysLeft = days - dayNow + 1;
  const goal = projectGoal(data);
  const canBuy = goal ? affordability(goal.saved, data) : null;
  const cityName = MARKETS[settings.city].name;
  const inv = settings.invest;
  const invProj = inv ? projectInvestments(inv) : null;
  const cityAvg = canBuy ? areasFor(canBuy.maxPrice, settings.city)[0] : null;

  let nudge: { tone: 'warn' | 'bad' | 'info'; title: string; body: string } | null = null;
  if (budget > 0 && s.spent > 0) {
    const goalName = settings.goalName.toLowerCase();
    if (usage >= 1) {
      const over = s.spent - budget;
      const d = daysOfSaving(over, goal?.monthlyPace ?? null);
      nudge = {
        tone: 'bad',
        title: `${money0(over)} over budget`,
        body: d
          ? `At your usual pace, that's about ${d} ${d === 1 ? 'day' : 'days'} of saving for your ${goalName}.`
          : `Every euro over budget comes out of your ${goalName}.`,
      };
    } else if (usage >= settings.warnAt) {
      nudge = {
        tone: 'warn',
        title: `${Math.round(usage * 100)}% of your budget used`,
        body: isCurrent
          ? `${money0(remaining)} left for ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}. Staying under keeps your ${goalName} on schedule${goal?.eta ? ` for ${monthLabel(goal.eta)}` : ''}.`
          : `${money0(remaining)} was left at the end of the month.`,
      };
    } else if (isCurrent && s.spent > budget * pace * 1.12 && dayNow > 3) {
      nudge = {
        tone: 'info',
        title: 'Spending a little ahead of plan',
        body: `By today you'd normally be at ${money0(budget * pace)}. Slowing down now protects your ${goalName}.`,
      };
    }
  }

  // Flexible (variable) categories first: that's where choices make a difference.
  const flex = [...s.byVariable.entries()].sort((a, b) => b[1] - a[1]);
  const flexMax = flex[0]?.[1] ?? 1;
  const catById = new Map(data.categories.map(c => [c.id, c]));
  const fixedNames = [...s.byFixed.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => catById.get(id)?.name ?? 'Other');
  const recent = data.transactions
    .filter(t => t.date.startsWith(month))
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="screen">
      {data.demo && (
        <div className="demo-banner">
          <p><b>You're looking at example data.</b> Explore freely. When you're ready, clear it and add your own.</p>
          <button className="btn small primary" onClick={onStartFresh}>Start with my data</button>
        </div>
      )}

      <div className="grid-2">
        {nudge && (
          <div className={'nudge span-2 ' + nudge.tone} role="status">
            {nudge.tone === 'info' ? <IconHouse /> : <IconAlert />}
            <div>
              <strong>{nudge.title}</strong>
              <p>{nudge.body}</p>
            </div>
          </div>
        )}

        {/* Budget */}
        <section className="card" aria-labelledby="h-spent">
          <div className="card-head">
            <h2 className="card-title" id="h-spent">Spent {isCurrent ? 'this month' : `in ${monthLabel(month, { year: false })}`}</h2>
            <button className="card-link" onClick={() => onGo('settings')}>Budget {money0(budget)}</button>
          </div>
          <BigMoney cents={s.spent} />
          {budget > 0 && (
            <>
              <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usage * 100)} aria-label="Budget used">
                <div className={'meter-fill' + (usage >= 1 ? ' bad' : usage >= settings.warnAt ? ' warn' : '')} style={{ width: `${Math.min(100, usage * 100)}%` }} />
              </div>
              <div className="meter-legend">
                <span>{Math.round(usage * 100)}% used</span>
                {isCurrent && <span>{daysLeft - 1} {daysLeft - 1 === 1 ? 'day' : 'days'} left</span>}
              </div>
            </>
          )}
          <div style={{ marginTop: 14 }}>
            <Delta now={s.spent} before={prevSame.spent} goodWhen="down"
              suffix={isCurrent ? `${monthLabel(prevMonth, { year: false })} by this day` : monthLabel(prevMonth, { year: false })} />
          </div>
        </section>

        {/* Savings */}
        <section className="card" aria-labelledby="h-saved">
          <div className="card-head">
            <h2 className="card-title" id="h-saved">Saved {isCurrent ? 'this month' : `in ${monthLabel(month, { year: false })}`}</h2>
          </div>
          {s.income > 0 ? (
            <>
              <div className="goal-amount" style={{ color: s.saved < 0 ? 'var(--bad)' : 'var(--fg)' }}>
                {s.saved < 0 ? '−' : ''}{money0(Math.abs(s.saved))}
              </div>
              <div className="hero-sub">{s.saved >= 0 ? `${Math.round((s.saved / s.income) * 100)}% of income kept` : 'Spending is above income'}{isCurrent ? ' so far' : ''}</div>
              <div style={{ marginTop: 14 }}>
                <Delta now={s.saved} before={prevSame.saved} goodWhen="up"
                  suffix={isCurrent ? `${monthLabel(prevMonth, { year: false })} by this day` : monthLabel(prevMonth, { year: false })} />
              </div>
            </>
          ) : (
            <div>
              <p className="muted" style={{ margin: '0 0 12px', fontSize: 14.5 }}>Add your income for {monthLabel(month, { year: false })} to see what you saved. Mark your salary as monthly and it fills itself in.</p>
              <button className="btn small primary" onClick={onAdd}>Add income</button>
            </div>
          )}
        </section>

        {/* Goal */}
        <section className="card" aria-labelledby="h-goal">
          <div className="card-head">
            <h2 className="card-title" id="h-goal">{settings.goalName}</h2>
            <button className="card-link" onClick={onSetBalance}>Update balance</button>
          </div>
          {goal ? (
            <>
              <div className="goal-top">
                <div className="goal-amount">{money0(goal.saved)}</div>
                <div className="goal-pct">{Math.floor(goal.progress * 100)}%</div>
              </div>
              <div className="goal-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(goal.progress * 100)} aria-label={`${settings.goalName} progress`}>
                <div className="goal-fill" style={{ width: `${goal.progress * 100}%` }} />
                <div className="goal-ticks"><i /><i /><i /></div>
              </div>
              <div className="goal-meta">
                <span>of <b className="num">{money0(goal.target)}</b> · <b className="num">{money0(goal.remaining)}</b> to go</span>
                {goal.remaining === 0
                  ? <span>You've reached it. Time to look at flats.</span>
                  : goal.eta
                    ? <span>At {money0(goal.monthlyPace ?? 0)} a month you'll get there around <b>{monthLabel(goal.eta)}</b>.</span>
                    : <span>Save a little each month to see when you'll get there.</span>}
              </div>
              {inv && (
                <button className="invest-line" onClick={onInvest}>
                  <span>Plus <b className="num">{money0(investedToday(inv))}</b> invested for the long term</span>
                  <span className="pill">Not counted</span>
                </button>
              )}
              <div className="goal-home">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span className="eyebrow">What it buys today</span>
                  <div style={{ width: 150 }}>
                    <Segmented value={settings.city} onChange={onCity} label="City"
                      options={[{ value: 'braga', label: 'Braga' }, { value: 'madrid', label: 'Madrid' }]} />
                  </div>
                </div>
                <button className="link-btn" style={{ textAlign: 'left', color: 'inherit', fontWeight: 400 }} onClick={onHouse}>
                  <span className="gh-top"><span>A home in {cityName} up to</span><b>{money0(canBuy?.maxPrice ?? 0)}</b></span>
                  {cityAvg && !cityAvg.small && (
                    <span className="gh-sub">About <b>{cityAvg.m2Max} m²</b> at {cityAvg.name.includes('average') ? 'the city average price' : `${cityAvg.name} prices`}, a {cityAvg.type}</span>
                  )}
                  {cityAvg && cityAvg.small && <span className="gh-sub">Not yet enough for a realistic home at average prices</span>}
                  <span className="gh-sub" style={{ color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>See details, taxes and areas</span>
                </button>
              </div>
            </>
          ) : (
            <div>
              <p className="muted" style={{ margin: '0 0 12px', fontSize: 14.5 }}>
                Enter what you have in the bank today. The app then adds what you save each month, so you can watch the {money0(settings.goalTarget)} come closer.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn small primary" onClick={onSetBalance}>Add bank balance</button>
                <button className="btn small" onClick={onHouse}>What can I buy?</button>
              </div>
            </div>
          )}
        </section>

        {/* Long-term investments */}
        {inv && invProj ? (
          <section className="card" aria-labelledby="h-inv">
            <div className="card-head">
              <h2 className="card-title" id="h-inv">{inv.name}</h2>
              <button className="card-link" onClick={onInvest}>Update</button>
            </div>
            <div className="goal-amount">{money0(investedToday(inv))}</div>
            <div className="hero-sub">{inv.monthly > 0 ? `+${money0(inv.monthly)} a month · ` : ''}kept apart from your house deposit</div>
            <div className="goal-home" style={{ marginTop: 14 }}>
              <span className="gh-top"><span>At {inv.targetAge}, growing {Math.round(inv.rate * 100)}% a year</span><b>{money0(invProj.final.value)}</b></span>
              <span className="gh-sub">In today's euros, in {inv.targetAge - invProj.age} years. You'd have paid in {money0(invProj.final.paidIn)}.</span>
            </div>
          </section>
        ) : null}

        {/* Flexible spending by category */}
        <section className="card" aria-labelledby="h-cats">
          <div className="card-head">
            <h2 className="card-title" id="h-cats">Flexible spending</h2>
            <button className="card-link" onClick={() => onGo('insights')}>Insights</button>
          </div>
          {flex.length ? (
            <div className="cat-list">
              {flex.slice(0, 6).map(([id, amt]) => {
                const c = catById.get(id);
                const before = prevSame.byVariable.get(id) ?? 0;
                const diff = amt - before;
                return (
                  <div className="cat-row" key={id}>
                    <span className="cat-name"><span className="dot" style={{ background: c?.color }} /><span>{c?.name ?? 'Other'}</span></span>
                    <span className="cat-amt">{money0(amt)}</span>
                    <span className="cat-bar"><i style={{ width: `${(amt / flexMax) * 100}%`, background: c?.color }} /></span>
                    <span className="cat-meta">
                      <span>{Math.round((amt / Math.max(1, s.variable)) * 100)}% of flexible</span>
                      {Math.abs(diff) >= 100 && <span className={diff > 0 ? 'up' : 'down'}>{diff > 0 ? '+' : '−'}{money0(Math.abs(diff))} vs {monthLabel(prevMonth, { short: true, year: false })}</span>}
                    </span>
                  </div>
                );
              })}
              {flex.length > 6 && <p className="small-print">+ {flex.length - 6} more in Insights</p>}
            </div>
          ) : <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>No flexible spending recorded for {monthLabel(month, { year: false })} yet.</p>}
          {s.fixed > 0 && (
            <div className="fixed-row">
              <span className="lock" aria-hidden="true"><IconLock /></span>
              <span>Fixed costs · {fixedNames.slice(0, 3).join(', ')}{fixedNames.length > 3 ? '…' : ''}</span>
              <span className="num">{money0(s.fixed)}</span>
            </div>
          )}
        </section>


        {/* Recent */}
        <section className="span-2" aria-labelledby="h-recent" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="card-head" style={{ margin: '4px 4px 0' }}>
            <h2 className="card-title" id="h-recent">Recent</h2>
            <button className="card-link" onClick={() => onGo('activity')}>See all</button>
          </div>
          {recent.length ? (
            <div className="list">
              {recent.map(t => <TxRow key={t.id} tx={t} cat={catById.get(t.categoryId)} onClick={() => onEdit(t)} showDate />)}
            </div>
          ) : (
            <div className="list empty">
              <strong>Nothing here yet</strong>
              <p>Add your first expense. It takes about five seconds.</p>
              <button className="btn primary small" onClick={onAdd}>Add expense</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
