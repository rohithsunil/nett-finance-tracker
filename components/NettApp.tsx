'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft, ArrowUpRight, Bell, BriefcaseBusiness, CalendarClock, Check, ChevronDown,
  CircleHelp, CirclePlus, CreditCard, Download, Eye, EyeOff, FileSpreadsheet, Filter, Gauge,
  GitCommitHorizontal, Home, Landmark, LayoutGrid, LineChart, ListFilter, LockKeyhole, LogIn, Menu, MoreHorizontal,
  MoveRight, Plus, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Target, TrendingDown,
  TrendingUp, Upload, Wallet, X, Zap,
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { calculateMetrics, debtProgress, displayAmount, formatCurrency, formatShortDate, isStale } from '@/lib/finance';
import { emptyData } from '@/lib/empty-data';
import { APP_VERSION } from '@/lib/app-meta';
import type { Account, Commitment, Debt, Investment, NettData, Receivable, Theme, Transaction } from '@/lib/types';

type Tab = 'home' | 'accounts' | 'activity' | 'plan' | 'more';
type Modal = 'account' | 'transaction' | 'checkin' | 'whatif' | 'commitment' | 'debt' | 'receivable' | 'investment' | 'import' | null;

const navItems: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
  { id: 'activity', label: 'Activity', icon: ListFilter },
  { id: 'plan', label: 'Plan', icon: Target },
  { id: 'more', label: 'More', icon: LayoutGrid },
];

