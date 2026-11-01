import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Transaction } from './types';
import { useStore } from './store';
import { addMonths, currentMonth, monthLabel } from './util';
import { firstMonth } from './logic';
import { Overview } from './screens/Overview';
import { Transactions } from './screens/Transactions';
import { Insights } from './screens/Insights';
import { SettingsScreen } from './screens/Settings';
import { TxEditor } from './components/TxEditor';
import { BalanceSheet } from './components/Sheets';
import { HouseSheet } from './components/HouseSheet';
import { InvestSheet } from './components/InvestSheet';
import { Logo } from './components/Logo';
import { IconChart, IconChevL, IconChevR, IconGear, IconHome, IconList, IconPlus } from './components/Icons';

type Tab = 'overview' | 'activity' | 'insights' | 'settings';
const TABS: Array<{ id: Tab; label: string; title: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }> = [
  { id: 'overview', label: 'Overview', title: 'Overview', Icon: IconHome },
  { id: 'activity', label: 'Activity', title: 'Activity', Icon: IconList },
  { id: 'insights', label: 'Insights', title: 'Insights', Icon: IconChart },
  { id: 'settings', label: 'Settings', title: 'Settings', Icon: IconGear },
];

const readHash = (): Tab => {
  const h = location.hash.replace('#', '');
  return (TABS.some(t => t.id === h) ? h : 'overview') as Tab;
};

interface Toast { msg: string; undo?: () => void; key: number }