const todayText = new Intl.DateTimeFormat('en-AE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const timeText = (value: string) => new Intl.DateTimeFormat('en-AE', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const displayName = (name: string | null | undefined) => (name || 'Rohith').split(' ')[0];

function IconForTransaction({ type }: { type: string }) {
  if (type === 'credit') return <ArrowDownLeft size={16} />;
  if (type === 'transfer') return <MoveRight size={16} />;
  if (type === 'debt_repayment') return <TrendingDown size={16} />;
  return <ArrowUpRight size={16} />;
}

function MetricCard({ label, value, note, icon, accent }: { label: string; value: number; note: string; icon: React.ReactNode; accent?: string }) {
  return <div className="card stat-card">
    <div className="stat-top"><span>{label}</span><span className="stat-icon" style={accent ? { color: accent, background: `${accent}14` } : undefined}>{icon}</span></div>
    <div className="stat-value">{formatCurrency(value)}</div><div className="stat-note">{note}</div>
  </div>;
}

function AccountCard({ account, displayCurrency, rates }: { account: Account; displayCurrency: string; rates: NettData['fxRates'] }) {
  const amount = Number(account.estimated_balance ?? account.verified_balance);
  const converted = displayAmount(amount, account.currency, displayCurrency, rates);
  return <div className={`account-card ${account.workspace_id === 'studio' ? 'business' : ''}`}>
    <div className="account-type"><span>{account.currency}</span><span>{account.type.replace('_', ' ')}</span></div>
    <div className="account-name">{account.name}</div>
    <div className="account-amount">{formatCurrency(amount, account.currency, true)}</div>
    <div className="account-converted">≈ {formatCurrency(converted, displayCurrency)} · {isStale(account.balance_verified_at, 31) ? 'Needs update' : 'Verified'}</div>
  </div>;
}

function ActivityRow({ transaction, displayCurrency, rates }: { transaction: Transaction; displayCurrency: string; rates: NettData['fxRates'] }) {
  const credit = transaction.type === 'credit';
  const converted = displayAmount(Number(transaction.amount), transaction.currency, displayCurrency, rates);
  return <div className="activity-row">
    <div className="activity-avatar"><IconForTransaction type={transaction.type} /></div>
    <div className="activity-main"><div className="activity-name">{transaction.category || transaction.type.replace('_', ' ')}</div><div className="activity-desc">{transaction.description || 'Selective entry'} · {transaction.currency}</div></div>
    <div className="activity-right"><div className={`activity-amount ${credit ? 'credit' : ''}`}>{credit ? '+' : '-'}{formatCurrency(Number(transaction.amount), transaction.currency, true)}</div><div className="activity-time">{formatShortDate(transaction.occurred_at)} · {formatCurrency(converted, displayCurrency, true)}</div></div>
  </div>;
}

export default function NettApp() {
  const [tab, setTab] = useState<Tab>('home');
  const [modal, setModal] = useState<Modal>(null);
  const [data, setData] = useState<NettData>(emptyData);
  const [session, setSession] = useState<{ userId: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [workspace, setWorkspace] = useState('everything');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState<Theme>('light');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [whatIf, setWhatIf] = useState('7000');
  const [whatIfResult, setWhatIfResult] = useState<number | null>(null);

  const displayCurrency = data.profile.display_currency;
  const scoped = (workspace === 'everything' ? data : {
    ...data,
    accounts: data.accounts.filter((item) => item.workspace_id === workspace),
    debts: data.debts.filter((item) => item.workspace_id === workspace),
    receivables: data.receivables.filter((item) => item.workspace_id === workspace),
    investments: data.investments.filter((item) => item.workspace_id === workspace),
    commitments: data.commitments.filter((item) => item.workspace_id === workspace),
    reserves: data.reserves.filter((item) => item.workspace_id === workspace),
    transactions: data.transactions.filter((item) => item.workspace_id === workspace),
  });
  const metrics = useMemo(() => calculateMetrics(scoped.accounts, scoped.debts, scoped.receivables, scoped.investments, scoped.commitments, scoped.reserves, displayCurrency, data.fxRates), [scoped.accounts, scoped.debts, scoped.receivables, scoped.investments, scoped.commitments, scoped.reserves, displayCurrency, data.fxRates]);
  const staleAccounts = scoped.accounts.filter((item) => isStale(item.balance_verified_at, data.profile.freshness_days)).length;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) { setLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: auth }) => {
      if (!mounted) return;
      if (!auth.session) { window.location.href = '/login?mode=signup'; return; }
      setSession({ userId: auth.session.user.id, email: auth.session.user.email });
      const userId = auth.session.user.id;
      const [profile, workspaces, accounts, debts, receivables, investments, commitments, reserves, transactions] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('workspaces').select('*').eq('user_id', userId).eq('archived', false).order('created_at'),
        supabase.from('accounts').select('*').eq('user_id', userId).eq('archived', false).order('sort_order'),
        supabase.from('debts').select('*').eq('user_id', userId).neq('status', 'archived').order('created_at'),
        supabase.from('receivables').select('*').eq('user_id', userId).neq('status', 'archived').order('created_at', { ascending: false }),
        supabase.from('investments').select('*').eq('user_id', userId).eq('archived', false).order('created_at'),
        supabase.from('commitments').select('*').eq('user_id', userId).neq('status', 'archived').order('due_date'),
        supabase.from('reserves').select('*').eq('user_id', userId).order('due_date'),
        supabase.from('transactions').select('*').eq('user_id', userId).order('occurred_at', { ascending: false }).limit(100),
      ]);
      if (!mounted) return;
      setData((current) => ({ ...current, profile: { ...current.profile, ...(profile.data || {}), id: userId }, workspaces: workspaces.data || [], accounts: accounts.data || [], debts: debts.data || [], receivables: receivables.data || [], investments: investments.data || [], commitments: commitments.data || [], reserves: reserves.data || [], transactions: transactions.data || [] }));
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, auth) => setSession(auth ? { userId: auth.user.id, email: auth.user.email } : null));
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer); }, [toast]);

  function notify(message: string) { setToast(message); }

  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (supabase) await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function createAccount(form: HTMLFormElement) {
    const formData = new FormData(form);
    const item: Account = { id: crypto.randomUUID(), workspace_id: String(formData.get('workspace_id')), name: String(formData.get('name')), type: String(formData.get('type')), currency: String(formData.get('currency')), verified_balance: Number(formData.get('balance')), estimated_balance: Number(formData.get('balance')), balance_verified_at: new Date().toISOString(), include_net_worth: true, include_liquidity: true };
    setData((current) => ({ ...current, accounts: [...current.accounts, item] }));
    const supabase = getSupabaseBrowser();
    if (supabase && session) await supabase.from('accounts').insert({ user_id: session.userId, workspace_id: item.workspace_id, name: item.name, type: item.type, currency: item.currency, verified_balance: item.verified_balance, estimated_balance: item.estimated_balance, balance_verified_at: item.balance_verified_at });
    setModal(null); notify(`${item.name} added to Nett.`);
  }

  async function importAccounts(items: Account[]) {
    const supabase = getSupabaseBrowser();
    if (supabase && session) {
      const { error } = await supabase.from('accounts').insert(items.map((item) => ({ id: item.id, user_id: session.userId, workspace_id: item.workspace_id, name: item.name, type: item.type, currency: item.currency, verified_balance: item.verified_balance, estimated_balance: item.estimated_balance, balance_verified_at: item.balance_verified_at, include_net_worth: item.include_net_worth, include_liquidity: item.include_liquidity })));
      if (error) { notify(`Import failed: ${error.message}`); return; }
    }
    setData((current) => ({ ...current, accounts: [...current.accounts, ...items] }));
    setModal(null); notify(`${items.length} account${items.length === 1 ? '' : 's'} imported and saved.`);
  }

  async function createTransaction(form: HTMLFormElement) {
    const formData = new FormData(form);
    const accountId = String(formData.get('account_id'));
    const account = data.accounts.find((item) => item.id === accountId);
    const item: Transaction = { id: crypto.randomUUID(), workspace_id: account?.workspace_id || 'personal', account_id: accountId, type: String(formData.get('type')) as Transaction['type'], amount: Number(formData.get('amount')), currency: String(formData.get('currency')), category: String(formData.get('category')), description: String(formData.get('description')), occurred_at: new Date().toISOString() };
    setData((current) => ({ ...current, transactions: [item, ...current.transactions], accounts: current.accounts.map((accountItem) => accountItem.id === accountId ? { ...accountItem, estimated_balance: Number(accountItem.estimated_balance ?? accountItem.verified_balance) + (item.type === 'credit' ? item.amount as number : -(item.amount as number)) } : accountItem) }));
    const supabase = getSupabaseBrowser();
    if (supabase && session) await supabase.from('transactions').insert({ user_id: session.userId, ...item });
    setModal(null); notify('Activity saved. Your balance is now estimated until the next check-in.');
  }

  async function createCommitment(form: HTMLFormElement) {
    const values = new FormData(form);
    const item: Commitment = { id: crypto.randomUUID(), workspace_id: String(values.get('workspace_id')), name: String(values.get('name')), amount: Number(values.get('amount')), currency: String(values.get('currency')), due_date: String(values.get('due_date')), recurrence: String(values.get('recurrence')), importance: String(values.get('importance')) as Commitment['importance'], status: 'open' };
    setData((current) => ({ ...current, commitments: [...current.commitments, item].sort((a, b) => a.due_date.localeCompare(b.due_date)) }));
    const supabase = getSupabaseBrowser();
    if (supabase && session) await supabase.from('commitments').insert({ user_id: session.userId, ...item });
    setModal(null); notify(`${item.name} added to your future timeline.`);
  }

  async function createDebtEvent(form: HTMLFormElement) {
    const values = new FormData(form); const debtId = String(values.get('debt_id')); const eventType = String(values.get('event_type')) as 'borrowing' | 'repayment'; const amount = Number(values.get('amount')); const target = data.debts.find((item) => item.id === debtId); if (!target || amount <= 0) return;
    const outstanding = Math.max(0, Number(target.outstanding) + (eventType === 'borrowing' ? amount : -amount));
    setData((current) => ({ ...current, debts: current.debts.map((item) => item.id === debtId ? { ...item, outstanding } : item) }));
    const supabase = getSupabaseBrowser();
    if (supabase && session) await supabase.from('debt_events').insert({ user_id: session.userId, debt_id: debtId, event_type: eventType, amount, currency: target.currency, note: String(values.get('note') || '') });
    setModal(null); notify(eventType === 'repayment' ? 'Repayment recorded and debt progress updated.' : 'Additional borrowing recorded.');
  }

  async function createReceivable(form: HTMLFormElement) {
    const values = new FormData(form); const item: Receivable = { id: crypto.randomUUID(), workspace_id: String(values.get('workspace_id')), contact_name: String(values.get('contact_name')), amount: Number(values.get('amount')), outstanding: Number(values.get('amount')), currency: String(values.get('currency')), expected_on: String(values.get('expected_on') || ''), confidence: String(values.get('confidence')) as Receivable['confidence'], include_in_net_worth: false, status: 'open' };
    setData((current) => ({ ...current, receivables: [item, ...current.receivables] }));
    const supabase = getSupabaseBrowser();
    if (supabase && session) await supabase.from('receivables').insert({ user_id: session.userId, ...item });
    setModal(null); notify(`${item.contact_name} was added as a receivable.`);
  }

  async function createInvestment(form: HTMLFormElement) {
    const values = new FormData(form); const item: Investment = { id: crypto.randomUUID(), workspace_id: String(values.get('workspace_id')), symbol: String(values.get('symbol')).toUpperCase(), exchange: String(values.get('exchange')), name: String(values.get('name')), quantity: Number(values.get('quantity')), holding_currency: String(values.get('currency')), average_cost: Number(values.get('average_cost')), liquid: Boolean(values.get('liquid')), latest_value: Number(values.get('value')), latest_value_at: new Date().toISOString() };
    setData((current) => ({ ...current, investments: [...current.investments, item] }));
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { data: created } = await supabase.from('investments').insert({ id: item.id, user_id: session.userId, workspace_id: item.workspace_id, symbol: item.symbol, exchange: item.exchange, name: item.name, quantity: item.quantity, holding_currency: item.holding_currency, average_cost: item.average_cost, liquid: item.liquid }).select('id').single(); if (created) await supabase.from('investment_values').insert({ user_id: session.userId, investment_id: created.id, value: item.latest_value, currency: item.holding_currency, source: 'manual' }); }
    setModal(null); notify(`${item.symbol} was added to your portfolio.`);
  }

  async function saveCheckin(balances: Record<string, number>) {
    const verifiedAt = new Date().toISOString(); const nextAccounts = data.accounts.map((account) => balances[account.id] === undefined ? account : { ...account, verified_balance: balances[account.id], estimated_balance: balances[account.id], balance_verified_at: verifiedAt });
    setData((current) => ({ ...current, accounts: nextAccounts }));
    const supabase = getSupabaseBrowser();
    if (supabase && session) {
      await Promise.all(nextAccounts.filter((account) => balances[account.id] !== undefined).map((account) => supabase.from('accounts').update({ verified_balance: account.verified_balance, estimated_balance: account.estimated_balance, balance_verified_at: verifiedAt }).eq('id', account.id).eq('user_id', session.userId)));
      const nextMetrics = calculateMetrics(nextAccounts, data.debts, data.receivables, data.investments, data.commitments, data.reserves, displayCurrency, data.fxRates);
      await supabase.from('snapshots').insert({ user_id: session.userId, label: `Check-in ${new Date().toLocaleDateString('en-AE', { month: 'short', year: 'numeric' })}`, display_currency: displayCurrency, primary_net_worth: nextMetrics.primaryNetWorth, all_debt_net_worth: nextMetrics.allDebtNetWorth, liquid_cash: nextMetrics.liquidCash, safe_to_spend: nextMetrics.safeToSpend, payload: { account_balances: balances } });
    }
    setModal(null); notify('Check-in complete. Your numbers are fresh again.');
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ ...data, exported_at: new Date().toISOString(), schema_version: '1.0' }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `nett-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); notify('Your portable JSON backup is ready.');
  }

  function exportCsv() {
    const rows = [['date', 'type', 'category', 'description', 'amount', 'currency'], ...data.transactions.map((item) => [item.occurred_at, item.type, item.category || '', item.description || '', String(item.amount), item.currency])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const link = document.createElement('a'); link.href = url; link.download = `nett-activity-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); notify('Your activity CSV is ready.');
  }

  function enableNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { notify('Push is not available in this browser. Install Nett to your Home Screen on iOS.'); return; }
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) { notify('Push is wired for production; add the VAPID public key to enable local delivery.'); return; }
    navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return notify('Notifications remain off until you allow them.');
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
      setPushEnabled(true);
      const supabase = getSupabaseBrowser();
      if (supabase && session) await supabase.from('notification_subscriptions').upsert({ user_id: session.userId, endpoint: subscription.endpoint, subscription: subscription.toJSON(), platform: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios-web' : 'android-web' }, { onConflict: 'user_id,endpoint' });
      notify('Nett can now send reminders to your notification centre.');
    }).catch(() => notify('Could not enable notifications yet. Try again after installing Nett.'));
  }

  function runWhatIf() { setWhatIfResult(metrics.safeToSpend - Number(whatIf || 0)); }

  if (loading) return <LoadingState />;

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  return <div className="app-shell">
    <aside className="desktop-sidebar">
      <div className="brand"><div className="brand-mark">n<span>•</span></div><div className="brand-name">nett</div><div className="brand-sub">v1.0</div></div>
      <Link href="/changelog" className="version-link"><GitCommitHorizontal size={13} /> v{APP_VERSION} · release notes</Link>
      <div className="nav-section-label">Your money</div>
      <nav className="nav-list">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-button ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}><Icon size={17} strokeWidth={tab === id ? 2.2 : 1.8} /><span className="nav-caption">{label}</span>{id === 'plan' && <span style={{ marginLeft: 'auto', color: '#bd7dd7', fontSize: 10 }}>2</span>}</button>)}</nav>
      <button className="nav-button" onClick={signOut}><LogIn size={17} /><span className="nav-caption">Sign out</span></button>
      <div className="nav-section-label" style={{ marginTop: 25 }}>Context</div>
      <div className="workspace-switcher"><div className="small-label"><span>Workspace</span><ChevronDown size={13} /></div><div className="workspace-name"><span className="workspace-dot" />{workspace === 'everything' ? 'Everything' : data.workspaces.find((item) => item.id === workspace)?.name || 'Personal'}</div></div>
      <select value={workspace} onChange={(event) => setWorkspace(event.target.value)} aria-label="Workspace filter" style={{ fontSize: 11, padding: '9px 10px', margin: '0 3px', width: 'calc(100% - 6px)' }}><option value="everything">Everything</option>{data.workspaces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      <div className="sidebar-spacer" />
      <button className="nav-button" onClick={() => setTab('more')}><Settings2 size={17} /><span className="nav-caption">Settings</span></button>
      {session ? <div className="user-chip"><div className="avatar">{displayName(data.profile.full_name).slice(0, 1)}</div><div><strong style={{ color: 'var(--ink)', fontSize: 12 }}>{displayName(data.profile.full_name)}</strong><div style={{ fontSize: 10 }}>{session.email || 'Private account'}</div></div></div> : <button className="nav-button" onClick={() => window.location.href = '/login'}><LogIn size={17} /><span className="nav-caption">Sign in</span></button>}
    </aside>
    <main className="main">
      <header className="topbar"><div><h1>{tab === 'home' ? `${greeting}, ${displayName(data.profile.full_name)}.` : navItems.find((item) => item.id === tab)?.label}</h1><p>{tab === 'home' ? `${todayText} · ${workspace === 'everything' ? 'Everything' : data.workspaces.find((item) => item.id === workspace)?.name}` : 'A clearer view of what you have, owe and plan.'}</p></div><div className="top-actions"><button className="soft-button" onClick={() => setModal('checkin')}><RefreshCw size={15} /> Update everything</button><button className="icon-button" aria-label="Notifications" onClick={enableNotifications}><Bell size={17} /></button><button className="icon-button" aria-label="Search" onClick={() => setTab('activity')}><Search size={17} /></button></div></header>
      {!session && <div className="demo-bar"><span><span className="demo-dot" /> Demo mode · your private Supabase account is not signed in</span><button className="soft-button" onClick={() => window.location.href = '/login'}><LogIn size={13} /> Sign in to save</button></div>}
      {tab === 'home' && <HomeView data={scoped} metrics={metrics} hidden={hidden} setHidden={setHidden} staleAccounts={staleAccounts} onQuick={(next) => setModal(next)} workspace={workspace} displayCurrency={displayCurrency} notify={notify} />}
      {tab === 'accounts' && <AccountsView data={scoped} displayCurrency={displayCurrency} onQuick={(next) => setModal(next)} />}
      {tab === 'activity' && <ActivityView data={scoped} displayCurrency={displayCurrency} search={search} setSearch={setSearch} />}
      {tab === 'plan' && <PlanView data={scoped} metrics={metrics} displayCurrency={displayCurrency} onQuick={(next) => setModal(next)} whatIf={whatIf} setWhatIf={setWhatIf} whatIfResult={whatIfResult} runWhatIf={runWhatIf} />}
      {tab === 'more' && <MoreView data={data} theme={theme} setTheme={(next) => { setTheme(next); notify(`Theme changed to ${next}.`); }} pushEnabled={pushEnabled} enableNotifications={enableNotifications} exportData={exportData} exportCsv={exportCsv} session={!!session} onQuick={(next) => setModal(next)} />}
    </main>
    <nav className="mobile-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={17} /><span>{label}</span></button>)}</nav>
    {modal === 'account' && <AccountModal workspaces={data.workspaces} onClose={() => setModal(null)} onSave={createAccount} />}
    {modal === 'transaction' && <TransactionModal accounts={data.accounts} onClose={() => setModal(null)} onSave={createTransaction} />}
    {modal === 'checkin' && <CheckInModal accounts={data.accounts} onClose={() => setModal(null)} onSave={saveCheckin} />}
    {modal === 'whatif' && <WhatIfModal safeToSpend={metrics.safeToSpend} whatIf={whatIf} setWhatIf={setWhatIf} onClose={() => setModal(null)} onRun={() => { runWhatIf(); setModal(null); setTab('plan'); }} />}
    {modal === 'commitment' && <CommitmentModal workspaces={data.workspaces} onClose={() => setModal(null)} onSave={createCommitment} />}
    {modal === 'debt' && <DebtModal debts={data.debts} onClose={() => setModal(null)} onSave={createDebtEvent} />}
    {modal === 'receivable' && <ReceivableModal workspaces={data.workspaces} onClose={() => setModal(null)} onSave={createReceivable} />}
    {modal === 'investment' && <InvestmentModal workspaces={data.workspaces} onClose={() => setModal(null)} onSave={createInvestment} />}
    {modal === 'import' && <ImportModal workspaces={data.workspaces} onClose={() => setModal(null)} onImport={importAccounts} />}
    {toast && <div className="toast"><Sparkles size={16} /> {toast}</div>}
  </div>;
}

function LoadingState() {
  return <main className="loading-shell"><div className="brand-mark">n<span>•</span></div><div className="loading-pulse">Preparing your private workspace…</div></main>;
}

function HomeView({ data, metrics, hidden, setHidden, staleAccounts, onQuick, workspace, displayCurrency, notify }: { data: NettData; metrics: ReturnType<typeof calculateMetrics>; hidden: boolean; setHidden: (value: boolean) => void; staleAccounts: number; onQuick: (modal: Modal) => void; workspace: string; displayCurrency: string; notify: (message: string) => void }) {
  if (!data.accounts.length) return <div className="empty-home"><div className="empty-home-icon"><Wallet size={23} /></div><div className="eyebrow"><Sparkles size={13} /> Your private workspace is ready</div><h2>Start with one real account.</h2><p>Add your first balance and Nett will turn it into a calm, useful picture. You can add debts, commitments and activity whenever you’re ready.</p><button className="primary-button" onClick={() => window.location.href = '/onboarding'}>Complete setup <ChevronDown size={15} style={{ transform: 'rotate(-90deg)' }} /></button><button className="empty-home-link" onClick={() => onQuick('account')}>I’m ready to add an account manually</button></div>;
  const maxReserve = Math.max(metrics.liquidCash, 1); const safePercent = Math.min(100, Math.max(0, metrics.safeToSpend / maxReserve * 100));
  return <>
    <div className="dashboard-grid">
      <section className="card hero-card"><div className="card-kicker"><Gauge size={15} /> Primary Net Worth <button onClick={() => setHidden(!hidden)} style={{ marginLeft: 4, border: 0, background: 'none', color: '#87858d', padding: 0 }}>{hidden ? <Eye size={14} /> : <EyeOff size={14} />}</button></div><div className="hero-value">{hidden ? '••••••' : formatCurrency(metrics.primaryNetWorth, displayCurrency)}<small>{displayCurrency}</small></div><div className="delta"><TrendingUp size={14} /> +2.4% since last check-in <span style={{ color: '#9b9aa1' }}>· verified view</span></div><div className="hero-footer"><span className={`status-chip ${staleAccounts ? 'warn' : 'good'}`}><span className="dot" /> {staleAccounts ? `${staleAccounts} update${staleAccounts > 1 ? 's' : ''} needed` : 'Everything looks fresh'}</span><span className="status-chip">Last check-in · 31 Jul</span></div></section>
      <div className="side-stack"><section className="card safe-card"><div className="card-kicker"><Zap size={15} /> Safe to Spend</div><div className="safe-value">{hidden ? '••••' : formatCurrency(metrics.safeToSpend, displayCurrency, true)}</div><div className="safe-sub">After reserves + near-term commitments</div><div className="safe-progress"><span style={{ width: `${safePercent}%` }} /></div><div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa8b0', fontSize: 10 }}><span>{formatCurrency(metrics.protectedAmount, displayCurrency, true)} protected</span><span>{Math.round(safePercent)}% free</span></div></section><section className="card" style={{ padding: 20 }}><div className="card-kicker"><CalendarClock size={15} /> Next check-in</div><div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.04em', marginTop: 17 }}>31 Aug 2026</div><div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 6 }}>~ 12 minutes to refresh</div><button className="soft-button" style={{ width: '100%', marginTop: 14, minHeight: 34, fontSize: 11 }} onClick={() => onQuick('checkin')}>Start when ready <ArrowUpRight size={13} /></button></section></div>
      <div className="stats-grid"><MetricCard label="Liquid Cash" value={metrics.liquidCash} note="Across cash-like accounts" icon={<Wallet size={14} />} /><MetricCard label="Mandatory Debt" value={metrics.mandatoryDebt} note="Included in primary net worth" icon={<CreditCard size={14} />} accent="#cb6e83" /><MetricCard label="Flexible Debt" value={metrics.flexibleDebt} note="Shown separately by default" icon={<ArrowDownLeft size={14} />} accent="#b77dc7" /><MetricCard label="Investments" value={metrics.investments} note="Manual values · last checked" icon={<LineChart size={14} />} accent="#5b9c9b" /></div>
    </div>
    <div className="content-grid"><section className="card wide-card"><div className="card-header"><div><h2 className="card-title">My accounts</h2><div className="card-meta">{data.accounts.length} accounts · {workspace === 'everything' ? 'combined view' : 'workspace view'}</div></div><button className="view-link" onClick={() => onQuick('account')}><Plus size={13} style={{ verticalAlign: '-2px' }} /> Add account</button></div><div className="account-rail">{data.accounts.map((account) => <AccountCard key={account.id} account={account} displayCurrency={displayCurrency} rates={data.fxRates} />)}</div></section><section className="card wide-card"><div className="card-header"><div><h2 className="card-title">Recent activity</h2><div className="card-meta">Selective entries · {data.transactions.length} this period</div></div><button className="view-link" onClick={() => onQuick('transaction')}>Quick add <Plus size={13} style={{ verticalAlign: '-2px' }} /></button></div><div className="activity-list">{data.transactions.slice(0, 4).map((item) => <ActivityRow key={item.id} transaction={item} displayCurrency={displayCurrency} rates={data.fxRates} />)}</div></section><section className="card wide-card"><div className="card-header"><div><h2 className="card-title">On the horizon</h2><div className="card-meta">The next 90 days, without the noise</div></div><button className="view-link" onClick={() => onQuick('commitment')}>Add <Plus size={13} style={{ verticalAlign: '-2px' }} /></button></div><div className="timeline">{data.commitments.slice(0, 3).map((item) => <div className="timeline-item" key={item.id}><span className="timeline-marker" /><div className="timeline-content"><div><div className="timeline-name">{item.name}</div><div className="timeline-date">{formatShortDate(item.due_date)} · {item.recurrence.replace('_', ' ')}</div></div><div><div className="timeline-amount">{formatCurrency(Number(item.amount), item.currency, true)}</div><span className="timeline-tag">{item.importance}</span></div></div></div>)}</div></section><section className="card wide-card"><div className="card-header"><div><h2 className="card-title">Small signal</h2><div className="card-meta">A nudge worth knowing</div></div><Sparkles size={17} color="#c080d8" /></div><div style={{ padding: '18px 24px 24px', display: 'flex', gap: 15, alignItems: 'center' }}><div style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: 15, background: 'linear-gradient(140deg,#ffd4e8,#e2d0ff)', color: '#985b9e' }}><ShieldCheck size={22} /></div><div><strong style={{ fontSize: 13 }}>Your cash buffer is doing the work.</strong><p style={{ margin: '5px 0 0', color: 'var(--muted)', fontSize: 11, lineHeight: 1.45 }}>Reserves cover {Math.round(metrics.protectedAmount / Math.max(metrics.upcomingCommitments, 1) * 100)}% of near-term mandatory commitments. Keep the next check-in light.</p></div></div></section></div>
  </>;
}