export const App: React.FC = () => {
  const { data, persisted, actions } = useStore();
  const [tab, setTab] = useState<Tab>(readHash);
  const [month, setMonth] = useState(currentMonth());
  const [editor, setEditor] = useState<{ tx?: Transaction } | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [houseOpen, setHouseOpen] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number>();

  // Apply the chosen light palette to the whole page.
  useEffect(() => {
    document.documentElement.dataset.palette = data.settings.palette ?? 'lagoon';
    const meta = document.querySelector('meta[name="theme-color"]');
    const bg = { blush: '#F5CAC3', sage: '#DCE7E3', mist: '#F2F2F7', lagoon: '#FFFFFF' }[data.settings.palette ?? 'lagoon'];
    if (meta && bg) meta.setAttribute('content', bg);
  }, [data.settings.palette]);

  useEffect(() => {
    const on = () => setTab(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = useCallback((t: Tab) => {
    setTab(t);
    try { history.replaceState(null, '', '#' + t); } catch { /* sandboxed frames may refuse */ }
    window.scrollTo({ top: 0 });
  }, []);

  const notify = useCallback((msg: string, undo?: () => void) => {
    window.clearTimeout(toastTimer.current);
    setToast({ msg, undo, key: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 5000 : 2600);
  }, []);

  const minMonth = firstMonth(data) < addMonths(currentMonth(), -24) ? firstMonth(data) : addMonths(currentMonth(), -24);
  const canNext = month < currentMonth();
  const canPrev = month > minMonth;
  const showMonth = tab !== 'settings';
  const title = TABS.find(t => t.id === tab)!.title;

  const openAdd = () => setEditor({});

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Sections">
        <div className="brand"><Logo size={34} /><span>Piggy<small>Saving for a home</small></span></div>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className="side-link" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon /> {label}
          </button>
        ))}
        <button className="side-add" onClick={openAdd}><IconPlus /> Add expense</button>
      </nav>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow brand-eyebrow">{tab === 'overview' && <Logo size={18} />}{tab === 'overview' ? (month === currentMonth() ? 'This month' : 'Looking back') : tab === 'settings' ? 'Piggy' : monthLabel(month)}</div>
            <h1>{tab === 'overview' ? monthLabel(month, { year: month.slice(0, 4) !== currentMonth().slice(0, 4) }) : title}</h1>
          </div>
          {showMonth && (
            <div className="month-switch">
              <button onClick={() => setMonth(addMonths(month, -1))} disabled={!canPrev} aria-label="Previous month"><IconChevL width={16} height={16} /></button>
              <button className="label" style={{ width: 'auto' }} onClick={() => setMonth(currentMonth())} disabled={!canNext} aria-label="Back to this month">
                {month === currentMonth() ? 'Now' : monthLabel(month, { short: true, year: false })}
              </button>
              <button onClick={() => setMonth(addMonths(month, 1))} disabled={!canNext} aria-label="Next month"><IconChevR width={16} height={16} /></button>
            </div>
          )}
        </header>

        {tab === 'overview' && (
          <Overview data={data} month={month} onAdd={openAdd} onEdit={tx => setEditor({ tx })} onGo={go}
            onSetBalance={() => setBalanceOpen(true)}
            onHouse={() => setHouseOpen(true)}
            onCity={c => actions.updateSettings({ city: c })}
            onInvest={() => setInvestOpen(true)}
            onStartFresh={() => { actions.startFresh(); notify('Example data cleared. Add your first expense with +'); }} />
        )}
        {tab === 'activity' && <Transactions data={data} month={month} onEdit={tx => setEditor({ tx })} onAdd={openAdd} onSelectMonth={setMonth} />}
        {tab === 'insights' && <Insights data={data} month={month} onSelectMonth={setMonth} onHouse={() => setHouseOpen(true)} />}
        {tab === 'settings' && <SettingsScreen data={data} actions={actions} persisted={persisted} notify={notify} onSetBalance={() => setBalanceOpen(true)} onHouse={() => setHouseOpen(true)} onInvest={() => setInvestOpen(true)} />}
      </main>

      <nav className="tabbar" aria-label="Sections">
        <div className="tabbar-inner">
          {TABS.slice(0, 2).map(({ id, label, Icon }) => (
            <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}><Icon />{label}</button>
          ))}
          <button className="add-btn" onClick={openAdd} aria-label="Add expense or income"><IconPlus /></button>
          {TABS.slice(2).map(({ id, label, Icon }) => (
            <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}><Icon />{label}</button>
          ))}
        </div>
      </nav>

      {editor && (
        <TxEditor
          data={data}
          editing={editor.tx}
          onClose={() => setEditor(null)}
          onCreateCategory={actions.saveCategory}
          onSave={(draft, repeat) => {
            if (editor.tx) {
              actions.updateTransaction(editor.tx.id, draft);
              notify('Saved');
            } else {
              actions.addTransaction(draft, repeat);
              notify(repeat ? 'Added. It will repeat every month' : draft.type === 'income' ? 'Income added' : 'Expense added');
              if (!draft.date.startsWith(month)) setMonth(draft.date.slice(0, 7));
            }
            setEditor(null);
          }}
          onDelete={editor.tx ? () => {
            const tx = editor.tx!;
            actions.deleteTransaction(tx.id);
            setEditor(null);
            notify('Deleted', () => actions.restoreTransaction(tx));
          } : undefined}
        />
      )}

      {balanceOpen && (
        <BalanceSheet data={data} onClose={() => setBalanceOpen(false)}
          onSave={(date, cents) => { actions.addBalance({ date, amount: cents }); setBalanceOpen(false); notify('Balance updated'); }} />
      )}

      {investOpen && (
        <InvestSheet invest={data.settings.invest} onClose={() => setInvestOpen(false)}
          onSave={inv => { actions.updateSettings({ invest: inv }); setInvestOpen(false); notify(inv ? 'Investments updated' : 'Investments removed'); }} />
      )}

      {houseOpen && (
        <HouseSheet data={data} onClose={() => setHouseOpen(false)}
          onUpdateSettings={patch => { actions.updateSettings(patch); if (patch.goalTarget) notify('Goal updated'); }} />
      )}

      {toast && (
        <div className="toast" role="status" key={toast.key}>
          <span>{toast.msg}</span>
          {toast.undo && <button onClick={() => { toast.undo!(); setToast(null); }}>Undo</button>}
        </div>
      )}
    </div>
  );
};