function AccountsView({ data, displayCurrency, onQuick }: { data: NettData; displayCurrency: string; onQuick: (modal: Modal) => void }) {
  return <div className="page-panel"><div className="view-header"><div><h2>Accounts & cards</h2><p>Every real balance, with verified and estimated states kept clear.</p></div><button className="primary-button" onClick={() => onQuick('account')}><Plus size={16} /> Add account</button></div><div className="card full-card"><div className="table-head"><span>Account</span><span>Balance</span><span>Freshness</span><span>Context</span></div>{data.accounts.map((account) => <div className="table-row" key={account.id}><div><div className="table-strong">{account.name}</div><div className="table-muted">{account.currency} · {account.type.replace('_', ' ')}</div></div><div><div className="table-strong">{formatCurrency(Number(account.estimated_balance ?? account.verified_balance), account.currency)}</div><div className="table-muted">≈ {formatCurrency(displayAmount(Number(account.estimated_balance ?? account.verified_balance), account.currency, displayCurrency, data.fxRates), displayCurrency)}</div></div><div><span className={`pill ${isStale(account.balance_verified_at, 31) ? 'warn' : 'good'}`}>{isStale(account.balance_verified_at, 31) ? 'Update needed' : 'Verified'}</span></div><div><span className="pill">{account.workspace_id === 'studio' ? 'Business' : 'Personal'}</span></div></div>)}<div className="empty-state" style={{ paddingBottom: 28 }}><CreditCard size={20} /><strong>Cards connect to the same picture</strong><span>Add a credit card to see limit, utilization and due dates here.</span><br /><button className="view-link" style={{ marginTop: 8 }} onClick={() => onQuick('account')}>Add a card</button></div></div></div>;
}

function ActivityView({ data, displayCurrency, search, setSearch }: { data: NettData; displayCurrency: string; search: string; setSearch: (value: string) => void }) {
  const filtered = data.transactions.filter((item) => `${item.category} ${item.description} ${item.currency}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page-panel"><div className="view-header"><div><h2>Activity</h2><p>A selective ledger, not a guilt machine.</p></div><div className="filter-pills"><button className="selected"><Filter size={12} /> All activity</button><button>Personal</button><button>Business</button></div></div><div className="card full-card"><div className="search-row"><div className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Dad, car, insurance…" /></div><button className="soft-button"><ListFilter size={15} /> Filters</button></div>{filtered.length ? filtered.map((item) => <ActivityRow key={item.id} transaction={item} displayCurrency={displayCurrency} rates={data.fxRates} />) : <div className="empty-state"><Search size={21} /><strong>No matching activity</strong><span>Try a person, category or description.</span></div>}</div></div>;
}

function PlanView({ data, metrics, displayCurrency, onQuick, whatIf, setWhatIf, whatIfResult, runWhatIf }: { data: NettData; metrics: ReturnType<typeof calculateMetrics>; displayCurrency: string; onQuick: (modal: Modal) => void; whatIf: string; setWhatIf: (value: string) => void; whatIfResult: number | null; runWhatIf: () => void }) {
  return <div className="page-panel"><div className="view-header"><div><h2>Plan</h2><p>See what is spoken for, what is owed and what comes next.</p></div><button className="primary-button gradient" onClick={() => onQuick('whatif')}><Sparkles size={16} /> What If</button></div><div className="section-grid"><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Debt position</h2><div className="card-meta">Mandatory and flexible stay honest</div></div><div style={{ display: 'flex', gap: 8 }}><button className="view-link" onClick={() => onQuick('debt')}>Add event</button></div></div><div className="table-head" style={{ paddingLeft: 0, paddingRight: 0, gridTemplateColumns: '1.5fr 1fr .8fr' }}><span>Debt</span><span>Outstanding</span><span>Progress</span></div>{data.debts.map((debt) => <div className="table-row" key={debt.id} style={{ paddingLeft: 0, paddingRight: 0, gridTemplateColumns: '1.5fr 1fr .8fr' }}><div><div className="table-strong">{debt.name}</div><div className="table-muted">{debt.debt_class} · {debt.currency}</div></div><div className="table-strong">{formatCurrency(Number(debt.outstanding), debt.currency)}</div><div><span className={`pill ${debt.debt_class === 'mandatory' ? 'warn' : 'pink'}`}>{Math.round(debtProgress(debt))}% repaid</span><div className="progress-line"><span style={{ width: `${debtProgress(debt)}%` }} /></div></div></div>)}</section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Future pressure</h2><div className="card-meta">Protected amounts are not double-counted</div></div><button className="view-link" onClick={() => onQuick('commitment')}>Add commitment</button></div><div className="timeline" style={{ padding: '20px 0 0' }}>{data.commitments.map((item) => <div className="timeline-item" key={item.id}><span className="timeline-marker" /><div className="timeline-content"><div><div className="timeline-name">{item.name}</div><div className="timeline-date">{formatShortDate(item.due_date)} · {item.importance}</div></div><div className="timeline-amount">{formatCurrency(Number(item.amount), item.currency, true)}</div></div></div>)}</div><div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}><span className="status-chip">{formatCurrency(metrics.protectedAmount, displayCurrency, true)} reserved</span><span className="status-chip warn">{formatCurrency(metrics.upcomingCommitments, displayCurrency, true)} due soon</span></div></section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">What If simulator</h2><div className="card-meta">A structured scenario that never changes live data</div></div><Sparkles size={17} color="#b678c7" /></div><div style={{ paddingTop: 20 }}><label>What if I spend <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 2 }}><input inputMode="decimal" value={whatIf} onChange={(event) => setWhatIf(event.target.value)} /><span style={{ color: 'var(--muted)', fontSize: 12 }}>AED</span><button className="primary-button" onClick={runWhatIf}>Calculate</button></div></label>{whatIfResult !== null && <div style={{ marginTop: 17, padding: 15, borderRadius: 15, background: whatIfResult >= 0 ? '#f0faf5' : '#fff3f4', color: whatIfResult >= 0 ? '#3d8c68' : '#b3525c', fontSize: 12 }}><strong>New Safe to Spend: {formatCurrency(whatIfResult, displayCurrency)}</strong><div style={{ marginTop: 4, opacity: .78 }}>This scenario is temporary. Convert it to a commitment only when you are ready.</div></div>}</div></section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Receivables</h2><div className="card-meta">Promised money stays separate from cash</div></div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="pill">{formatCurrency(metrics.receivables, displayCurrency, true)}</span><button className="view-link" onClick={() => onQuick('receivable')}>Add</button></div></div>{data.receivables.map((item) => <div className="settings-row" key={item.id} style={{ marginTop: 14 }}><div className="activity-avatar"><ArrowDownLeft size={16} /></div><main><strong>{item.contact_name}</strong><small>{item.confidence} · due {item.expected_on ? formatShortDate(item.expected_on) : 'not set'}</small></main><div style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{formatCurrency(Number(item.outstanding), item.currency)}</div></div>)}</section></div></div>;
}

function MoreView({ data, theme, setTheme, pushEnabled, enableNotifications, exportData, exportCsv, session, onQuick }: { data: NettData; theme: Theme; setTheme: (theme: Theme) => void; pushEnabled: boolean; enableNotifications: () => void; exportData: () => void; exportCsv: () => void; session: boolean; onQuick: (modal: Modal) => void }) {
  return <div className="page-panel"><div className="view-header"><div><h2>More</h2><p>Investments, portability, security and how Nett feels.</p></div><span className="status-chip good"><ShieldCheck size={13} /> Private by design</span></div><div className="section-grid"><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Portfolio</h2><div className="card-meta">Manual valuation · provider-ready</div></div><LineChart size={17} color="#6a9e9e" /></div>{data.investments.map((item) => <div className="settings-row" key={item.id} style={{ marginTop: 14 }}><div className="activity-avatar" style={{ color: '#438e8b', background: '#edf8f5' }}><TrendingUp size={16} /></div><main><strong>{item.symbol} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {item.exchange}</span></strong><small>{item.quantity} units · {item.holding_currency} · last updated {item.latest_value_at ? formatShortDate(item.latest_value_at) : 'never'}</small></main><div style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{formatCurrency(Number(item.latest_value || 0), item.holding_currency, true)}</div></div>)}<button className="soft-button" style={{ width: '100%', marginTop: 14 }} onClick={() => onQuick('investment')}><Plus size={14} /> Add holding</button></section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Phone notifications</h2><div className="card-meta">Due dates, check-ins and freshness—only when useful.</div></div><Bell size={17} color="#b16e9b" /></div><div className="settings-row" style={{ marginTop: 16 }}><div className="activity-avatar"><Bell size={16} /></div><main><strong>{pushEnabled ? 'Notifications enabled' : 'Enable notification centre alerts'}</strong><small>{pushEnabled ? 'Nett can send reminders to this device.' : 'Install Nett to Home Screen on iOS first.'}</small></main><button className={`toggle ${pushEnabled ? 'on' : ''}`} onClick={enableNotifications} aria-label="Toggle notifications"><span /></button></div><div className="settings-row"><div className="activity-avatar"><CalendarClock size={16} /></div><main><strong>Monthly check-in</strong><small>31st of each month · enabled</small></main><span className="pill good">On</span></div></section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Appearance</h2><div className="card-meta">A calm surface in any light</div></div><Sparkles size={17} color="#b678c7" /></div><div className="filter-pills" style={{ marginTop: 16 }}>{(['light', 'dark', 'amoled', 'system'] as Theme[]).map((item) => <button key={item} className={theme === item ? 'selected' : ''} onClick={() => setTheme(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div></section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Your data</h2><div className="card-meta">Portable, inspectable and yours</div></div><Download size={17} color="#8a65ae" /></div><div className="settings-list" style={{ marginTop: 16 }}><div className="settings-row"><FileSpreadsheet size={18} /><main><strong>Export complete backup</strong><small>JSON with original currency values and history.</small></main><div style={{ display: 'flex', gap: 7 }}><button className="soft-button" onClick={exportData}><Download size={13} /> JSON</button><button className="soft-button" onClick={exportCsv}>CSV</button></div></div><div className="settings-row"><Upload size={18} /><main><strong>Import a spreadsheet</strong><small>CSV preview before commit; XLSX mapping is next.</small></main><button className="soft-button" onClick={() => onQuick('import')}><Upload size={13} /> Import</button></div><div className="settings-row"><LockKeyhole size={18} /><main><strong>Security & sessions</strong><small>{session ? 'Supabase-authenticated account with RLS.' : 'Demo mode — sign in to manage sessions.'}</small></main><ShieldCheck size={17} color="#4ca67e" /></div></div></section></div></div>;
}

function ModalShell({ title, description, children, onClose }: { title: string; description: string; children: React.ReactNode; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal"><div className="modal-header"><div><h3>{title}</h3><p>{description}</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={16} /></button></div>{children}</div></div>; }

function AccountModal({ workspaces, onClose, onSave }: { workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Add an account" description="Start with the balance you actually verified." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Account name<input name="name" required placeholder="Everyday AED" /></label><label>Type<select name="type" defaultValue="current"><option value="current">Current account</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="wallet">Wallet</option><option value="business_bank">Business bank</option><option value="credit_card">Credit card</option></select></label><label>Currency<select name="currency" defaultValue="AED"><option>AED</option><option>INR</option><option>USD</option></select></label><label>Workspace<select name="workspace_id" defaultValue={workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Verified balance<input name="balance" type="number" step="0.01" required placeholder="0.00" /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save account</button></div></form></ModalShell>; }

function TransactionModal({ accounts, onClose, onSave }: { accounts: Account[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Quick add" description="Capture only the activity that makes your picture clearer." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label>Type<select name="type" defaultValue="debit"><option value="debit">Debit / expense</option><option value="credit">Credit / income</option><option value="adjustment">Balance adjustment</option></select></label><label>Amount<input required name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" /></label><label>Currency<select name="currency" defaultValue="AED"><option>AED</option><option>INR</option><option>USD</option></select></label><label>Account<select name="account_id" defaultValue={accounts[0]?.id}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label><label className="full-span">Category<input name="category" required placeholder="Groceries, salary, transport…" /></label><label className="full-span">Note (optional)<input name="description" placeholder="A little context for future you" /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save activity</button></div></form></ModalShell>; }

function CheckInModal({ accounts, onClose, onSave }: { accounts: Account[]; onClose: () => void; onSave: (balances: Record<string, number>) => void }) { const [balances, setBalances] = useState<Record<string, number>>(() => Object.fromEntries(accounts.map((item) => [item.id, Number(item.verified_balance)]))); return <ModalShell title="Monthly check-in" description="Verify the balances that shape your reality. No transactions required." onClose={onClose}><div className="status-chip good" style={{ marginBottom: 17 }}><ShieldCheck size={13} /> Saved as an immutable snapshot after confirmation</div><div style={{ display: 'grid', gap: 11 }}>{accounts.map((account) => <label key={account.id}>{account.name} · {account.currency}<input type="number" step="0.01" value={balances[account.id]} onChange={(event) => setBalances((current) => ({ ...current, [account.id]: Number(event.target.value) }))} /></label>)}</div><div className="modal-actions"><button className="soft-button" onClick={onClose}>Later</button><button className="primary-button" onClick={() => onSave(balances)}><Check size={15} /> Confirm check-in</button></div></ModalShell>; }

function WhatIfModal({ safeToSpend, whatIf, setWhatIf, onClose, onRun }: { safeToSpend: number; whatIf: string; setWhatIf: (value: string) => void; onClose: () => void; onRun: () => void }) { return <ModalShell title="What If" description="Try a future decision without touching live data." onClose={onClose}><label>Hypothetical expense<input autoFocus type="number" value={whatIf} onChange={(event) => setWhatIf(event.target.value)} /></label><div style={{ padding: 15, marginTop: 14, borderRadius: 15, background: '#faf5fd', color: '#7e5b87', fontSize: 12 }}>Current Safe to Spend: <strong>{formatCurrency(safeToSpend)}</strong><br /><span style={{ display: 'block', marginTop: 4, opacity: .75 }}>The scenario will only be kept in this session.</span></div><div className="modal-actions"><button className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button gradient" onClick={onRun}><Sparkles size={15} /> See impact</button></div></ModalShell>; }

function CommitmentModal({ workspaces, onClose, onSave }: { workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Add a commitment" description="Give future money a place in your plan." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Name<input name="name" required placeholder="Insurance, renewal, travel…" /></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00" /></label><label>Currency<select name="currency" defaultValue="AED"><option>AED</option><option>INR</option><option>USD</option></select></label><label>Due date<input name="due_date" required type="date" /></label><label>Importance<select name="importance" defaultValue="mandatory"><option value="mandatory">Mandatory</option><option value="planned">Planned</option><option value="optional">Optional</option></select></label><label>Recurrence<select name="recurrence" defaultValue="one_time"><option value="one_time">One time</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label><label>Workspace<select name="workspace_id" defaultValue={workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save commitment</button></div></form></ModalShell>; }

function DebtModal({ debts, onClose, onSave }: { debts: Debt[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Update a debt" description="Borrow more or record any repayment—no fixed schedule required." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Debt<select name="debt_id" defaultValue={debts[0]?.id}>{debts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label><label>Event<select name="event_type" defaultValue="repayment"><option value="repayment">Repayment</option><option value="borrowing">Additional borrowing</option></select></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00" /></label><label className="full-span">Note<input name="note" placeholder="Optional context for your history" /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save debt event</button></div></form></ModalShell>; }

function ReceivableModal({ workspaces, onClose, onSave }: { workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Add a receivable" description="Track money owed to you without mistaking it for available cash." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Who owes you?<input name="contact_name" required placeholder="Dad, Alina, client name…" /></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00" /></label><label>Currency<select name="currency" defaultValue="AED"><option>AED</option><option>INR</option><option>USD</option></select></label><label>Expected date<input name="expected_on" type="date" /></label><label>Confidence<select name="confidence" defaultValue="confirmed"><option value="confirmed">Confirmed</option><option value="likely">Likely</option><option value="uncertain">Uncertain</option></select></label><label>Workspace<select name="workspace_id" defaultValue={workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save receivable</button></div></form></ModalShell>; }

function InvestmentModal({ workspaces, onClose, onSave }: { workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Add a holding" description="Manual values keep your portfolio useful even without a quote provider." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label>Symbol<input name="symbol" required placeholder="NVDA" /></label><label>Exchange<input name="exchange" placeholder="NASDAQ" /></label><label className="full-span">Name<input name="name" placeholder="Company or fund name" /></label><label>Quantity<input name="quantity" required type="number" min="0" step="0.0001" placeholder="0" /></label><label>Average cost<input name="average_cost" required type="number" min="0" step="0.01" placeholder="0" /></label><label>Current value<input name="value" required type="number" min="0" step="0.01" placeholder="0" /></label><label>Currency<select name="currency" defaultValue="USD"><option>AED</option><option>INR</option><option>USD</option></select></label><label>Workspace<select name="workspace_id" defaultValue={workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save holding</button></div></form></ModalShell>; }

function ImportModal({ workspaces, onClose, onImport }: { workspaces: NettData['workspaces']; onClose: () => void; onImport: (items: Account[]) => void | Promise<void> }) { const [fileName, setFileName] = useState(''); const [items, setItems] = useState<Account[]>([]); async function readFile(file: File) { const text = await file.text(); const [header, ...lines] = text.trim().split(/\r?\n/); const headers = header.split(',').map((item) => item.trim().toLowerCase()); const parsed = lines.filter(Boolean).map((line) => { const cells = line.split(',').map((item) => item.trim()); const get = (key: string, fallback = '') => cells[headers.indexOf(key)] || fallback; return { id: crypto.randomUUID(), workspace_id: workspaces[0]?.id || '', name: get('name', 'Imported account'), type: get('type', 'current'), currency: get('currency', 'AED'), verified_balance: Number(get('balance', '0')), estimated_balance: Number(get('balance', '0')), balance_verified_at: new Date().toISOString(), include_net_worth: true, include_liquidity: true } as Account; }); setFileName(file.name); setItems(parsed); } return <ModalShell title="Import accounts" description="Start with a CSV preview. Nothing is committed until you confirm." onClose={onClose}><label>CSV file<input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); }} /></label>{fileName && <div className="form-message"><Check size={16} /> {fileName} · {items.length} rows ready for review.</div>}<div className="modal-actions"><button className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!items.length || !workspaces.length} onClick={() => void onImport(items)}><Upload size={15} /> Import and save</button></div></ModalShell>; }

function urlBase64ToUint8Array(base64String: string) { const padding = '='.repeat((4 - base64String.length % 4) % 4); const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/'); const rawData = window.atob(base64); return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0))); }
