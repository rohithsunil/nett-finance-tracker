'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  ArrowDownLeft, ArrowUpRight, Bell, BriefcaseBusiness, CalendarClock, Check, ChevronDown,
  CircleHelp, CirclePlus, CreditCard, Download, Eye, EyeOff, FileSpreadsheet, Filter, Gauge,
  CircleDollarSign, GitCommitHorizontal, Globe, Home, Landmark, LayoutGrid, LineChart, ListFilter, LockKeyhole, LogIn, Menu, MoreHorizontal,
  MoveRight, Plus, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Target, TrendingDown,
  History, Pencil, Trash2, TrendingUp, Upload, Wallet, X, Zap,
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { calculateMetrics, commitmentOccurrences, debtProgress, displayAmount, formatCurrency, formatShortDate, hasFxRate, isStale } from '@/lib/finance';
import { emptyData } from '@/lib/empty-data';
import { APP_VERSION } from '@/lib/app-meta';
import NettLogo from '@/components/NettLogo';
import type { Account, AccountSnapshot, BudgetLine, Commitment, CountryConfig, CreditCard as CreditCardRecord, Debt, DebtEvent, ForecastScenario, Investment, InvestmentValue, NettData, Receivable, ReceivableEvent, Snapshot, Space, Theme, Transaction } from '@/lib/types';

export type NettTab = 'home' | 'accounts' | 'pots' | 'loans' | 'holdings' | 'bills' | 'spends' | 'recurring' | 'forecast' | 'budget' | 'history' | 'settings';
type LegacyTab = 'activity' | 'plan' | 'more';
type Tab = NettTab | LegacyTab;
type Modal = 'quick-add' | 'account' | 'move-account-country' | 'delete-account' | 'transaction' | 'transfer' | 'checkin' | 'whatif' | 'commitment' | 'debt' | 'debt-event' | 'delete-debt-event' | 'receivable' | 'receivable-event' | 'delete-receivable' | 'investment' | 'delete-investment' | 'reserve' | 'workspace' | 'space' | 'pot' | 'pot-event' | 'delete-space' | 'delete-commitment' | 'delete-debt' | 'delete-transaction' | 'forecast-scenario' | 'delete-forecast-scenario' | 'budget-line' | 'delete-budget-line' | 'country' | 'delete-country' | 'snapshot' | 'delete-snapshot' | 'import' | null;
function DebtModalV3({ debts, accounts, spaces, event = null, defaultDebtId = null, defaultEventType = 'repayment', onClose, onSave }: { debts: Debt[]; accounts: Account[]; spaces: Space[]; event?: DebtEvent | null; defaultDebtId?: string | null; defaultEventType?: 'borrowing' | 'repayment'; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  const selectedDebtId = event?.debt_id || defaultDebtId || debts[0]?.id;
  return <ModalShell title={event ? 'Edit debt entry' : defaultEventType === 'borrowing' ? 'Add to loan' : 'Log payment'} description={event ? 'Correct the amount, date or note without losing the loan history.' : 'Record a partial repayment or add borrowing when the balance grows.'} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}>
      <div className="form-grid">
        <label className="full-span">Debt<select name="debt_id" required defaultValue={debts[0]?.id}>{debts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency} · {formatCurrency(Number(item.outstanding), item.currency)}</option>)}</select></label>
        <label>Event<select name="event_type" defaultValue="repayment"><option value="repayment">Repayment</option><option value="borrowing">Additional borrowing</option></select></label>
        <label>Amount<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00" /></label>
        <label>Source account<select name="source_account_id" defaultValue=""><option value="">Do not link an account</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label>
        <label>Space ledger<select name="space_id" defaultValue=""><option value="">Do not link a Space</option>{spaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="full-span">Note<input name="note" placeholder="Dad loan for car, extra repair funding…" /></label>
      </div>
      <div className="form-message"><CircleDollarSign size={15} /> Linking this to Car or Business records the borrowing or repayment in that Space without double-counting your cash.</div>
      <div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save debt event</button></div>
    </form>
  </ModalShell>;
}

function DebtEventModalV4({ debts, accounts, spaces, event, defaultDebtId, defaultSpaceId, defaultEventType, onClose, onSave }: { debts: Debt[]; accounts: Account[]; spaces: Space[]; event: DebtEvent | null; defaultDebtId: string | null; defaultSpaceId: string | null; defaultEventType: 'borrowing' | 'repayment'; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  const selectedDebtId = event?.debt_id || defaultDebtId || debts[0]?.id;
  const dateValue = event?.occurred_at ? event.occurred_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return <ModalShell title={event ? 'Edit debt entry' : defaultEventType === 'borrowing' ? 'Add to loan' : 'Log payment'} description={event ? 'Correct the amount, date or note without losing the loan history.' : 'Record a partial repayment or add borrowing when the balance changes.'} onClose={onClose}>
    <form onSubmit={(submitEvent) => { submitEvent.preventDefault(); onSave(submitEvent.currentTarget); }}>
      <div className="form-grid">
        <label className="full-span">Loan<select name="debt_id" required defaultValue={selectedDebtId}>{debts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency} · {formatCurrency(Number(item.outstanding), item.currency)}</option>)}</select></label>
        {event && <input type="hidden" name="event_id" value={event.id} />}
        <label>Entry type<select name="event_type" defaultValue={event?.event_type === 'borrowing' ? 'borrowing' : defaultEventType}><option value="repayment">Repayment</option><option value="borrowing">Additional borrowing</option></select></label>
        <label>Amount<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={event?.amount ?? ''} placeholder="0.00" /></label>
        {accounts.length > 0 && <label>Account<select name="source_account_id" defaultValue={event?.source_account_id || ''}><option value="">Do not link an account</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label>}
        <label>Date<input name="occurred_at" type="date" defaultValue={dateValue} /></label>
        {!event && spaces.length > 0 && <label>Space ledger<select name="space_id" defaultValue={defaultSpaceId || ''}><option value="">Do not link a Space</option>{spaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label className="full-span">Note<input name="note" defaultValue={event?.note || ''} placeholder="Dad loan for car, extra repair funding…" /></label>
      </div>
      <div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> {event ? 'Save changes' : defaultEventType === 'borrowing' ? 'Add to loan' : 'Log payment'}</button></div>
    </form>
  </ModalShell>;
}

const navItems: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Dashboard', icon: Home },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
  { id: 'pots', label: 'Pots', icon: Target },
  { id: 'loans', label: 'Loans', icon: ArrowDownLeft },
  { id: 'holdings', label: 'Holdings', icon: LineChart },
  { id: 'bills', label: 'Bills', icon: CalendarClock },
  { id: 'spends', label: 'Spends', icon: CreditCard },
  { id: 'recurring', label: 'Recurring', icon: RefreshCw },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp },
  { id: 'budget', label: 'Budget', icon: Gauge },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

const mobileNavItems: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
  { id: 'spends', label: 'Spends', icon: CreditCard },
];

const mobileMoreItems: Array<{ id: Tab; label: string; description: string; icon: typeof Home }> = [
  { id: 'pots', label: 'Pots', description: 'Personal loan payoff ledgers', icon: Target },
  { id: 'loans', label: 'Loans', description: 'Money you owe or are owed', icon: ArrowDownLeft },
  { id: 'holdings', label: 'Holdings', description: 'Stocks and investments', icon: LineChart },
  { id: 'bills', label: 'Bills', description: 'Upcoming commitments', icon: CalendarClock },
  { id: 'recurring', label: 'Recurring', description: 'Income and expenses that repeat', icon: RefreshCw },
  { id: 'budget', label: 'Budget', description: 'Plan and compare your month', icon: Gauge },
  { id: 'forecast', label: 'Forecast', description: 'See what your future looks like', icon: TrendingUp },
  { id: 'history', label: 'History', description: 'Monthly net-worth snapshots', icon: History },
  { id: 'settings', label: 'Settings', description: 'Preferences, privacy and backups', icon: Settings2 },
];

const currencyOptions = ['AED', 'INR', 'USD'];
type CountryOption = { value: string; label: string };
const countryOptions = [
  { value: 'AE', label: 'UAE' },
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'United States' },
];
const countryLabel = (value: string) => countryOptions.find((item) => item.value === value)?.label || value;
const countryForCurrency = (currency: string) => currency === 'INR' ? 'IN' : currency === 'USD' ? 'US' : 'AE';
const alternateCurrency = (currency: string) => currency === 'AED' ? 'INR' : 'AED';
const rateFor = (base: string, quote: string, rates: NettData['fxRates']) => base === quote ? 1 : rates[`${base}_${quote}`] || (rates[`${quote}_${base}`] ? 1 / rates[`${quote}_${base}`] : 0);
const routeForTab: Record<NettTab, string> = {
  home: '/', accounts: '/accounts', pots: '/pots', loans: '/loans', holdings: '/holdings', bills: '/bills',
  spends: '/spends', recurring: '/recurring', forecast: '/forecast', budget: '/budget', history: '/history', settings: '/settings',
};

function FlagIcon({ country, size = 18 }: { country: string; size?: number }) {
  const common = { width: size, height: Math.round(size * 0.72), viewBox: '0 0 24 17', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true } as const;
  if (country === 'AE') return <svg {...common}><path fill="#00732F" d="M6 0h18v5.67H6z" /><path fill="#fff" d="M6 5.67h18v5.66H6z" /><path fill="#000" d="M6 11.33h18V17H6z" /><path fill="#FF0000" d="M0 0h6v17H0z" /></svg>;
  if (country === 'IN') return <svg {...common}><path fill="#FF9933" d="M0 0h24v5.67H0z" /><path fill="#fff" d="M0 5.67h24v5.66H0z" /><path fill="#128807" d="M0 11.33h24V17H0z" /><circle cx="12" cy="8.5" r="2.05" stroke="#2455A4" strokeWidth=".7" /><circle cx="12" cy="8.5" r=".45" fill="#2455A4" /></svg>;
  if (country === 'US') return <svg {...common}><path fill="#B22234" d="M0 0h24v17H0z" /><path stroke="#fff" strokeWidth="1.3" d="M0 2.5h24M0 5.2h24M0 7.9h24M0 10.6h24M0 13.3h24M0 16h24" /><path fill="#3C3B6E" d="M0 0h10.8v9.2H0z" /><circle cx="2" cy="2" r=".45" fill="#fff" /><circle cx="4" cy="2" r=".45" fill="#fff" /><circle cx="6" cy="2" r=".45" fill="#fff" /><circle cx="8" cy="2" r=".45" fill="#fff" /><circle cx="3" cy="4" r=".45" fill="#fff" /><circle cx="5" cy="4" r=".45" fill="#fff" /><circle cx="7" cy="4" r=".45" fill="#fff" /><circle cx="2" cy="6" r=".45" fill="#fff" /><circle cx="4" cy="6" r=".45" fill="#fff" /><circle cx="6" cy="6" r=".45" fill="#fff" /><circle cx="8" cy="6" r=".45" fill="#fff" /></svg>;
  return <svg {...common}><rect width="24" height="17" rx="2.5" fill="#F3F0F7" /><path d="M6 4h12M6 8.5h9M6 13h12" stroke="#8B8493" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

function CountryBadge({ country, label = true }: { country: string; label?: boolean }) {
  return <span className="country-badge"><FlagIcon country={country} />{label && <span>{countryLabel(country)}</span>}</span>;
}

function ContextToolbar({ country, countries, displayCurrency, currencies, onCountryChange, onCurrencyChange }: { country: string; countries: CountryOption[]; displayCurrency: string; currencies: string[]; onCountryChange: (value: string) => void; onCurrencyChange: (value: string) => void }) {
  return <section className="context-toolbar" aria-label="View options">
    <div className="context-toolbar-title"><span className="eyebrow"><Globe size={13} /> View</span><strong>Choose your lens</strong><span>See all countries together or focus on one financial home.</span></div>
    <div className="context-toolbar-group"><span>Country</span><div className="context-chip-list"><button className={country === 'all' ? 'selected' : ''} onClick={() => onCountryChange('all')}><Globe size={15} /> All countries</button>{countries.map((item) => <button key={item.value} className={country === item.value ? 'selected' : ''} onClick={() => onCountryChange(item.value)}><FlagIcon country={item.value} /> {item.label}</button>)}</div></div>
    <div className="context-toolbar-group context-toolbar-currency"><span>Totals in</span><div className="context-chip-list">{currencies.map((item) => <button key={item} className={displayCurrency === item ? 'selected' : ''} onClick={() => onCurrencyChange(item)}>{item}</button>)}</div></div>
  </section>;
}

const todayText = new Intl.DateTimeFormat('en-AE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const timeText = (value: string) => new Intl.DateTimeFormat('en-AE', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const displayName = (name: string | null | undefined) => (name || 'Rohith').split(' ')[0];
const currentRates = () => ({ ...emptyData.fxRates });
const currentProfile = () => ({ ...emptyData.profile });
const supportedCountryCodes = countryOptions.map((item) => item.value);
const normalizePreferenceValues = (values: unknown, fallback: string[], supported: string[]) => {
  const selected = Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string' && supported.includes(value)) : [];
  return selected.length ? selected : fallback.filter((value) => supported.includes(value));
};
const readStoredPreference = (key: string) => {
  try { return JSON.parse(window.localStorage.getItem(key) || 'null') as unknown; } catch { return null; }
};

async function fetchLiveRates() {
  const response = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
  if (!response.ok) throw new Error('FX provider unavailable');
  const payload = await response.json() as { rates?: Record<string, number> };
  const rates = payload.rates || {};
  const pair = (base: string, quote: string) => {
    if (base === 'USD') return rates[quote];
    if (quote === 'USD') return rates[base] ? 1 / rates[base] : undefined;
    return rates[base] && rates[quote] ? rates[quote] / rates[base] : undefined;
  };
  const result: Record<string, number> = {};
  for (const base of currencyOptions) for (const quote of currencyOptions) if (base !== quote) { const rate = pair(base, quote); if (rate) result[`${base}_${quote}`] = rate; }
  return result;
}

function isMissingFinancialMigration(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(error && (error.code === '42703' || error.code === 'PGRST202' || error.message?.includes('does not exist') || error.message?.includes('Could not find the function')));
}

function hydrateAccountMetadata(account: Account) {
  if (account.account_last4 || !account.notes?.includes('nett_account_metadata')) return account;
  try { const parsed = JSON.parse(account.notes); return { ...account, ...(parsed.nett_account_metadata || {}) }; } catch { return account; }
}

const LOAN_META_PREFIX = 'nett_loan_metadata:';
const POT_META_PREFIX = 'nett_pot_metadata:';
const SPEND_META_PREFIX = 'nett_spend_metadata:';
type LoanMetadata = { title?: string; who?: string; description?: string; includeInNetWorth?: boolean };
type PotMetadata = { countryCode?: string; notes?: string };
type SpendMetadata = { countryCode?: string; notes?: string; trackerType?: 'cost' | 'business' | 'trip' };

function decodeMetadata<T>(value: string | null | undefined, prefix: string): T | null {
  if (!value?.startsWith(prefix)) return null;
  try { return JSON.parse(value.slice(prefix.length)) as T; } catch { return null; }
}

function loanMetadata(item: Debt | Receivable): LoanMetadata {
  const parsed = decodeMetadata<LoanMetadata>(item.notes, LOAN_META_PREFIX);
  if (parsed) return parsed;
  if ('contact_name' in item) return { title: item.contact_name, who: item.contact_name, description: item.notes || '' };
  return { title: item.name, who: '', description: item.notes || '', includeInNetWorth: true };
}

function encodeLoanMetadata(meta: LoanMetadata) { return `${LOAN_META_PREFIX}${JSON.stringify(meta)}`; }
function potMetadata(space: Space): PotMetadata { return decodeMetadata<PotMetadata>(space.notes, POT_META_PREFIX) || { countryCode: countryForCurrency(space.currency), notes: space.notes || '' }; }
function encodePotMetadata(meta: PotMetadata) { return `${POT_META_PREFIX}${JSON.stringify(meta)}`; }
function potCountry(space: Space) { return potMetadata(space).countryCode || countryForCurrency(space.currency); }
function isPot(space: Space) { return space.kind === 'pot' || Boolean(space.notes?.startsWith(POT_META_PREFIX)); }
function isSpendTracker(space: Space) { return !isPot(space) && (space.kind === 'spend' || space.notes?.startsWith(SPEND_META_PREFIX) || !space.kind); }
function spendMetadata(space: Space): SpendMetadata {
  return decodeMetadata<SpendMetadata>(space.notes, SPEND_META_PREFIX) || { countryCode: space.country_code || countryForCurrency(space.currency), notes: space.notes || '', trackerType: space.tracker_type || 'cost' };
}
function encodeSpendMetadata(meta: SpendMetadata) { return `${SPEND_META_PREFIX}${JSON.stringify(meta)}`; }
function spaceCountry(space: Space) { return isPot(space) ? potCountry(space) : spendMetadata(space).countryCode || countryForCurrency(space.currency); }

async function insertWithLegacyFallback(client: ReturnType<typeof getSupabaseBrowser>, table: string, payload: Record<string, unknown>, legacyPayload: Record<string, unknown>) {
  if (!client) return { error: null };
  const first = await (client as any).from(table).insert(payload);
  if (!first.error || !isMissingFinancialMigration(first.error)) return first;
  return (client as any).from(table).insert(legacyPayload);
}

function IconForTransaction({ type }: { type: string }) {
  if (type === 'credit') return <ArrowDownLeft size={16} />;
  if (type === 'transfer') return <MoveRight size={16} />;
  if (type === 'debt_repayment') return <TrendingDown size={16} />;
  return <ArrowUpRight size={16} />;
}

function transactionBalanceDelta(transaction: Pick<Transaction, 'type' | 'amount'>) {
  const amount = Number(transaction.amount);
  return transaction.type === 'credit' || transaction.type === 'debt_borrowing' ? amount : -amount;
}

function debtEventBalanceDelta(event: Pick<DebtEvent, 'event_type' | 'amount'>) {
  const amount = Number(event.amount);
  return event.event_type === 'borrowing' ? amount : -amount;
}

function debtOutstandingFromEvents(debt: Debt, events: DebtEvent[]) {
  return Math.max(0, Number(debt.original_principal) + events.filter((event) => event.event_type === 'borrowing' || event.event_type === 'repayment').reduce((sum, event) => sum + debtEventBalanceDelta(event), 0));
}

function MetricCard({ label, value, note, icon, accent }: { label: string; value: number; note: string; icon: React.ReactNode; accent?: string }) {
  return <div className="card stat-card">
    <div className="stat-top"><span>{label}</span><span className="stat-icon" style={accent ? { color: accent, background: `${accent}14` } : undefined}>{icon}</span></div>
    <div className="stat-value">{formatCurrency(value)}</div><div className="stat-note">{note}</div>
  </div>;
}

function RateContext({ baseCurrency, comparisonCurrency, rates, source, updatedAt, onChange, options = currencyOptions }: { baseCurrency: string; comparisonCurrency: string; rates: NettData['fxRates']; source?: string; updatedAt?: string | null; onChange: (currency: string) => void; options?: string[] }) {
  const rate = rateFor(baseCurrency, comparisonCurrency, rates);
  return <div className="rate-context" aria-label="Currency conversion rate">
    <div className="rate-icon"><CircleDollarSign size={16} /></div>
    <div className="rate-copy"><strong>1 {baseCurrency} = {rate ? formatCurrency(rate, comparisonCurrency, false) : 'Rate unavailable'}</strong><span>{source || 'Nett rate history'}{updatedAt ? ` · updated ${formatShortDate(updatedAt)}` : ''}</span></div>
    <div className="rate-select" aria-label="Comparison currency"><span>Compare in</span><div className="rate-currency-buttons">{options.filter((item) => item !== baseCurrency).map((item) => <button key={item} className={comparisonCurrency === item ? 'selected' : ''} onClick={() => onChange(item)} aria-pressed={comparisonCurrency === item}>{item}</button>)}</div></div>
  </div>;
}

function AccountLogo({ account, size = 42 }: { account: Account; size?: number }) {
  const initials = (account.institution_name || account.name || 'A').trim().slice(0, 2).toUpperCase();
  return <div className="account-logo" style={{ width: size, height: size }} aria-hidden="true">
    {account.logo_url ? <img src={account.logo_url} alt="" /> : <span>{initials}</span>}
  </div>;
}

function AccountCard({ account, displayCurrency: requestedCurrency, rates }: { account: Account; displayCurrency: string; rates: NettData['fxRates'] }) {
  const displayCurrency = requestedCurrency === account.currency ? alternateCurrency(requestedCurrency) : requestedCurrency;
  const amount = Number(account.estimated_balance ?? account.verified_balance);
  const converted = displayAmount(amount, account.currency, displayCurrency, rates);
  return <div className={`account-card ${account.workspace_id === 'studio' ? 'business' : ''}`}>
    <AccountLogo account={account} size={34} />
    <div className="account-type"><span>{account.currency}</span><span>{account.type.replace('_', ' ')}</span></div>
    <div className="account-name">{account.name}</div>
    <div className="account-amount">{formatCurrency(amount, account.currency, true)}</div>
    <div className="account-converted">≈ {formatCurrency(converted, displayCurrency)} · {account.account_last4 ? `•••• ${account.account_last4} · ` : ''}{isStale(account.balance_verified_at, 31) ? 'Needs update' : 'Verified'}</div>
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

export default function NettApp({ initialTab = 'home' }: { initialTab?: NettTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [modal, setModal] = useState<Modal>(null);
  const [data, setData] = useState<NettData>(emptyData);
  const [session, setSession] = useState<{ userId: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [workspace, setWorkspace] = useState('everything');
  const [country, setCountry] = useState('all');
  const [comparisonCurrency, setComparisonCurrency] = useState('INR');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [movingAccount, setMovingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [spaceFilter, setSpaceFilter] = useState('all');
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [deletingSpace, setDeletingSpace] = useState<Space | null>(null);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);
  const [deletingCommitment, setDeletingCommitment] = useState<Commitment | null>(null);
  const [editingForecastScenario, setEditingForecastScenario] = useState<ForecastScenario | null>(null);
  const [deletingForecastScenario, setDeletingForecastScenario] = useState<ForecastScenario | null>(null);
  const [editingBudgetLine, setEditingBudgetLine] = useState<BudgetLine | null>(null);
  const [deletingBudgetLine, setDeletingBudgetLine] = useState<BudgetLine | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null);
  const [deletingReceivable, setDeletingReceivable] = useState<Receivable | null>(null);
  const [receivableEventId, setReceivableEventId] = useState<string | null>(null);
  const [editingDebtEvent, setEditingDebtEvent] = useState<DebtEvent | null>(null);
  const [deletingDebtEvent, setDeletingDebtEvent] = useState<DebtEvent | null>(null);
  const [debtEventDebtId, setDebtEventDebtId] = useState<string | null>(null);
  const [debtEventSpaceId, setDebtEventSpaceId] = useState<string | null>(null);
  const [debtEventType, setDebtEventType] = useState<'borrowing' | 'repayment'>('repayment');
  const [potEventSpace, setPotEventSpace] = useState<Space | null>(null);
  const [potEventType, setPotEventType] = useState<'borrowing' | 'repayment'>('repayment');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionSpaceId, setTransactionSpaceId] = useState<string | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null);
  const [editingCountry, setEditingCountry] = useState<CountryConfig | null>(null);
  const [deletingCountry, setDeletingCountry] = useState<CountryConfig | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<Snapshot | null>(null);
  const [deletingSnapshot, setDeletingSnapshot] = useState<Snapshot | null>(null);
  const [commitmentMode, setCommitmentMode] = useState<'bill' | 'recurring'>('bill');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState<Theme>('system');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [whatIf, setWhatIf] = useState('7000');
  const [whatIfResult, setWhatIfResult] = useState<number | null>(null);
  const [showContextSheet, setShowContextSheet] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [enabledCountries, setEnabledCountries] = useState<string[]>(['AE', 'IN']);
  const [enabledCurrencies, setEnabledCurrencies] = useState<string[]>(['AED', 'INR']);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [safeHorizon, setSafeHorizon] = useState(90);

  const displayCurrency = data.profile.display_currency;
  const configuredCountryOptions = data.countries.length ? data.countries.map((item) => ({ value: item.code, label: item.name })) : countryOptions;
  const configuredCountryLabel = (value: string) => configuredCountryOptions.find((item) => item.value === value)?.label || value;
  const activeCountryOptions = configuredCountryOptions;
  const activeCurrencyOptions = currencyOptions.filter((item) => enabledCurrencies.includes(item));
  const formCountryOptions = configuredCountryOptions;
  const formCurrencyOptions = currencyOptions;
  const scopedBase = data;
  const scoped = country === 'all' ? scopedBase : {
    ...scopedBase,
    accounts: scopedBase.accounts.filter((item) => (item.country_code || 'AE') === country),
    debts: scopedBase.debts.filter((item) => (item.country_code || 'AE') === country),
    debtEvents: scopedBase.debtEvents.filter((event) => scopedBase.debts.some((debt) => debt.id === event.debt_id && (debt.country_code || 'AE') === country)),
    receivables: scopedBase.receivables.filter((item) => (item.country_code || 'AE') === country),
    receivableEvents: scopedBase.receivableEvents.filter((event) => scopedBase.receivables.some((item) => item.id === event.receivable_id && (item.country_code || 'AE') === country)),
    investments: scopedBase.investments.filter((item) => (item.country_code || 'AE') === country),
    commitments: scopedBase.commitments.filter((item) => (item.country_code || 'AE') === country),
    reserves: scopedBase.reserves.filter((item) => (item.country_code || 'AE') === country),
    spaces: scopedBase.spaces.filter((item) => spaceCountry(item) === country),
    forecastScenarios: scopedBase.forecastScenarios.filter((item) => (item.country_code || 'AE') === country),
    budgetLines: scopedBase.budgetLines.filter((item) => (item.country_code || 'AE') === country),
    transactions: scopedBase.transactions.filter((item) => {
      const linkedAccount = scopedBase.accounts.find((account) => account.id === item.account_id);
      const linkedSpace = scopedBase.spaces.find((space) => space.id === item.space_id);
      return (linkedAccount?.country_code || (linkedSpace ? spaceCountry(linkedSpace) : 'AE')) === country;
    }),
  };
  const countedDebts = scoped.debts.filter((item) => loanMetadata(item).includeInNetWorth !== false);
  const countedReceivables = data.profile.count_owed_to_me ? scoped.receivables : scoped.receivables.map((item) => ({ ...item, include_in_net_worth: false }));
  const metrics = calculateMetrics(scoped.accounts, countedDebts, countedReceivables, scoped.investments, scoped.commitments, [], displayCurrency, data.fxRates);
  const staleAccounts = scoped.accounts.filter((item) => isStale(item.balance_verified_at, data.profile.freshness_days)).length;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('nett-theme', theme);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncBrowserChrome = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      const themeColor = resolved === 'amoled' ? '#000000' : resolved === 'dark' ? '#1a181f' : '#f4f4f6';
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', themeColor);
      document.documentElement.style.colorScheme = resolved === 'light' ? 'light' : 'dark';
    };
    syncBrowserChrome();
    media.addEventListener('change', syncBrowserChrome);
    return () => media.removeEventListener('change', syncBrowserChrome);
  }, [theme]);

  useEffect(() => {
    const saved = window.localStorage.getItem('nett-theme') as Theme | null;
    if (saved && ['light', 'dark', 'amoled', 'system'].includes(saved)) setTheme(saved);
    const savedComparison = window.localStorage.getItem('nett-comparison-currency');
    if (savedComparison && currencyOptions.includes(savedComparison)) setComparisonCurrency(savedComparison);
  }, []);

  useEffect(() => {
    const matched = (Object.entries(routeForTab).find(([, route]) => route === pathname)?.[0] || initialTab) as NettTab;
    setTab(matched);
  }, [pathname, initialTab]);

  function navigateTo(nextTab: Tab) {
    if (nextTab === 'activity') { router.push(routeForTab.spends as Route); return; }
    if (nextTab === 'plan') { router.push(routeForTab.forecast as Route); return; }
    if (nextTab === 'more') { setShowMobileMore(true); return; }
    setTab(nextTab);
    router.push(routeForTab[nextTab] as Route);
    setShowMobileMore(false);
  }

  useEffect(() => {
    if (comparisonCurrency === displayCurrency || !activeCurrencyOptions.includes(comparisonCurrency)) setComparisonCurrency(activeCurrencyOptions.find((item) => item !== displayCurrency) || displayCurrency);
    window.localStorage.setItem('nett-comparison-currency', comparisonCurrency);
  }, [comparisonCurrency, displayCurrency, activeCurrencyOptions]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) { setLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: auth }) => {
      if (!mounted) return;
      if (!auth.session) { window.location.href = '/login?mode=signup'; return; }
      setSession({ userId: auth.session.user.id, email: auth.session.user.email });
      const userId = auth.session.user.id;
      const [profile, workspaces, accounts, debts, debtEvents, receivables, receivableEvents, investments, commitments, reserves, transactions, creditCards, spaces, investmentValues, fxRates, forecastScenarios, budgetLines, countries, snapshots, accountSnapshots] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('workspaces').select('*').eq('user_id', userId).eq('archived', false).order('created_at'),
        supabase.from('accounts').select('*').eq('user_id', userId).eq('archived', false).order('sort_order'),
        supabase.from('debts').select('*').eq('user_id', userId).neq('status', 'archived').order('created_at'),
        supabase.from('debt_events').select('*').eq('user_id', userId).order('occurred_at', { ascending: false }).limit(300),
        supabase.from('receivables').select('*').eq('user_id', userId).neq('status', 'archived').order('created_at', { ascending: false }),
        supabase.from('receivable_events').select('*').eq('user_id', userId).order('occurred_at', { ascending: false }).limit(300),
        supabase.from('investments').select('*').eq('user_id', userId).eq('archived', false).order('created_at'),
        supabase.from('commitments').select('*').eq('user_id', userId).neq('status', 'archived').order('due_date'),
        supabase.from('reserves').select('*').eq('user_id', userId).order('due_date'),
        supabase.from('transactions').select('*').eq('user_id', userId).order('occurred_at', { ascending: false }).limit(100),
        supabase.from('credit_cards').select('*').eq('user_id', userId),
        supabase.from('spaces').select('*').eq('user_id', userId).eq('archived', false).order('created_at'),
        supabase.from('investment_values').select('*').eq('user_id', userId).order('valued_at', { ascending: false }),
        supabase.from('fx_rates').select('*').eq('user_id', userId).order('effective_at', { ascending: false }),
        supabase.from('forecast_scenarios').select('*').eq('user_id', userId).order('month_offset'),
        supabase.from('budget_lines').select('*').eq('user_id', userId).order('month', { ascending: false }),
        supabase.from('countries').select('*').eq('user_id', userId).order('sort_order').order('name'),
        supabase.from('snapshots').select('*').eq('user_id', userId).order('snapshot_date', { ascending: false }).limit(120),
        supabase.from('account_snapshots').select('*').eq('user_id', userId).order('verified_at', { ascending: false }).limit(1000),
      ]);
      if (!mounted) return;
      const latestValues = new Map<string, InvestmentValue>();
      for (const value of ((investmentValues.data || []) as InvestmentValue[])) if (!latestValues.has(value.investment_id)) latestValues.set(value.investment_id, value);
      const loadedInvestments = (investments.data || []).map((item) => { const latest = latestValues.get(item.id); return { ...item, latest_value: latest?.value ?? null, latest_value_at: latest?.valued_at ?? null, latest_value_source: latest?.source ?? null }; });
      const loadedRates = (fxRates.data || []).reduce((result, item) => ({ ...result, [`${item.base_currency}_${item.quote_currency}`]: Number(item.rate) }), { ...currentRates() });
      const loadedProfile = { ...currentProfile(), ...(profile.data || {}), id: userId };
      const savedCountries = profile.data?.enabled_countries || readStoredPreference(`nett-enabled-countries-${userId}`);
      const savedCurrencies = profile.data?.enabled_currencies || readStoredPreference(`nett-enabled-currencies-${userId}`);
      setEnabledCountries(normalizePreferenceValues(savedCountries, ['AE', 'IN'], supportedCountryCodes));
      setEnabledCurrencies(normalizePreferenceValues(savedCurrencies, ['AED', 'INR'], currencyOptions));
      setPreferencesLoaded(true);
      setTheme((profile.data?.theme as Theme) || loadedProfile.theme || 'system');
       setData((current) => ({ ...current, profile: loadedProfile, workspaces: workspaces.data || [], accounts: (accounts.data || []).map(hydrateAccountMetadata), debts: debts.data || [], debtEvents: (debtEvents.data || []) as DebtEvent[], receivables: receivables.data || [], receivableEvents: (receivableEvents.data || []) as ReceivableEvent[], investments: loadedInvestments, commitments: commitments.data || [], reserves: reserves.data || [], transactions: transactions.data || [], creditCards: (creditCards.data || []) as CreditCardRecord[], spaces: (spaces.data || []) as Space[], investmentValues: (investmentValues.data || []) as InvestmentValue[], forecastScenarios: (forecastScenarios.data || []) as ForecastScenario[], budgetLines: (budgetLines.data || []) as BudgetLine[], countries: (countries.data || []) as CountryConfig[], snapshots: (snapshots.data || []) as Snapshot[], accountSnapshots: (accountSnapshots.data || []) as AccountSnapshot[], fxRates: loadedRates, fxRateSource: fxRates.data?.length ? 'Supabase rate history' : 'Nett baseline rates', fxRatesUpdatedAt: fxRates.data?.[0]?.effective_at || null }));
      void fetchLiveRates().then(async (liveRates) => {
        if (!mounted || !Object.keys(liveRates).length) return;
        const effectiveAt = new Date().toISOString();
        setData((current) => ({ ...current, fxRates: { ...current.fxRates, ...liveRates }, fxRateSource: 'Open Exchange Rates feed', fxRatesUpdatedAt: effectiveAt }));
        await Promise.all(Object.entries(liveRates).map(([pair, rate]) => { const [base_currency, quote_currency] = pair.split('_'); return supabase.from('fx_rates').insert({ user_id: userId, base_currency, quote_currency, rate, source: 'open.er-api.com', effective_at: effectiveAt }); }));
      }).catch(() => undefined);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, auth) => setSession(auth ? { userId: auth.user.id, email: auth.user.email } : null));
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer); }, [toast]);

  function notify(message: string) { setToast(message); }

  function openTransactionModal(spaceId?: string | null, transaction?: Transaction | null) {
    setEditingTransaction(transaction || null);
    setTransactionSpaceId(spaceId || transaction?.space_id || null);
    setModal('transaction');
  }

  function openDebtEventModal(debtId?: string | null, eventType: 'borrowing' | 'repayment' = 'repayment', event?: DebtEvent | null, spaceId?: string | null) {
    setEditingDebtEvent(event || null);
    setDebtEventDebtId(debtId || event?.debt_id || null);
    setDebtEventSpaceId(spaceId || null);
    setDebtEventType(eventType);
    setModal('debt-event');
  }

  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (supabase) await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function updateDisplayCurrency(nextCurrency: string) {
    if (nextCurrency === displayCurrency) return;
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('profiles').update({ display_currency: nextCurrency }).eq('id', session.userId); if (error) { notify(`Could not change currency: ${error.message}`); return; } }
    setData((current) => ({ ...current, profile: { ...current.profile, display_currency: nextCurrency } })); notify(`Showing totals in ${nextCurrency}.`);
  }

  async function updateTheme(nextTheme: Theme) {
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('profiles').update({ theme: nextTheme }).eq('id', session.userId); if (error) { notify(`Could not save theme: ${error.message}`); return; } }
    setTheme(nextTheme); notify(`Theme changed to ${nextTheme}.`);
  }

  async function updateCountOwedToMe(nextValue: boolean) {
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('profiles').update({ count_owed_to_me: nextValue }).eq('id', session.userId); if (error && !isMissingFinancialMigration(error)) { notify(`Could not save net-worth preference: ${error.message}`); return; } }
    setData((current) => ({ ...current, profile: { ...current.profile, count_owed_to_me: nextValue } }));
    notify(nextValue ? 'Money owed to you now counts in net worth.' : 'Money owed to you is kept outside net worth.');
  }

  async function refreshFxRates() {
    try {
      const rates = await fetchLiveRates();
      const effectiveAt = new Date().toISOString();
      const supabase = getSupabaseBrowser();
      if (supabase && session) await Promise.all(Object.entries(rates).map(([pair, rate]) => { const [base_currency, quote_currency] = pair.split('_'); return supabase.from('fx_rates').insert({ user_id: session.userId, base_currency, quote_currency, rate, source: 'open.er-api.com', effective_at: effectiveAt }); }));
      setData((current) => ({ ...current, fxRates: { ...current.fxRates, ...rates }, fxRateSource: 'Open Exchange Rates feed', fxRatesUpdatedAt: effectiveAt }));
      notify('Exchange rates refreshed.');
    } catch { notify('Exchange rates could not be refreshed right now.'); }
  }

  async function saveManualRate(form: HTMLFormElement) {
    const values = new FormData(form);
    const base = String(values.get('base_currency') || 'AED');
    const quote = String(values.get('quote_currency') || 'INR');
    const rate = Number(values.get('rate'));
    if (base === quote || rate <= 0) { notify('Choose two different currencies and a positive rate.'); return; }
    const effectiveAt = new Date().toISOString();
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('fx_rates').insert({ user_id: session.userId, base_currency: base, quote_currency: quote, rate, source: 'manual', effective_at: effectiveAt }); if (error) { notify(`Could not save rate: ${error.message}`); return; } }
    setData((current) => ({ ...current, fxRates: { ...current.fxRates, [`${base}_${quote}`]: rate, [`${quote}_${base}`]: 1 / rate }, fxRateSource: 'Manual override', fxRatesUpdatedAt: effectiveAt }));
    notify(`Saved 1 ${base} = ${rate} ${quote}.`);
  }

  useEffect(() => {
    if (!session || !preferencesLoaded) return;
    window.localStorage.setItem(`nett-enabled-countries-${session.userId}`, JSON.stringify(enabledCountries));
    window.localStorage.setItem(`nett-enabled-currencies-${session.userId}`, JSON.stringify(enabledCurrencies));
    const supabase = getSupabaseBrowser();
    if (supabase) void supabase.from('profiles').update({ enabled_countries: enabledCountries, enabled_currencies: enabledCurrencies }).eq('id', session.userId);
  }, [enabledCountries, enabledCurrencies, session, preferencesLoaded]);

  function toggleCountry(code: string) {
    if (enabledCountries.includes(code) && enabledCountries.length === 1) { notify('Keep at least one country enabled.'); return; }
    const nextCountries = enabledCountries.includes(code) ? enabledCountries.filter((item) => item !== code) : [...enabledCountries, code];
    setEnabledCountries(nextCountries);
    setData((current) => ({ ...current, profile: { ...current.profile, enabled_countries: nextCountries } }));
    if (country === code) setCountry('all');
  }

  function toggleCurrency(code: string) {
    if (enabledCurrencies.includes(code) && enabledCurrencies.length === 1) { notify('Keep at least one currency enabled.'); return; }
    if (code === displayCurrency) { notify(`${displayCurrency} is your totals currency. Choose another currency before removing it.`); return; }
    const nextCurrencies = enabledCurrencies.includes(code) ? enabledCurrencies.filter((item) => item !== code) : [...enabledCurrencies, code];
    setEnabledCurrencies(nextCurrencies);
    setData((current) => ({ ...current, profile: { ...current.profile, enabled_currencies: nextCurrencies } }));
    if (comparisonCurrency === code) setComparisonCurrency(nextCurrencies.find((item) => item !== displayCurrency) || displayCurrency);
  }

  function resetViewOptions() {
    setEnabledCountries(['AE', 'IN']);
    setEnabledCurrencies(['AED', 'INR']);
    setData((current) => ({ ...current, profile: { ...current.profile, enabled_countries: ['AE', 'IN'], enabled_currencies: ['AED', 'INR'] } }));
    setCountry('all');
    setComparisonCurrency(displayCurrency === 'AED' ? 'INR' : 'AED');
    notify('Restored UAE, India, AED and INR.');
  }

  async function saveAccount(form: HTMLFormElement) {
    const formData = new FormData(form);
    const accountId = String(formData.get('id') || '') || crypto.randomUUID();
    const last4 = String(formData.get('account_last4') || '').trim() || null;
    if (last4 && !/^\d{4}$/.test(last4)) { notify('Last 4 digits must contain exactly four numbers.'); return; }
    const previous = data.accounts.find((account) => account.id === accountId);
    const ownershipType = String(formData.get('ownership_type') || 'personal') as 'personal' | 'business';
    const ownerWorkspace = data.workspaces.find((item) => item.kind === ownershipType) || data.workspaces.find((item) => item.id === String(formData.get('workspace_id') || '')) || data.workspaces[0];
    const balance = Number(formData.get('balance'));
    const verifiedAt = String(formData.get('as_of_date') || new Date().toISOString().slice(0, 10));
    const isVerified = formData.get('verified') === 'true';
    const item: Account = { id: accountId, workspace_id: ownerWorkspace?.id || previous?.workspace_id || '', name: String(formData.get('name')).trim(), type: String(formData.get('type')), currency: String(formData.get('currency')), verified_balance: balance, estimated_balance: balance, balance_verified_at: isVerified ? `${verifiedAt}T12:00:00.000Z` : null, include_net_worth: formData.get('include_net_worth') === 'true', include_liquidity: formData.get('include_liquidity') === 'true', institution_name: String(formData.get('institution_name') || '').trim() || null, account_last4: last4, country_code: String(formData.get('country_code') || countryForCurrency(String(formData.get('currency')))), logo_url: String(formData.get('logo_url') || '').trim() || null, notes: String(formData.get('notes') || '').trim() || null, ownership_type: ownershipType };
    if (!item.workspace_id || !item.name || !Number.isFinite(balance)) { notify('Add an account name and valid balance.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase && session) {
      const accountPayload = { id: item.id, user_id: session.userId, workspace_id: item.workspace_id, name: item.name, type: item.type, currency: item.currency, verified_balance: item.verified_balance, estimated_balance: item.estimated_balance, balance_verified_at: item.balance_verified_at, include_net_worth: item.include_net_worth, include_liquidity: item.include_liquidity, institution_name: item.institution_name, account_last4: item.account_last4, country_code: item.country_code, logo_url: item.logo_url, notes: item.notes, ownership_type: item.ownership_type };
      const legacyPayload = { ...accountPayload, institution_name: undefined, account_last4: undefined, country_code: undefined, logo_url: undefined, ownership_type: undefined, notes: JSON.stringify({ nett_account_metadata: { institution_name: item.institution_name, account_last4: item.account_last4, country_code: item.country_code, logo_url: item.logo_url, ownership_type: item.ownership_type, notes: item.notes } }) };
      const result = previous ? await supabase.from('accounts').update(accountPayload).eq('id', item.id).eq('user_id', session.userId) : await insertWithLegacyFallback(supabase, 'accounts', accountPayload, legacyPayload);
      if (result.error && isMissingFinancialMigration(result.error)) {
        const fallback = previous ? await supabase.from('accounts').update(legacyPayload).eq('id', item.id).eq('user_id', session.userId) : await supabase.from('accounts').insert(legacyPayload);
        if (fallback.error) { notify(`Could not save account: ${fallback.error.message}`); return; }
      } else if (result.error) { notify(`Could not save account: ${result.error.message}`); return; }
    }
    setData((current) => ({ ...current, accounts: previous ? current.accounts.map((account) => account.id === item.id ? item : account) : [...current.accounts, item] }));
    setModal(null); setEditingAccount(null); notify(previous ? `${item.name} updated.` : `${item.name} added to Nett.`);
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

  async function moveAccountCountry(form: HTMLFormElement) {
    const values = new FormData(form);
    const accountId = String(values.get('account_id'));
    const nextCountry = String(values.get('country_code'));
    const account = data.accounts.find((item) => item.id === accountId);
    if (!account || !nextCountry || account.country_code === nextCountry) { setModal(null); setMovingAccount(null); return; }
    const supabase = getSupabaseBrowser();
    if (supabase && session) {
      const { error } = await supabase.from('accounts').update({ country_code: nextCountry }).eq('id', account.id).eq('user_id', session.userId);
      if (error && !isMissingFinancialMigration(error)) { notify(`Could not move account: ${error.message}`); return; }
      if (error && isMissingFinancialMigration(error)) { notify('The account-country migration is still being applied. Try again in a moment.'); return; }
    }
    setData((current) => ({ ...current, accounts: current.accounts.map((item) => item.id === account.id ? { ...item, country_code: nextCountry } : item) }));
    setModal(null); setMovingAccount(null); notify(`${account.name} moved to ${countryLabel(nextCountry)}. Linked activity now follows that country.`);
  }

  async function deleteAccount(account: Account) {
    const supabase = getSupabaseBrowser();
    if (supabase && session) {
      const { error } = await supabase.from('accounts').delete().eq('id', account.id).eq('user_id', session.userId);
      if (error) { notify(`Could not delete account: ${error.message}`); return; }
    }
    setData((current) => ({
      ...current,
      accounts: current.accounts.filter((item) => item.id !== account.id),
      creditCards: current.creditCards.filter((item) => item.account_id !== account.id),
      transactions: current.transactions.filter((item) => item.account_id !== account.id),
    }));
    setModal(null); setDeletingAccount(null); setEditingAccount(null);
    notify(`${account.name} deleted.`);
  }

  async function createTransaction(form: HTMLFormElement) {
    const formData = new FormData(form);
    const accountId = String(formData.get('account_id'));
    const account = data.accounts.find((item) => item.id === accountId);
    const spaceId = String(formData.get('space_id') || '') || null;
    const linkedSpace = data.spaces.find((item) => item.id === spaceId);
    if (!session || (!account && !linkedSpace)) { notify('Choose an account or spend tracker before saving.'); return; }
    const item: Transaction = { id: editingTransaction?.id || crypto.randomUUID(), workspace_id: account?.workspace_id || linkedSpace?.workspace_id || '', account_id: account?.id || null, space_id: spaceId, type: String(formData.get('type')) as Transaction['type'], amount: Number(formData.get('amount')), currency: String(formData.get('currency') || account?.currency || linkedSpace?.currency || displayCurrency), category: String(formData.get('category')), description: String(formData.get('description')), occurred_at: String(formData.get('occurred_at') || new Date().toISOString()) };
    if (Number(item.amount) <= 0 || !item.category) { notify('Enter a positive amount and a category.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase && editingTransaction) {
      const previous = data.transactions.find((entry) => entry.id === editingTransaction.id);
      if (!previous) { notify('That ledger entry is no longer available.'); return; }
      const result = await supabase.from('transactions').update({ workspace_id: item.workspace_id, account_id: item.account_id, space_id: item.space_id, type: item.type, amount: item.amount, currency: item.currency, category: item.category, description: item.description, occurred_at: item.occurred_at }).eq('id', item.id).eq('user_id', session.userId);
      if (result.error) { notify(`Could not update ledger entry: ${result.error.message}`); return; }
      const previousDelta = transactionBalanceDelta(previous);
      const nextDelta = transactionBalanceDelta(item);
      const accountDeltas = new Map<string, number>();
      if (previous.account_id) accountDeltas.set(previous.account_id, (accountDeltas.get(previous.account_id) || 0) - previousDelta);
      if (account?.id) accountDeltas.set(account.id, (accountDeltas.get(account.id) || 0) + nextDelta);
      const updates = await Promise.all([...accountDeltas.entries()].map(([id, delta]) => { const accountState = data.accounts.find((entry) => entry.id === id); return supabase.from('accounts').update({ estimated_balance: Number(accountState?.estimated_balance ?? accountState?.verified_balance ?? 0) + delta }).eq('id', id).eq('user_id', session.userId); }));
      const failed = updates.find((result) => result.error);
      if (failed?.error) { notify(`Ledger entry updated, but the account balance failed: ${failed.error.message}`); return; }
      setData((current) => ({ ...current, transactions: current.transactions.map((entry) => entry.id === item.id ? item : entry), accounts: current.accounts.map((entry) => { const delta = accountDeltas.get(entry.id); return delta ? { ...entry, estimated_balance: Number(entry.estimated_balance ?? entry.verified_balance ?? 0) + delta } : entry; }) }));
      setModal(null); setEditingTransaction(null); setTransactionSpaceId(null); notify('Ledger entry updated.');
      return;
    }
    if (supabase) {
      const delta = transactionBalanceDelta(item);
      const { data: saved, error } = await supabase.rpc('nett_post_transaction', { p_user_id: session.userId, p_transaction_id: item.id, p_workspace_id: item.workspace_id, p_account_id: item.account_id, p_space_id: item.space_id, p_type: item.type, p_amount: item.amount, p_currency: item.currency, p_category: item.category, p_description: item.description, p_occurred_at: item.occurred_at, p_balance_delta: item.account_id ? delta : 0 });
      if (error && !isMissingFinancialMigration(error)) { notify(`Could not save activity: ${error.message}`); return; }
      if (error && isMissingFinancialMigration(error)) { const direct = await supabase.from('transactions').insert({ user_id: session.userId, ...item }); if (direct.error) { notify(`Could not save activity: ${direct.error.message}`); return; } if (account) { const balanceUpdate = await supabase.from('accounts').update({ estimated_balance: Number(account.estimated_balance ?? account.verified_balance) + delta }).eq('id', account.id).eq('user_id', session.userId); if (balanceUpdate.error) { notify(`Activity saved, but balance update failed: ${balanceUpdate.error.message}`); return; } } }
      if (!error && !saved) { notify('Activity was not confirmed by Supabase.'); return; }
    }
    setData((current) => ({ ...current, transactions: [item, ...current.transactions], accounts: current.accounts.map((accountItem) => account && accountItem.id === account.id ? { ...accountItem, estimated_balance: Number(accountItem.estimated_balance ?? accountItem.verified_balance) + transactionBalanceDelta(item) } : accountItem) }));
    setModal(null); setTransactionSpaceId(null); notify('Activity saved. Your balance is now estimated until the next check-in.');
  }

  async function deleteTransaction(item: Transaction) {
    if (!session) { notify('Sign in before deleting a ledger entry.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const { error } = await supabase.from('transactions').delete().eq('id', item.id).eq('user_id', session.userId);
      if (error) { notify(`Could not delete ledger entry: ${error.message}`); return; }
      if (item.account_id) {
        const account = data.accounts.find((entry) => entry.id === item.account_id);
        const balanceUpdate = await supabase.from('accounts').update({ estimated_balance: Number(account?.estimated_balance ?? account?.verified_balance ?? 0) - transactionBalanceDelta(item) }).eq('id', item.account_id).eq('user_id', session.userId);
        if (balanceUpdate.error) { notify(`Entry deleted, but the account balance failed: ${balanceUpdate.error.message}`); return; }
      }
    }
    setData((current) => ({ ...current, transactions: current.transactions.filter((entry) => entry.id !== item.id), accounts: current.accounts.map((entry) => entry.id === item.account_id ? { ...entry, estimated_balance: Number(entry.estimated_balance ?? entry.verified_balance ?? 0) - transactionBalanceDelta(item) } : entry) }));
    setModal(null); setDeletingTransaction(null); notify('Ledger entry deleted.');
  }

  async function createCommitment(form: HTMLFormElement) {
    const values = new FormData(form);
    const item: Commitment = { id: crypto.randomUUID(), workspace_id: String(values.get('workspace_id')), name: String(values.get('name')).trim(), amount: Number(values.get('amount')), currency: String(values.get('currency')), due_date: String(values.get('due_date')), recurrence: String(values.get('recurrence')), importance: String(values.get('importance')) as Commitment['importance'], status: 'open', expected_income: values.get('expected_income') === 'true', confidence: String(values.get('confidence') || 'confirmed'), country_code: String(values.get('country_code') || 'AE'), notes: String(values.get('notes') || '') || null };
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await insertWithLegacyFallback(supabase, 'commitments', { user_id: session.userId, ...item }, { user_id: session.userId, ...item, country_code: undefined }); if (error) { notify(`Could not save commitment: ${error.message}`); return; } }
    setData((current) => ({ ...current, commitments: [...current.commitments, item].sort((a, b) => a.due_date.localeCompare(b.due_date)) }));
    setModal(null); notify(`${item.name} added to your future timeline.`);
  }

  async function saveCommitment(form: HTMLFormElement) {
    const values = new FormData(form);
    const currency = String(values.get('currency') || 'AED');
    const requestedCountry = String(values.get('country_code') || 'auto');
    const entryType = String(values.get('entry_type') || commitmentMode) as 'bill' | 'recurring';
    const dueDate = String(values.get('due_date') || values.get('start_date') || new Date().toISOString().slice(0, 10));
    const item: Commitment = {
      id: editingCommitment?.id || crypto.randomUUID(),
      workspace_id: String(values.get('workspace_id') || editingCommitment?.workspace_id || data.workspaces[0]?.id || ''),
      name: String(values.get('name') || '').trim(),
      amount: Number(values.get('amount')),
      currency,
      due_date: dueDate,
      recurrence: String(values.get('recurrence') || (entryType === 'recurring' ? 'monthly' : 'one_time')),
      importance: 'mandatory',
      status: editingCommitment?.status || 'open',
      expected_income: entryType === 'recurring' && String(values.get('kind') || 'expense') === 'income',
      confidence: 'confirmed',
      country_code: requestedCountry === 'auto' ? countryForCurrency(currency) : requestedCountry,
      notes: String(values.get('notes') || '').trim() || null,
      category: String(values.get('category') || 'General'),
      active: entryType === 'recurring' ? values.get('active') === 'true' : true,
      day_of_month: entryType === 'recurring' ? Number(values.get('day_of_month') || 0) || null : null,
      entry_type: entryType,
    };
    if (!item.name || !item.workspace_id || Number(item.amount) <= 0 || !item.due_date) { notify(`Add a name, positive amount and ${entryType === 'bill' ? 'due' : 'start'} date.`); return; }
    const supabase = getSupabaseBrowser();
    if (supabase && session) {
      const payload = { user_id: session.userId, ...item };
      const legacyPayload = { ...payload, country_code: undefined, category: undefined, active: undefined, day_of_month: undefined, entry_type: undefined };
      const result = editingCommitment ? await supabase.from('commitments').update(payload).eq('id', item.id).eq('user_id', session.userId) : await insertWithLegacyFallback(supabase, 'commitments', payload, legacyPayload);
      if (result.error && isMissingFinancialMigration(result.error) && editingCommitment) { const fallback = await supabase.from('commitments').update(legacyPayload).eq('id', item.id).eq('user_id', session.userId); if (fallback.error) { notify(`Could not save ${entryType}: ${fallback.error.message}`); return; } } else if (result.error) { notify(`Could not save ${entryType}: ${result.error.message}`); return; }
    }
    setData((current) => ({ ...current, commitments: [...current.commitments.filter((entry) => entry.id !== item.id), item].sort((a, b) => a.due_date.localeCompare(b.due_date)) }));
    setModal(null); setEditingCommitment(null); notify(`${item.name} ${editingCommitment ? 'updated' : entryType === 'bill' ? 'added to bills' : 'added to recurring'}.`);
  }

  async function toggleCommitmentStatus(item: Commitment) {
    const nextStatus = item.status === 'completed' ? 'open' : 'completed';
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('commitments').update({ status: nextStatus }).eq('id', item.id).eq('user_id', session.userId); if (error) { notify(`Could not update bill: ${error.message}`); return; } }
    setData((current) => ({ ...current, commitments: current.commitments.map((entry) => entry.id === item.id ? { ...entry, status: nextStatus } : entry) }));
    notify(nextStatus === 'completed' ? `${item.name} marked paid.` : `${item.name} marked unpaid.`);
  }

  async function toggleRecurringActive(item: Commitment) {
    const active = item.active === false;
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('commitments').update({ active }).eq('id', item.id).eq('user_id', session.userId); if (error && !isMissingFinancialMigration(error)) { notify(`Could not update recurring item: ${error.message}`); return; } }
    setData((current) => ({ ...current, commitments: current.commitments.map((entry) => entry.id === item.id ? { ...entry, active } : entry) }));
  }

  async function deleteCommitment(item: Commitment) {
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('commitments').delete().eq('id', item.id).eq('user_id', session.userId); if (error) { notify(`Could not delete commitment: ${error.message}`); return; } }
    setData((current) => ({ ...current, commitments: current.commitments.filter((entry) => entry.id !== item.id) })); setModal(null); setDeletingCommitment(null); notify(`${item.name} deleted.`);
  }

  async function saveForecastScenario(form: HTMLFormElement) {
    const values = new FormData(form);
    const item: ForecastScenario = {
      id: editingForecastScenario?.id || crypto.randomUUID(),
      workspace_id: String(values.get('workspace_id')),
      name: String(values.get('name') || '').trim(),
      kind: String(values.get('kind') || 'expense') as ForecastScenario['kind'],
      amount: Number(values.get('amount') || 0),
      currency: String(values.get('currency') || 'AED'),
      month_offset: Math.max(0, Math.min(60, Number(values.get('month_offset') || 0))),
      country_code: String(values.get('country_code') || 'AE'),
      notes: String(values.get('notes') || '') || null,
      recurrence: String(values.get('recurrence') || 'one_time') as ForecastScenario['recurrence'],
      duration_months: Number(values.get('duration_months') || 0) || null,
      active: values.get('active') === 'true',
    };
    if (!item.name || Number(item.amount) <= 0 || !session) { notify('Add a name and a positive scenario amount.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const payload = { user_id: session.userId, ...item };
      const result = editingForecastScenario
        ? await supabase.from('forecast_scenarios').update(payload).eq('id', item.id).eq('user_id', session.userId)
        : await insertWithLegacyFallback(supabase, 'forecast_scenarios', payload, { ...payload, recurrence: undefined, duration_months: undefined, active: undefined });
      if (result.error && editingForecastScenario && isMissingFinancialMigration(result.error)) {
        const fallback = await supabase.from('forecast_scenarios').update({ ...payload, recurrence: undefined, duration_months: undefined, active: undefined }).eq('id', item.id).eq('user_id', session.userId);
        if (fallback.error) { notify(`Could not save scenario: ${fallback.error.message}`); return; }
      } else if (result.error) { notify(`Could not save scenario: ${result.error.message}`); return; }
    }
    setData((current) => ({ ...current, forecastScenarios: [...current.forecastScenarios.filter((entry) => entry.id !== item.id), item].sort((a, b) => a.month_offset - b.month_offset) }));
    setModal(null); setEditingForecastScenario(null); notify(`${item.name} scenario ${editingForecastScenario ? 'updated' : 'saved'}.`);
  }

  async function deleteForecastScenario(item: ForecastScenario) {
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('forecast_scenarios').delete().eq('id', item.id).eq('user_id', session.userId); if (error) { notify(`Could not delete scenario: ${error.message}`); return; } }
    setData((current) => ({ ...current, forecastScenarios: current.forecastScenarios.filter((entry) => entry.id !== item.id) }));
    setModal(null); setDeletingForecastScenario(null); notify(`${item.name} scenario deleted.`);
  }

  async function toggleForecastScenario(item: ForecastScenario) {
    const active = item.active === false;
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('forecast_scenarios').update({ active }).eq('id', item.id).eq('user_id', session.userId); if (error && !isMissingFinancialMigration(error)) { notify(`Could not update scenario: ${error.message}`); return; } }
    setData((current) => ({ ...current, forecastScenarios: current.forecastScenarios.map((entry) => entry.id === item.id ? { ...entry, active } : entry) }));
  }

  async function saveBudgetLine(form: HTMLFormElement) {
    const values = new FormData(form);
    const month = String(values.get('month') || selectedMonth).slice(0, 7);
    const item: BudgetLine = {
      id: editingBudgetLine?.id || crypto.randomUUID(),
      workspace_id: String(values.get('workspace_id')),
      month,
      name: String(values.get('name') || '').trim(),
      kind: String(values.get('kind') || 'expense') as BudgetLine['kind'],
      category: String(values.get('category') || '') || null,
      amount: Number(values.get('amount') || 0),
      currency: String(values.get('currency') || 'AED'),
      country_code: String(values.get('country_code') || 'AE'),
      notes: String(values.get('notes') || '') || null,
      is_template: values.get('is_template') !== 'false',
    };
    if (!item.name || !month || Number(item.amount) <= 0 || !session) { notify('Add a name, month and positive planned amount.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const payload = { user_id: session.userId, ...item, month: `${month}-01` };
      const result = editingBudgetLine
        ? await supabase.from('budget_lines').update(payload).eq('id', item.id).eq('user_id', session.userId)
        : await insertWithLegacyFallback(supabase, 'budget_lines', payload, { ...payload, is_template: undefined });
      if (result.error && editingBudgetLine && isMissingFinancialMigration(result.error)) {
        const fallback = await supabase.from('budget_lines').update({ ...payload, is_template: undefined }).eq('id', item.id).eq('user_id', session.userId);
        if (fallback.error) { notify(`Could not save budget line: ${fallback.error.message}`); return; }
      } else if (result.error) { notify(`Could not save budget line: ${result.error.message}`); return; }
    }
    setData((current) => ({ ...current, budgetLines: [...current.budgetLines.filter((entry) => entry.id !== item.id), item].sort((a, b) => a.month.localeCompare(b.month)) }));
    setSelectedMonth(month); setModal(null); setEditingBudgetLine(null); notify(`${item.name} budget line ${editingBudgetLine ? 'updated' : 'added'}.`);
  }

  async function deleteBudgetLine(item: BudgetLine) {
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('budget_lines').delete().eq('id', item.id).eq('user_id', session.userId); if (error) { notify(`Could not delete budget line: ${error.message}`); return; } }
    setData((current) => ({ ...current, budgetLines: current.budgetLines.filter((entry) => entry.id !== item.id) }));
    setModal(null); setDeletingBudgetLine(null); notify(`${item.name} budget line deleted.`);
  }

  async function importRecurringToBudget() {
    if (!session) return;
    const recurring = data.commitments.filter((item) => item.entry_type === 'recurring' && item.active !== false);
    if (!recurring.length) { notify('Add recurring income or expenses first.'); return; }
    const existing = new Set(data.budgetLines.filter((item) => item.is_template).map((item) => `${item.kind}:${item.name.trim().toLowerCase()}`));
    const imported: BudgetLine[] = recurring.filter((item) => !existing.has(`${item.expected_income ? 'income' : 'expense'}:${item.name.trim().toLowerCase()}`)).map((item) => {
      const amount = Number(item.amount);
      const monthlyAmount = item.recurrence === 'weekly' ? amount * 52 / 12 : item.recurrence === 'yearly' ? amount / 12 : amount;
      return { id: crypto.randomUUID(), workspace_id: item.workspace_id, month: selectedMonth, name: item.name, kind: item.expected_income ? 'income' : 'expense', category: item.category || null, amount: Number(monthlyAmount.toFixed(2)), currency: item.currency, country_code: item.country_code || countryForCurrency(item.currency), notes: 'Imported from Recurring', is_template: true };
    });
    if (!imported.length) { notify('Your recurring items are already in the budget template.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const payload = imported.map((item) => ({ user_id: session.userId, ...item, month: `${selectedMonth}-01` }));
      let result = await supabase.from('budget_lines').insert(payload);
      if (result.error && isMissingFinancialMigration(result.error)) result = await supabase.from('budget_lines').insert(payload.map(({ is_template: _isTemplate, ...item }) => item));
      if (result.error) { notify(`Could not import recurring items: ${result.error.message}`); return; }
    }
    setData((current) => ({ ...current, budgetLines: [...current.budgetLines, ...imported] }));
    notify(`${imported.length} recurring item${imported.length === 1 ? '' : 's'} added to your budget template.`);
  }

  async function createDebtEvent(form: HTMLFormElement) {
    const values = new FormData(form); const debtId = String(values.get('debt_id')); const eventType = String(values.get('event_type')) as 'borrowing' | 'repayment'; const amount = Number(values.get('amount')); const target = data.debts.find((item) => item.id === debtId); if (!target || amount <= 0 || !session) { notify('Choose a debt and enter a positive amount.'); return; }
    const outstanding = Math.max(0, Number(target.outstanding) + (eventType === 'borrowing' ? amount : -amount));
    const spaceId = String(values.get('space_id') || '') || null;
    const sourceAccountId = String(values.get('source_account_id') || '') || null;
    const supabase = getSupabaseBrowser();
    if (supabase) { const rpc = await supabase.rpc('nett_apply_debt_event', { p_user_id: session.userId, p_debt_id: debtId, p_event_type: eventType, p_amount: amount, p_currency: target.currency, p_source_account_id: String(values.get('source_account_id') || '') || null, p_note: String(values.get('note') || ''), p_occurred_at: new Date().toISOString() }); if (rpc.error && !isMissingFinancialMigration(rpc.error)) { notify(`Could not save debt event: ${rpc.error.message}`); return; } if (rpc.error && isMissingFinancialMigration(rpc.error)) { const eventInsert = await supabase.from('debt_events').insert({ user_id: session.userId, debt_id: debtId, event_type: eventType, amount, currency: target.currency, source_account_id: String(values.get('source_account_id') || '') || null, note: String(values.get('note') || '') }); if (eventInsert.error) { notify(`Could not save debt event: ${eventInsert.error.message}`); return; } const debtUpdate = await supabase.from('debts').update({ outstanding, status: outstanding === 0 ? 'settled' : 'open' }).eq('id', debtId).eq('user_id', session.userId); if (debtUpdate.error) { notify(`Debt event saved, but balance update failed: ${debtUpdate.error.message}`); return; } } }
    const ledgerTransaction: Transaction | null = spaceId ? { id: crypto.randomUUID(), workspace_id: target.workspace_id, account_id: sourceAccountId, space_id: spaceId, type: eventType === 'borrowing' ? 'debt_borrowing' : 'debt_repayment', amount, currency: target.currency, category: eventType === 'borrowing' ? 'Debt borrowing' : 'Debt repayment', description: String(values.get('note') || `${target.name} ${eventType}`), occurred_at: new Date().toISOString() } : null;
    if (ledgerTransaction && supabase) { const { error } = await supabase.from('transactions').insert({ user_id: session.userId, ...ledgerTransaction }); if (error) notify(`Debt updated, but the Space ledger entry failed: ${error.message}`); }
    setData((current) => ({ ...current, debts: current.debts.map((item) => item.id === debtId ? { ...item, outstanding, status: outstanding === 0 ? 'settled' : 'open' } : item), transactions: ledgerTransaction ? [ledgerTransaction, ...current.transactions] : current.transactions }));
    setModal(null); notify(eventType === 'repayment' ? 'Repayment recorded and debt progress updated.' : 'Additional borrowing recorded.');
  }

  async function saveDebtEventV2(form: HTMLFormElement) {
    const values = new FormData(form);
    const debtId = String(values.get('debt_id'));
    const eventType = String(values.get('event_type')) as DebtEvent['event_type'];
    const amount = Number(values.get('amount'));
    const target = data.debts.find((item) => item.id === debtId);
    const previous = editingDebtEvent ? data.debtEvents.find((item) => item.id === editingDebtEvent.id) || null : null;
    if (!target || !session || !['borrowing', 'repayment'].includes(eventType) || amount <= 0) { notify('Choose a loan and enter a positive amount.'); return; }
    if (previous && previous.debt_id !== debtId) { notify('Keep an entry with its original loan.'); return; }
    const sourceAccountId = String(values.get('source_account_id') || '') || null;
    const note = String(values.get('note') || '').trim() || null;
    const occurredAt = String(values.get('occurred_at') || new Date().toISOString().slice(0, 10));
    const nextEvent: DebtEvent = { id: previous?.id || crypto.randomUUID(), debt_id: debtId, event_type: eventType, amount, currency: target.currency, source_account_id: sourceAccountId, note, occurred_at: occurredAt.includes('T') ? occurredAt : `${occurredAt}T12:00:00.000Z` };
    let savedEvent = nextEvent;
    const supabase = getSupabaseBrowser();

    if (previous && supabase) {
      const result = await supabase.from('debt_events').update({ event_type: eventType, amount, currency: target.currency, source_account_id: sourceAccountId, note, occurred_at: nextEvent.occurred_at }).eq('id', previous.id).eq('user_id', session.userId);
      if (result.error) { notify(`Could not update debt entry: ${result.error.message}`); return; }
      const oldDelta = debtEventBalanceDelta(previous);
      const newDelta = debtEventBalanceDelta(nextEvent);
      const accountDeltas = new Map<string, number>();
      if (previous.source_account_id) accountDeltas.set(previous.source_account_id, (accountDeltas.get(previous.source_account_id) || 0) - oldDelta);
      if (sourceAccountId) accountDeltas.set(sourceAccountId, (accountDeltas.get(sourceAccountId) || 0) + newDelta);
      const debtEvents = data.debtEvents.map((item) => item.id === previous.id ? nextEvent : item);
      const nextOutstanding = debtOutstandingFromEvents(target, debtEvents.filter((item) => item.debt_id === target.id));
      const debtUpdate = await supabase.from('debts').update({ outstanding: nextOutstanding, status: nextOutstanding === 0 ? 'settled' : 'open' }).eq('id', target.id).eq('user_id', session.userId);
      if (debtUpdate.error) { notify(`Entry updated, but loan balance failed: ${debtUpdate.error.message}`); return; }
      const accountUpdates = await Promise.all([...accountDeltas.entries()].map(([accountId, delta]) => { const account = data.accounts.find((item) => item.id === accountId); return supabase.from('accounts').update({ estimated_balance: Number(account?.estimated_balance ?? account?.verified_balance ?? 0) + delta }).eq('id', accountId).eq('user_id', session.userId); }));
      const failedAccount = accountUpdates.find((result) => result.error);
      if (failedAccount?.error) { notify(`Entry updated, but an account balance failed: ${failedAccount.error.message}`); return; }
      setData((current) => ({ ...current, debts: current.debts.map((item) => item.id === target.id ? { ...item, outstanding: nextOutstanding, status: nextOutstanding === 0 ? 'settled' : 'open' } : item), debtEvents: current.debtEvents.map((item) => item.id === nextEvent.id ? nextEvent : item), accounts: current.accounts.map((account) => { const delta = accountDeltas.get(account.id); return delta ? { ...account, estimated_balance: Number(account.estimated_balance ?? account.verified_balance ?? 0) + delta } : account; }) }));
      setModal(null); setEditingDebtEvent(null); setDebtEventDebtId(null); setDebtEventSpaceId(null); notify('Debt entry updated.');
      return;
    }

    if (supabase) {
      const rpc = await supabase.rpc('nett_apply_debt_event', { p_user_id: session.userId, p_debt_id: debtId, p_event_type: eventType, p_amount: amount, p_currency: target.currency, p_source_account_id: sourceAccountId, p_note: note || '', p_occurred_at: nextEvent.occurred_at });
      if (rpc.error && !isMissingFinancialMigration(rpc.error)) { notify(`Could not save debt entry: ${rpc.error.message}`); return; }
      if (!rpc.error) {
        const rpcPayload = rpc.data as { event?: Partial<DebtEvent> } | null;
        if (rpcPayload?.event?.id) savedEvent = { ...nextEvent, id: String(rpcPayload.event.id), occurred_at: String(rpcPayload.event.occurred_at || nextEvent.occurred_at) };
      }
      if (rpc.error && isMissingFinancialMigration(rpc.error)) {
        const eventInsert = await supabase.from('debt_events').insert({ id: nextEvent.id, user_id: session.userId, debt_id: debtId, event_type: eventType, amount, currency: target.currency, source_account_id: sourceAccountId, note, occurred_at: nextEvent.occurred_at }).select('*').single();
        if (eventInsert.error) { notify(`Could not save debt entry: ${eventInsert.error.message}`); return; }
        if (eventInsert.data) savedEvent = eventInsert.data as DebtEvent;
        const nextOutstanding = Math.max(0, Number(target.outstanding) + debtEventBalanceDelta(savedEvent));
        const debtUpdate = await supabase.from('debts').update({ outstanding: nextOutstanding, status: nextOutstanding === 0 ? 'settled' : 'open' }).eq('id', debtId).eq('user_id', session.userId);
        if (debtUpdate.error) { notify(`Entry saved, but loan balance failed: ${debtUpdate.error.message}`); return; }
        if (sourceAccountId) { const account = data.accounts.find((item) => item.id === sourceAccountId); const accountUpdate = await supabase.from('accounts').update({ estimated_balance: Number(account?.estimated_balance ?? account?.verified_balance ?? 0) + debtEventBalanceDelta(savedEvent) }).eq('id', sourceAccountId).eq('user_id', session.userId); if (accountUpdate.error) { notify(`Entry saved, but account balance failed: ${accountUpdate.error.message}`); return; } }
      }
    }

    const nextOutstanding = Math.max(0, Number(target.outstanding) + debtEventBalanceDelta(savedEvent));
    const spaceId = String(values.get('space_id') || '') || null;
    const ledgerTransaction: Transaction | null = spaceId ? { id: crypto.randomUUID(), workspace_id: target.workspace_id, account_id: sourceAccountId, space_id: spaceId, type: eventType === 'borrowing' ? 'debt_borrowing' : 'debt_repayment', amount, currency: target.currency, category: eventType === 'borrowing' ? 'Debt borrowing' : 'Debt repayment', description: note || `${target.name} ${eventType}`, occurred_at: savedEvent.occurred_at } : null;
    if (ledgerTransaction && supabase) { const result = await supabase.from('transactions').insert({ user_id: session.userId, ...ledgerTransaction }); if (result.error) { notify(`Loan saved, but the Space ledger entry failed: ${result.error.message}`); return; } }
    setData((current) => ({ ...current, debts: current.debts.map((item) => item.id === debtId ? { ...item, outstanding: nextOutstanding, status: nextOutstanding === 0 ? 'settled' : 'open' } : item), debtEvents: [savedEvent, ...current.debtEvents], transactions: ledgerTransaction ? [ledgerTransaction, ...current.transactions] : current.transactions, accounts: current.accounts.map((account) => account.id === sourceAccountId ? { ...account, estimated_balance: Number(account.estimated_balance ?? account.verified_balance ?? 0) + debtEventBalanceDelta(savedEvent) } : account) }));
    setModal(null); setEditingDebtEvent(null); setDebtEventDebtId(null); setDebtEventSpaceId(null); notify(eventType === 'repayment' ? 'Payment recorded and loan progress updated.' : 'Additional borrowing recorded.');
  }

  async function deleteDebtEvent(item: DebtEvent) {
    if (!session) { notify('Sign in before deleting a debt entry.'); return; }
    const target = data.debts.find((debt) => debt.id === item.debt_id);
    if (!target) { notify('That loan is no longer available.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const result = await supabase.from('debt_events').delete().eq('id', item.id).eq('user_id', session.userId);
      if (result.error) { notify(`Could not delete debt entry: ${result.error.message}`); return; }
      const remaining = data.debtEvents.filter((event) => event.id !== item.id);
      const nextOutstanding = debtOutstandingFromEvents(target, remaining.filter((event) => event.debt_id === target.id));
      const debtUpdate = await supabase.from('debts').update({ outstanding: nextOutstanding, status: nextOutstanding === 0 ? 'settled' : 'open' }).eq('id', target.id).eq('user_id', session.userId);
      if (debtUpdate.error) { notify(`Entry deleted, but loan balance failed: ${debtUpdate.error.message}`); return; }
      if (item.source_account_id) { const account = data.accounts.find((entry) => entry.id === item.source_account_id); const accountUpdate = await supabase.from('accounts').update({ estimated_balance: Number(account?.estimated_balance ?? account?.verified_balance ?? 0) - debtEventBalanceDelta(item) }).eq('id', item.source_account_id).eq('user_id', session.userId); if (accountUpdate.error) { notify(`Entry deleted, but account balance failed: ${accountUpdate.error.message}`); return; } }
      setData((current) => ({ ...current, debts: current.debts.map((debt) => debt.id === target.id ? { ...debt, outstanding: nextOutstanding, status: nextOutstanding === 0 ? 'settled' : 'open' } : debt), debtEvents: remaining, accounts: current.accounts.map((account) => account.id === item.source_account_id ? { ...account, estimated_balance: Number(account.estimated_balance ?? account.verified_balance ?? 0) - debtEventBalanceDelta(item) } : account) }));
    } else {
      setData((current) => ({ ...current, debtEvents: current.debtEvents.filter((event) => event.id !== item.id) }));
    }
    setModal(null); setDeletingDebtEvent(null); notify('Debt entry deleted.');
  }

  async function createReceivable(form: HTMLFormElement) {
    const values = new FormData(form); const item: Receivable = { id: crypto.randomUUID(), workspace_id: String(values.get('workspace_id')), contact_name: String(values.get('contact_name')).trim(), amount: Number(values.get('amount')), outstanding: Number(values.get('amount')), currency: String(values.get('currency')), expected_on: String(values.get('expected_on') || ''), confidence: String(values.get('confidence')) as Receivable['confidence'], include_in_net_worth: values.get('include_in_net_worth') === 'true', status: 'open', country_code: String(values.get('country_code') || 'AE'), notes: String(values.get('notes') || '') || null };
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await insertWithLegacyFallback(supabase, 'receivables', { user_id: session.userId, ...item }, { user_id: session.userId, ...item, country_code: undefined }); if (error) { notify(`Could not save receivable: ${error.message}`); return; } }
    setData((current) => ({ ...current, receivables: [item, ...current.receivables] }));
    setModal(null); notify(`${item.contact_name} was added as a receivable.`);
  }

  async function createDebt(form: HTMLFormElement) {
    const values = new FormData(form);
    const item: Debt = { id: crypto.randomUUID(), workspace_id: String(values.get('workspace_id')), name: String(values.get('name')).trim(), debt_class: String(values.get('debt_class')) as Debt['debt_class'], original_principal: Number(values.get('original_principal')), outstanding: Number(values.get('outstanding')), currency: String(values.get('currency')), comfortable_target: Number(values.get('comfortable_target') || 0) || null, due_date: String(values.get('due_date') || '') || null, status: 'open', country_code: String(values.get('country_code') || 'AE'), notes: String(values.get('notes') || '') || null };
    if (!session) { notify('Sign in before adding a debt.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) { const { error } = await insertWithLegacyFallback(supabase, 'debts', { user_id: session.userId, ...item }, { user_id: session.userId, ...item, country_code: undefined }); if (error) { notify(`Could not save debt: ${error.message}`); return; } }
    setData((current) => ({ ...current, debts: [...current.debts, item] })); setModal(null); notify(`${item.name} added to your debt plan.`);
  }

  async function saveLoan(form: HTMLFormElement) {
    const values = new FormData(form);
    const direction = String(values.get('direction')) as 'i_owe' | 'owed_to_me';
    const title = String(values.get('title') || '').trim();
    const who = String(values.get('who') || '').trim();
    const principal = Number(values.get('principal'));
    const currency = String(values.get('currency') || 'AED');
    const requestedCountry = String(values.get('country_code') || 'auto');
    const countryCode = requestedCountry === 'auto' ? countryForCurrency(currency) : requestedCountry;
    const workspaceId = String(values.get('workspace_id') || data.workspaces[0]?.id || '');
    const description = String(values.get('description') || '').trim();
    const includeInNetWorth = values.get('include_in_net_worth') === 'true';
    if (!session || !title || !who || principal <= 0 || !workspaceId) { notify('Add a title, person and positive principal amount.'); return; }
    const supabase = getSupabaseBrowser();

    if (direction === 'owed_to_me') {
      const paid = editingReceivable ? Math.max(0, Number(editingReceivable.amount) - Number(editingReceivable.outstanding)) : 0;
      const item: Receivable = { id: editingReceivable?.id || crypto.randomUUID(), workspace_id: workspaceId, contact_name: who, amount: principal, outstanding: Math.max(0, principal - paid), currency, expected_on: editingReceivable?.expected_on || null, confidence: editingReceivable?.confidence || 'confirmed', include_in_net_worth: includeInNetWorth, status: editingReceivable?.status || 'open', country_code: countryCode, notes: encodeLoanMetadata({ title, who, description, includeInNetWorth }) };
      if (supabase) {
        const payload = { user_id: session.userId, ...item };
        const result = editingReceivable
          ? await supabase.from('receivables').update(payload).eq('id', item.id).eq('user_id', session.userId)
          : await insertWithLegacyFallback(supabase, 'receivables', payload, { ...payload, country_code: undefined });
        if (result.error) { notify(`Could not save loan: ${result.error.message}`); return; }
      }
      setData((current) => ({ ...current, receivables: editingReceivable ? current.receivables.map((entry) => entry.id === item.id ? item : entry) : [item, ...current.receivables] }));
      setModal(null); setEditingReceivable(null); notify(`${title} ${editingReceivable ? 'updated' : 'added'} as money owed to you.`);
      return;
    }

    const paid = editingDebt ? Math.max(0, Number(editingDebt.original_principal) - Number(editingDebt.outstanding)) : 0;
    const item: Debt = { id: editingDebt?.id || crypto.randomUUID(), workspace_id: workspaceId, name: title, debt_class: editingDebt?.debt_class || 'flexible', original_principal: principal, outstanding: Math.max(0, principal - paid), currency, comfortable_target: editingDebt?.comfortable_target || null, due_date: editingDebt?.due_date || null, status: editingDebt?.status || 'open', country_code: countryCode, notes: encodeLoanMetadata({ title, who, description, includeInNetWorth }) };
    if (supabase) {
      const payload = { user_id: session.userId, ...item };
      const result = editingDebt
        ? await supabase.from('debts').update(payload).eq('id', item.id).eq('user_id', session.userId)
        : await insertWithLegacyFallback(supabase, 'debts', payload, { ...payload, country_code: undefined });
      if (result.error) { notify(`Could not save loan: ${result.error.message}`); return; }
    }
    setData((current) => ({ ...current, debts: editingDebt ? current.debts.map((entry) => entry.id === item.id ? item : entry) : [...current.debts, item] }));
    setModal(null); setEditingDebt(null); notify(`${title} ${editingDebt ? 'updated' : 'added'} as money you owe.`);
  }

  async function deleteDebt(item: Debt) {
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('debts').delete().eq('id', item.id).eq('user_id', session.userId); if (error) { notify(`Could not delete debt: ${error.message}`); return; } }
    setData((current) => ({ ...current, debts: current.debts.filter((entry) => entry.id !== item.id) })); setModal(null); setDeletingDebt(null); notify(`${item.name} deleted.`);
  }

  async function deleteReceivable(item: Receivable) {
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('receivables').delete().eq('id', item.id).eq('user_id', session.userId); if (error) { notify(`Could not delete loan: ${error.message}`); return; } }
    setData((current) => ({ ...current, receivables: current.receivables.filter((entry) => entry.id !== item.id), receivableEvents: current.receivableEvents.filter((event) => event.receivable_id !== item.id) }));
    setModal(null); setDeletingReceivable(null); notify(`${loanMetadata(item).title || item.contact_name} deleted.`);
  }

  async function createReceivableEvent(form: HTMLFormElement) {
    const values = new FormData(form); const receivableId = String(values.get('receivable_id')); const target = data.receivables.find((item) => item.id === receivableId); const amount = Number(values.get('amount'));
    if (!target || amount <= 0 || !session) { notify('Choose a receivable and enter a positive amount.'); return; }
    if (amount > Number(target.outstanding)) { notify(`The payment cannot exceed ${formatCurrency(Number(target.outstanding), target.currency)}.`); return; }
    const date = String(values.get('occurred_at') || new Date().toISOString().slice(0, 10));
    const occurredAt = date.includes('T') ? date : `${date}T12:00:00.000Z`;
    const nextOutstanding = Math.max(0, Number(target.outstanding) - amount); const supabase = getSupabaseBrowser();
    const savedEvent: ReceivableEvent = { id: crypto.randomUUID(), receivable_id: receivableId, event_type: nextOutstanding === 0 ? 'settlement' : 'repayment', amount, currency: target.currency, destination_account_id: null, note: String(values.get('note') || ''), occurred_at: occurredAt };
    if (supabase) { const rpc = await supabase.rpc('nett_apply_receivable_event', { p_user_id: session.userId, p_receivable_id: receivableId, p_event_type: nextOutstanding === 0 ? 'settlement' : 'repayment', p_amount: amount, p_currency: target.currency, p_destination_account_id: null, p_note: String(values.get('note') || ''), p_occurred_at: occurredAt }); if (rpc.error && !isMissingFinancialMigration(rpc.error)) { notify(`Could not save receivable payment: ${rpc.error.message}`); return; } if (rpc.error && isMissingFinancialMigration(rpc.error)) { const eventInsert = await supabase.from('receivable_events').insert({ user_id: session.userId, receivable_id: receivableId, event_type: nextOutstanding === 0 ? 'settlement' : 'repayment', amount, currency: target.currency, destination_account_id: null, note: String(values.get('note') || ''), occurred_at: occurredAt }); if (eventInsert.error) { notify(`Could not save receivable payment: ${eventInsert.error.message}`); return; } const itemUpdate = await supabase.from('receivables').update({ outstanding: nextOutstanding, status: nextOutstanding === 0 ? 'settled' : 'open' }).eq('id', receivableId).eq('user_id', session.userId); if (itemUpdate.error) { notify(`Payment saved, but receivable update failed: ${itemUpdate.error.message}`); return; } } }
    setData((current) => ({ ...current, receivables: current.receivables.map((item) => item.id === receivableId ? { ...item, outstanding: nextOutstanding, status: nextOutstanding === 0 ? 'settled' : 'open' } : item), receivableEvents: [savedEvent, ...current.receivableEvents] })); setModal(null); setReceivableEventId(null); notify('Payment recorded and the amount owed to you was updated.');
  }

  async function createTransfer(form: HTMLFormElement) {
    const values = new FormData(form); const sourceId = String(values.get('source_account_id')); const destinationId = String(values.get('destination_account_id')); const source = data.accounts.find((item) => item.id === sourceId); const destination = data.accounts.find((item) => item.id === destinationId); const sourceAmount = Number(values.get('source_amount')); const destinationAmount = Number(values.get('destination_amount') || sourceAmount); const fee = Number(values.get('fee') || 0);
    if (!source || !destination || source.id === destination.id || sourceAmount <= 0 || destinationAmount <= 0 || !session) { notify('Choose two different accounts and enter valid amounts.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) { const rpc = await supabase.rpc('nett_create_transfer', { p_user_id: session.userId, p_source_account_id: source.id, p_destination_account_id: destination.id, p_source_amount: sourceAmount, p_destination_amount: destinationAmount, p_source_currency: source.currency, p_destination_currency: destination.currency, p_fee: fee, p_description: String(values.get('description') || ''), p_occurred_at: new Date().toISOString() }); if (rpc.error && !isMissingFinancialMigration(rpc.error)) { notify(`Could not save transfer: ${rpc.error.message}`); return; } if (rpc.error && isMissingFinancialMigration(rpc.error)) { const transferGroup = crypto.randomUUID(); const occurredAt = new Date().toISOString(); const inserts = await supabase.from('transactions').insert([{ user_id: session.userId, workspace_id: source.workspace_id, account_id: source.id, type: 'transfer', amount: sourceAmount + fee, currency: source.currency, description: String(values.get('description') || 'Transfer'), transfer_group_id: transferGroup, occurred_at: occurredAt }, { user_id: session.userId, workspace_id: destination.workspace_id, account_id: destination.id, type: 'transfer', amount: destinationAmount, currency: destination.currency, description: String(values.get('description') || 'Transfer'), transfer_group_id: transferGroup, occurred_at: occurredAt }]); if (inserts.error) { notify(`Could not save transfer: ${inserts.error.message}`); return; } const accountUpdates = await Promise.all([supabase.from('accounts').update({ estimated_balance: Number(source.estimated_balance ?? source.verified_balance) - sourceAmount - fee }).eq('id', source.id).eq('user_id', session.userId), supabase.from('accounts').update({ estimated_balance: Number(destination.estimated_balance ?? destination.verified_balance) + destinationAmount }).eq('id', destination.id).eq('user_id', session.userId)]); const failedUpdate = accountUpdates.find((result) => result.error); if (failedUpdate?.error) { notify(`Transfer saved, but an account balance failed: ${failedUpdate.error.message}`); return; } } }
    const transferId = crypto.randomUUID(); const occurredAt = new Date().toISOString(); const tx: Transaction[] = [{ id: `${transferId}-out`, workspace_id: source.workspace_id, account_id: source.id, type: 'transfer', amount: sourceAmount + fee, currency: source.currency, description: String(values.get('description') || 'Transfer'), occurred_at: occurredAt }, { id: `${transferId}-in`, workspace_id: destination.workspace_id, account_id: destination.id, type: 'transfer', amount: destinationAmount, currency: destination.currency, description: String(values.get('description') || 'Transfer'), occurred_at: occurredAt }];
    setData((current) => ({ ...current, transactions: [...tx, ...current.transactions], accounts: current.accounts.map((item) => item.id === source.id ? { ...item, estimated_balance: Number(item.estimated_balance ?? item.verified_balance) - sourceAmount - fee } : item.id === destination.id ? { ...item, estimated_balance: Number(item.estimated_balance ?? item.verified_balance) + destinationAmount } : item) })); setModal(null); notify('Transfer saved across both accounts.');
  }

  async function createReserve(form: HTMLFormElement) {
    const values = new FormData(form); const item = { id: crypto.randomUUID(), workspace_id: String(values.get('workspace_id')), name: String(values.get('name')).trim(), target_amount: Number(values.get('target_amount')), funded_amount: Number(values.get('funded_amount') || 0), currency: String(values.get('currency')), due_date: String(values.get('due_date') || '') || null, country_code: String(values.get('country_code') || 'AE') };
    if (!session) { notify('Sign in before adding a reserve.'); return; }
    const supabase = getSupabaseBrowser(); if (supabase) { const { error } = await insertWithLegacyFallback(supabase, 'reserves', { user_id: session.userId, ...item }, { user_id: session.userId, ...item, country_code: undefined }); if (error) { notify(`Could not save reserve: ${error.message}`); return; } }
    setData((current) => ({ ...current, reserves: [...current.reserves, item] })); setModal(null); notify(`${item.name} reserve added.`);
  }

  async function createWorkspace(form: HTMLFormElement) {
    const values = new FormData(form); const item = { id: crypto.randomUUID(), name: String(values.get('name')).trim(), kind: String(values.get('kind')) as 'personal' | 'business' | 'other' };
    if (!session) return; const supabase = getSupabaseBrowser(); if (supabase) { const { data: created, error } = await supabase.from('workspaces').insert({ user_id: session.userId, ...item }).select('id, name, kind').single(); if (error || !created) { notify(`Could not save workspace: ${error?.message || 'unknown error'}`); return; } item.id = created.id; }
    setData((current) => ({ ...current, workspaces: [...current.workspaces, item] })); setWorkspace(item.id); setModal(null); notify(`${item.name} workspace created.`);
  }

  async function saveSpace(form: HTMLFormElement) {
    const values = new FormData(form);
    const currency = String(values.get('currency') || 'AED');
    const requestedCountry = String(values.get('country_code') || 'auto');
    const trackerType = String(values.get('tracker_type') || 'cost') as 'cost' | 'business' | 'trip';
    const countryCode = requestedCountry === 'auto' ? countryForCurrency(currency) : requestedCountry;
    const notes = String(values.get('notes') || '').trim();
    const item: Space = { id: editingSpace?.id || crypto.randomUUID(), workspace_id: String(values.get('workspace_id') || editingSpace?.workspace_id || data.workspaces[0]?.id || ''), name: String(values.get('name')).trim(), color: editingSpace?.color || '#b678c7', budget: null, allocation: null, currency, notes: encodeSpendMetadata({ countryCode, notes, trackerType }), kind: 'spend', tracker_type: trackerType, country_code: countryCode };
    if (!session || !item.name || !item.workspace_id) { notify('Add a tracker name first.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const payload = { workspace_id: item.workspace_id, name: item.name, color: item.color, budget: null, allocation: null, currency: item.currency, notes: item.notes, kind: item.kind, tracker_type: item.tracker_type, country_code: item.country_code };
      const legacyPayload = { ...payload, kind: undefined, tracker_type: undefined, country_code: undefined };
      const result = editingSpace
        ? await supabase.from('spaces').update(payload).eq('id', item.id).eq('user_id', session.userId)
        : await insertWithLegacyFallback(supabase, 'spaces', { id: item.id, user_id: session.userId, ...payload }, { id: item.id, user_id: session.userId, ...legacyPayload });
      if (result.error && editingSpace && isMissingFinancialMigration(result.error)) {
        const fallback = await supabase.from('spaces').update(legacyPayload).eq('id', item.id).eq('user_id', session.userId);
        if (fallback.error) { notify(`Could not save tracker: ${fallback.error.message}`); return; }
      } else
      if (result.error) { notify(`Could not save Space: ${result.error.message}`); return; }
    }
    setData((current) => ({ ...current, spaces: editingSpace ? current.spaces.map((space) => space.id === item.id ? item : space) : [...current.spaces, item] })); setModal(null); setEditingSpace(null); notify(`${item.name} tracker ${editingSpace ? 'updated' : 'created'}.`);
  }

  async function savePot(form: HTMLFormElement) {
    const values = new FormData(form);
    const currency = String(values.get('currency') || 'AED');
    const requestedCountry = String(values.get('country_code') || 'auto');
    const countryCode = requestedCountry === 'auto' ? countryForCurrency(currency) : requestedCountry;
    const loanAmount = Number(values.get('loan_amount'));
    const item: Space = { id: editingSpace?.id || crypto.randomUUID(), workspace_id: String(values.get('workspace_id') || data.workspaces[0]?.id || ''), name: String(values.get('name') || '').trim(), color: editingSpace?.color || '#b678c7', budget: loanAmount, allocation: editingSpace?.allocation || 0, currency, notes: encodePotMetadata({ countryCode, notes: String(values.get('notes') || '').trim() }), kind: 'pot', tracker_type: null, country_code: countryCode };
    if (!session || !item.name || !item.workspace_id || loanAmount <= 0) { notify('Add a pot name and positive loan amount.'); return; }
    if (Number(item.allocation) > loanAmount) { notify('The loan amount cannot be less than the payments already logged.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const payload = { workspace_id: item.workspace_id, name: item.name, color: item.color, budget: item.budget, allocation: item.allocation, currency: item.currency, notes: item.notes, kind: item.kind, tracker_type: item.tracker_type, country_code: item.country_code };
      const result = editingSpace
        ? await supabase.from('spaces').update(payload).eq('id', item.id).eq('user_id', session.userId)
        : await insertWithLegacyFallback(supabase, 'spaces', { id: item.id, user_id: session.userId, ...payload }, { id: item.id, user_id: session.userId, ...payload, kind: undefined, tracker_type: undefined, country_code: undefined });
      if (result.error && editingSpace && isMissingFinancialMigration(result.error)) {
        const fallback = await supabase.from('spaces').update({ ...payload, kind: undefined, tracker_type: undefined, country_code: undefined }).eq('id', item.id).eq('user_id', session.userId);
        if (fallback.error) { notify(`Could not save pot: ${fallback.error.message}`); return; }
      } else if (result.error) { notify(`Could not save pot: ${result.error.message}`); return; }
    }
    setData((current) => ({ ...current, spaces: editingSpace ? current.spaces.map((space) => space.id === item.id ? item : space) : [...current.spaces, item] }));
    setModal(null); setEditingSpace(null); notify(`${item.name} ${editingSpace ? 'updated' : 'created'}.`);
  }

  async function savePotEvent(form: HTMLFormElement) {
    if (!potEventSpace || !session) { notify('Choose a pot first.'); return; }
    const values = new FormData(form);
    const amount = Number(values.get('amount'));
    const currentPrincipal = Number(potEventSpace.budget || 0);
    const currentPaid = Number(potEventSpace.allocation || 0);
    if (amount <= 0) { notify('Enter a positive amount.'); return; }
    if (potEventType === 'repayment' && amount > Math.max(0, currentPrincipal - currentPaid)) { notify(`The payment cannot exceed ${formatCurrency(Math.max(0, currentPrincipal - currentPaid), potEventSpace.currency)}.`); return; }
    const date = String(values.get('occurred_at') || new Date().toISOString().slice(0, 10));
    const occurredAt = date.includes('T') ? date : `${date}T12:00:00.000Z`;
    const note = String(values.get('note') || '').trim();
    const nextSpace: Space = { ...potEventSpace, budget: potEventType === 'borrowing' ? currentPrincipal + amount : currentPrincipal, allocation: potEventType === 'repayment' ? currentPaid + amount : currentPaid };
    const transaction: Transaction = { id: crypto.randomUUID(), workspace_id: potEventSpace.workspace_id, account_id: null, space_id: potEventSpace.id, type: potEventType === 'borrowing' ? 'debt_borrowing' : 'debt_repayment', amount, currency: potEventSpace.currency, category: potEventType === 'borrowing' ? 'Added to loan' : 'Loan payment', description: note || (potEventType === 'borrowing' ? 'Additional borrowing' : 'Repayment'), occurred_at: occurredAt };
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const insert = await supabase.from('transactions').insert({ user_id: session.userId, ...transaction });
      if (insert.error) { notify(`Could not save pot entry: ${insert.error.message}`); return; }
      const update = await supabase.from('spaces').update({ budget: nextSpace.budget, allocation: nextSpace.allocation }).eq('id', nextSpace.id).eq('user_id', session.userId);
      if (update.error) { await supabase.from('transactions').delete().eq('id', transaction.id).eq('user_id', session.userId); notify(`Could not update pot balance: ${update.error.message}`); return; }
    }
    setData((current) => ({ ...current, spaces: current.spaces.map((space) => space.id === nextSpace.id ? nextSpace : space), transactions: [transaction, ...current.transactions] }));
    setModal(null); setPotEventSpace(null); notify(potEventType === 'borrowing' ? 'Loan amount increased.' : 'Payment logged and progress updated.');
  }

  async function deleteSpace(space: Space) {
    if (!session) { notify('Sign in before deleting a Space.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const { error } = await supabase.from('spaces').update({ archived: true }).eq('id', space.id).eq('user_id', session.userId);
      if (error) { notify(`Could not delete Space: ${error.message}`); return; }
    }
    setData((current) => ({ ...current, spaces: current.spaces.filter((item) => item.id !== space.id) })); setModal(null); setDeletingSpace(null); notify(`${space.name} Space deleted.`);
  }

  async function saveCountry(form: HTMLFormElement) {
    const values = new FormData(form);
    const code = String(values.get('code') || '').trim().toUpperCase();
    const currency = String(values.get('currency') || '').trim().toUpperCase();
    const item: CountryConfig = { id: editingCountry?.id || crypto.randomUUID(), code, name: String(values.get('name') || '').trim(), currency, sort_order: Number(values.get('sort_order') || data.countries.length) };
    if (!session || !/^[A-Z]{2}$/.test(code) || !item.name || !/^[A-Z]{3}$/.test(currency)) { notify('Use a two-letter country code, name and three-letter currency code.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const payload = { id: item.id, user_id: session.userId, code: item.code, name: item.name, currency: item.currency, sort_order: item.sort_order };
      const result = editingCountry ? await supabase.from('countries').update(payload).eq('id', item.id).eq('user_id', session.userId) : await supabase.from('countries').insert(payload);
      if (result.error) { notify(`Could not save country: ${result.error.message}`); return; }
    }
    setData((current) => ({ ...current, countries: (editingCountry ? current.countries.map((entry) => entry.id === item.id ? item : entry) : [...current.countries, item]).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)) }));
    setModal(null); setEditingCountry(null); notify(`${item.name} ${editingCountry ? 'updated' : 'added'}.`);
  }

  async function deleteCountry(item: CountryConfig) {
    const linked = data.accounts.some((account) => account.country_code === item.code) || data.debts.some((debt) => debt.country_code === item.code) || data.receivables.some((loan) => loan.country_code === item.code);
    if (linked) { notify(`Move records out of ${item.name} before removing it.`); return; }
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('countries').delete().eq('id', item.id).eq('user_id', session.userId); if (error) { notify(`Could not delete country: ${error.message}`); return; } }
    setData((current) => ({ ...current, countries: current.countries.filter((entry) => entry.id !== item.id) }));
    setModal(null); setDeletingCountry(null); if (country === item.code) setCountry('all'); notify(`${item.name} removed.`);
  }

  async function saveInvestment(form: HTMLFormElement) {
    const values = new FormData(form);
    const quantity = Number(values.get('quantity'));
    const price = Number(values.get('current_price'));
    const currency = String(values.get('currency') || 'AED');
    const market = String(values.get('market') || 'UAE');
    const requestedCountry = String(values.get('country_code') || 'auto');
    const valueAtDate = String(values.get('as_of_date') || new Date().toISOString().slice(0, 10));
    const valueAt = `${valueAtDate}T12:00:00.000Z`;
    const item: Investment = {
      id: editingInvestment?.id || crypto.randomUUID(),
      workspace_id: String(values.get('workspace_id') || editingInvestment?.workspace_id || data.workspaces[0]?.id || ''),
      symbol: String(values.get('symbol') || '').trim().toUpperCase(),
      exchange: market,
      market,
      name: String(values.get('name') || '').trim(),
      quantity,
      holding_currency: currency,
      average_cost: editingInvestment?.average_cost || price,
      liquid: true,
      latest_value: quantity * price,
      latest_value_at: valueAt,
      latest_value_source: 'manual',
      country_code: requestedCountry === 'auto' ? countryForCurrency(currency) : requestedCountry,
    };
    if (!session || !item.name || !item.symbol || !item.workspace_id || quantity < 0 || price < 0) { notify('Add a name, ticker, quantity and current price.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const payload = { user_id: session.userId, id: item.id, workspace_id: item.workspace_id, symbol: item.symbol, exchange: item.exchange, market: item.market, name: item.name, quantity: item.quantity, holding_currency: item.holding_currency, average_cost: item.average_cost, liquid: item.liquid, country_code: item.country_code };
      const legacyPayload = { ...payload, market: undefined, country_code: undefined };
      const result = editingInvestment
        ? await supabase.from('investments').update(payload).eq('id', item.id).eq('user_id', session.userId)
        : await insertWithLegacyFallback(supabase, 'investments', payload, legacyPayload);
      if (result.error && editingInvestment && isMissingFinancialMigration(result.error)) {
        const fallback = await supabase.from('investments').update(legacyPayload).eq('id', item.id).eq('user_id', session.userId);
        if (fallback.error) { notify(`Could not save holding: ${fallback.error.message}`); return; }
      } else if (result.error) { notify(`Could not save holding: ${result.error.message}`); return; }
      const valueResult = await supabase.from('investment_values').insert({ user_id: session.userId, investment_id: item.id, value: item.latest_value, price, currency: item.holding_currency, source: 'manual', valued_at: valueAt });
      if (valueResult.error) { notify(`Holding saved, but valuation failed: ${valueResult.error.message}`); return; }
    }
    const valuation: InvestmentValue = { id: crypto.randomUUID(), investment_id: item.id, value: Number(item.latest_value || 0), price, currency: item.holding_currency, source: 'manual', valued_at: valueAt };
    setData((current) => ({ ...current, investments: editingInvestment ? current.investments.map((entry) => entry.id === item.id ? item : entry) : [...current.investments, item], investmentValues: [valuation, ...current.investmentValues] }));
    setModal(null); setEditingInvestment(null); notify(`${item.name} ${editingInvestment ? 'updated' : 'added to holdings'}.`);
  }

  async function deleteInvestment(item: Investment) {
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('investments').delete().eq('id', item.id).eq('user_id', session.userId); if (error) { notify(`Could not delete holding: ${error.message}`); return; } }
    setData((current) => ({ ...current, investments: current.investments.filter((entry) => entry.id !== item.id), investmentValues: current.investmentValues.filter((entry) => entry.investment_id !== item.id) }));
    setModal(null); setDeletingInvestment(null); notify(`${item.name || item.symbol} deleted.`);
  }

  async function saveCheckin(balances: Record<string, number>) {
    const verifiedAt = new Date().toISOString(); const nextAccounts = data.accounts.map((account) => balances[account.id] === undefined ? account : { ...account, verified_balance: balances[account.id], estimated_balance: balances[account.id], balance_verified_at: verifiedAt });
    const supabase = getSupabaseBrowser();
    if (supabase && session) {
      const updates = await Promise.all(nextAccounts.filter((account) => balances[account.id] !== undefined).map(async (account) => {
        const result = await supabase.from('accounts').update({ verified_balance: account.verified_balance, estimated_balance: account.estimated_balance, balance_verified_at: verifiedAt }).eq('id', account.id).eq('user_id', session.userId);
        if (!result.error) await supabase.from('account_snapshots').insert({ user_id: session.userId, account_id: account.id, balance: account.verified_balance, currency: account.currency, verified_at: verifiedAt, fx_rates: data.fxRates });
        return result;
      }));
      const failed = updates.find((result) => result.error);
      if (failed?.error) { notify(`Check-in could not be completed: ${failed.error.message}`); return; }
      const nextMetrics = calculateMetrics(nextAccounts, data.debts, data.receivables, data.investments, data.commitments, data.reserves, displayCurrency, data.fxRates);
      const snapshotResult = await supabase.from('snapshots').insert({ user_id: session.userId, label: `Check-in ${new Date().toLocaleDateString('en-AE', { month: 'short', year: 'numeric' })}`, display_currency: displayCurrency, primary_net_worth: nextMetrics.primaryNetWorth, all_debt_net_worth: nextMetrics.allDebtNetWorth, liquid_cash: nextMetrics.liquidCash, safe_to_spend: nextMetrics.safeToSpend, payload: { account_balances: balances, fx_rates: data.fxRates } });
      if (snapshotResult.error) { notify(`Balances saved, but the snapshot failed: ${snapshotResult.error.message}`); return; }
    }
    setData((current) => ({ ...current, accounts: nextAccounts }));
    setModal(null); notify('Check-in complete. Your numbers are fresh again.');
  }

  async function saveSnapshot(form: HTMLFormElement) {
    const values = new FormData(form);
    const snapshotDate = String(values.get('snapshot_date') || new Date().toISOString().slice(0, 10));
    const aed = Number(values.get('aed_amount') || 0);
    const inr = Number(values.get('inr_amount') || 0);
    const usd = Number(values.get('usd_amount') || 0);
    const inrToAed = Number(values.get('inr_to_aed') || rateFor('INR', 'AED', data.fxRates));
    const usdToAed = Number(values.get('usd_to_aed') || rateFor('USD', 'AED', data.fxRates));
    const totalAed = aed + inr * inrToAed + usd * usdToAed;
    const item: Snapshot = { id: editingSnapshot?.id || crypto.randomUUID(), label: String(values.get('label') || monthTitle(snapshotDate.slice(0, 7))), display_currency: 'AED', snapshot_date: snapshotDate, primary_net_worth: totalAed, all_debt_net_worth: totalAed, liquid_cash: totalAed, safe_to_spend: totalAed, payload: { AED: aed, INR: inr, USD: usd, INR_AED: inrToAed, USD_AED: usdToAed, notes: String(values.get('notes') || '').trim() } };
    if (!session || !snapshotDate || [aed, inr, usd, inrToAed, usdToAed].some((value) => !Number.isFinite(value) || value < 0)) { notify('Enter valid balances and exchange rates.'); return; }
    const supabase = getSupabaseBrowser();
    if (supabase) {
      const payload = { user_id: session.userId, ...item };
      const result = editingSnapshot ? await supabase.from('snapshots').update(payload).eq('id', item.id).eq('user_id', session.userId) : await supabase.from('snapshots').insert(payload);
      if (result.error) { notify(`Could not save history: ${result.error.message}`); return; }
    }
    setData((current) => ({ ...current, snapshots: [...current.snapshots.filter((entry) => entry.id !== item.id), item].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date)) }));
    setModal(null); setEditingSnapshot(null); notify(`${item.label} saved to history.`);
  }

  async function deleteSnapshot(item: Snapshot) {
    const supabase = getSupabaseBrowser();
    if (supabase && session) { const { error } = await supabase.from('snapshots').delete().eq('id', item.id).eq('user_id', session.userId); if (error) { notify(`Could not delete history: ${error.message}`); return; } }
    setData((current) => ({ ...current, snapshots: current.snapshots.filter((entry) => entry.id !== item.id) }));
    setModal(null); setDeletingSnapshot(null); notify(`${item.label} deleted.`);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ ...data, exported_at: new Date().toISOString(), schema_version: '1.0' }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `nett-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); notify('Your portable JSON backup is ready.');
  }

  function exportCsv() {
    const rows = [['date', 'type', 'category', 'description', 'amount', 'currency'], ...data.transactions.map((item) => [item.occurred_at, item.type, item.category || '', item.description || '', String(item.amount), item.currency])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const link = document.createElement('a'); link.href = url; link.download = `nett-activity-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); notify('Your activity CSV is ready.');
  }

  function exportXlsx() {
    const workbook = XLSX.utils.book_new();
    const sheets: Array<[string, unknown[]]> = [
      ['Accounts', data.accounts], ['Activity', data.transactions], ['Debts', data.debts], ['Receivables', data.receivables], ['Commitments', data.commitments], ['Investments', data.investments], ['Reserves', data.reserves], ['Spaces', data.spaces],
    ];
    for (const [name, rows] of sheets) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
    XLSX.writeFile(workbook, `nett-backup-${new Date().toISOString().slice(0, 10)}.xlsx`); notify('Your complete spreadsheet backup is ready.');
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
      <div className="brand"><NettLogo priority /><div className="brand-name">nett</div><div className="brand-sub">v{APP_VERSION}</div></div>
      <Link href="/changelog" className="version-link"><GitCommitHorizontal size={13} /> v{APP_VERSION} · release notes</Link>
      <div className="nav-section-label">Your money</div>
       <nav className="nav-list" aria-label="Primary navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-button ${tab === id ? 'active' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => navigateTo(id)}><Icon size={18} strokeWidth={tab === id ? 2.2 : 1.8} /><span className="nav-caption">{label}</span>{(id === 'loans' && data.debts.length + data.receivables.length > 0) && <span className="nav-count">{data.debts.length + data.receivables.length}</span>}</button>)}</nav>
      <button className="nav-button" onClick={signOut}><LogIn size={17} /><span className="nav-caption">Sign out</span></button>
      <div className="sidebar-spacer" />
      {session ? <div className="user-chip"><div className="avatar">{displayName(data.profile.full_name).slice(0, 1)}</div><div><strong style={{ color: 'var(--ink)', fontSize: 12 }}>{displayName(data.profile.full_name)}</strong><div style={{ fontSize: 10 }}>{session.email || 'Private account'}</div></div></div> : <button className="nav-button" onClick={() => window.location.href = '/login'}><LogIn size={17} /><span className="nav-caption">Sign in</span></button>}
    </aside>
    <main className="main">
      <header className="mobile-app-bar">
        <div className="mobile-app-heading">
          <span className="mobile-app-kicker">nett</span>
          <h1>{tab === 'home' ? `${greeting}, ${displayName(data.profile.full_name)}.` : navItems.find((item) => item.id === tab)?.label}</h1>
          <p>{tab === 'home' ? `${todayText} · ${country === 'all' ? 'All countries' : countryLabel(country)} · ${displayCurrency}` : 'Your private financial workspace'}</p>
        </div>
        <div className="mobile-app-actions">
          <button className="mobile-round-action" aria-label="Update all balances" onClick={() => setModal('checkin')}><RefreshCw size={19} /></button>
        </div>
      </header>
       <header className={`topbar ${tab === 'home' ? '' : 'topbar-page'}`}><div><h1>{tab === 'home' ? `${greeting}, ${displayName(data.profile.full_name)}.` : navItems.find((item) => item.id === tab)?.label}</h1><p>{tab === 'home' ? `${todayText} · ${country === 'all' ? 'All countries' : configuredCountryLabel(country)} · ${displayCurrency}` : 'Simple, private and grounded in your real numbers.'}</p></div><div className="top-actions"><button className="soft-button" onClick={() => setModal('checkin')}><RefreshCw size={16} /> Update everything</button></div></header>
      {!session && <div className="demo-bar"><span><span className="demo-dot" /> Demo mode · your private Supabase account is not signed in</span><button className="soft-button" onClick={() => window.location.href = '/login'}><LogIn size={13} /> Sign in to save</button></div>}
       {tab === 'home' && <ContextToolbar country={country} countries={activeCountryOptions} displayCurrency={displayCurrency} currencies={activeCurrencyOptions} onCountryChange={setCountry} onCurrencyChange={(value) => void updateDisplayCurrency(value)} />}
      {tab === 'home' && <RateContext baseCurrency={displayCurrency} comparisonCurrency={comparisonCurrency} rates={data.fxRates} source={data.fxRateSource} updatedAt={data.fxRatesUpdatedAt} options={activeCurrencyOptions} onChange={setComparisonCurrency} />}
      {tab === 'home' && <div className="mobile-view-context">
        <button className="mobile-context-trigger" aria-expanded={showContextSheet} onClick={() => setShowContextSheet((current) => !current)}><span className="workspace-dot" /><span>{workspace === 'everything' ? 'Everything' : data.workspaces.find((item) => item.id === workspace)?.name || 'Personal'}</span><span className="context-divider">·</span><span>{country === 'all' ? 'All countries' : countryLabel(country)}</span><span className="context-currency">{displayCurrency}</span><ChevronDown size={14} /></button>
        {showContextSheet && <div className="context-sheet" role="dialog" aria-label="View context">
          <div className="context-sheet-header"><div><strong>View your money</strong><span>Choose the slice you want to see.</span></div><button className="icon-button" aria-label="Close view context" onClick={() => setShowContextSheet(false)}><X size={15} /></button></div>
           <label><span>Country</span><select value={country} onChange={(event) => setCountry(event.target.value)}><option value="all">All countries</option>{activeCountryOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
          <label><span>Show totals in</span><select value={displayCurrency} onChange={(event) => void updateDisplayCurrency(event.target.value)}>{currencyOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button className="primary-button full" onClick={() => setShowContextSheet(false)}>Done</button>
        </div>}
      </div>}
       {tab === 'home' && <HomeView data={scoped} metrics={metrics} hidden={hidden} setHidden={setHidden} staleAccounts={staleAccounts} onQuick={(next) => setModal(next)} onNavigate={navigateTo} workspace="everything" displayCurrency={displayCurrency} comparisonCurrency={comparisonCurrency} notify={notify} whatIf={whatIf} setWhatIf={setWhatIf} whatIfResult={whatIfResult} runWhatIf={runWhatIf} />}
       {tab === 'accounts' && <AccountsViewV3 data={data} displayCurrency={comparisonCurrency} onQuick={(next) => setModal(next)} onEdit={(account) => { setEditingAccount(account); setModal('account'); }} onDelete={(account) => { setDeletingAccount(account); setModal('delete-account'); }} />}
       {tab === 'pots' && <PotsLoanView data={{ ...data, spaces: data.spaces.filter(isPot) }} onAddSpace={() => { setEditingSpace(null); setModal('pot'); }} onEditSpace={(space) => { setEditingSpace(space); setModal('pot'); }} onDeleteSpace={(space) => { setDeletingSpace(space); setModal('delete-space'); }} onAddPayment={(space) => { setPotEventSpace(space); setPotEventType('repayment'); setModal('pot-event'); }} onAddBorrowing={(space) => { setPotEventSpace(space); setPotEventType('borrowing'); setModal('pot-event'); }} />}
       {tab === 'loans' && <LoansUnifiedView data={data} onAddLoan={() => { setEditingDebt(null); setEditingReceivable(null); setModal('debt'); }} onAddPayment={(debtId) => openDebtEventModal(debtId, 'repayment')} onAddBorrowing={(debtId) => openDebtEventModal(debtId, 'borrowing')} onEditEvent={(event) => openDebtEventModal(event.debt_id, event.event_type === 'borrowing' ? 'borrowing' : 'repayment', event)} onDeleteEvent={(event) => { setDeletingDebtEvent(event); setModal('delete-debt-event'); }} onEditDebt={(item) => { setEditingReceivable(null); setEditingDebt(item); setModal('debt'); }} onDeleteDebt={(item) => { setDeletingDebt(item); setModal('delete-debt'); }} onEditReceivable={(item) => { setEditingDebt(null); setEditingReceivable(item); setModal('debt'); }} onDeleteReceivable={(item) => { setDeletingReceivable(item); setModal('delete-receivable'); }} onAddReceivablePayment={(item) => { setReceivableEventId(item.id); setModal('receivable-event'); }} />}
       {tab === 'holdings' && <HoldingsView data={data} onAdd={() => { setEditingInvestment(null); setModal('investment'); }} onEdit={(item) => { setEditingInvestment(item); setModal('investment'); }} onDelete={(item) => { setDeletingInvestment(item); setModal('delete-investment'); }} />}
       {tab === 'bills' && <BillsViewV4 data={{ ...data, commitments: data.commitments.filter((item) => item.entry_type !== 'recurring') }} onAdd={() => { setCommitmentMode('bill'); setEditingCommitment(null); setModal('commitment'); }} onToggle={(item) => void toggleCommitmentStatus(item)} onEdit={(item) => { setCommitmentMode('bill'); setEditingCommitment(item); setModal('commitment'); }} onDelete={(item) => { setDeletingCommitment(item); setModal('delete-commitment'); }} />}
       {tab === 'spends' && <SpendsViewV4 data={{ ...data, spaces: data.spaces.filter(isSpendTracker) }} onAddSpace={() => { setEditingSpace(null); setModal('space'); }} onAddEntry={(space) => openTransactionModal(space.id)} onEditEntry={(entry) => openTransactionModal(entry.space_id, entry)} onDeleteEntry={(entry) => { setDeletingTransaction(entry); setModal('delete-transaction'); }} onEditSpace={(space) => { setEditingSpace(space); setModal('space'); }} onDeleteSpace={(space) => { setDeletingSpace(space); setModal('delete-space'); }} />}
       {tab === 'recurring' && <RecurringView data={{ ...data, commitments: data.commitments.filter((item) => item.entry_type === 'recurring') }} displayCurrency={displayCurrency} onAdd={() => { setCommitmentMode('recurring'); setEditingCommitment(null); setModal('commitment'); }} onEdit={(item) => { setCommitmentMode('recurring'); setEditingCommitment(item); setModal('commitment'); }} onDelete={(item) => { setDeletingCommitment(item); setModal('delete-commitment'); }} onToggle={(item) => void toggleRecurringActive(item)} onNavigate={navigateTo} />}
       {tab === 'forecast' && <ForecastView data={data} metrics={metrics} displayCurrency={displayCurrency} onAdd={() => { setEditingForecastScenario(null); setModal('forecast-scenario'); }} onEdit={(item) => { setEditingForecastScenario(item); setModal('forecast-scenario'); }} onDelete={(item) => { setDeletingForecastScenario(item); setModal('delete-forecast-scenario'); }} onToggle={(item) => void toggleForecastScenario(item)} />}
       {tab === 'budget' && <BudgetView data={data} displayCurrency={displayCurrency} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} onAdd={() => { setEditingBudgetLine(null); setModal('budget-line'); }} onEdit={(item) => { setEditingBudgetLine(item); setModal('budget-line'); }} onDelete={(item) => { setDeletingBudgetLine(item); setModal('delete-budget-line'); }} onLogActual={() => openTransactionModal()} onEditActual={(item) => openTransactionModal(item.space_id, item)} onDeleteActual={(item) => { setDeletingTransaction(item); setModal('delete-transaction'); }} onImportRecurring={() => void importRecurringToBudget()} />}
       {tab === 'history' && <HistoryView data={data} onAdd={() => { setEditingSnapshot(null); setModal('snapshot'); }} onEdit={(item) => { setEditingSnapshot(item); setModal('snapshot'); }} onDelete={(item) => { setDeletingSnapshot(item); setModal('delete-snapshot'); }} onRefresh={() => setModal('checkin')} />}
       {tab === 'settings' && <div className="settings-view"><SettingsView data={data} theme={theme} setTheme={updateTheme} exportData={exportData} session={!!session} enabledCurrencies={enabledCurrencies} onToggleCurrency={toggleCurrency} onDisplayCurrency={(value) => void updateDisplayCurrency(value)} onCountOwed={(value) => void updateCountOwedToMe(value)} onRefreshRates={() => void refreshFxRates()} onSaveRate={saveManualRate} onAddCountry={() => { setEditingCountry(null); setModal('country'); }} onEditCountry={(item) => { setEditingCountry(item); setModal('country'); }} onDeleteCountry={(item) => { setDeletingCountry(item); setModal('delete-country'); }} /></div>}
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <button className={tab === 'home' ? 'active' : ''} aria-current={tab === 'home' ? 'page' : undefined} onClick={() => navigateTo('home')}><Home size={20} /><span>Home</span></button>
      <button className={tab === 'accounts' ? 'active' : ''} aria-current={tab === 'accounts' ? 'page' : undefined} onClick={() => navigateTo('accounts')}><Wallet size={20} /><span>Accounts</span></button>
      <button className="mobile-nav-add" aria-label="Quick add" onClick={() => setModal('quick-add')}><Plus size={25} /><span>Add</span></button>
      <button className={tab === 'spends' ? 'active' : ''} aria-current={tab === 'spends' ? 'page' : undefined} onClick={() => navigateTo('spends')}><CreditCard size={20} /><span>Spends</span></button>
      <button className={showMobileMore || mobileMoreItems.some((item) => item.id === tab) ? 'active' : ''} aria-expanded={showMobileMore} onClick={() => setShowMobileMore(true)}><LayoutGrid size={20} /><span>More</span></button>
    </nav>
    <MobileMoreSheet open={showMobileMore} activeTab={tab} onClose={() => setShowMobileMore(false)} onNavigate={navigateTo} />
    {modal === 'quick-add' && <QuickAddSheet onClose={() => setModal(null)} onAccount={() => { setEditingAccount(null); setModal('account'); }} onSpend={() => { setEditingSpace(null); setModal('space'); }} onBill={() => { setCommitmentMode('bill'); setEditingCommitment(null); setModal('commitment'); }} onRecurring={() => { setCommitmentMode('recurring'); setEditingCommitment(null); setModal('commitment'); }} />}
    {modal === 'account' && <ReferenceAccountModal account={editingAccount} workspaces={data.workspaces} currencies={formCurrencyOptions} countries={formCountryOptions} onClose={() => { setModal(null); setEditingAccount(null); }} onSave={saveAccount} onDelete={(account) => { setEditingAccount(null); setDeletingAccount(account); setModal('delete-account'); }} />}
    {modal === 'move-account-country' && movingAccount && <MoveAccountCountryModal account={movingAccount} countries={formCountryOptions} onClose={() => { setModal(null); setMovingAccount(null); }} onSave={moveAccountCountry} />}
    {modal === 'delete-account' && deletingAccount && <DeleteAccountModal account={deletingAccount} onClose={() => { setModal(null); setDeletingAccount(null); }} onDelete={() => void deleteAccount(deletingAccount)} />}
    {modal === 'transaction' && <ReferenceTransactionModal transaction={editingTransaction} defaultSpaceId={transactionSpaceId} accounts={data.accounts} spaces={data.spaces.filter(isSpendTracker)} onClose={() => { setModal(null); setEditingTransaction(null); setTransactionSpaceId(null); }} onSave={createTransaction} />}
    {modal === 'transfer' && <TransferModal accounts={data.accounts} onClose={() => setModal(null)} onSave={createTransfer} />}
    {modal === 'checkin' && <CheckInModal accounts={data.accounts} onClose={() => setModal(null)} onSave={saveCheckin} />}
    {modal === 'whatif' && <WhatIfModal safeToSpend={metrics.safeToSpend} whatIf={whatIf} setWhatIf={setWhatIf} onClose={() => setModal(null)} onRun={() => { runWhatIf(); setModal(null); navigateTo('forecast'); }} />}
    {modal === 'commitment' && <ReferenceCommitmentModal mode={commitmentMode} commitment={editingCommitment} workspaces={data.workspaces} countries={formCountryOptions} currencies={formCurrencyOptions} onClose={() => { setModal(null); setEditingCommitment(null); }} onSave={saveCommitment} />}
    {modal === 'delete-commitment' && deletingCommitment && <DeleteCommitmentModal item={deletingCommitment} onClose={() => { setModal(null); setDeletingCommitment(null); }} onDelete={() => void deleteCommitment(deletingCommitment)} />}
    {modal === 'forecast-scenario' && <ReferenceForecastScenarioModal scenario={editingForecastScenario} workspaces={data.workspaces} countries={formCountryOptions} currencies={formCurrencyOptions} onClose={() => { setModal(null); setEditingForecastScenario(null); }} onSave={saveForecastScenario} />}
    {modal === 'delete-forecast-scenario' && deletingForecastScenario && <DeleteForecastScenarioModal item={deletingForecastScenario} onClose={() => { setModal(null); setDeletingForecastScenario(null); }} onDelete={() => void deleteForecastScenario(deletingForecastScenario)} />}
    {modal === 'budget-line' && <ReferenceBudgetLineModal line={editingBudgetLine} workspaces={data.workspaces} countries={formCountryOptions} currencies={formCurrencyOptions} month={selectedMonth} onClose={() => { setModal(null); setEditingBudgetLine(null); }} onSave={saveBudgetLine} />}
    {modal === 'delete-budget-line' && deletingBudgetLine && <DeleteBudgetLineModal item={deletingBudgetLine} onClose={() => { setModal(null); setDeletingBudgetLine(null); }} onDelete={() => void deleteBudgetLine(deletingBudgetLine)} />}
    {modal === 'debt' && <LoanEditorModal debt={editingDebt} receivable={editingReceivable} workspaces={data.workspaces} countries={formCountryOptions} currencies={formCurrencyOptions} onClose={() => { setModal(null); setEditingDebt(null); setEditingReceivable(null); }} onSave={saveLoan} />}
    {modal === 'delete-debt' && deletingDebt && <DeleteDebtModal item={deletingDebt} onClose={() => { setModal(null); setDeletingDebt(null); }} onDelete={() => void deleteDebt(deletingDebt)} />}
    {modal === 'debt-event' && <DebtEventModalV4 debts={data.debts} accounts={[]} spaces={[]} event={editingDebtEvent} defaultDebtId={debtEventDebtId} defaultSpaceId={null} defaultEventType={debtEventType} onClose={() => { setModal(null); setEditingDebtEvent(null); setDebtEventDebtId(null); setDebtEventSpaceId(null); }} onSave={saveDebtEventV2} />}
    {modal === 'delete-debt-event' && deletingDebtEvent && <DeleteDebtEventModal item={deletingDebtEvent} onClose={() => { setModal(null); setDeletingDebtEvent(null); }} onDelete={() => void deleteDebtEvent(deletingDebtEvent)} />}
    {modal === 'receivable' && <ReceivableModal workspaces={data.workspaces} onClose={() => setModal(null)} onSave={createReceivable} />}
    {modal === 'receivable-event' && <ReceivablePaymentModal receivables={data.receivables} defaultReceivableId={receivableEventId} onClose={() => { setModal(null); setReceivableEventId(null); }} onSave={createReceivableEvent} />}
    {modal === 'delete-receivable' && deletingReceivable && <DeleteReceivableModal item={deletingReceivable} onClose={() => { setModal(null); setDeletingReceivable(null); }} onDelete={() => void deleteReceivable(deletingReceivable)} />}
    {modal === 'investment' && <ReferenceInvestmentModal investment={editingInvestment} workspaces={data.workspaces} countries={formCountryOptions} currencies={formCurrencyOptions} onClose={() => { setModal(null); setEditingInvestment(null); }} onSave={saveInvestment} />}
    {modal === 'delete-investment' && deletingInvestment && <DeleteInvestmentModal item={deletingInvestment} onClose={() => { setModal(null); setDeletingInvestment(null); }} onDelete={() => void deleteInvestment(deletingInvestment)} />}
    {modal === 'reserve' && <ReserveModal workspaces={data.workspaces} onClose={() => setModal(null)} onSave={createReserve} />}
    {modal === 'workspace' && <WorkspaceModal onClose={() => setModal(null)} onSave={createWorkspace} />}
    {modal === 'space' && <SpendTrackerModal space={editingSpace} workspaces={data.workspaces} countries={formCountryOptions} currencies={formCurrencyOptions} onClose={() => { setModal(null); setEditingSpace(null); }} onSave={saveSpace} />}
    {modal === 'pot' && <PotEditorModal space={editingSpace} workspaces={data.workspaces} countries={formCountryOptions} currencies={formCurrencyOptions} onClose={() => { setModal(null); setEditingSpace(null); }} onSave={savePot} />}
    {modal === 'pot-event' && potEventSpace && <PotEventModal space={potEventSpace} eventType={potEventType} onClose={() => { setModal(null); setPotEventSpace(null); }} onSave={savePotEvent} />}
    {modal === 'delete-space' && deletingSpace && <DeleteSpaceModal space={deletingSpace} onClose={() => { setModal(null); setDeletingSpace(null); }} onDelete={() => void deleteSpace(deletingSpace)} />}
    {modal === 'delete-transaction' && deletingTransaction && <DeleteTransactionModal item={deletingTransaction} onClose={() => { setModal(null); setDeletingTransaction(null); }} onDelete={() => void deleteTransaction(deletingTransaction)} />}
    {modal === 'country' && <CountryModal country={editingCountry} onClose={() => { setModal(null); setEditingCountry(null); }} onSave={saveCountry} />}
    {modal === 'delete-country' && deletingCountry && <DeleteCountryModal item={deletingCountry} onClose={() => { setModal(null); setDeletingCountry(null); }} onDelete={() => void deleteCountry(deletingCountry)} />}
    {modal === 'snapshot' && <SnapshotModal snapshot={editingSnapshot} rates={data.fxRates} onClose={() => { setModal(null); setEditingSnapshot(null); }} onSave={saveSnapshot} />}
    {modal === 'delete-snapshot' && deletingSnapshot && <DeleteSnapshotModal item={deletingSnapshot} onClose={() => { setModal(null); setDeletingSnapshot(null); }} onDelete={() => void deleteSnapshot(deletingSnapshot)} />}
    {modal === 'import' && <ImportModal workspaces={data.workspaces} onClose={() => setModal(null)} onImport={importAccounts} />}
    {toast && <div className="toast"><Sparkles size={16} /> {toast}</div>}
  </div>;
}

function LoadingState() {
  return <main className="loading-shell"><NettLogo priority /><div className="loading-pulse">Preparing your private workspace…</div></main>;
}

function HomeView({ data, metrics, hidden, setHidden, staleAccounts, onQuick, onNavigate, workspace, displayCurrency, comparisonCurrency, notify, whatIf, setWhatIf, whatIfResult, runWhatIf }: { data: NettData; metrics: ReturnType<typeof calculateMetrics>; hidden: boolean; setHidden: (value: boolean) => void; staleAccounts: number; onQuick: (modal: Modal) => void; onNavigate: (tab: Tab) => void; workspace: string; displayCurrency: string; comparisonCurrency: string; notify: (message: string) => void; whatIf: string; setWhatIf: (value: string) => void; whatIfResult: number | null; runWhatIf: () => void }) {
  if (!data.accounts.length) return <div className="empty-home"><div className="empty-home-icon"><Wallet size={23} /></div><div className="eyebrow"><Sparkles size={13} /> Your private workspace is ready</div><h2>Start with one real account.</h2><p>Add your first balance and Nett will turn it into a calm, useful picture. You can add loans, bills and spending entries whenever you’re ready.</p><button className="primary-button" onClick={() => window.location.href = '/onboarding'}>Complete setup <ChevronDown size={15} style={{ transform: 'rotate(-90deg)' }} /></button><button className="empty-home-link" onClick={() => onQuick('account')}>I’m ready to add an account manually</button></div>;
  const maxReserve = Math.max(metrics.liquidCash, 1); const safePercent = Math.min(100, Math.max(0, metrics.safeToSpend / maxReserve * 100));
  return <>
    <MobileHomeView data={data} metrics={metrics} hidden={hidden} setHidden={setHidden} staleAccounts={staleAccounts} onQuick={onQuick} onNavigate={onNavigate} displayCurrency={displayCurrency} whatIf={whatIf} setWhatIf={setWhatIf} whatIfResult={whatIfResult} runWhatIf={runWhatIf} />
    <DesktopHomeView data={data} metrics={metrics} hidden={hidden} setHidden={setHidden} staleAccounts={staleAccounts} onQuick={onQuick} onNavigate={onNavigate} displayCurrency={displayCurrency} whatIf={whatIf} setWhatIf={setWhatIf} whatIfResult={whatIfResult} runWhatIf={runWhatIf} />
    <div className="legacy-desktop-home-view">
    <div className="dashboard-grid">
      <section className="card hero-card"><div className="card-kicker"><Gauge size={15} /> Primary Net Worth <button onClick={() => setHidden(!hidden)} style={{ marginLeft: 4, border: 0, background: 'none', color: '#87858d', padding: 0 }}>{hidden ? <Eye size={14} /> : <EyeOff size={14} />}</button></div><div className="hero-value">{hidden ? '••••••' : formatCurrency(metrics.primaryNetWorth, displayCurrency)}<small>{displayCurrency}</small></div><div className="delta"><ShieldCheck size={14} /> Based on your latest saved balances <span style={{ color: '#9b9aa1' }}>· no fake trend data</span></div><div className="hero-footer"><span className={`status-chip ${staleAccounts ? 'warn' : 'good'}`}><span className="dot" /> {staleAccounts ? `${staleAccounts} update${staleAccounts > 1 ? 's' : ''} needed` : 'Everything looks fresh'}</span><span className="status-chip">{staleAccounts ? 'Check-in recommended' : 'Balances recently verified'}</span></div></section>
      <div className="side-stack"><section className={`card safe-card ${metrics.safeToSpend < 0 ? 'negative' : ''}`}><div className="card-kicker"><Zap size={15} /> {metrics.safeToSpend < 0 ? 'Amount to protect' : 'Safe to Spend'}</div><div className="safe-value">{hidden ? '••••' : formatCurrency(metrics.safeToSpend, displayCurrency, true)}</div><div className="safe-sub">After reserves + recurring commitments</div><div className="safe-progress"><span style={{ width: `${safePercent}%` }} /></div><div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa8b0', fontSize: 10 }}><span>{formatCurrency(metrics.protectedAmount, displayCurrency, true)} protected</span><span>{metrics.safeToSpend < 0 ? 'Needs attention' : `${Math.round(safePercent)}% free`}</span></div></section><section className="card" style={{ padding: 20 }}><div className="card-kicker"><CalendarClock size={15} /> Freshness</div><div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.04em', marginTop: 17 }}>{staleAccounts ? `${staleAccounts} account${staleAccounts > 1 ? 's' : ''} to update` : 'All balances fresh'}</div><div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 6 }}>Nett never invents a check-in date.</div><button className="soft-button" style={{ width: '100%', marginTop: 14, minHeight: 34, fontSize: 11 }} onClick={() => onQuick('checkin')}>Review balances <ArrowUpRight size={13} /></button></section></div>
      <div className="stats-grid"><MetricCard label="Liquid Cash" value={metrics.liquidCash} note="Across cash-like accounts" icon={<Wallet size={14} />} /><MetricCard label="Mandatory Debt" value={metrics.mandatoryDebt} note="Included in primary net worth" icon={<CreditCard size={14} />} accent="#cb6e83" /><MetricCard label="Flexible Debt" value={metrics.flexibleDebt} note="Shown separately by default" icon={<ArrowDownLeft size={14} />} accent="#b77dc7" /><MetricCard label="Investments" value={metrics.investments} note="Manual values · last checked" icon={<LineChart size={14} />} accent="#5b9c9b" /></div>
    </div>
    <div className="content-grid"><section className="card wide-card"><div className="card-header"><div><h2 className="card-title">My accounts</h2><div className="card-meta">{data.accounts.length} accounts · {workspace === 'everything' ? 'combined view' : 'workspace view'}</div></div><button className="view-link" onClick={() => onQuick('account')}><Plus size={13} style={{ verticalAlign: '-2px' }} /> Add account</button></div><div className="account-rail">{data.accounts.map((account) => <AccountCard key={account.id} account={account} displayCurrency={displayCurrency} rates={data.fxRates} />)}</div></section><section className="card wide-card"><div className="card-header"><div><h2 className="card-title">Recent activity</h2><div className="card-meta">Selective entries · {data.transactions.length} this period</div></div><button className="view-link" onClick={() => onQuick('transaction')}>Quick add <Plus size={13} style={{ verticalAlign: '-2px' }} /></button></div><div className="activity-list">{data.transactions.slice(0, 4).map((item) => <ActivityRow key={item.id} transaction={item} displayCurrency={displayCurrency} rates={data.fxRates} />)}</div></section><section className="card wide-card"><div className="card-header"><div><h2 className="card-title">On the horizon</h2><div className="card-meta">The next 90 days, without the noise</div></div><button className="view-link" onClick={() => onQuick('commitment')}>Add <Plus size={13} style={{ verticalAlign: '-2px' }} /></button></div><div className="timeline">{data.commitments.slice(0, 3).map((item) => <div className="timeline-item" key={item.id}><span className="timeline-marker" /><div className="timeline-content"><div><div className="timeline-name">{item.name}</div><div className="timeline-date">{formatShortDate(item.due_date)} · {item.recurrence.replace('_', ' ')}</div></div><div><div className="timeline-amount">{formatCurrency(Number(item.amount), item.currency, true)}</div><span className="timeline-tag">{item.importance}</span></div></div></div>)}</div></section><section className="card wide-card"><div className="card-header"><div><h2 className="card-title">Small signal</h2><div className="card-meta">A nudge worth knowing</div></div><Sparkles size={17} color="#c080d8" /></div><div style={{ padding: '18px 24px 24px', display: 'flex', gap: 15, alignItems: 'center' }}><div style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: 15, background: 'linear-gradient(140deg,#ffd4e8,#e2d0ff)', color: '#985b9e' }}><ShieldCheck size={22} /></div><div><strong style={{ fontSize: 13 }}>Your cash buffer is doing the work.</strong><p style={{ margin: '5px 0 0', color: 'var(--muted)', fontSize: 11, lineHeight: 1.45 }}>Reserves cover {Math.round(metrics.protectedAmount / Math.max(metrics.upcomingCommitments, 1) * 100)}% of near-term mandatory commitments. Keep the next check-in light.</p></div></div></section></div>
    </div>
  </>;
}

function WhatIfCard({ displayCurrency, whatIf, setWhatIf, whatIfResult, runWhatIf, compact = false }: { displayCurrency: string; whatIf: string; setWhatIf: (value: string) => void; whatIfResult: number | null; runWhatIf: () => void; compact?: boolean }) {
  const amount = Number(whatIf || 0);
  return <section className={`card whatif-card ${compact ? 'compact' : ''}`}>
    <div className="whatif-card-heading"><div><div className="eyebrow"><Sparkles size={13} /> Decision check</div><h3>Before you spend.</h3><p>See how a purchase changes your safe-to-spend picture.</p></div><span className="pill">Not saved</span></div>
    <form className="whatif-card-form" onSubmit={(event) => { event.preventDefault(); runWhatIf(); }}><label className="sr-only" htmlFor={compact ? 'mobile-whatif-amount' : 'desktop-whatif-amount'}>Hypothetical expense</label><input id={compact ? 'mobile-whatif-amount' : 'desktop-whatif-amount'} inputMode="decimal" type="number" min="0" step="0.01" value={whatIf} onChange={(event) => setWhatIf(event.target.value)} placeholder="What might you spend?" /><span>{displayCurrency}</span><button className="primary-button" type="submit">Calculate</button></form>
    {whatIfResult !== null && <div className={`scenario-result ${whatIfResult >= 0 ? 'positive' : 'negative'}`} role="status"><strong>Safe to spend after: {formatCurrency(whatIfResult, displayCurrency)}</strong><span>Net worth impact: −{formatCurrency(amount, displayCurrency, true)} · this scenario is temporary.</span></div>}
  </section>;
}

function MobileHomeView({ data, metrics, hidden, setHidden, staleAccounts, onQuick, onNavigate, displayCurrency, whatIf, setWhatIf, whatIfResult, runWhatIf }: { data: NettData; metrics: ReturnType<typeof calculateMetrics>; hidden: boolean; setHidden: (value: boolean) => void; staleAccounts: number; onQuick: (modal: Modal) => void; onNavigate: (tab: Tab) => void; displayCurrency: string; whatIf: string; setWhatIf: (value: string) => void; whatIfResult: number | null; runWhatIf: () => void }) {
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthTransactions = data.transactions.filter((item) => item.occurred_at.startsWith(monthKey));
  const income = monthTransactions.filter((item) => item.type === 'credit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const expenses = monthTransactions.filter((item) => item.type === 'debit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const safePercent = Math.min(100, Math.max(0, metrics.safeToSpend / Math.max(metrics.liquidCash, 1) * 100));
  return <div className="mobile-home-view">
    <section className="mobile-total-card"><div className="mobile-card-label"><span>Total net worth</span><button onClick={() => setHidden(!hidden)} aria-label={hidden ? 'Show balances' : 'Hide balances'}>{hidden ? <Eye size={17} /> : <EyeOff size={17} />}</button></div><strong>{hidden ? '••••••' : formatCurrency(metrics.primaryNetWorth, displayCurrency)}</strong><div className="mobile-total-meta"><span>{data.accounts.length} accounts · {staleAccounts ? `${staleAccounts} to update` : 'All balances fresh'}</span><span>{displayCurrency}</span></div></section>
    <section className={`mobile-safe-card ${metrics.safeToSpend < 0 ? 'negative' : ''}`}><div className="mobile-safe-card-heading"><span><Zap size={17} /> Safe to spend</span><small>After reserves + commitments</small></div><strong>{hidden ? '••••' : formatCurrency(metrics.safeToSpend, displayCurrency, true)}</strong><p>This is what is genuinely available before you spend.</p><div className="mobile-safe-progress"><span style={{ width: `${safePercent}%` }} /></div><div className="mobile-safe-footer"><span>{Math.round(safePercent)}% free</span><span>{formatCurrency(metrics.protectedAmount, displayCurrency, true)} protected</span></div></section>
    <div className="mobile-home-actions-row"><button className="primary-button" onClick={() => onQuick('transaction')}><Plus size={17} /> Add entry</button><button className="soft-button" onClick={() => onQuick('checkin')}><RefreshCw size={17} /> Update balances</button></div>
    <div className="mobile-money-pair"><button className="mobile-summary-card" onClick={() => onQuick('transaction')}><span>Income this month <ArrowDownLeft size={14} /></span><strong>{formatCurrency(income, displayCurrency, true)}</strong><small>{monthTransactions.filter((item) => item.type === 'credit').length} entries</small></button><button className="mobile-summary-card" onClick={() => onQuick('transaction')}><span>Expenses this month <ArrowUpRight size={14} /></span><strong>{formatCurrency(expenses, displayCurrency, true)}</strong><small>{monthTransactions.filter((item) => item.type === 'debit').length} entries</small></button></div>
    <div className="mobile-section-heading"><h3>Your overview</h3><button onClick={() => onNavigate('forecast')}>Open forecast <ArrowUpRight size={14} /></button></div>
    <div className="mobile-overview-grid"><button onClick={() => onNavigate('accounts')}><span className="mobile-overview-icon lilac"><Wallet size={17} /></span><span><b>Accounts</b><small>{data.accounts.length} accounts</small></span><ArrowUpRight size={14} /></button><button onClick={() => onNavigate('bills')}><span className="mobile-overview-icon blue"><CalendarClock size={17} /></span><span><b>Bills</b><small>{data.commitments.filter((item) => item.entry_type !== 'recurring').length} upcoming</small></span><ArrowUpRight size={14} /></button><button onClick={() => onNavigate('spends')}><span className="mobile-overview-icon mint"><CreditCard size={17} /></span><span><b>Spends</b><small>{data.spaces.filter(isSpendTracker).length} trackers</small></span><ArrowUpRight size={14} /></button><button onClick={() => onNavigate('holdings')}><span className="mobile-overview-icon peach"><LineChart size={17} /></span><span><b>Holdings</b><small>{data.investments.length} positions</small></span><ArrowUpRight size={14} /></button></div>
    <div className="mobile-section-heading"><h3>Recent entries</h3><button onClick={() => onNavigate('spends')}>Open spends <ArrowUpRight size={14} /></button></div>
    <section className="mobile-activity-card">{data.transactions.length ? data.transactions.slice(0, 3).map((item) => <div className="mobile-activity-row" key={item.id}><span className={`mobile-activity-icon ${item.type === 'credit' ? 'credit' : 'debit'}`}>{item.type === 'credit' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span><span className="mobile-activity-copy"><b>{item.category || item.description || 'Entry'}</b><small>{formatShortDate(item.occurred_at)} · {item.description || 'Saved entry'}</small></span><strong className={item.type === 'credit' ? 'credit' : 'debit'}>{item.type === 'credit' ? '+' : '−'}{formatCurrency(displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), displayCurrency, true)}</strong></div>) : <div className="mobile-empty-row"><ListFilter size={18} /><span>No entries yet. Add your first expense or income.</span></div>}<button className="mobile-primary-row-action" onClick={() => onQuick('transaction')}><Plus size={15} /> Add entry</button></section>
    {data.commitments.length > 0 && <><div className="mobile-section-heading"><h3>Coming up</h3><button onClick={() => onNavigate('bills')}>Open bills <ArrowUpRight size={14} /></button></div><section className="mobile-upcoming-card">{data.commitments.slice(0, 2).map((item) => <div className="mobile-upcoming-row" key={item.id}><span className="mobile-upcoming-dot" /><span><b>{item.name}</b><small>{formatShortDate(item.due_date)} · {item.recurrence.replace('_', ' ')}</small></span><strong>{formatCurrency(Number(item.amount), item.currency, true)}</strong></div>)}</section></>}
    <WhatIfCard compact displayCurrency={displayCurrency} whatIf={whatIf} setWhatIf={setWhatIf} whatIfResult={whatIfResult} runWhatIf={runWhatIf} />
  </div>;
}

function DesktopNetWorthCard({ metrics, hidden, setHidden, staleAccounts, displayCurrency }: { metrics: ReturnType<typeof calculateMetrics>; hidden: boolean; setHidden: (value: boolean) => void; staleAccounts: number; displayCurrency: string }) {
  return <section className="card desktop-net-worth-card">
    <div className="desktop-net-worth-primary"><span>Primary net worth</span><button onClick={() => setHidden(!hidden)} aria-label={hidden ? 'Show balances' : 'Hide balances'}>{hidden ? <Eye size={16} /> : <EyeOff size={16} />}</button></div>
    <div className="desktop-net-worth-amount"><strong>{hidden ? '••••••' : formatCurrency(metrics.primaryNetWorth, displayCurrency)}</strong><span>{displayCurrency}</span></div>
    <div className="desktop-net-worth-meta"><ShieldCheck size={14} /> <span>Based on your latest saved balances</span><span className="desktop-net-worth-muted">· no fake trend data</span></div>
    <div className="desktop-net-worth-badges"><span className={`status-chip ${staleAccounts ? 'warn' : 'good'}`}><span className="dot" />{staleAccounts ? `${staleAccounts} balance${staleAccounts > 1 ? 's' : ''} need updating` : 'Everything looks fresh'}</span><span className="status-chip">{staleAccounts ? 'Check-in recommended' : 'Balances recently verified'}</span></div>
  </section>;
}

function DesktopHomeView({ data, metrics, hidden, setHidden, staleAccounts, onQuick, onNavigate, displayCurrency, whatIf, setWhatIf, whatIfResult, runWhatIf }: { data: NettData; metrics: ReturnType<typeof calculateMetrics>; hidden: boolean; setHidden: (value: boolean) => void; staleAccounts: number; onQuick: (modal: Modal) => void; onNavigate: (tab: Tab) => void; displayCurrency: string; whatIf: string; setWhatIf: (value: string) => void; whatIfResult: number | null; runWhatIf: () => void }) {
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthTransactions = data.transactions.filter((item) => item.occurred_at.startsWith(monthKey));
  const income = monthTransactions.filter((item) => item.type === 'credit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const expenses = monthTransactions.filter((item) => item.type === 'debit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const safePercent = Math.min(100, Math.max(0, metrics.safeToSpend / Math.max(metrics.liquidCash, 1) * 100));
  const visibleCurrencies = data.profile.enabled_currencies?.length ? data.profile.enabled_currencies : currencyOptions;
  const currencyTotals = visibleCurrencies.map((currency) => ({ currency, amount: data.accounts.filter((item) => item.currency === currency).reduce((sum, item) => sum + Number(item.estimated_balance ?? item.verified_balance), 0) })).filter((item) => item.amount !== 0);
  return <div className="desktop-home-view"><div className="desktop-cockpit-grid"><div className="desktop-cockpit-main">
    <DesktopNetWorthCard metrics={metrics} hidden={hidden} setHidden={setHidden} staleAccounts={staleAccounts} displayCurrency={displayCurrency} />
    <div className="desktop-summary-grid"><button onClick={() => onNavigate('accounts')}><span className="desktop-summary-icon lilac"><Wallet size={17} /></span><span><b>Accounts</b><small>{formatCurrency(metrics.liquidCash, displayCurrency, true)}</small></span><ArrowUpRight size={15} /></button><button onClick={() => onNavigate('holdings')}><span className="desktop-summary-icon mint"><LineChart size={17} /></span><span><b>Holdings</b><small>{formatCurrency(metrics.investments, displayCurrency, true)}</small></span><ArrowUpRight size={15} /></button><button onClick={() => onNavigate('loans')}><span className="desktop-summary-icon rose"><CreditCard size={17} /></span><span><b>You owe</b><small>{formatCurrency(metrics.mandatoryDebt + metrics.flexibleDebt, displayCurrency, true)}</small></span><ArrowUpRight size={15} /></button><button onClick={() => onNavigate('loans')}><span className="desktop-summary-icon blue"><ArrowDownLeft size={17} /></span><span><b>Owed to you</b><small>{formatCurrency(metrics.receivables, displayCurrency, true)}</small></span><ArrowUpRight size={15} /></button></div>
    <section className="card desktop-section-card"><div className="desktop-section-heading"><div><h3>By currency</h3><p>See each balance without opening every account.</p></div><button className="view-link" onClick={() => onNavigate('accounts')}>Manage accounts <ArrowUpRight size={13} /></button></div><div className="desktop-currency-grid">{currencyTotals.length ? currencyTotals.map((item) => <button key={item.currency} onClick={() => onNavigate('accounts')}><span>{item.currency}</span><strong>{formatCurrency(item.amount, item.currency)}</strong><small>Across {data.accounts.filter((account) => account.currency === item.currency).length} account{data.accounts.filter((account) => account.currency === item.currency).length === 1 ? '' : 's'}</small></button>) : <div className="desktop-empty-copy">Add an account to see balances grouped by currency.</div>}</div></section>
    <section className="card desktop-section-card"><div className="desktop-section-heading"><div><h3>Upcoming</h3><p>Future bills and commitments stay visible before they become surprises.</p></div><button className="view-link" onClick={() => onNavigate('bills')}>Open bills <ArrowUpRight size={13} /></button></div><div className="desktop-upcoming-list">{data.commitments.length ? data.commitments.slice(0, 3).map((item) => <button key={item.id} onClick={() => onNavigate('bills')}><span className="desktop-upcoming-dot" /><span><b>{item.name}</b><small>{formatShortDate(item.due_date)} · {item.recurrence.replace('_', ' ')}</small></span><strong>{formatCurrency(Number(item.amount), item.currency, true)}</strong></button>) : <div className="desktop-empty-copy">No future commitments recorded.</div>}</div></section>
  </div><aside className="desktop-cockpit-side">
    <section className={`card desktop-safe-card ${metrics.safeToSpend < 0 ? 'negative' : ''}`}><div className="card-kicker"><Zap size={15} /> Safe to spend</div><strong>{hidden ? '••••' : formatCurrency(metrics.safeToSpend, displayCurrency, true)}</strong><p>After reserves + recurring commitments.</p><div className="safe-progress"><span style={{ width: `${safePercent}%` }} /></div><div><span>{Math.round(safePercent)}% free</span><span>{formatCurrency(metrics.protectedAmount, displayCurrency, true)} protected</span></div></section>
    <WhatIfCard displayCurrency={displayCurrency} whatIf={whatIf} setWhatIf={setWhatIf} whatIfResult={whatIfResult} runWhatIf={runWhatIf} />
    <section className="card desktop-section-card"><div className="desktop-section-heading"><div><h3>Recent entries</h3><p>Keep an eye on the last things that moved.</p></div><button className="view-link" onClick={() => onNavigate('spends')}>Open spends <ArrowUpRight size={13} /></button></div><div className="desktop-activity-list">{data.transactions.length ? data.transactions.slice(0, 5).map((item) => <ActivityRow key={item.id} transaction={item} displayCurrency={displayCurrency} rates={data.fxRates} />) : <div className="desktop-empty-copy">No entries yet.</div>}</div><button className="desktop-add-row" onClick={() => onQuick('transaction')}><Plus size={14} /> Add entry</button></section>
    <section className="card desktop-checkin-card"><CalendarClock size={16} /><div><b>{staleAccounts ? `${staleAccounts} balance${staleAccounts > 1 ? 's' : ''} need updating` : 'Everything looks fresh'}</b><p>Monthly review takes a few minutes.</p></div><button className="view-link" onClick={() => onQuick('checkin')}>Review</button></section>
    <div className="desktop-monthly-split"><div><span>Income this month</span><strong>{formatCurrency(income, displayCurrency, true)}</strong></div><div><span>Expenses this month</span><strong>{formatCurrency(expenses, displayCurrency, true)}</strong></div></div>
  </aside></div></div>;
}

function DesktopHomeViewLegacy({ data, metrics, hidden, setHidden, staleAccounts, onQuick, onNavigate, displayCurrency, whatIf, setWhatIf, whatIfResult, runWhatIf }: { data: NettData; metrics: ReturnType<typeof calculateMetrics>; hidden: boolean; setHidden: (value: boolean) => void; staleAccounts: number; onQuick: (modal: Modal) => void; onNavigate: (tab: Tab) => void; displayCurrency: string; whatIf: string; setWhatIf: (value: string) => void; whatIfResult: number | null; runWhatIf: () => void }) {
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthTransactions = data.transactions.filter((item) => item.occurred_at.startsWith(monthKey));
  const income = monthTransactions.filter((item) => item.type === 'credit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const expenses = monthTransactions.filter((item) => item.type === 'debit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const safePercent = Math.min(100, Math.max(0, metrics.safeToSpend / Math.max(metrics.liquidCash, 1) * 100));
  const visibleCurrencies = data.profile.enabled_currencies?.length ? data.profile.enabled_currencies : currencyOptions;
  const currencyTotals = visibleCurrencies.map((currency) => ({ currency, amount: data.accounts.filter((item) => item.currency === currency).reduce((sum, item) => sum + Number(item.estimated_balance ?? item.verified_balance), 0) })).filter((item) => item.amount !== 0);
  return <div className="desktop-home-view"><div className="desktop-cockpit-grid"><div className="desktop-cockpit-main"><section className="card desktop-net-worth-card"><div className="desktop-card-topline"><div><span className="desktop-eyebrow">Your financial cockpit</span><h2>Your net worth, in one place.</h2></div><button className="soft-button" onClick={() => onQuick('checkin')}><RefreshCw size={14} /> Update balances</button></div><div className="desktop-net-worth-label">Total net worth <button onClick={() => setHidden(!hidden)} aria-label={hidden ? 'Show balances' : 'Hide balances'}>{hidden ? <Eye size={15} /> : <EyeOff size={15} />}</button></div><strong className="desktop-net-worth-value">{hidden ? '••••••' : formatCurrency(metrics.primaryNetWorth, displayCurrency)}</strong><div className="desktop-net-worth-meta">Updated from your saved balances · {data.accounts.length} accounts · {staleAccounts ? `${staleAccounts} need attention` : 'everything fresh'}</div><div className="desktop-net-worth-strip"><span /><small>{displayCurrency}</small></div></section><div className="desktop-summary-grid"><button onClick={() => onNavigate('accounts')}><span className="desktop-summary-icon lilac"><Wallet size={17} /></span><span><b>Banking</b><small>{formatCurrency(metrics.liquidCash, displayCurrency, true)}</small></span><ArrowUpRight size={15} /></button><button onClick={() => onNavigate('more')}><span className="desktop-summary-icon mint"><LineChart size={17} /></span><span><b>Holdings</b><small>{formatCurrency(metrics.investments, displayCurrency, true)}</small></span><ArrowUpRight size={15} /></button><button onClick={() => onNavigate('plan')}><span className="desktop-summary-icon rose"><CreditCard size={17} /></span><span><b>You owe</b><small>{formatCurrency(metrics.mandatoryDebt + metrics.flexibleDebt, displayCurrency, true)}</small></span><ArrowUpRight size={15} /></button><button onClick={() => onNavigate('plan')}><span className="desktop-summary-icon blue"><ArrowDownLeft size={17} /></span><span><b>Owed to you</b><small>{formatCurrency(metrics.receivables, displayCurrency, true)}</small></span><ArrowUpRight size={15} /></button></div><section className="card desktop-section-card"><div className="desktop-section-heading"><div><h3>By currency</h3><p>See each balance without opening every account.</p></div><button className="view-link" onClick={() => onNavigate('accounts')}>Manage banking <ArrowUpRight size={13} /></button></div><div className="desktop-currency-grid">{currencyTotals.length ? currencyTotals.map((item) => <button key={item.currency} onClick={() => onNavigate('accounts')}><span>{item.currency}</span><strong>{formatCurrency(item.amount, item.currency)}</strong><small>Across {data.accounts.filter((account) => account.currency === item.currency).length} account{data.accounts.filter((account) => account.currency === item.currency).length === 1 ? '' : 's'}</small></button>) : <div className="desktop-empty-copy">Add an account to see balances grouped by currency.</div>}</div></section><section className="card desktop-section-card"><div className="desktop-section-heading"><div><h3>Upcoming</h3><p>Future bills and commitments stay visible before they become surprises.</p></div><button className="view-link" onClick={() => onNavigate('plan')}>Open plan <ArrowUpRight size={13} /></button></div><div className="desktop-upcoming-list">{data.commitments.length ? data.commitments.slice(0, 3).map((item) => <button key={item.id} onClick={() => onNavigate('plan')}><span className="desktop-upcoming-dot" /><span><b>{item.name}</b><small>{formatShortDate(item.due_date)} · {item.recurrence.replace('_', ' ')}</small></span><strong>{formatCurrency(Number(item.amount), item.currency, true)}</strong></button>) : <div className="desktop-empty-copy">No future commitments recorded.</div>}</div></section></div><aside className="desktop-cockpit-side"><section className={`card desktop-safe-card ${metrics.safeToSpend < 0 ? 'negative' : ''}`}><div className="card-kicker"><Zap size={15} /> Safe to spend</div><strong>{hidden ? '••••' : formatCurrency(metrics.safeToSpend, displayCurrency, true)}</strong><p>After protected reserves and near-term commitments.</p><div className="safe-progress"><span style={{ width: `${safePercent}%` }} /></div><div><span>{Math.round(safePercent)}% of liquid cash free</span><span>{formatCurrency(metrics.protectedAmount, displayCurrency, true)} protected</span></div></section><section className="card desktop-section-card"><div className="desktop-section-heading"><div><h3>Recent activity</h3><p>Keep an eye on the last things that moved.</p></div><button className="view-link" onClick={() => onNavigate('activity')}>See all <ArrowUpRight size={13} /></button></div><div className="desktop-activity-list">{data.transactions.length ? data.transactions.slice(0, 5).map((item) => <ActivityRow key={item.id} transaction={item} displayCurrency={displayCurrency} rates={data.fxRates} />) : <div className="desktop-empty-copy">No activity yet.</div>}</div><button className="desktop-add-row" onClick={() => onQuick('transaction')}><Plus size={14} /> Add activity</button></section><section className="card desktop-checkin-card"><CalendarClock size={16} /><div><b>{staleAccounts ? `${staleAccounts} balance${staleAccounts > 1 ? 's' : ''} need updating` : 'Everything looks fresh'}</b><p>Monthly review takes a few minutes.</p></div><button className="view-link" onClick={() => onQuick('checkin')}>Review</button></section><div className="desktop-monthly-split"><div><span>Income this month</span><strong>{formatCurrency(income, displayCurrency, true)}</strong></div><div><span>Expenses this month</span><strong>{formatCurrency(expenses, displayCurrency, true)}</strong></div></div></aside></div></div>;
}

function CountryFilter({ value, onChange, options = countryOptions }: { value: string; onChange: (value: string) => void; options?: typeof countryOptions }) {
  return <div className="country-filter" aria-label="Filter accounts by country"><span><Globe size={14} /> Show accounts in</span><div><button className={value === 'all' ? 'selected' : ''} onClick={() => onChange('all')}><Globe size={15} /> All countries</button>{options.map((item) => <button key={item.value} className={value === item.value ? 'selected' : ''} onClick={() => onChange(item.value)}><FlagIcon country={item.value} /> {item.label}</button>)}</div></div>;
}

function AccountsViewV3({ data, displayCurrency, onQuick, onEdit, onDelete }: { data: NettData; displayCurrency: string; onQuick: (modal: Modal) => void; onEdit: (account: Account) => void; onDelete: (account: Account) => void }) {
  const [countryFilter, setCountryFilter] = useState('all');
  const accountCountries = Array.from(new Set(data.accounts.map((item) => item.country_code || countryForCurrency(item.currency))));
  const visibleAccounts = countryFilter === 'all' ? data.accounts : data.accounts.filter((item) => (item.country_code || countryForCurrency(item.currency)) === countryFilter);
  const accountCurrencies = Array.from(new Set(visibleAccounts.map((item) => item.currency)));
  const grouped = accountCurrencies.map((currency) => ({ currency, accounts: visibleAccounts.filter((item) => item.currency === currency) }));
  return <div className="page-panel zen-page accounts-page">
    <div className="view-header"><div><div className="eyebrow"><Wallet size={14} /> Your money</div><h2>Accounts</h2><p>Every balance, bank detail and freshness date in one calm place.</p></div><button className="primary-button" onClick={() => onQuick('account')}><Plus size={17} /> Add account</button></div>
    {accountCountries.length > 1 && <div className="account-country-filter" role="group" aria-label="Filter accounts by country"><button className={countryFilter === 'all' ? 'selected' : ''} onClick={() => setCountryFilter('all')}><Globe size={16} /> All countries</button>{accountCountries.map((code) => <button key={code} className={countryFilter === code ? 'selected' : ''} onClick={() => setCountryFilter(code)}><FlagIcon country={code} /> {countryLabel(code)}</button>)}</div>}
    {grouped.map((group) => <section className="account-currency-section" key={group.currency}>
      <div className="section-heading"><div><h3>{group.currency} accounts</h3><p>{group.accounts.length} {group.accounts.length === 1 ? 'account' : 'accounts'} in original currency</p></div><strong>{formatCurrency(group.accounts.reduce((sum, item) => sum + Number(item.estimated_balance ?? item.verified_balance), 0), group.currency)}</strong></div>
      <div className="account-detail-grid">{group.accounts.map((account, index) => {
        const balance = Number(account.estimated_balance ?? account.verified_balance);
        const converted = displayAmount(balance, account.currency, displayCurrency, data.fxRates);
        const stale = isStale(account.balance_verified_at, data.profile.freshness_days);
        return <article className={`account-detail-card account-card-visual tone-${index % 4}`} key={account.id}>
          <div className="account-detail-top"><div className="account-heading"><AccountLogo account={account} size={44} /><div><div className="account-detail-name">{account.name}</div><div className="table-muted">{account.institution_name || (account.ownership_type === 'business' ? 'Business account' : 'Personal account')} · {account.type.replaceAll('_', ' ')}</div></div></div><span className={`pill ${stale ? 'warn' : 'good'}`}>{stale ? 'Needs update' : 'Verified'}</span></div>
          <div className="account-meta-line"><CountryBadge country={account.country_code || countryForCurrency(account.currency)} /><span>{account.currency}{account.account_last4 ? ` · •••• ${account.account_last4}` : ''}</span></div>
          <div className="account-balance-row"><div><div className="account-detail-balance">{formatCurrency(balance, account.currency)}</div>{displayCurrency !== account.currency && hasFxRate(account.currency, displayCurrency, data.fxRates) && <div className="account-converted-balance">≈ {formatCurrency(converted, displayCurrency)}</div>}</div><small>Checked {account.balance_verified_at ? formatShortDate(account.balance_verified_at) : 'never'}</small></div>
          <div className="account-detail-actions"><span className="pill">{account.include_net_worth ? 'In net worth' : 'Excluded'}</span>{account.include_liquidity && <span className="pill">Liquid</span>}<div className="account-card-spacer" /><button className="edit-account-button" onClick={() => onEdit(account)}><Pencil size={15} /> Edit</button><button className="edit-account-button account-delete-icon" onClick={() => onDelete(account)} aria-label={`Delete ${account.name}`}><Trash2 size={15} /></button></div>
        </article>;
      })}</div>
    </section>)}
    {!data.accounts.length && <div className="empty-state"><Wallet size={22} /><strong>No accounts yet</strong><span>Add your first bank, cash, investment or credit account.</span><button className="primary-button" onClick={() => onQuick('account')}><Plus size={15} /> Add account</button></div>}
    {!!data.accounts.length && !visibleAccounts.length && <div className="empty-state compact"><Wallet size={22} /><strong>No accounts in this country</strong><span>Choose another country or add an account here.</span><button className="soft-button" onClick={() => setCountryFilter('all')}>Show all accounts</button></div>}
  </div>;
}

function PotsView({ data, onQuick, onAddSpace, onEditSpace, onDeleteSpace }: { data: NettData; onQuick: (modal: Modal) => void; onAddSpace: () => void; onEditSpace: (space: Space) => void; onDeleteSpace: (space: Space) => void }) {
  return <div className="page-panel reference-page"><div className="view-header"><div><div className="eyebrow"><Target size={13} /> Purpose-led money</div><h2>Pots</h2><p>Separate mini-ledgers for a car, business, travel, taxes or any goal.</p></div><button className="primary-button" onClick={onAddSpace}><Plus size={16} /> New pot</button></div>{data.spaces.length ? <div className="reference-card-grid">{data.spaces.map((space) => { const spent = data.transactions.filter((item) => item.space_id === space.id && item.type === 'debit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, space.currency, data.fxRates), 0); const allocation = Number(space.allocation || 0); const budget = Number(space.budget || 0); const progress = budget ? Math.min(100, Math.max(0, allocation / budget * 100)) : 0; return <article className="reference-card pot-card" key={space.id} style={{ borderTopColor: space.color || '#b678c7' }}><div className="reference-card-top"><div><h3>{space.name}</h3><span className="pill">{space.currency}</span></div><div className="reference-card-actions"><button className="icon-button" onClick={() => onEditSpace(space)} aria-label={`Edit ${space.name}`}><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => onDeleteSpace(space)} aria-label={`Delete ${space.name}`}><Trash2 size={15} /></button></div></div><div className="reference-card-label">Allocated</div><strong className="reference-card-value">{formatCurrency(allocation, space.currency)}</strong><div className="reference-card-meta">{budget ? `of ${formatCurrency(budget, space.currency)}` : 'No target set'} · {formatCurrency(spent, space.currency, true)} spent</div>{budget > 0 && <div className="reference-progress"><span style={{ width: `${progress}%` }} /></div>}<div className="reference-card-actions-row"><button className="soft-button" onClick={() => onQuick('transaction')}><Plus size={14} /> Add entry</button><button className="soft-button" onClick={() => onEditSpace(space)}><Pencil size={14} /> Edit pot</button></div><div className="reference-divider" /><div className="reference-card-footer"><span>Ledger</span><span>{data.transactions.filter((item) => item.space_id === space.id).length} entries</span></div></article>; })}</div> : <div className="empty-state compact"><Target size={22} /><strong>No pots yet</strong><span>Create a car, business or savings pot to keep related money together.</span><button className="primary-button" onClick={onAddSpace}><Plus size={14} /> Create first pot</button></div>}</div>;
}

function PotsLedgerView({ data, onAddSpace, onEditSpace, onDeleteSpace, onAddEntry, onAddPayment, onAddBorrowing, onEditEntry, onDeleteEntry }: { data: NettData; onAddSpace: () => void; onEditSpace: (space: Space) => void; onDeleteSpace: (space: Space) => void; onAddEntry: (space: Space) => void; onAddPayment: (space: Space) => void; onAddBorrowing: (space: Space) => void; onEditEntry: (transaction: Transaction) => void; onDeleteEntry: (transaction: Transaction) => void }) {
  return <div className="page-panel reference-page"><div className="view-header"><div><div className="eyebrow"><Target size={13} /> Purpose-led money</div><h2>Pots</h2><p>Separate mini-ledgers for a car, business, travel, taxes or any goal.</p></div><button className="primary-button" onClick={onAddSpace}><Plus size={16} /> New pot</button></div>{data.spaces.length ? <div className="reference-card-grid">{data.spaces.map((space) => {
    const entries = data.transactions.filter((item) => item.space_id === space.id).sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    const allocation = Number(space.allocation || 0);
    const budget = Number(space.budget || 0);
    const spent = entries.filter((item) => item.type === 'debit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, space.currency, data.fxRates), 0);
    const progress = budget > 0 ? Math.min(100, Math.max(0, allocation / budget * 100)) : 0;
    return <article className="reference-card pot-card pot-ledger-card" key={space.id} style={{ borderTopColor: space.color || '#b678c7' }}>
      <div className="reference-card-top"><div><h3>{space.name}</h3><span className="pill">{space.currency}</span></div><div className="reference-card-actions"><button className="icon-button" onClick={() => onEditSpace(space)} aria-label={`Edit ${space.name}`}><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => onDeleteSpace(space)} aria-label={`Delete ${space.name}`}><Trash2 size={15} /></button></div></div>
      <div className="reference-card-label">Allocated</div><div className="pot-total-row"><strong className="reference-card-value">{formatCurrency(allocation, space.currency)}</strong>{budget > 0 && <span>out of {formatCurrency(budget, space.currency)}</span>}</div>
      <div className="reference-card-meta">{budget > 0 ? `${Math.round(progress)}% allocated · ` : ''}{formatCurrency(spent, space.currency, true)} spent</div>{budget > 0 && <div className="reference-progress"><span style={{ width: `${progress}%` }} /></div>}
      <div className="reference-card-actions-row"><button className="soft-button" disabled={!data.debts.length} onClick={() => onAddPayment(space)} title={data.debts.length ? 'Reduce a loan balance' : 'Add a loan first'}><ArrowDownLeft size={14} /> Log payment</button><button className="soft-button" disabled={!data.debts.length} onClick={() => onAddBorrowing(space)} title={data.debts.length ? 'Record additional borrowing' : 'Add a loan first'}><ArrowUpRight size={14} /> Add to loan</button></div>
      <div className="reference-card-actions-row pot-secondary-actions"><button className="soft-button" onClick={() => onAddEntry(space)}><Plus size={14} /> Add entry</button><button className="soft-button" onClick={() => onEditSpace(space)}><Pencil size={14} /> Edit pot</button></div>
      <div className="reference-divider" /><div className="reference-card-footer"><span>Ledger</span><span>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span></div>
      {entries.length ? <div className="pot-ledger-list">{entries.map((entry) => { const positive = entry.type === 'credit' || entry.type === 'debt_borrowing'; const loanEvent = entry.type === 'debt_borrowing' || entry.type === 'debt_repayment'; return <div className="pot-ledger-row" key={entry.id}><span className={`pot-ledger-icon ${positive ? 'positive' : 'negative'}`}>{positive ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}</span><div className="pot-ledger-copy"><strong>{entry.category || entry.description || (loanEvent ? 'Loan event' : 'Ledger entry')}</strong><span>{entry.description && entry.category ? `${entry.description} · ` : ''}{formatShortDate(entry.occurred_at)} · {timeText(entry.occurred_at)}</span></div><strong className={`pot-ledger-amount ${positive ? 'positive' : 'negative'}`}>{positive ? '+' : '−'}{formatCurrency(Number(entry.amount), entry.currency, true)}</strong>{!loanEvent && <div className="pot-ledger-actions"><button className="icon-button" onClick={() => onEditEntry(entry)} aria-label={`Edit ${entry.category || 'ledger entry'}`}><Pencil size={13} /></button><button className="icon-button danger-icon" onClick={() => onDeleteEntry(entry)} aria-label={`Delete ${entry.category || 'ledger entry'}`}><Trash2 size={13} /></button></div>}</div>; })}</div> : <div className="pot-ledger-empty"><span>No entries yet.</span><button className="view-link" onClick={() => onAddEntry(space)}>Add your first entry <ArrowUpRight size={13} /></button></div>}
    </article>;
  })}</div> : <div className="empty-state compact"><Target size={22} /><strong>No pots yet</strong><span>Create a car, business or savings pot to keep related money together.</span><button className="primary-button" onClick={onAddSpace}><Plus size={14} /> Create first pot</button></div>}</div>;
}

function PotsLoanView({ data, onAddSpace, onEditSpace, onDeleteSpace, onAddPayment, onAddBorrowing }: { data: NettData; onAddSpace: () => void; onEditSpace: (space: Space) => void; onDeleteSpace: (space: Space) => void; onAddPayment: (space: Space) => void; onAddBorrowing: (space: Space) => void }) {
  return <div className="page-panel reference-page"><div className="view-header"><div><div className="eyebrow"><Target size={13} /> Progress, not pressure</div><h2>Pots</h2><p>Personal loans you are paying off over time — log payments to chip away, then add to the same loan whenever you borrow more.</p></div><button className="primary-button" onClick={onAddSpace}><Plus size={16} /> New pot</button></div>{data.spaces.length ? <div className="reference-card-grid">{data.spaces.map((space) => {
    const entries = data.transactions.filter((item) => item.space_id === space.id).sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    const paid = Number(space.allocation || 0);
    const principal = Number(space.budget || 0);
    const progress = principal > 0 ? Math.min(100, Math.max(0, paid / principal * 100)) : 0;
    const remaining = Math.max(0, principal - paid);
    return <article className="reference-card pot-card pot-ledger-card" key={space.id}>
      <div className="reference-card-top"><div><h3>{space.name}</h3><span className="pill">{space.currency}</span></div><div className="reference-card-actions"><button className="icon-button" onClick={() => onEditSpace(space)} aria-label={`Edit ${space.name}`} title="Edit pot"><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => onDeleteSpace(space)} aria-label={`Delete ${space.name}`} title="Delete pot"><Trash2 size={15} /></button></div></div>
      <div className="reference-card-label">Paid</div><div className="pot-total-row"><strong className="reference-card-value">{formatCurrency(paid, space.currency)}</strong><span>out of {formatCurrency(principal, space.currency)}</span></div>
      <div className="reference-progress"><span style={{ width: `${progress}%` }} /></div><div className="reference-card-meta">{Math.round(progress)}% paid · {formatCurrency(remaining, space.currency)} left</div>
      <div className="reference-card-actions-row"><button className="soft-button" onClick={() => onAddPayment(space)}><ArrowDownLeft size={14} /> Log payment</button><button className="soft-button" onClick={() => onAddBorrowing(space)}><ArrowUpRight size={14} /> Add to loan</button></div>
      <div className="reference-divider" /><div className="reference-card-footer"><span>Ledger</span><span>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span></div>
      {entries.length ? <div className="pot-ledger-list">{entries.map((entry) => { const positive = entry.type === 'debt_borrowing' || entry.type === 'credit'; return <div className="pot-ledger-row" key={entry.id}><span className={`pot-ledger-icon ${positive ? 'positive' : 'negative'}`}>{positive ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}</span><div className="pot-ledger-copy"><strong>{entry.description || entry.category || (positive ? 'Additional borrowing' : 'Repayment')}</strong><span>{formatShortDate(entry.occurred_at)} · {timeText(entry.occurred_at)}</span></div><strong className={`pot-ledger-amount ${positive ? 'positive' : 'negative'}`}>{positive ? '+' : '−'}{formatCurrency(Number(entry.amount), entry.currency, true)}</strong></div>; })}</div> : <div className="pot-ledger-empty"><span>No transactions yet.</span></div>}
    </article>;
  })}</div> : <div className="empty-state compact"><Target size={22} /><strong>No pots yet</strong><span>Create a loan pot, then log repayments and any extra borrowing in one attached ledger.</span><button className="primary-button" onClick={onAddSpace}><Plus size={14} /> Create first pot</button></div>}</div>;
}

function LoansView({ data, displayCurrency, onQuick, onEditDebt, onDeleteDebt }: { data: NettData; displayCurrency: string; onQuick: (modal: Modal) => void; onEditDebt: (item: Debt) => void; onDeleteDebt: (item: Debt) => void }) {
  return <div className="page-panel reference-page"><div className="view-header"><div><div className="eyebrow"><ArrowDownLeft size={13} /> Progress, not pressure</div><h2>Loans</h2><p>Track what you owe and what people owe you, with partial payments and honest progress.</p></div><button className="primary-button" onClick={() => onQuick('debt')}><Plus size={16} /> Add loan</button></div><div className="reference-card-grid">{data.debts.map((debt) => { const progress = debtProgress(debt); return <article className="reference-card loan-card" key={debt.id}><div className="reference-card-top"><div><h3>{debt.name}</h3><span className="pill dark-pill">You owe · {debt.currency}</span></div><div className="reference-card-actions"><button className="icon-button" onClick={() => onEditDebt(debt)} aria-label={`Edit ${debt.name}`}><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => onDeleteDebt(debt)} aria-label={`Delete ${debt.name}`}><Trash2 size={15} /></button></div></div><div className="reference-card-label">Remaining</div><strong className="reference-card-value">{formatCurrency(Number(debt.outstanding), debt.currency)}</strong><div className="reference-card-meta">{Math.round(progress)}% repaid · {formatCurrency(Number(debt.original_principal), debt.currency)} original</div><div className="reference-progress"><span style={{ width: `${progress}%` }} /></div><div className="reference-card-actions-row"><button className="soft-button" onClick={() => onQuick('debt-event')}><ArrowDownLeft size={14} /> Log payment</button><button className="soft-button" onClick={() => onQuick('debt-event')}><ArrowUpRight size={14} /> Add to loan</button></div></article>; })}</div>{data.receivables.length > 0 && <section className="reference-subsection"><div className="reference-subsection-heading"><div><h3>Owed to you</h3><p>Kept separate from cash until it arrives.</p></div><button className="soft-button" onClick={() => onQuick('receivable')}><Plus size={14} /> Add receivable</button></div><div className="reference-card-grid">{data.receivables.map((item) => <article className="reference-card receivable-card" key={item.id}><div className="reference-card-top"><div><h3>{item.contact_name}</h3><span className="pill">Owed to you · {item.currency}</span></div></div><div className="reference-card-label">Remaining to receive</div><strong className="reference-card-value">{formatCurrency(Number(item.outstanding), item.currency)}</strong><div className="reference-card-meta">{item.confidence} · {item.expected_on ? `expected ${formatShortDate(item.expected_on)}` : 'no date set'}</div><button className="soft-button full" onClick={() => onQuick('receivable-event')}><Check size={14} /> Record payment</button></article>)}</div></section>}{!data.debts.length && !data.receivables.length && <div className="empty-state compact"><ArrowDownLeft size={22} /><strong>No loans recorded</strong><span>Add a family loan, credit-card balance or informal IOU.</span><button className="primary-button" onClick={() => onQuick('debt')}><Plus size={14} /> Add first loan</button></div>}</div>;
}

function LoansViewV4({ data, displayCurrency, onAddLoan, onAddPayment, onAddBorrowing, onEditEvent, onDeleteEvent, onQuick, onEditDebt, onDeleteDebt }: { data: NettData; displayCurrency: string; onAddLoan: () => void; onAddPayment: (debtId: string) => void; onAddBorrowing: (debtId: string) => void; onEditEvent: (event: DebtEvent) => void; onDeleteEvent: (event: DebtEvent) => void; onQuick: (modal: Modal) => void; onEditDebt: (item: Debt) => void; onDeleteDebt: (item: Debt) => void }) {
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  return <div className="page-panel reference-page loans-reference-page"><div className="view-header"><div><div className="eyebrow"><ArrowDownLeft size={13} /> Progress, not pressure</div><h2>Loans</h2><p>Money you owe and money owed to you — with clear progress and a ledger that stays attached to each loan.</p></div><button className="primary-button" onClick={onAddLoan}><Plus size={16} /> Add loan</button></div>{data.debts.length ? <div className="reference-card-grid">{data.debts.map((debt) => { const progress = debtProgress(debt); const paid = Math.max(0, Number(debt.original_principal) - Number(debt.outstanding)); const events = data.debtEvents.filter((event) => event.debt_id === debt.id).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)); const visibleEvents = expandedDebtId === debt.id ? events : events.slice(0, 5); return <article className="reference-card loan-card loan-ledger-card" key={debt.id}><div className="reference-card-top"><div><h3>{debt.name}</h3><span className="pill dark-pill">You owe · {debt.currency}</span></div><div className="reference-card-actions"><button className="icon-button" onClick={() => onEditDebt(debt)} aria-label={`Edit ${debt.name}`} title="Edit loan"><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => onDeleteDebt(debt)} aria-label={`Delete ${debt.name}`} title="Delete loan"><Trash2 size={15} /></button></div></div><div className="reference-card-label">Paid</div><div className="loan-value-row"><strong className="reference-card-value">{formatCurrency(paid, debt.currency)}</strong><span>out of {formatCurrency(Number(debt.original_principal), debt.currency)}</span></div><div className="reference-progress"><span style={{ width: `${progress}%` }} /></div><div className="reference-card-meta">{Math.round(progress)}% paid · {formatCurrency(Number(debt.outstanding), debt.currency)} left{debt.due_date ? ` · due ${formatShortDate(debt.due_date)}` : ''}</div><div className="reference-card-actions-row"><button className="soft-button" onClick={() => onAddPayment(debt.id)}><ArrowDownLeft size={14} /> Log payment</button><button className="soft-button" onClick={() => onAddBorrowing(debt.id)}><ArrowUpRight size={14} /> Add to loan</button></div><div className="reference-divider" /><div className="loan-ledger-heading"><span>Ledger</span><span>{events.length} {events.length === 1 ? 'entry' : 'entries'}</span></div>{events.length ? <div className="loan-ledger-list">{visibleEvents.map((event) => { const borrowing = event.event_type === 'borrowing'; return <div className="loan-ledger-row" key={event.id}><span className={`loan-ledger-icon ${borrowing ? 'borrowing' : 'repayment'}`}>{borrowing ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}</span><div className="loan-ledger-copy"><strong>{event.note || (borrowing ? 'Additional borrowing' : 'Repayment')}</strong><span>{formatShortDate(event.occurred_at)}</span></div><strong className={borrowing ? 'loan-ledger-positive' : 'loan-ledger-negative'}>{borrowing ? '+' : '-'}{formatCurrency(Number(event.amount), event.currency, true)}</strong><div className="loan-ledger-actions"><button className="icon-button" onClick={() => onEditEvent(event)} aria-label={`Edit ${event.note || 'debt entry'}`}><Pencil size={14} /></button><button className="icon-button danger-icon" onClick={() => onDeleteEvent(event)} aria-label={`Delete ${event.note || 'debt entry'}`}><Trash2 size={14} /></button></div></div>; })}</div> : <div className="loan-ledger-empty">No payments or extra borrowing yet.</div>}{events.length > 5 && <button className="view-link loan-ledger-more" onClick={() => setExpandedDebtId(expandedDebtId === debt.id ? null : debt.id)}>{expandedDebtId === debt.id ? 'Show latest 5' : 'View full ledger'}</button>}</article>; })}</div> : <div className="empty-state compact"><ArrowDownLeft size={22} /><strong>No loans recorded</strong><span>Add a family loan, credit-card balance or informal IOU.</span><button className="primary-button" onClick={onAddLoan}><Plus size={14} /> Add first loan</button></div>}{data.receivables.length > 0 && <section className="reference-subsection"><div className="reference-subsection-heading"><div><h3>Owed to you</h3><p>Keep receivables separate until the money actually arrives.</p></div><button className="soft-button" onClick={() => onQuick('receivable')}><Plus size={14} /> Add receivable</button></div><div className="reference-card-grid">{data.receivables.map((item) => <article className="reference-card receivable-card" key={item.id}><div className="reference-card-top"><div><h3>{item.contact_name}</h3><span className="pill">Owed to you · {item.currency}</span></div></div><div className="reference-card-label">Remaining to receive</div><strong className="reference-card-value">{formatCurrency(Number(item.outstanding), item.currency)}</strong><div className="reference-card-meta">{item.confidence} · {item.expected_on ? `expected ${formatShortDate(item.expected_on)}` : 'no date set'}</div><button className="soft-button full" onClick={() => onQuick('receivable-event')}><Check size={14} /> Record payment</button></article>)}</div></section>}</div>;
}

function ReceivableLoanCard({ item, events, onEdit, onDelete, onAddPayment }: { item: Receivable; events: ReceivableEvent[]; onEdit: () => void; onDelete: () => void; onAddPayment: () => void }) {
  const meta = loanMetadata(item);
  const original = Number(item.amount);
  const paid = Math.max(0, original - Number(item.outstanding));
  const progress = original > 0 ? Math.min(100, paid / original * 100) : 0;
  const title = meta.title || item.contact_name;
  const sortedEvents = [...events].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  return <article className="reference-card loan-card loan-ledger-card">
    <div className="reference-card-top"><div><h3>{title}</h3><span className="pill dark-pill">Owed to you · {item.currency}</span></div><div className="reference-card-actions"><button className="icon-button" onClick={onEdit} aria-label={`Edit ${title}`}><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={onDelete} aria-label={`Delete ${title}`}><Trash2 size={15} /></button></div></div>
    <div className="reference-card-label">Remaining to collect</div><div className="loan-value-row"><strong className="reference-card-value">{formatCurrency(Number(item.outstanding), item.currency)}</strong><span>{formatCurrency(paid, item.currency)} paid<br />of {formatCurrency(original, item.currency)}</span></div>
    <div className="reference-progress"><span style={{ width: `${progress}%` }} /></div><div className="reference-card-meta">{Math.round(progress)}% collected</div>
    <div className="reference-divider" /><div className="loan-ledger-heading"><span>Payments</span><button className="view-link" onClick={onAddPayment}><Plus size={14} /> Log payment</button></div>
    {sortedEvents.length ? <div className="loan-ledger-list">{sortedEvents.map((event) => <div className="loan-ledger-row" key={event.id}><span className="loan-ledger-icon repayment"><ArrowDownLeft size={14} /></span><div className="loan-ledger-copy"><strong>{event.note || 'Payment'}</strong><span>{formatShortDate(event.occurred_at)}</span></div><strong className="loan-ledger-negative">−{formatCurrency(Number(event.amount), event.currency, true)}</strong></div>)}</div> : <div className="loan-ledger-empty">No payments logged yet.</div>}
    <div className="loan-party-note"><span>Owes you: <strong>{meta.who || item.contact_name}</strong></span>{meta.description && <small>{meta.description}</small>}</div>
  </article>;
}

function LoansUnifiedView({ data, onAddLoan, onAddPayment, onAddBorrowing, onEditEvent, onDeleteEvent, onEditDebt, onDeleteDebt, onEditReceivable, onDeleteReceivable, onAddReceivablePayment }: { data: NettData; onAddLoan: () => void; onAddPayment: (debtId: string) => void; onAddBorrowing: (debtId: string) => void; onEditEvent: (event: DebtEvent) => void; onDeleteEvent: (event: DebtEvent) => void; onEditDebt: (item: Debt) => void; onDeleteDebt: (item: Debt) => void; onEditReceivable: (item: Receivable) => void; onDeleteReceivable: (item: Receivable) => void; onAddReceivablePayment: (item: Receivable) => void }) {
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const hasLoans = data.debts.length > 0 || data.receivables.length > 0;
  return <div className="page-panel reference-page loans-reference-page"><div className="view-header"><div><div className="eyebrow"><ArrowDownLeft size={13} /> Progress, not pressure</div><h2>Loans</h2><p>Money you owe and money owed to you — with progress tracking and one clear add flow.</p></div><button className="primary-button" onClick={onAddLoan}><Plus size={16} /> Add loan</button></div>{hasLoans ? <div className="reference-card-grid">
    {data.debts.map((debt) => { const meta = loanMetadata(debt); const progress = debtProgress(debt); const paid = Math.max(0, Number(debt.original_principal) - Number(debt.outstanding)); const events = data.debtEvents.filter((event) => event.debt_id === debt.id).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)); const visibleEvents = expandedDebtId === debt.id ? events : events.slice(0, 5); return <article className="reference-card loan-card loan-ledger-card" key={debt.id}><div className="reference-card-top"><div><h3>{debt.name}</h3><span className="pill dark-pill">You owe · {debt.currency}</span></div><div className="reference-card-actions"><button className="icon-button" onClick={() => onEditDebt(debt)} aria-label={`Edit ${debt.name}`}><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => onDeleteDebt(debt)} aria-label={`Delete ${debt.name}`}><Trash2 size={15} /></button></div></div><div className="reference-card-label">Paid</div><div className="loan-value-row"><strong className="reference-card-value">{formatCurrency(paid, debt.currency)}</strong><span>out of {formatCurrency(Number(debt.original_principal), debt.currency)}</span></div><div className="reference-progress"><span style={{ width: `${progress}%` }} /></div><div className="reference-card-meta">{Math.round(progress)}% paid · {formatCurrency(Number(debt.outstanding), debt.currency)} left</div><div className="reference-card-actions-row"><button className="soft-button" onClick={() => onAddPayment(debt.id)}><ArrowDownLeft size={14} /> Log payment</button><button className="soft-button" onClick={() => onAddBorrowing(debt.id)}><ArrowUpRight size={14} /> Add to loan</button></div><div className="reference-divider" /><div className="loan-ledger-heading"><span>Ledger</span><span>{events.length} {events.length === 1 ? 'entry' : 'entries'}</span></div>{events.length ? <div className="loan-ledger-list">{visibleEvents.map((event) => { const borrowing = event.event_type === 'borrowing'; return <div className="loan-ledger-row" key={event.id}><span className={`loan-ledger-icon ${borrowing ? 'borrowing' : 'repayment'}`}>{borrowing ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}</span><div className="loan-ledger-copy"><strong>{event.note || (borrowing ? 'Additional borrowing' : 'Repayment')}</strong><span>{formatShortDate(event.occurred_at)}</span></div><strong className={borrowing ? 'loan-ledger-positive' : 'loan-ledger-negative'}>{borrowing ? '+' : '−'}{formatCurrency(Number(event.amount), event.currency, true)}</strong><div className="loan-ledger-actions"><button className="icon-button" onClick={() => onEditEvent(event)} aria-label="Edit loan entry"><Pencil size={14} /></button><button className="icon-button danger-icon" onClick={() => onDeleteEvent(event)} aria-label="Delete loan entry"><Trash2 size={14} /></button></div></div>; })}</div> : <div className="loan-ledger-empty">No payments or extra borrowing yet.</div>}{events.length > 5 && <button className="view-link loan-ledger-more" onClick={() => setExpandedDebtId(expandedDebtId === debt.id ? null : debt.id)}>{expandedDebtId === debt.id ? 'Show latest 5' : 'View full ledger'}</button>}{(meta.who || meta.description) && <div className="loan-party-note">{meta.who && <span>You owe: <strong>{meta.who}</strong></span>}{meta.description && <small>{meta.description}</small>}</div>}</article>; })}
    {data.receivables.map((item) => <ReceivableLoanCard key={item.id} item={item} events={data.receivableEvents.filter((event) => event.receivable_id === item.id)} onEdit={() => onEditReceivable(item)} onDelete={() => onDeleteReceivable(item)} onAddPayment={() => onAddReceivablePayment(item)} />)}
  </div> : <div className="empty-state compact"><ArrowDownLeft size={22} /><strong>No loans recorded</strong><span>Add a loan, then choose whether you owe them or they owe you.</span><button className="primary-button" onClick={onAddLoan}><Plus size={14} /> Add first loan</button></div>}</div>;
}

function BillsView({ data, onQuick, onEdit, onDelete }: { data: NettData; onQuick: (modal: Modal) => void; onEdit: (item: Commitment) => void; onDelete: (item: Commitment) => void }) {
  return <div className="page-panel reference-page"><div className="view-header"><div><div className="eyebrow"><CalendarClock size={13} /> Protect future you</div><h2>Upcoming bills</h2><p>Future expenses such as insurance, renewals and maintenance—before you tap your card.</p></div><button className="primary-button" onClick={() => onQuick('commitment')}><Plus size={16} /> Add bill</button></div>{data.commitments.length ? <div className="bill-list">{data.commitments.map((item) => <article className={`reference-bill ${item.importance === 'mandatory' ? 'mandatory' : ''}`} key={item.id}><span className="bill-check" /><div className="bill-copy"><strong>{item.name}</strong><span><span className="pill">{item.recurrence.replace('_', ' ')}</span> {item.expected_income ? 'Expected income' : item.importance} · {formatShortDate(item.due_date)}</span></div><strong className="bill-amount">{formatCurrency(Number(item.amount), item.currency)}</strong><div className="reference-card-actions"><button className="icon-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`}><Trash2 size={15} /></button></div></article>)}</div> : <div className="empty-state compact"><CalendarClock size={22} /><strong>No bills planned</strong><span>Add recurring or one-time obligations so future-you is protected.</span><button className="primary-button" onClick={() => onQuick('commitment')}><Plus size={14} /> Add first bill</button></div>}</div>;
}

function BillsViewV4({ data, onAdd, onToggle, onEdit, onDelete }: { data: NettData; onAdd: () => void; onToggle: (item: Commitment) => void; onEdit: (item: Commitment) => void; onDelete: (item: Commitment) => void }) {
  const bills = [...data.commitments].sort((a, b) => a.due_date.localeCompare(b.due_date));
  return <div className="page-panel reference-page bills-reference-page zen-page">
    <div className="view-header"><div><div className="eyebrow"><CalendarClock size={14} /> Protect future you</div><h2>Upcoming bills</h2><p>Insurance, renewals and maintenance—visible before they become surprises.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} /> Add bill</button></div>
    {bills.length ? <div className="reference-card-grid">{bills.map((item) => {
      const days = Math.ceil((new Date(`${item.due_date}T12:00:00`).getTime() - Date.now()) / 86400000);
      const paid = item.status === 'completed';
      const dueLabel = paid ? 'Paid' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `in ${days}d`;
      return <article className={`reference-card bill-card ${!paid && days < 0 ? 'overdue' : ''} ${paid ? 'is-paid' : ''}`} key={item.id}>
        <div className="reference-card-top"><div className="bill-card-title"><button className={`bill-check ${paid ? 'checked' : ''}`} onClick={() => onToggle(item)} aria-label={paid ? `Mark ${item.name} unpaid` : `Mark ${item.name} paid`}>{paid && <Check size={15} />}</button><div><h3>{item.name}</h3><div className="bill-inline-meta"><span className="pill">{item.recurrence.replaceAll('_', ' ')}</span><span className={days < 0 && !paid ? 'danger-text' : ''}>{dueLabel}</span></div></div></div><div className="reference-card-actions"><button className="icon-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Pencil size={16} /></button><button className="icon-button danger-icon" onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`}><Trash2 size={16} /></button></div></div>
        <div className="bill-card-due"><div><span>{item.category || 'Bill'}</span><small>Due {formatShortDate(item.due_date)}</small></div><strong>{formatCurrency(Number(item.amount), item.currency)}</strong></div>
        {item.notes && <p className="bill-card-note">{item.notes}</p>}
      </article>;
    })}</div> : <div className="empty-state compact"><CalendarClock size={24} /><strong>No bills planned</strong><span>Add a one-time or repeating bill so future-you is protected.</span><button className="primary-button" onClick={onAdd}><Plus size={15} /> Add first bill</button></div>}
  </div>;
}

function HoldingsView({ data, onAdd, onEdit, onDelete }: { data: NettData; onAdd: () => void; onEdit: (item: Investment) => void; onDelete: (item: Investment) => void }) {
  const marketOrder = ['UAE', 'India', 'US'];
  const groups = marketOrder.map((market) => ({ market, items: data.investments.filter((item) => (item.market || (item.country_code === 'IN' ? 'India' : item.country_code === 'US' ? 'US' : 'UAE')) === market) })).filter((group) => group.items.length);
  return <div className="page-panel reference-page holdings-page zen-page">
    <div className="view-header"><div><div className="eyebrow"><LineChart size={14} /> Long-term money</div><h2>Holdings</h2><p>Your manually tracked stocks and investments, grouped by market.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} /> Add holding</button></div>
    {groups.length ? groups.map((group) => <section className="holding-market-section" key={group.market}><div className="section-heading"><div><h3>{group.market}</h3><p>{group.items.length} {group.items.length === 1 ? 'position' : 'positions'}</p></div></div><div className="reference-card-grid">{group.items.map((item) => {
      const value = Number(item.latest_value || 0);
      const unitPrice = Number(item.quantity) > 0 ? value / Number(item.quantity) : 0;
      return <article className="reference-card holding-card" key={item.id}><div className="reference-card-top"><div className="holding-identity"><span className="holding-symbol">{item.symbol.slice(0, 3)}</span><div><h3>{item.name || item.symbol}</h3><span>{item.symbol}{item.exchange ? ` · ${item.exchange}` : ''}</span></div></div><div className="reference-card-actions"><button className="icon-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.symbol}`}><Pencil size={16} /></button><button className="icon-button danger-icon" onClick={() => onDelete(item)} aria-label={`Delete ${item.symbol}`}><Trash2 size={16} /></button></div></div><div className="reference-card-label">Current value</div><strong className="reference-card-value">{formatCurrency(value, item.holding_currency)}</strong><div className="holding-facts"><span>{Number(item.quantity).toLocaleString()} units</span><span>{formatCurrency(unitPrice, item.holding_currency)} each</span><span>Updated {item.latest_value_at ? formatShortDate(item.latest_value_at) : 'never'}</span></div></article>;
    })}</div></section>) : <div className="empty-state compact"><LineChart size={24} /><strong>No holdings yet</strong><span>Add a position and refresh its value during your monthly review.</span><button className="primary-button" onClick={onAdd}><Plus size={15} /> Add first holding</button></div>}
  </div>;
}

function SpendsView({ data, onQuick, onAddSpace, onEditSpace, onDeleteSpace }: { data: NettData; onQuick: (modal: Modal) => void; onAddSpace: () => void; onEditSpace: (space: Space) => void; onDeleteSpace: (space: Space) => void }) {
  return <div className="page-panel reference-page"><div className="view-header"><div><div className="eyebrow"><CreditCard size={13} /> Purpose-led spending</div><h2>Spends</h2><p>Track what you put into a car, a business, a trip or any project—separate from your net worth.</p></div><button className="primary-button" onClick={onAddSpace}><Plus size={16} /> New tracker</button></div>{data.spaces.length ? <div className="reference-card-grid">{data.spaces.map((space) => { const entries = data.transactions.filter((item) => item.space_id === space.id); const net = entries.reduce((sum, item) => { const amount = displayAmount(Number(item.amount), item.currency, space.currency, data.fxRates); return sum + (item.type === 'credit' ? -amount : amount); }, 0); return <article className="reference-card spend-card" key={space.id}><div className="reference-card-top"><div><h3>{space.name}</h3><span className="pill">Spend tracker · {space.currency}</span></div><div className="reference-card-actions"><button className="icon-button" onClick={() => onEditSpace(space)} aria-label={`Edit ${space.name}`}><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => onDeleteSpace(space)} aria-label={`Delete ${space.name}`}><Trash2 size={15} /></button></div></div><div className="reference-card-label">Lifetime cost</div><strong className="reference-card-value">{formatCurrency(net, space.currency)}</strong><div className="reference-card-meta">{entries.length} entries · {space.notes || 'Separate ledger for this purpose'}</div><div className="reference-card-actions-row"><button className="soft-button" onClick={() => onQuick('transaction')}><Plus size={14} /> Add entry</button><button className="soft-button" onClick={() => onEditSpace(space)}><Pencil size={14} /> Edit tracker</button></div></article>; })}</div> : <div className="empty-state compact"><CreditCard size={22} /><strong>No spend trackers yet</strong><span>Make your car, business or travel costs their own connected ledger.</span><button className="primary-button" onClick={onAddSpace}><Plus size={14} /> Create tracker</button></div>}</div>;
}

function SpendTrackerCard({ space, transactions, rates, onAddEntry, onEditEntry, onDeleteEntry, onEditSpace, onDeleteSpace }: { space: Space; transactions: Transaction[]; rates: NettData['fxRates']; onAddEntry: (space: Space) => void; onEditEntry: (entry: Transaction) => void; onDeleteEntry: (entry: Transaction) => void; onEditSpace: (space: Space) => void; onDeleteSpace: (space: Space) => void }) {
  const [period, setPeriod] = useState<'all' | 'month' | 'year'>('all');
  const now = new Date();
  const entries = transactions.filter((item) => item.space_id === space.id).filter((item) => period === 'all' || (period === 'month' ? item.occurred_at.slice(0, 7) === now.toISOString().slice(0, 7) : item.occurred_at.slice(0, 4) === String(now.getFullYear()))).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  const meta = spendMetadata(space);
  const trackerType = space.tracker_type || meta.trackerType || 'cost';
  const debitLabel = trackerType === 'business' ? 'Expense' : trackerType === 'trip' ? 'Trip spend' : 'Expense';
  const creditLabel = trackerType === 'business' ? 'Income' : 'Cashback';
  const totalDebit = entries.filter((item) => item.type === 'debit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, space.currency, rates), 0);
  const totalCredit = entries.filter((item) => item.type === 'credit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, space.currency, rates), 0);
  const net = trackerType === 'business' ? totalCredit - totalDebit : totalDebit - totalCredit;
  const title = trackerType === 'business' ? 'Net profit' : trackerType === 'trip' ? 'Net trip cost' : 'Lifetime cost';
  const byCategory = entries.filter((item) => item.type === 'debit').reduce<Record<string, number>>((result, item) => { const key = item.category || 'Other'; result[key] = (result[key] || 0) + displayAmount(Number(item.amount), item.currency, space.currency, rates); return result; }, {});
  const categoryEntries = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
  const categoryTotal = Math.max(1, categoryEntries.reduce((sum, [, value]) => sum + value, 0));
  return <article className="reference-card spend-card spend-ledger-card" data-print-tracker={space.id}>
    <div className="reference-card-top"><div><h3>{space.name}</h3><span className="pill">{trackerType === 'business' ? 'Business tracker' : trackerType === 'trip' ? 'Trip tracker' : 'Cost tracker'} · {space.currency}</span></div><div className="reference-card-actions"><button className="icon-button" onClick={() => onEditSpace(space)} aria-label={`Edit ${space.name}`}><Pencil size={16} /></button><button className="icon-button danger-icon" onClick={() => onDeleteSpace(space)} aria-label={`Delete ${space.name}`}><Trash2 size={16} /></button></div></div>
    <div className="reference-card-label">{title}</div><div className="spend-value-row"><strong className="reference-card-value">{formatCurrency(net, space.currency)}</strong><span>{debitLabel}: {formatCurrency(totalDebit, space.currency, true)}<br />{creditLabel}: {formatCurrency(totalCredit, space.currency, true)}</span></div>
    {categoryEntries.length > 0 && <><div className="spend-breakdown">{categoryEntries.slice(0, 4).map(([category, value], index) => <span key={category} className={`segment-${index}`} style={{ width: `${Math.max(4, value / categoryTotal * 100)}%` }} />)}</div><div className="spend-breakdown-legend">{categoryEntries.slice(0, 4).map(([category], index) => <span key={category}><i className={`spend-dot dot-${index}`} />{category}</span>)}</div></>}
    <div className="spend-toolbar"><label className="select-shell"><span className="sr-only">Period</span><select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}><option value="all">All time</option><option value="month">This month</option><option value="year">This year</option></select></label><div><button className="soft-button" onClick={() => window.print()}><Download size={15} /> PDF</button><button className="primary-button" onClick={() => onAddEntry(space)}><Plus size={15} /> Add entry</button></div></div>
    <div className="reference-divider" />
    {entries.length ? <div className="spend-ledger-list">{entries.map((entry) => <div className="spend-ledger-row" key={entry.id}><span className={`spend-ledger-arrow ${entry.type === 'credit' ? 'credit' : ''}`}>{entry.type === 'credit' ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}</span><div className="spend-ledger-copy"><strong>{entry.category || (entry.type === 'credit' ? creditLabel : debitLabel)}</strong><span>{entry.description || 'No note'} · {formatShortDate(entry.occurred_at)}</span></div><strong className={entry.type === 'credit' ? 'credit' : 'debit'}>{entry.type === 'credit' ? '+' : '−'}{formatCurrency(Number(entry.amount), entry.currency, true)}</strong><div className="row-actions"><button className="icon-button" onClick={() => onEditEntry(entry)} aria-label="Edit entry"><Pencil size={14} /></button><button className="icon-button danger-icon" onClick={() => onDeleteEntry(entry)} aria-label="Delete entry"><Trash2 size={14} /></button></div></div>)}</div> : <div className="spend-ledger-empty">No entries for this period.</div>}
  </article>;
}

function SpendsViewV4({ data, onAddSpace, onAddEntry, onEditEntry, onDeleteEntry, onEditSpace, onDeleteSpace }: { data: NettData; onAddSpace: () => void; onAddEntry: (space: Space) => void; onEditEntry: (entry: Transaction) => void; onDeleteEntry: (entry: Transaction) => void; onEditSpace: (space: Space) => void; onDeleteSpace: (space: Space) => void }) {
  const trackers = data.spaces.filter(isSpendTracker);
  return <div className="page-panel reference-page spends-reference-page zen-page"><div className="view-header"><div><div className="eyebrow"><CreditCard size={14} /> Purpose-led spending</div><h2>Spends</h2><p>Track a car, business, trip or side project without mixing it into net worth.</p></div><button className="primary-button" onClick={onAddSpace}><Plus size={17} /> New tracker</button></div>{trackers.length ? <div className="reference-card-grid">{trackers.map((space) => <SpendTrackerCard key={space.id} space={space} transactions={data.transactions} rates={data.fxRates} onAddEntry={onAddEntry} onEditEntry={onEditEntry} onDeleteEntry={onDeleteEntry} onEditSpace={onEditSpace} onDeleteSpace={onDeleteSpace} />)}</div> : <div className="empty-state compact"><CreditCard size={24} /><strong>No spend trackers yet</strong><span>Give your car, business or trip its own clean ledger.</span><button className="primary-button" onClick={onAddSpace}><Plus size={15} /> Create tracker</button></div>}</div>;
}

function AccountsViewV2({ data, displayCurrency, onQuick }: { data: NettData; displayCurrency: string; onQuick: (modal: Modal) => void }) {
  const cards = data.accounts.filter((item) => item.type === 'credit_card').map((account) => ({ account, card: data.creditCards.find((item) => item.account_id === account.id) }));
  return <div className="page-panel"><div className="view-header"><div><h2>Accounts & cards</h2><p>Every balance, account detail and due date in one place.</p></div><div className="action-row"><button className="soft-button" onClick={() => onQuick('transfer')}><MoveRight size={15} /> Move money</button><button className="primary-button" onClick={() => onQuick('account')}><Plus size={16} /> Add account</button></div></div><div className="card full-card"><div className="account-detail-grid">{data.accounts.map((account) => <div className="account-detail-card" key={account.id}><div className="account-detail-top"><span className="pill">{account.country_code || 'AE'}</span><span className={`pill ${isStale(account.balance_verified_at, data.profile.freshness_days) ? 'warn' : 'good'}`}>{isStale(account.balance_verified_at, data.profile.freshness_days) ? 'Update needed' : 'Verified'}</span></div><div className="account-detail-name">{account.name}</div><div className="table-muted">{account.institution_name || 'Personal account'} · {account.type.replace('_', ' ')} · {account.currency}</div><div className="account-detail-balance">{formatCurrency(Number(account.estimated_balance ?? account.verified_balance), account.currency)}</div><div className="table-muted">≈ {formatCurrency(displayAmount(Number(account.estimated_balance ?? account.verified_balance), account.currency, displayCurrency, data.fxRates), displayCurrency)}{account.account_last4 ? ` · •••• ${account.account_last4}` : ''}</div><div className="account-detail-actions"><span className="pill">{account.include_net_worth ? 'In net worth' : 'Excluded'}</span><span className="pill">{account.include_liquidity ? 'Liquid' : 'Not liquid'}</span></div></div>)}</div>{!data.accounts.length && <div className="empty-state"><Wallet size={20} /><strong>Your accounts will appear here</strong><span>Add current accounts, cash, wallets or credit cards.</span></div>}</div>{cards.length > 0 && <section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Credit cards</h2><div className="card-meta">Outstanding, utilisation and payment due dates</div></div><CreditCard size={17} color="#b16e9b" /></div><div className="card-list">{cards.map(({ account, card }) => <div className="settings-row" key={account.id}><div className="activity-avatar"><CreditCard size={16} /></div><main><strong>{account.name}</strong><small>{card ? `${formatCurrency(Number(card.current_outstanding), account.currency)} outstanding · due ${card.payment_due_date ? formatShortDate(card.payment_due_date) : 'date not set'}` : 'Add card details to track utilisation and due dates.'}</small></main><span className="pill warn">{card?.credit_limit ? `${Math.round(Number(card.current_outstanding) / Number(card.credit_limit) * 100)}% used` : 'Details needed'}</span></div>)}</div></section>}<section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Spaces</h2><div className="card-meta">Purpose-led mini-ledgers for goals and budgets</div></div><button className="view-link" onClick={() => onQuick('space')}><Plus size={13} /> Add Space</button></div>{data.spaces.length ? <div className="space-grid">{data.spaces.map((space) => <div className="space-card" key={space.id} style={{ borderTopColor: space.color }}><strong>{space.name}</strong><small>{space.workspace_id === data.workspaces[0]?.id ? data.workspaces[0]?.name : 'Workspace'} · {space.currency}</small><div className="space-amount">{formatCurrency(Number(space.allocation || 0), space.currency)} <span>/ {formatCurrency(Number(space.budget || 0), space.currency)}</span></div></div>)}</div> : <div className="empty-state compact"><Target size={20} /><strong>No Spaces yet</strong><span>Create one for rent, travel, taxes or a goal.</span></div>}</section></div>;
}

function AccountsView({ data, displayCurrency, onQuick }: { data: NettData; displayCurrency: string; onQuick: (modal: Modal) => void }) {
  return <div className="page-panel"><div className="view-header"><div><h2>Accounts & cards</h2><p>Every real balance, with verified and estimated states kept clear.</p></div><button className="primary-button" onClick={() => onQuick('account')}><Plus size={16} /> Add account</button></div><div className="card full-card"><div className="table-head"><span>Account</span><span>Balance</span><span>Freshness</span><span>Context</span></div>{data.accounts.map((account) => <div className="table-row" key={account.id}><div><div className="table-strong">{account.name}</div><div className="table-muted">{account.currency} · {account.type.replace('_', ' ')}</div></div><div><div className="table-strong">{formatCurrency(Number(account.estimated_balance ?? account.verified_balance), account.currency)}</div><div className="table-muted">≈ {formatCurrency(displayAmount(Number(account.estimated_balance ?? account.verified_balance), account.currency, displayCurrency, data.fxRates), displayCurrency)}</div></div><div><span className={`pill ${isStale(account.balance_verified_at, 31) ? 'warn' : 'good'}`}>{isStale(account.balance_verified_at, 31) ? 'Update needed' : 'Verified'}</span></div><div><span className="pill">{account.workspace_id === 'studio' ? 'Business' : 'Personal'}</span></div></div>)}<div className="empty-state" style={{ paddingBottom: 28 }}><CreditCard size={20} /><strong>Cards connect to the same picture</strong><span>Add a credit card to see limit, utilization and due dates here.</span><br /><button className="view-link" style={{ marginTop: 8 }} onClick={() => onQuick('account')}>Add a card</button></div></div></div>;
}

function ActivityViewV3({ data, displayCurrency, country, selectedMonth, setSelectedMonth, search, setSearch, spaceFilter, setSpaceFilter, onQuick }: { data: NettData; displayCurrency: string; country: string; selectedMonth: string; setSelectedMonth: (value: string) => void; search: string; setSearch: (value: string) => void; spaceFilter: string; setSpaceFilter: (value: string) => void; onQuick: (modal: Modal) => void }) {
  const query = search.toLowerCase();
  const monthKey = selectedMonth || new Date().toISOString().slice(0, 7);
  const monthTransactions = data.transactions.filter((item) => item.occurred_at.slice(0, 7) === monthKey);
  const scopedMonthTransactions = spaceFilter === 'all' ? monthTransactions : monthTransactions.filter((item) => item.space_id === spaceFilter);
  const expenses = scopedMonthTransactions.filter((item) => item.type === 'debit' || item.type === 'debt_repayment').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const income = scopedMonthTransactions.filter((item) => item.type === 'credit' || item.type === 'debt_borrowing').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const filtered = scopedMonthTransactions.filter((item) => `${item.category || ''} ${item.description || ''} ${item.currency} ${item.type}`.toLowerCase().includes(query));
  return <div className="page-panel">
    <div className="activity-filter-bar"><div><strong>Focus your view</strong><span>Keep Car, Business and other ledgers separate.</span></div><label><span>Space</span><select value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)}><option value="all">All activity</option>{data.spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label></div>
    <div className="view-header"><div><h2>Activity</h2><p>Track this month’s expenses by country, currency and account.</p></div><div className="action-row"><label className="month-picker"><span>Month</span><input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label><button className="soft-button" onClick={() => onQuick('transfer')}><MoveRight size={15} /> Transfer</button><button className="primary-button" onClick={() => onQuick('transaction')}><Plus size={15} /> Add expense</button></div></div>
     <div className="stats-grid month-stats"><MetricCard label="Expenses" value={expenses} note={`${scopedMonthTransactions.filter((item) => item.type === 'debit' || item.type === 'debt_repayment').length} entries · selected view`} icon={<TrendingDown size={14} />} accent="#cb6e83" /><MetricCard label="Income" value={income} note={`${scopedMonthTransactions.filter((item) => item.type === 'credit' || item.type === 'debt_borrowing').length} entries`} icon={<TrendingUp size={14} />} accent="#5b9c9b" /><MetricCard label="Net cash flow" value={income - expenses} note={`After expenses · ${displayCurrency}`} icon={<CircleDollarSign size={14} />} /></div>
    <section className="card full-card"><div className="month-summary-bar"><div><strong>{new Intl.DateTimeFormat('en-AE', { month: 'long', year: 'numeric' }).format(new Date(`${monthKey}-01T12:00:00`))}</strong><span>{data.accounts.length ? `${data.accounts.length} account${data.accounts.length === 1 ? '' : 's'} · ${country === 'all' ? 'All countries' : countryLabel(country)}` : 'No accounts in this view'}</span></div><div className="month-summary-value">{formatCurrency(expenses, displayCurrency)}<small> expenses</small></div></div><div className="search-row"><div className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search groceries, salary, transfer…" /></div></div>{filtered.length ? <div className="activity-list">{filtered.map((item) => <ActivityRow key={item.id} transaction={item} displayCurrency={displayCurrency} rates={data.fxRates} />)}</div> : <div className="empty-state"><Search size={21} /><strong>No activity recorded for this month</strong><span>Choose a country above, then tap Add expense or add income to record what happened this month.</span><button className="primary-button" style={{ marginTop: 16 }} onClick={() => onQuick('transaction')}><Plus size={15} /> Add this month’s activity</button></div>}</section>
    <SpaceLedgerSummary spaces={data.spaces} transactions={data.transactions} selectedMonth={monthKey} displayCurrency={displayCurrency} rates={data.fxRates} onSelect={setSpaceFilter} onAdd={() => onQuick('space')} />
  </div>;
}

function SpaceLedgerSummary({ spaces, transactions, selectedMonth, displayCurrency, rates, onSelect, onAdd }: { spaces: Space[]; transactions: Transaction[]; selectedMonth: string; displayCurrency: string; rates: NettData['fxRates']; onSelect: (id: string) => void; onAdd: () => void }) {
  return <section className="card full-card space-ledger-section"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Purpose-led ledgers</h2><div className="card-meta">Keep Car, Business and other areas separate without duplicating the underlying account balance.</div></div><button className="view-link" onClick={onAdd}><Plus size={13} /> Add Space</button></div>{spaces.length ? <div className="space-ledger-grid">{spaces.map((space) => { const spaceTransactions = transactions.filter((item) => item.space_id === space.id); const monthTransactions = spaceTransactions.filter((item) => item.occurred_at.slice(0, 7) === selectedMonth); const spent = spaceTransactions.filter((item) => item.type === 'debit' || item.type === 'debt_repayment').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, rates), 0); const received = spaceTransactions.filter((item) => item.type === 'credit' || item.type === 'debt_borrowing').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, rates), 0); const monthSpent = monthTransactions.filter((item) => item.type === 'debit' || item.type === 'debt_repayment').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, rates), 0); const budget = Number(space.budget ?? space.allocation ?? 0); const remaining = budget ? budget - spent + received : null; return <article className="space-ledger-card" key={space.id} style={{ borderTopColor: space.color || '#ff8dc7' }}><div className="space-card-top"><div><strong>{space.name}</strong><small>{space.currency} · {spaceTransactions.length} linked entr{spaceTransactions.length === 1 ? 'y' : 'ies'}</small></div><button className="edit-account-button" onClick={() => onSelect(space.id)}>View</button></div><div className="space-ledger-amount">{formatCurrency(monthSpent, displayCurrency, true)} <span>spent this month</span></div><div className="space-ledger-meta"><span>{remaining === null ? 'No budget set' : `${formatCurrency(remaining, displayCurrency, true)} left`}</span><span>{formatCurrency(received - spent, displayCurrency, true)} net movement</span></div></article>; })}</div> : <div className="empty-state compact"><Target size={20} /><strong>Give an expense a home</strong><span>Create Car, Business Operations or any other Space to keep focused ledgers without mixing every purchase together.</span><button className="soft-button" onClick={onAdd}><Plus size={14} /> Create a Space</button></div>}</section>;
}

function ActivityViewV2({ data, displayCurrency, search, setSearch, onQuick }: { data: NettData; displayCurrency: string; search: string; setSearch: (value: string) => void; onQuick: (modal: Modal) => void }) {
  const query = search.toLowerCase();
  const filtered = data.transactions.filter((item) => `${item.category || ''} ${item.description || ''} ${item.currency} ${item.type}`.toLowerCase().includes(query));
  return <div className="page-panel"><div className="view-header"><div><h2>Activity</h2><p>Expenses, income, transfers and adjustments—your selective ledger.</p></div><div className="action-row"><button className="soft-button" onClick={() => onQuick('transfer')}><MoveRight size={15} /> Transfer</button><button className="primary-button" onClick={() => onQuick('transaction')}><Plus size={15} /> Add activity</button></div></div><section className="card full-card"><div className="search-row"><div className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search groceries, salary, transfer…" /></div></div>{filtered.length ? <div className="activity-list">{filtered.map((item) => <ActivityRow key={item.id} transaction={item} displayCurrency={displayCurrency} rates={data.fxRates} />)}</div> : <div className="empty-state"><Search size={21} /><strong>No matching activity</strong><span>Try a person, category, currency or description.</span></div>}</section></div>;
}

function ActivityView({ data, displayCurrency, search, setSearch }: { data: NettData; displayCurrency: string; search: string; setSearch: (value: string) => void }) {
  const filtered = data.transactions.filter((item) => `${item.category} ${item.description} ${item.currency}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page-panel"><div className="view-header"><div><h2>Activity</h2><p>A selective ledger, not a guilt machine.</p></div><div className="filter-pills"><button className="selected"><Filter size={12} /> All activity</button><button>Personal</button><button>Business</button></div></div><div className="card full-card"><div className="search-row"><div className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Dad, car, insurance…" /></div><button className="soft-button"><ListFilter size={15} /> Filters</button></div>{filtered.length ? filtered.map((item) => <ActivityRow key={item.id} transaction={item} displayCurrency={displayCurrency} rates={data.fxRates} />) : <div className="empty-state"><Search size={21} /><strong>No matching activity</strong><span>Try a person, category or description.</span></div>}</div></div>;
}

function SpaceManagerPanel({ data, onAdd, onEdit, onDelete }: { data: NettData; onAdd: () => void; onEdit: (space: Space) => void; onDelete: (space: Space) => void }) {
  return <section className="card full-card space-manager-panel"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Spaces</h2><div className="card-meta">Goals and budgets you can update or remove anytime.</div></div><button className="primary-button" onClick={onAdd}><Plus size={14} /> Add Space</button></div>{data.spaces.length ? <div className="space-grid">{data.spaces.map((space) => <article className="space-card" key={space.id} style={{ borderTopColor: space.color || '#ff8dc7' }}><div className="space-card-top"><div><strong>{space.name}</strong><small>{space.currency} · {space.budget ? `Budget ${formatCurrency(Number(space.budget), space.currency, true)}` : 'No budget set'}</small></div><div className="space-actions"><button className="edit-account-button" onClick={() => onEdit(space)} aria-label={`Edit ${space.name}`}><Pencil size={13} /> Edit</button><button className="icon-button danger-icon" onClick={() => onDelete(space)} aria-label={`Delete ${space.name}`}><Trash2 size={14} /></button></div></div><div className="space-amount">{formatCurrency(Number(space.allocation || 0), space.currency, true)} <span>allocated</span></div>{space.notes && <p className="space-notes">{space.notes}</p>}</article>)}</div> : <div className="empty-state compact"><Target size={20} /><strong>No Spaces yet</strong><span>Create a goal or budget for travel, rent, taxes or anything you want to keep visible.</span><button className="soft-button" onClick={onAdd}><Plus size={14} /> Create your first Space</button></div>}</section>;
}

function monthStart(month: string) {
  return new Date(`${month}-01T12:00:00`);
}

function monthTitle(month: string) {
  return new Intl.DateTimeFormat('en-AE', { month: 'long', year: 'numeric' }).format(monthStart(month));
}

function addCalendarMonths(month: string, offset: number) {
  const date = monthStart(month);
  date.setMonth(date.getMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function recurringMonthlyValue(item: Commitment, displayCurrency: string, rates: NettData['fxRates']) {
  const multiplier = item.recurrence === 'weekly' ? 52 / 12 : item.recurrence === 'quarterly' ? 1 / 3 : item.recurrence === 'yearly' ? 1 / 12 : 1;
  return displayAmount(Number(item.amount), item.currency, displayCurrency, rates) * multiplier;
}

function RecurringView({ data, displayCurrency, onAdd, onEdit, onDelete, onToggle, onNavigate }: { data: NettData; displayCurrency: string; onAdd: () => void; onEdit: (item: Commitment) => void; onDelete: (item: Commitment) => void; onToggle: (item: Commitment) => void; onNavigate: (tab: Tab) => void }) {
  const items = data.commitments.filter((item) => item.entry_type === 'recurring');
  const activeItems = items.filter((item) => item.active !== false);
  const monthlyIncome = activeItems.filter((item) => item.expected_income).reduce((sum, item) => sum + recurringMonthlyValue(item, displayCurrency, data.fxRates), 0);
  const monthlyOutgoings = activeItems.filter((item) => !item.expected_income).reduce((sum, item) => sum + recurringMonthlyValue(item, displayCurrency, data.fxRates), 0);
  return <div className="page-panel finance-tool-page zen-page"><div className="view-header"><div><div className="eyebrow"><RefreshCw size={14} /> Monthly rhythm</div><h2>Recurring</h2><p>Salary, rent, subscriptions and every fixed rhythm feeding your forecast.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} /> Add recurring</button></div><div className="tool-stat-grid"><MetricCard label="Monthly income" value={monthlyIncome} note="Active recurring credits" icon={<ArrowDownLeft size={15} />} accent="#4ba17a" /><MetricCard label="Monthly outgoings" value={monthlyOutgoings} note="Active recurring debits" icon={<ArrowUpRight size={15} />} accent="#b678c7" /><MetricCard label="Monthly net" value={monthlyIncome - monthlyOutgoings} note="Feeds Forecast" icon={<TrendingUp size={15} />} /></div>{items.length ? <div className="finance-list-grid">{items.map((item) => <article className={`finance-list-card ${item.active === false ? 'is-inactive' : ''}`} key={item.id}><div className="finance-list-card-top"><div className={`finance-kind-icon ${item.expected_income ? 'positive' : 'negative'}`}>{item.expected_income ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</div><div><h3>{item.name}</h3><p>{item.expected_income ? 'Income' : 'Expense'} · {item.category || 'General'} · {item.recurrence.replaceAll('_', ' ')}</p></div><div className="row-actions"><button className={`toggle ${item.active === false ? '' : 'on'}`} onClick={() => onToggle(item)} aria-label={`${item.active === false ? 'Enable' : 'Pause'} ${item.name}`}><span /></button><button className="icon-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Pencil size={16} /></button><button className="icon-button danger-icon" onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`}><Trash2 size={16} /></button></div></div><div className="finance-list-card-bottom"><strong>{formatCurrency(Number(item.amount), item.currency)}</strong><span>{item.active === false ? 'Paused' : `≈ ${formatCurrency(recurringMonthlyValue(item, displayCurrency, data.fxRates), displayCurrency)} / month`}</span></div>{item.notes && <p className="finance-note">{item.notes}</p>}</article>)}</div> : <div className="tool-empty"><RefreshCw size={30} /><h3>No recurring items yet</h3><p>Add salary, rent and subscriptions—the monthly rhythm your forecast builds on.</p><button className="soft-button" onClick={onAdd}><Plus size={15} /> Add your first item</button></div>}<section className="tool-callout"><div><strong>See the rhythm become a trajectory.</strong><span>Forecast includes active recurring items automatically.</span></div><button className="view-link" onClick={() => onNavigate('forecast')}>Open Forecast <ArrowUpRight size={14} /></button></section></div>;
}

function ForecastView({ data, metrics, displayCurrency, onAdd, onEdit, onDelete, onToggle }: { data: NettData; metrics: ReturnType<typeof calculateMetrics>; displayCurrency: string; onAdd: () => void; onEdit: (item: ForecastScenario) => void; onDelete: (item: ForecastScenario) => void; onToggle: (item: ForecastScenario) => void }) {
  const [horizon, setHorizon] = useState(12);
  const [annualGrowth, setAnnualGrowth] = useState(0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const forecast = useMemo(() => {
    const activeScenarios = data.forecastScenarios.filter((item) => item.active !== false);
    const scenarioValueAt = (item: ForecastScenario, offset: number) => {
      if (item.recurrence !== 'recurring') return item.month_offset === offset;
      if (offset < item.month_offset) return false;
      return !item.duration_months || offset < item.month_offset + item.duration_months;
    };
    const currentScenarioNet = activeScenarios.filter((item) => scenarioValueAt(item, 0)).reduce((sum, item) => sum + (item.kind === 'income' ? 1 : -1) * displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
    const points = [{ month: currentMonth, baseline: metrics.primaryNetWorth, scenario: metrics.primaryNetWorth + currentScenarioNet, net: currentScenarioNet }];
    for (let offset = 1; offset <= horizon; offset += 1) {
      const month = addCalendarMonths(currentMonth, offset);
      const from = monthStart(month);
      const to = new Date(from); to.setMonth(to.getMonth() + 1); to.setDate(0);
      const recurringNet = data.commitments.filter((item) => item.entry_type === 'recurring' && item.active !== false).reduce((sum, item) => commitmentOccurrences(item, from, to).reduce((inner, occurrence) => inner + (item.expected_income ? 1 : -1) * displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), sum), 0);
      const scenarioNet = activeScenarios.filter((item) => scenarioValueAt(item, offset)).reduce((sum, item) => sum + (item.kind === 'income' ? 1 : -1) * displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
      const previous = points[offset - 1];
      const growth = annualGrowth / 100 / 12;
      const baseline = previous.baseline * (1 + growth) + recurringNet;
      const scenario = previous.scenario * (1 + growth) + recurringNet + scenarioNet;
      points.push({ month, baseline, scenario, net: recurringNet + scenarioNet });
    }
    return points;
  }, [annualGrowth, currentMonth, data.commitments, data.forecastScenarios, data.fxRates, displayCurrency, horizon, metrics.primaryNetWorth]);
  const monthlyNet = forecast[1]?.net || 0;
  const end = forecast[forecast.length - 1];
  const max = Math.max(...forecast.map((item) => Math.max(item.baseline, item.scenario)), metrics.primaryNetWorth, 1);
  const min = Math.min(...forecast.map((item) => Math.min(item.baseline, item.scenario)), 0);
  const range = Math.max(1, max - min);
  const activeScenarioCount = data.forecastScenarios.filter((item) => item.active !== false).length;
  return <div className="page-panel finance-tool-page zen-page"><div className="view-header"><div><div className="eyebrow"><TrendingUp size={14} /> Forward view</div><h2>Forecast</h2><p>Project net worth forward, then layer in decisions without touching live data.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} /> Add scenario</button></div><div className="tool-stat-grid forecast-stat-grid"><MetricCard label="Today" value={metrics.primaryNetWorth} note="Current net worth" icon={<Gauge size={15} />} /><MetricCard label="Monthly net" value={monthlyNet} note="Recurring rhythm" icon={<RefreshCw size={15} />} accent={monthlyNet >= 0 ? '#4ba17a' : '#bd6675'} /><MetricCard label={`In ${horizon} months`} value={end.baseline} note="Baseline" icon={<LineChart size={15} />} /><MetricCard label={`In ${horizon} months`} value={end.scenario} note="With scenarios" icon={<Sparkles size={15} />} accent="#b678c7" /></div><section className="card forecast-controls"><label>Horizon<select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}><option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option><option value={24}>24 months</option><option value={36}>36 months</option></select></label><label>Annual growth<input type="number" min="-100" max="100" step="0.1" value={annualGrowth} onChange={(event) => setAnnualGrowth(Number(event.target.value) || 0)} /><span>%</span></label><span className="forecast-controls-note">Active recurring items and scenarios feed this projection automatically.</span></section><section className="card forecast-chart-card"><div className="section-heading"><div><h3>Net worth trajectory</h3><p>Baseline versus active scenarios in {displayCurrency}.</p></div><div className="forecast-legend"><span className="baseline-dot" /> Baseline <span className="scenario-dot" /> With scenarios</div></div><div className="forecast-chart" role="img" aria-label={`Forecast from ${formatCurrency(metrics.primaryNetWorth, displayCurrency)} today to ${formatCurrency(end.scenario, displayCurrency)} with scenarios`}><div className="forecast-grid-lines"><span /><span /><span /><span /></div><div className="forecast-bars">{forecast.map((point, index) => <div className="forecast-point" key={point.month} title={`${monthTitle(point.month)}: ${formatCurrency(point.scenario, displayCurrency)}`}><span className="forecast-bar baseline" style={{ height: `${Math.max(4, ((point.baseline - min) / range) * 100)}%` }} /><span className="forecast-bar scenario" style={{ height: `${Math.max(4, ((point.scenario - min) / range) * 100)}%` }} /><small>{index === 0 || index === forecast.length - 1 || index % Math.max(1, Math.floor(horizon / 4)) === 0 ? monthTitle(point.month).split(' ')[0] : ''}</small></div>)}</div></div><div className="forecast-accessible-table">{forecast.slice(0, Math.min(forecast.length, 6)).map((point) => <div key={point.month}><span>{monthTitle(point.month)}</span><strong>{formatCurrency(point.baseline, displayCurrency)}</strong><strong>{formatCurrency(point.scenario, displayCurrency)}</strong></div>)}</div></section><div className={`tool-callout ${end.scenario >= 0 ? 'positive' : 'negative'}`}><div><strong>{end.scenario >= 0 ? 'You stay in the green across the horizon.' : 'This horizon needs attention.'}</strong><span>{activeScenarioCount ? `${activeScenarioCount} active scenario${activeScenarioCount === 1 ? '' : 's'} included.` : 'No active scenarios—showing your baseline trajectory.'}</span></div></div><section className="forecast-scenarios"><div className="section-heading"><div><h3>Scenarios</h3><p>Test a purchase, debt or income change on the curve.</p></div><button className="view-link" onClick={onAdd}><Plus size={15} /> Add</button></div>{data.forecastScenarios.length ? <div className="scenario-list">{data.forecastScenarios.map((item) => <div className={`scenario-row ${item.active === false ? 'is-inactive' : ''}`} key={item.id}><div><strong>{item.name}</strong><span>{item.kind} · {item.recurrence === 'recurring' ? `recurring from month ${item.month_offset}` : `in ${item.month_offset} ${item.month_offset === 1 ? 'month' : 'months'}`}</span></div><b className={item.kind === 'income' ? 'credit' : 'debit'}>{item.kind === 'income' ? '+' : '−'}{formatCurrency(Number(item.amount), item.currency)}</b><div className="row-actions"><button className={`toggle ${item.active === false ? '' : 'on'}`} onClick={() => onToggle(item)} aria-label={`${item.active === false ? 'Enable' : 'Pause'} ${item.name}`}><span /></button><button className="icon-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Pencil size={16} /></button><button className="icon-button danger-icon" onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`}><Trash2 size={16} /></button></div></div>)}</div> : <div className="tool-empty compact"><Sparkles size={24} /><p>No scenarios yet. Add one to see its impact on the curve.</p><button className="soft-button" onClick={onAdd}><Plus size={15} /> Add scenario</button></div>}</section></div>;
}

function BudgetView({ data, displayCurrency, selectedMonth, setSelectedMonth, onAdd, onEdit, onDelete, onLogActual, onEditActual, onDeleteActual, onImportRecurring }: { data: NettData; displayCurrency: string; selectedMonth: string; setSelectedMonth: (value: string) => void; onAdd: () => void; onEdit: (item: BudgetLine) => void; onDelete: (item: BudgetLine) => void; onLogActual: () => void; onEditActual: (item: Transaction) => void; onDeleteActual: (item: Transaction) => void; onImportRecurring: () => void }) {
  const lines = data.budgetLines.filter((item) => item.is_template || item.month.slice(0, 7) === selectedMonth);
  const actuals = data.transactions.filter((item) => item.occurred_at.slice(0, 7) === selectedMonth);
  const plannedIncome = lines.filter((item) => item.kind === 'income').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const plannedExpenses = lines.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const actualIncome = actuals.filter((item) => item.type === 'credit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const actualExpenses = actuals.filter((item) => item.type === 'debit').reduce((sum, item) => sum + displayAmount(Number(item.amount), item.currency, displayCurrency, data.fxRates), 0);
  const plannedSavings = plannedIncome - plannedExpenses;
  const actualSavings = actualIncome - actualExpenses;
  return <div className="page-panel finance-tool-page"><div className="view-header"><div><div className="eyebrow"><Gauge size={13} /> Monthly control</div><h2>Budget</h2><p>Plan the month, then log actuals to see expected versus real income, spending and savings.</p></div><div className="action-row"><button className="soft-button" onClick={onImportRecurring}><RefreshCw size={15} /> Import recurring</button><button className="soft-button" onClick={onAdd}><Plus size={15} /> Planned</button><button className="primary-button" onClick={onLogActual}><Plus size={15} /> Log actual</button></div></div><div className="month-switcher"><button className="icon-button" onClick={() => setSelectedMonth(addCalendarMonths(selectedMonth, -1))} aria-label="Previous month">‹</button><h3>{monthTitle(selectedMonth)}</h3><button className="icon-button" onClick={() => setSelectedMonth(addCalendarMonths(selectedMonth, 1))} aria-label="Next month">›</button></div><div className="tool-stat-grid"><MetricCard label="Planned savings" value={plannedSavings} note={`${formatCurrency(plannedIncome, displayCurrency)} income · ${formatCurrency(plannedExpenses, displayCurrency)} expenses`} icon={<Target size={14} />} /><MetricCard label="Actual savings" value={actualSavings} note={`${actuals.length} ledger entr${actuals.length === 1 ? 'y' : 'ies'}`} icon={<ListFilter size={14} />} accent="#4ba17a" /><MetricCard label="Variance" value={actualSavings - plannedSavings} note="Actual minus planned" icon={<TrendingUp size={14} />} accent={actualSavings - plannedSavings >= 0 ? '#4ba17a' : '#bd6675'} /></div><section className="card budget-compare"><div className="section-heading"><div><h3>Planned vs actual</h3><p>Use this as your end-of-month review, not another noisy ledger.</p></div><span className="pill">{displayCurrency}</span></div><div className="budget-compare-grid"><div><span>Income</span><strong>{formatCurrency(plannedIncome, displayCurrency)}</strong><small>Actual {formatCurrency(actualIncome, displayCurrency)}</small></div><div><span>Expenses</span><strong>{formatCurrency(plannedExpenses, displayCurrency)}</strong><small>Actual {formatCurrency(actualExpenses, displayCurrency)}</small></div><div><span>Savings</span><strong>{formatCurrency(plannedSavings, displayCurrency)}</strong><small>Actual {formatCurrency(actualSavings, displayCurrency)}</small></div></div></section><section className="card budget-lines"><div className="section-heading"><div><h3>Planned lines</h3><p>Your template carries forward; month-only lines stay here.</p></div><button className="view-link" onClick={onAdd}><Plus size={14} /> Add line</button></div>{lines.length ? <div className="budget-line-list">{lines.map((item) => <div className="budget-line-row" key={item.id}><div className={`finance-kind-icon ${item.kind === 'income' ? 'positive' : 'negative'}`}>{item.kind === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</div><div><strong>{item.name}</strong><span>{item.kind} · {item.category || 'General'}{item.is_template ? ' · every month' : ''}</span></div><b>{formatCurrency(Number(item.amount), item.currency)}</b><div className="row-actions"><button className="icon-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`}><Trash2 size={15} /></button></div></div>)}</div> : <div className="tool-empty compact"><Target size={22} /><p>No planned lines for {monthTitle(selectedMonth)} yet.</p><button className="soft-button" onClick={onAdd}><Plus size={14} /> Plan this month</button></div>}</section><section className="card budget-lines"><div className="section-heading"><div><h3>Actual transactions</h3><p>Real entries for this month, editable here and in Spends.</p></div><button className="view-link" onClick={onLogActual}><Plus size={14} /> Log actual</button></div>{actuals.length ? <div className="budget-line-list">{actuals.map((item) => <div className="budget-line-row" key={item.id}><div className={`finance-kind-icon ${item.type === 'credit' ? 'positive' : 'negative'}`}><IconForTransaction type={item.type} /></div><div><strong>{item.category || item.type}</strong><span>{item.description || 'Ledger entry'} · {formatShortDate(item.occurred_at)}</span></div><b className={item.type === 'credit' ? 'credit' : 'debit'}>{item.type === 'credit' ? '+' : '-'}{formatCurrency(Number(item.amount), item.currency)}</b><div className="row-actions"><button className="icon-button" onClick={() => onEditActual(item)} aria-label={`Edit ${item.category || 'transaction'}`}><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => onDeleteActual(item)} aria-label={`Delete ${item.category || 'transaction'}`}><Trash2 size={15} /></button></div></div>)}</div> : <div className="tool-empty compact"><ListFilter size={22} /><p>No transactions logged for {monthTitle(selectedMonth)} yet.</p><button className="soft-button" onClick={onLogActual}><Plus size={14} /> Log actual</button></div>}</section></div>;
}

function PlanViewV2({ data, metrics, displayCurrency, onQuick, onEditCommitment, onDeleteCommitment, onEditDebt, onDeleteDebt, whatIf, setWhatIf, whatIfResult, runWhatIf }: { data: NettData; metrics: ReturnType<typeof calculateMetrics>; displayCurrency: string; onQuick: (modal: Modal) => void; onEditCommitment: (item: Commitment) => void; onDeleteCommitment: (item: Commitment) => void; onEditDebt: (item: Debt) => void; onDeleteDebt: (item: Debt) => void; whatIf: string; setWhatIf: (value: string) => void; whatIfResult: number | null; runWhatIf: () => void }) {
  return <div className="page-panel"><div className="view-header"><div><h2>Plan</h2><p>Loans, IOUs, future commitments and reserves—kept separate from cash.</p></div><div className="action-row"><button className="soft-button" onClick={() => onQuick('debt')}><Plus size={15} /> Add debt</button><button className="primary-button gradient" onClick={() => onQuick('whatif')}><Sparkles size={16} /> What If</button></div></div><div className="stats-grid plan-stats"><MetricCard label="Primary net worth" value={metrics.primaryNetWorth} note="After mandatory debt" icon={<Gauge size={14} />} /><MetricCard label="All-debt net worth" value={metrics.allDebtNetWorth} note="After flexible debt too" icon={<ShieldCheck size={14} />} accent="#b77dc7" /><MetricCard label="Owed to you" value={metrics.receivables} note="Not counted unless enabled" icon={<ArrowDownLeft size={14} />} accent="#5b9c9b" /><MetricCard label="Due next 90 days" value={metrics.upcomingCommitments} note="Recurring obligations included" icon={<CalendarClock size={14} />} accent="#cb6e83" /></div><div className="section-grid"><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Debt & loans</h2><div className="card-meta">Formal loans and flexible IOUs</div></div><div className="action-row"><button className="view-link" onClick={() => onQuick('debt-event')}>Add payment</button><button className="view-link" onClick={() => onQuick('debt')}>New debt</button></div></div>{data.debts.length ? data.debts.map((debt) => <div className="settings-row" key={debt.id}><div className="activity-avatar"><CreditCard size={16} /></div><main><strong>{debt.name}</strong><small>{debt.debt_class} · {debt.currency}{debt.due_date ? ` · next due ${formatShortDate(debt.due_date)}` : ''}</small><div className="progress-line"><span style={{ width: `${debtProgress(debt)}%` }} /></div></main><div className="plan-row-right"><strong>{formatCurrency(Number(debt.outstanding), debt.currency)}</strong><span className="pill">{Math.round(debtProgress(debt))}% repaid</span></div></div>) : <div className="empty-state compact"><CreditCard size={20} /><strong>No debts recorded</strong><span>Add a loan, credit card balance or informal IOU.</span></div>}</section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Future commitments</h2><div className="card-meta">One-time and recurring obligations</div></div><button className="view-link" onClick={() => onQuick('commitment')}><Plus size={13} /> Add</button></div>{data.commitments.length ? data.commitments.map((item) => <div className="settings-row" key={item.id}><div className="timeline-marker" /><main><strong>{item.name}</strong><small>{formatShortDate(item.due_date)} · {item.recurrence.replace('_', ' ')} · {item.importance}{item.expected_income ? ' · income' : ''}</small></main><strong>{formatCurrency(Number(item.amount), item.currency)}</strong></div>) : <div className="empty-state compact"><CalendarClock size={20} /><strong>Nothing planned yet</strong><span>Add rent, subscriptions, bills or one-time expenses.</span></div>}<div className="plan-inline-actions"><button className="soft-button" onClick={() => onQuick('reserve')}><Target size={14} /> Add reserve</button><button className="soft-button" onClick={() => onQuick('space')}><LayoutGrid size={14} /> Add Space</button></div></section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Receivables</h2><div className="card-meta">Money owed to you stays outside available cash</div></div><div className="action-row"><span className="pill">{formatCurrency(metrics.receivables, displayCurrency, true)}</span><button className="view-link" onClick={() => onQuick('receivable')}>Add</button></div></div>{data.receivables.length ? data.receivables.map((item) => <div className="settings-row" key={item.id}><div className="activity-avatar"><ArrowDownLeft size={16} /></div><main><strong>{item.contact_name}</strong><small>{item.confidence} · {item.include_in_net_worth ? 'included in net worth' : 'excluded from net worth'}{item.expected_on ? ` · due ${formatShortDate(item.expected_on)}` : ''}</small></main><div className="plan-row-right"><strong>{formatCurrency(Number(item.outstanding), item.currency)}</strong><button className="view-link" onClick={() => onQuick('receivable-event')}>Record payment</button></div></div>) : <div className="empty-state compact"><ArrowDownLeft size={20} /><strong>No receivables</strong><span>Track money a friend, client or family member owes you.</span></div>}</section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">What If simulator</h2><div className="card-meta">Test a decision without changing live data</div></div><Sparkles size={17} color="#b678c7" /></div><div className="whatif-row"><input inputMode="decimal" value={whatIf} onChange={(event) => setWhatIf(event.target.value)} placeholder="Amount" /><span>{displayCurrency}</span><button className="primary-button" onClick={runWhatIf}>Calculate</button></div>{whatIfResult !== null && <div className={`scenario-result ${whatIfResult >= 0 ? 'positive' : 'negative'}`}><strong>New Safe to Spend: {formatCurrency(whatIfResult, displayCurrency)}</strong><span>This scenario is temporary and has not been saved.</span></div>}</section></div></div>;
}

type PlanFocus = 'overview' | 'debts' | 'commitments' | 'receivables' | 'spaces';

function PlanViewV3({ data, metrics, displayCurrency, onQuick, onNavigate, onEditCommitment, onDeleteCommitment, onEditDebt, onDeleteDebt, onAddSpace, onEditSpace, onDeleteSpace, whatIf, setWhatIf, whatIfResult, runWhatIf }: { data: NettData; metrics: ReturnType<typeof calculateMetrics>; displayCurrency: string; onQuick: (modal: Modal) => void; onNavigate: (tab: Tab) => void; onEditCommitment: (item: Commitment) => void; onDeleteCommitment: (item: Commitment) => void; onEditDebt: (item: Debt) => void; onDeleteDebt: (item: Debt) => void; onAddSpace: () => void; onEditSpace: (space: Space) => void; onDeleteSpace: (space: Space) => void; whatIf: string; setWhatIf: (value: string) => void; whatIfResult: number | null; runWhatIf: () => void }) {
  const [focus, setFocus] = useState<PlanFocus>('overview');
  const focusItems: Array<{ id: PlanFocus; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'debts', label: 'Debts & loans', count: data.debts.length },
    { id: 'commitments', label: 'Future costs', count: data.commitments.length },
    { id: 'receivables', label: 'Owed to you', count: data.receivables.length },
    { id: 'spaces', label: 'Spaces', count: data.spaces.length },
  ];
  const renderEmpty = (icon: React.ReactNode, title: string, copy: string, action?: React.ReactNode) => <div className="empty-state compact">{icon}<strong>{title}</strong><span>{copy}</span>{action}</div>;
  const debtSection = <section className="card full-card plan-surface"><div className="section-heading"><div><div className="eyebrow"><CreditCard size={13} /> Track what you owe</div><h3>Debts & loans</h3><p>Repay in any amount, add borrowing later, and see the balance move.</p></div><div className="action-row"><button className="soft-button" disabled={!data.debts.length} onClick={() => onQuick('debt-event')}><Plus size={14} /> Log payment</button><button className="primary-button" onClick={() => onQuick('debt')}><Plus size={14} /> New debt</button></div></div>{data.debts.length ? <div className="plan-item-list">{data.debts.map((debt) => { const progress = debtProgress(debt); return <article className="plan-item-card" key={debt.id}><div className="plan-item-top"><div><strong>{debt.name}</strong><small>{debt.debt_class === 'mandatory' ? 'Mandatory' : 'Flexible IOU'} · {debt.currency}{debt.due_date ? ` · due ${formatShortDate(debt.due_date)}` : ''}</small></div><div className="plan-item-actions"><button className="edit-account-button" onClick={() => onEditDebt(debt)}><Pencil size={13} /> Edit</button><button className="icon-button danger-icon" onClick={() => onDeleteDebt(debt)} aria-label={`Delete ${debt.name}`} title="Delete debt"><Trash2 size={14} /></button></div></div><div className="plan-progress-row"><div className="progress-line"><span style={{ width: `${progress}%` }} /></div><span>{Math.round(progress)}% repaid</span></div><div className="plan-item-footer"><span>{formatCurrency(Number(debt.outstanding), debt.currency)} outstanding of {formatCurrency(Number(debt.original_principal), debt.currency)}</span><button className="view-link" onClick={() => onQuick('debt-event')}>Add payment or borrowing</button></div></article>; })}</div> : renderEmpty(<CreditCard size={20} />, 'No debts recorded', 'Add a family loan, credit card balance or informal IOU.')}</section>;
  const commitmentSection = <section className="card full-card plan-surface"><div className="section-heading"><div><div className="eyebrow"><CalendarClock size={13} /> Protect future you</div><h3>Future commitments</h3><p>Keep one-time and recurring costs visible before they become surprises.</p></div><button className="primary-button" onClick={() => onQuick('commitment')}><Plus size={14} /> Add future cost</button></div>{data.commitments.length ? <div className="plan-item-list">{data.commitments.map((item) => <article className="plan-item-card" key={item.id}><div className="plan-item-top"><div className="plan-item-copy"><span className="timeline-marker" /><div><strong>{item.name}</strong><small>{formatShortDate(item.due_date)} · {item.recurrence.replace('_', ' ')} · {item.importance}{item.expected_income ? ' · expected income' : ''}</small></div></div><div className="plan-item-amount"><strong>{formatCurrency(Number(item.amount), item.currency)}</strong><div className="plan-item-actions"><button className="edit-account-button" onClick={() => onEditCommitment(item)}><Pencil size={13} /> Edit</button><button className="icon-button danger-icon" onClick={() => onDeleteCommitment(item)} aria-label={`Delete ${item.name}`} title="Delete commitment"><Trash2 size={14} /></button></div></div></div></article>)}</div> : renderEmpty(<CalendarClock size={20} />, 'Nothing planned yet', 'Add rent, insurance, business renewal or a one-time expense.') }<div className="plan-secondary-actions"><button className="soft-button" onClick={() => onQuick('reserve')}><Target size={14} /> Add reserve</button><button className="soft-button" onClick={onAddSpace}><LayoutGrid size={14} /> Add Space</button></div>{data.reserves.length > 0 && <div className="reserve-list"><div className="subsection-label">Reserves</div>{data.reserves.map((reserve) => { const progress = Math.min(100, Math.max(0, Number(reserve.target_amount) ? Number(reserve.funded_amount) / Number(reserve.target_amount) * 100 : 0)); return <div className="reserve-row" key={reserve.id}><div><strong>{reserve.name}</strong><small>{formatCurrency(Number(reserve.funded_amount), reserve.currency)} of {formatCurrency(Number(reserve.target_amount), reserve.currency)}{reserve.due_date ? ` · due ${formatShortDate(reserve.due_date)}` : ''}</small></div><div className="reserve-progress"><div className="progress-line"><span style={{ width: `${progress}%` }} /></div><span>{Math.round(progress)}%</span></div></div>; })}</div>}</section>;
  const receivableSection = <section className="card full-card plan-surface"><div className="section-heading"><div><div className="eyebrow"><ArrowDownLeft size={13} /> Keep promises separate</div><h3>Owed to you</h3><p>Track money people or clients owe you without treating it like cash in hand.</p></div><div className="action-row"><button className="soft-button" disabled={!data.receivables.length} onClick={() => onQuick('receivable-event')}><Check size={14} /> Record payment</button><button className="primary-button" onClick={() => onQuick('receivable')}><Plus size={14} /> Add receivable</button></div></div>{data.receivables.length ? <div className="plan-item-list">{data.receivables.map((item) => <article className="plan-item-card" key={item.id}><div className="plan-item-top"><div><strong>{item.contact_name}</strong><small>{item.confidence} · {item.include_in_net_worth ? 'included in net worth' : 'not counted in net worth'}{item.expected_on ? ` · expected ${formatShortDate(item.expected_on)}` : ''}</small></div><strong className="plan-item-amount">{formatCurrency(Number(item.outstanding), item.currency)}</strong></div><div className="plan-item-footer"><span>Remaining to receive</span><button className="view-link" onClick={() => onQuick('receivable-event')}>Record partial payment</button></div></article>)}</div> : renderEmpty(<ArrowDownLeft size={20} />, 'No receivables', 'Track money a friend, family member or client owes you.')}</section>;
  const spacesSection = <section className="card full-card plan-surface"><div className="section-heading"><div><div className="eyebrow"><LayoutGrid size={13} /> Give money a purpose</div><h3>Spaces</h3><p>Separate mini-ledgers for a car, travel, taxes, business or any goal.</p></div><button className="primary-button" onClick={onAddSpace}><Plus size={14} /> New Space</button></div>{data.spaces.length ? <div className="space-grid">{data.spaces.map((space) => <article className="space-card" key={space.id} style={{ borderTopColor: space.color || '#ff8dc7' }}><div className="space-card-top"><div><strong>{space.name}</strong><small>{space.currency} · {space.budget ? `Budget ${formatCurrency(Number(space.budget), space.currency, true)}` : 'No budget set'}</small></div><div className="space-actions"><button className="edit-account-button" onClick={() => onEditSpace(space)} aria-label={`Edit ${space.name}`}><Pencil size={13} /> Edit</button><button className="icon-button danger-icon" onClick={() => onDeleteSpace(space)} aria-label={`Delete ${space.name}`} title="Delete Space"><Trash2 size={14} /></button></div></div><div className="space-amount">{formatCurrency(Number(space.allocation || 0), space.currency, true)} <span>allocated</span></div>{space.budget ? <div className="space-progress"><span style={{ width: `${Math.min(100, Math.max(0, Number(space.allocation || 0) / Number(space.budget) * 100))}%` }} /></div> : null}{space.notes && <p className="space-notes">{space.notes}</p>}</article>)}</div> : renderEmpty(<Target size={20} />, 'No Spaces yet', 'Create one for car costs, business expenses, rent or a goal.', <button className="soft-button" onClick={onAddSpace}><Plus size={14} /> Create your first Space</button>)}</section>;
  const overview = <div className="plan-overview"><section className="card plan-hero"><div><div className="eyebrow"><Target size={13} /> Your forward view</div><h3>Make future money decisions with the full picture.</h3><p>Nett keeps balances, obligations, spaces and receivables connected without mixing them into one noisy ledger.</p></div><div className="plan-hero-stats"><div><span>Primary net worth</span><strong>{formatCurrency(metrics.primaryNetWorth, displayCurrency)}</strong><small>After mandatory debt</small></div><div><span>Due next 90 days</span><strong>{formatCurrency(metrics.upcomingCommitments, displayCurrency)}</strong><small>Recurring costs included</small></div></div></section><div className="plan-summary-grid"><button className="card plan-summary-card" onClick={() => setFocus('debts')}><span className="stat-icon"><CreditCard size={15} /></span><strong>{data.debts.length} debt{data.debts.length === 1 ? '' : 's'}</strong><small>{formatCurrency(metrics.allDebtNetWorth, displayCurrency)} after all debt</small><ArrowUpRight size={15} /></button><button className="card plan-summary-card" onClick={() => setFocus('commitments')}><span className="stat-icon"><CalendarClock size={15} /></span><strong>{data.commitments.length} future cost{data.commitments.length === 1 ? '' : 's'}</strong><small>{formatCurrency(metrics.upcomingCommitments, displayCurrency)} due soon</small><ArrowUpRight size={15} /></button><button className="card plan-summary-card" onClick={() => setFocus('receivables')}><span className="stat-icon"><ArrowDownLeft size={15} /></span><strong>{data.receivables.length} receivable{data.receivables.length === 1 ? '' : 's'}</strong><small>{formatCurrency(metrics.receivables, displayCurrency)} owed to you</small><ArrowUpRight size={15} /></button><button className="card plan-summary-card" onClick={() => setFocus('spaces')}><span className="stat-icon"><LayoutGrid size={15} /></span><strong>{data.spaces.length} Space{data.spaces.length === 1 ? '' : 's'}</strong><small>{formatCurrency(metrics.protectedAmount, displayCurrency)} protected</small><ArrowUpRight size={15} /></button></div><section className="card plan-surface"><div className="section-heading"><div><div className="eyebrow"><Sparkles size={13} /> Decision check</div><h3>What if?</h3><p>Try a future expense without changing your saved data.</p></div><span className="pill">Temporary scenario</span></div><div className="whatif-row"><input inputMode="decimal" value={whatIf} onChange={(event) => setWhatIf(event.target.value)} placeholder="Amount" /><span>{displayCurrency}</span><button className="primary-button" onClick={runWhatIf}>Calculate</button></div>{whatIfResult !== null && <div className={`scenario-result ${whatIfResult >= 0 ? 'positive' : 'negative'}`}><strong>New Safe to Spend: {formatCurrency(whatIfResult, displayCurrency)}</strong><span>This scenario is temporary and has not been saved.</span></div>}</section></div>;
  return <div className="page-panel plan-v3"><div className="view-header"><div><div className="eyebrow"><Target size={13} /> Plan ahead</div><h2>Plan</h2><p>See what is spoken for, what is owed and what comes next.</p></div><div className="action-row"><button className="soft-button" onClick={() => onQuick('commitment')}><Plus size={15} /> Future cost</button><button className="primary-button" onClick={() => onQuick('debt')}><Plus size={15} /> Debt or loan</button></div></div><div className="plan-focus-nav" role="tablist" aria-label="Plan sections">{focusItems.map((item) => <button key={item.id} role="tab" aria-selected={focus === item.id} className={focus === item.id ? 'selected' : ''} onClick={() => setFocus(item.id)}>{item.label}{item.count ? <span>{item.count}</span> : null}</button>)}</div><div className="plan-tool-links" aria-label="Planning tools"><button onClick={() => onNavigate('recurring')}><RefreshCw size={15} /><span><strong>Recurring</strong><small>{data.commitments.filter((item) => item.recurrence !== 'one_time').length} repeating items</small></span><ArrowUpRight size={14} /></button><button onClick={() => onNavigate('forecast')}><TrendingUp size={15} /><span><strong>Forecast</strong><small>Project your net worth</small></span><ArrowUpRight size={14} /></button><button onClick={() => onNavigate('budget')}><Gauge size={15} /><span><strong>Budget</strong><small>Plan this month</small></span><ArrowUpRight size={14} /></button></div>{focus === 'overview' && overview}{focus === 'debts' && debtSection}{focus === 'commitments' && commitmentSection}{focus === 'receivables' && receivableSection}{focus === 'spaces' && spacesSection}</div>;
}

function PlanManagePanel({ data, onEditCommitment, onDeleteCommitment, onEditDebt, onDeleteDebt }: { data: NettData; onEditCommitment: (item: Commitment) => void; onDeleteCommitment: (item: Commitment) => void; onEditDebt: (item: Debt) => void; onDeleteDebt: (item: Debt) => void }) {
  return <section className="card full-card plan-manage-panel"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Manage your plan</h2><div className="card-meta">Edit or remove anything you have added. Your linked history stays private.</div></div><Pencil size={17} color="#b678c7" /></div><div className="plan-manage-grid"><div><strong className="plan-manage-heading">Debts & loans</strong>{data.debts.length ? <div className="plan-manage-list">{data.debts.map((item) => <div className="plan-manage-row" key={item.id}><div><strong>{item.name}</strong><span>{item.currency} · {formatCurrency(Number(item.outstanding), item.currency, true)} outstanding</span></div><div className="plan-item-actions"><button className="edit-account-button" onClick={() => onEditDebt(item)}><Pencil size={13} /> Edit</button><button className="icon-button danger-icon" onClick={() => onDeleteDebt(item)} aria-label={`Delete ${item.name}`} title="Delete debt"><Trash2 size={14} /></button></div></div>)}</div> : <span className="plan-manage-empty">No debts to manage.</span>}</div><div><strong className="plan-manage-heading">Future commitments</strong>{data.commitments.length ? <div className="plan-manage-list">{data.commitments.map((item) => <div className="plan-manage-row" key={item.id}><div><strong>{item.name}</strong><span>{formatShortDate(item.due_date)} · {formatCurrency(Number(item.amount), item.currency, true)}</span></div><div className="plan-item-actions"><button className="edit-account-button" onClick={() => onEditCommitment(item)}><Pencil size={13} /> Edit</button><button className="icon-button danger-icon" onClick={() => onDeleteCommitment(item)} aria-label={`Delete ${item.name}`} title="Delete commitment"><Trash2 size={14} /></button></div></div>)}</div> : <span className="plan-manage-empty">No commitments to manage.</span>}</div></div></section>;
}

function PlanView({ data, metrics, displayCurrency, onQuick, whatIf, setWhatIf, whatIfResult, runWhatIf }: { data: NettData; metrics: ReturnType<typeof calculateMetrics>; displayCurrency: string; onQuick: (modal: Modal) => void; whatIf: string; setWhatIf: (value: string) => void; whatIfResult: number | null; runWhatIf: () => void }) {
  return <div className="page-panel"><div className="view-header"><div><h2>Plan</h2><p>See what is spoken for, what is owed and what comes next.</p></div><button className="primary-button gradient" onClick={() => onQuick('whatif')}><Sparkles size={16} /> What If</button></div><div className="section-grid"><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Debt position</h2><div className="card-meta">Mandatory and flexible stay honest</div></div><div style={{ display: 'flex', gap: 8 }}><button className="view-link" onClick={() => onQuick('debt')}>Add event</button></div></div><div className="table-head" style={{ paddingLeft: 0, paddingRight: 0, gridTemplateColumns: '1.5fr 1fr .8fr' }}><span>Debt</span><span>Outstanding</span><span>Progress</span></div>{data.debts.map((debt) => <div className="table-row" key={debt.id} style={{ paddingLeft: 0, paddingRight: 0, gridTemplateColumns: '1.5fr 1fr .8fr' }}><div><div className="table-strong">{debt.name}</div><div className="table-muted">{debt.debt_class} · {debt.currency}</div></div><div className="table-strong">{formatCurrency(Number(debt.outstanding), debt.currency)}</div><div><span className={`pill ${debt.debt_class === 'mandatory' ? 'warn' : 'pink'}`}>{Math.round(debtProgress(debt))}% repaid</span><div className="progress-line"><span style={{ width: `${debtProgress(debt)}%` }} /></div></div></div>)}</section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Future pressure</h2><div className="card-meta">Protected amounts are not double-counted</div></div><button className="view-link" onClick={() => onQuick('commitment')}>Add commitment</button></div><div className="timeline" style={{ padding: '20px 0 0' }}>{data.commitments.map((item) => <div className="timeline-item" key={item.id}><span className="timeline-marker" /><div className="timeline-content"><div><div className="timeline-name">{item.name}</div><div className="timeline-date">{formatShortDate(item.due_date)} · {item.importance}</div></div><div className="timeline-amount">{formatCurrency(Number(item.amount), item.currency, true)}</div></div></div>)}</div><div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}><span className="status-chip">{formatCurrency(metrics.protectedAmount, displayCurrency, true)} reserved</span><span className="status-chip warn">{formatCurrency(metrics.upcomingCommitments, displayCurrency, true)} due soon</span></div></section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">What If simulator</h2><div className="card-meta">A structured scenario that never changes live data</div></div><Sparkles size={17} color="#b678c7" /></div><div style={{ paddingTop: 20 }}><label>What if I spend <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 2 }}><input inputMode="decimal" value={whatIf} onChange={(event) => setWhatIf(event.target.value)} /><span style={{ color: 'var(--muted)', fontSize: 12 }}>AED</span><button className="primary-button" onClick={runWhatIf}>Calculate</button></div></label>{whatIfResult !== null && <div style={{ marginTop: 17, padding: 15, borderRadius: 15, background: whatIfResult >= 0 ? '#f0faf5' : '#fff3f4', color: whatIfResult >= 0 ? '#3d8c68' : '#b3525c', fontSize: 12 }}><strong>New Safe to Spend: {formatCurrency(whatIfResult, displayCurrency)}</strong><div style={{ marginTop: 4, opacity: .78 }}>This scenario is temporary. Convert it to a commitment only when you are ready.</div></div>}</div></section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Receivables</h2><div className="card-meta">Promised money stays separate from cash</div></div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="pill">{formatCurrency(metrics.receivables, displayCurrency, true)}</span><button className="view-link" onClick={() => onQuick('receivable')}>Add</button></div></div>{data.receivables.map((item) => <div className="settings-row" key={item.id} style={{ marginTop: 14 }}><div className="activity-avatar"><ArrowDownLeft size={16} /></div><main><strong>{item.contact_name}</strong><small>{item.confidence} · due {item.expected_on ? formatShortDate(item.expected_on) : 'not set'}</small></main><div style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{formatCurrency(Number(item.outstanding), item.currency)}</div></div>)}</section></div></div>;
}

function ViewPreferences({ enabledCountries, enabledCurrencies, onToggleCountry, onToggleCurrency, onReset }: { enabledCountries: string[]; enabledCurrencies: string[]; onToggleCountry: (value: string) => void; onToggleCurrency: (value: string) => void; onReset: () => void }) {
  return <section className="card full-card view-preferences"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">View options</h2><div className="card-meta">Keep only the countries and currencies you actually use in your selectors.</div></div><Globe size={17} color="#8a65ae" /></div><div className="preference-group"><div><strong>Countries</strong><span>Used by filters and account details.</span></div><div className="preference-chips">{countryOptions.map((item) => <button key={item.value} className={enabledCountries.includes(item.value) ? 'selected' : ''} onClick={() => onToggleCountry(item.value)} aria-pressed={enabledCountries.includes(item.value)}><FlagIcon country={item.value} />{item.label}</button>)}</div></div><div className="preference-group"><div><strong>Currencies</strong><span>Used by totals, forms and conversion context.</span></div><div className="preference-chips">{currencyOptions.map((item) => <button key={item} className={enabledCurrencies.includes(item) ? 'selected' : ''} onClick={() => onToggleCurrency(item)} aria-pressed={enabledCurrencies.includes(item)}>{item}</button>)}</div></div><button className="view-link preference-reset" onClick={onReset}>Restore UAE, India, AED and INR</button></section>;
}

function HistoryView({ data, onAdd, onEdit, onDelete, onRefresh }: { data: NettData; onAdd: () => void; onEdit: (item: Snapshot) => void; onDelete: (item: Snapshot) => void; onRefresh: () => void }) {
  const snapshots = [...data.snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  const maxValue = Math.max(1, ...snapshots.map((item) => Number(item.primary_net_worth)));
  return <div className="page-panel finance-tool-page zen-page history-page"><div className="view-header"><div><div className="eyebrow"><History size={14} /> Your monthly record</div><h2>History</h2><p>Save honest snapshots, compare months and see how each account changed.</p></div><div className="action-row"><button className="soft-button" onClick={onRefresh}><RefreshCw size={16} /> Refresh balances</button><button className="primary-button" onClick={onAdd}><Plus size={17} /> Add snapshot</button></div></div>{snapshots.length ? <><section className="card history-chart-card"><div className="section-heading"><div><h3>Net worth over time</h3><p>Saved snapshots in their recorded display currency.</p></div></div><div className="history-bars" role="img" aria-label="Net worth history chart">{snapshots.map((item) => <div key={item.id} title={`${item.label}: ${formatCurrency(Number(item.primary_net_worth), item.display_currency)}`}><span style={{ height: `${Math.max(6, Number(item.primary_net_worth) / maxValue * 100)}%` }} /><small>{new Intl.DateTimeFormat('en-AE', { month: 'short', year: '2-digit' }).format(new Date(`${item.snapshot_date}T12:00:00`))}</small></div>)}</div></section><div className="reference-card-grid">{[...snapshots].reverse().map((item) => { const payload = item.payload || {}; const aed = Number(payload.AED || 0); const inr = Number(payload.INR || 0); const usd = Number(payload.USD || 0); return <article className="reference-card snapshot-card" key={item.id}><div className="reference-card-top"><div><h3>{item.label}</h3><span>{formatShortDate(item.snapshot_date)}</span></div><div className="reference-card-actions"><button className="icon-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.label}`}><Pencil size={16} /></button><button className="icon-button danger-icon" onClick={() => onDelete(item)} aria-label={`Delete ${item.label}`}><Trash2 size={16} /></button></div></div><div className="reference-card-label">Saved net worth</div><strong className="reference-card-value">{formatCurrency(Number(item.primary_net_worth), item.display_currency)}</strong><div className="snapshot-currencies"><span>AED <b>{formatCurrency(aed, 'AED', true)}</b></span><span>INR <b>{formatCurrency(inr, 'INR', true)}</b></span><span>USD <b>{formatCurrency(usd, 'USD', true)}</b></span></div></article>; })}</div></> : <div className="tool-empty"><History size={30} /><h3>No history yet</h3><p>Save your first monthly snapshot after updating account balances.</p><button className="primary-button" onClick={onAdd}><Plus size={15} /> Add snapshot</button></div>}</div>;
}

function SettingsView({ data, theme, setTheme, exportData, session, enabledCurrencies, onToggleCurrency, onDisplayCurrency, onCountOwed, onRefreshRates, onSaveRate, onAddCountry, onEditCountry, onDeleteCountry }: { data: NettData; theme: Theme; setTheme: (theme: Theme) => void; exportData: () => void; session: boolean; enabledCurrencies: string[]; onToggleCurrency: (value: string) => void; onDisplayCurrency: (value: string) => void; onCountOwed: (value: boolean) => void; onRefreshRates: () => void; onSaveRate: (form: HTMLFormElement) => void; onAddCountry: () => void; onEditCountry: (item: CountryConfig) => void; onDeleteCountry: (item: CountryConfig) => void }) {
  const countries = data.countries;
  return <div className="page-panel finance-tool-page zen-page settings-reference-page"><div className="view-header"><div><div className="eyebrow"><Settings2 size={14} /> Make Nett yours</div><h2>Settings</h2><p>Appearance, currencies, exchange rates, privacy and a portable backup.</p></div><span className="status-chip good"><ShieldCheck size={14} /> {session ? 'Private account' : 'Demo mode'}</span></div><div className="settings-reference-grid">
    <section className="card settings-section"><div className="section-heading"><div><h3>Appearance</h3><p>A calm surface in any light.</p></div><Sparkles size={18} /></div><div className="segmented-control">{(['light', 'dark', 'amoled'] as Theme[]).map((item) => <button key={item} className={theme === item ? 'selected' : ''} onClick={() => setTheme(item)}>{item === 'amoled' ? 'AMOLED' : item[0].toUpperCase() + item.slice(1)}</button>)}</div></section>
    <section className="card settings-section"><div className="section-heading"><div><h3>Default currency</h3><p>Used for combined totals and forecasts.</p></div><CircleDollarSign size={18} /></div><div className="segmented-control">{enabledCurrencies.map((item) => <button key={item} className={data.profile.display_currency === item ? 'selected' : ''} onClick={() => onDisplayCurrency(item)}>{item}</button>)}</div><div className="settings-currency-list">{currencyOptions.map((item) => <button key={item} className={enabledCurrencies.includes(item) ? 'selected' : ''} aria-pressed={enabledCurrencies.includes(item)} onClick={() => onToggleCurrency(item)}><span>{item}</span><Check size={15} /></button>)}</div></section>
    <section className="card settings-section settings-wide"><div className="section-heading"><div><h3>Countries</h3><p>Keep only the financial homes you actually use.</p></div><button className="soft-button" onClick={onAddCountry}><Plus size={15} /> Add country</button></div>{countries.length ? <div className="country-settings-list">{countries.map((item) => <div key={item.id}><CountryBadge country={item.code} /><span><strong>{item.name}</strong><small>{item.currency}</small></span><div className="row-actions"><button className="icon-button" onClick={() => onEditCountry(item)} aria-label={`Edit ${item.name}`}><Pencil size={16} /></button><button className="icon-button danger-icon" onClick={() => onDeleteCountry(item)} aria-label={`Delete ${item.name}`}><Trash2 size={16} /></button></div></div>)}</div> : <div className="settings-empty-row"><Globe size={20} /><span>Your default UAE and India options remain available. Add a custom country to manage it here.</span></div>}</section>
    <section className="card settings-section settings-wide"><div className="section-heading"><div><h3>Exchange rates</h3><p>{data.fxRateSource || 'Saved rates'} · updated {data.fxRatesUpdatedAt ? formatShortDate(data.fxRatesUpdatedAt) : 'not yet'}</p></div><button className="soft-button" onClick={onRefreshRates}><RefreshCw size={15} /> Refresh rates</button></div><div className="fx-summary-grid">{['AED_INR', 'AED_USD', 'INR_USD'].map((pair) => { const [base, quote] = pair.split('_'); return <div key={pair}><span>1 {base}</span><strong>{rateFor(base, quote, data.fxRates).toLocaleString(undefined, { maximumFractionDigits: 4 })} {quote}</strong></div>; })}</div><form className="manual-rate-form" onSubmit={(event) => { event.preventDefault(); onSaveRate(event.currentTarget); }}><label>From<select name="base_currency" defaultValue="AED">{enabledCurrencies.map((item) => <option key={item}>{item}</option>)}</select></label><label>To<select name="quote_currency" defaultValue={enabledCurrencies.find((item) => item !== 'AED') || 'INR'}>{enabledCurrencies.map((item) => <option key={item}>{item}</option>)}</select></label><label>Rate<input name="rate" type="number" min="0.000001" step="0.000001" required placeholder="0.00" /></label><button className="primary-button">Save override</button></form></section>
    <section className="card settings-section"><div className="section-heading"><div><h3>Net worth policy</h3><p>Decide whether uncertain receivables count.</p></div><ShieldCheck size={18} /></div><div className="settings-toggle-row"><span><strong>Count money owed to me</strong><small>Off keeps receivables outside net worth until they arrive.</small></span><button className={`toggle ${data.profile.count_owed_to_me ? 'on' : ''}`} onClick={() => onCountOwed(!data.profile.count_owed_to_me)} aria-label="Toggle money owed to me in net worth"><span /></button></div></section>
    <section className="card settings-section"><div className="section-heading"><div><h3>Your data</h3><p>Portable, inspectable and yours.</p></div><Download size={18} /></div><button className="settings-export-button" onClick={exportData}><span><strong>Export complete backup</strong><small>JSON with original values and history.</small></span><Download size={17} /></button><div className="privacy-note"><LockKeyhole size={17} /><span>{session ? 'Supabase authentication and row-level security keep every user separate.' : 'Sign in to persist changes securely.'}</span></div></section>
  </div></div>;
}

function MoreView({ data, theme, setTheme, pushEnabled, enableNotifications, exportData, exportCsv, exportXlsx, session, enabledCountries, enabledCurrencies, onToggleCountry, onToggleCurrency, onResetViewOptions, onQuick, onNavigate }: { data: NettData; theme: Theme; setTheme: (theme: Theme) => void; pushEnabled: boolean; enableNotifications: () => void; exportData: () => void; exportCsv: () => void; exportXlsx: () => void; session: boolean; enabledCountries: string[]; enabledCurrencies: string[]; onToggleCountry: (value: string) => void; onToggleCurrency: (value: string) => void; onResetViewOptions: () => void; onQuick: (modal: Modal) => void; onNavigate: (tab: Tab) => void }) {
  return <div className="page-panel"><div className="view-header"><div><h2>More</h2><p>Investments, portability, security and how Nett feels.</p></div><span className="status-chip good"><ShieldCheck size={13} /> Private by design</span></div><ViewPreferences enabledCountries={enabledCountries} enabledCurrencies={enabledCurrencies} onToggleCountry={onToggleCountry} onToggleCurrency={onToggleCurrency} onReset={onResetViewOptions} /><div className="section-grid"><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Portfolio</h2><div className="card-meta">Manual valuation · provider-ready</div></div><LineChart size={17} color="#6a9e9e" /></div>{data.investments.map((item) => <div className="settings-row" key={item.id} style={{ marginTop: 14 }}><div className="activity-avatar" style={{ color: '#438e8b', background: '#edf8f5' }}><TrendingUp size={16} /></div><main><strong>{item.symbol} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {item.exchange}</span></strong><small>{item.quantity} units · {item.holding_currency} · last updated {item.latest_value_at ? formatShortDate(item.latest_value_at) : 'never'}</small></main><div style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{formatCurrency(Number(item.latest_value || 0), item.holding_currency, true)}</div></div>)}<button className="soft-button" style={{ width: '100%', marginTop: 14 }} onClick={() => onQuick('investment')}><Plus size={14} /> Add holding</button></section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Phone notifications</h2><div className="card-meta">Due dates, check-ins and freshness—only when useful.</div></div><Bell size={17} color="#b16e9b" /></div><div className="settings-row" style={{ marginTop: 16 }}><div className="activity-avatar"><Bell size={16} /></div><main><strong>{pushEnabled ? 'Notifications enabled' : 'Enable notification centre alerts'}</strong><small>{pushEnabled ? 'Nett can send reminders to this device.' : 'Install Nett to Home Screen on iOS first.'}</small></main><button className={`toggle ${pushEnabled ? 'on' : ''}`} onClick={enableNotifications} aria-label="Toggle notifications"><span /></button></div><div className="settings-row"><div className="activity-avatar"><CalendarClock size={16} /></div><main><strong>Monthly check-in</strong><small>31st of each month · enabled</small></main><span className="pill good">On</span></div></section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Appearance</h2><div className="card-meta">A calm surface in any light</div></div><Sparkles size={17} color="#b678c7" /></div><div className="filter-pills" style={{ marginTop: 16 }}>{(['light', 'dark', 'amoled', 'system'] as Theme[]).map((item) => <button key={item} className={theme === item ? 'selected' : ''} onClick={() => setTheme(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div></section><section className="card full-card"><div className="card-header" style={{ padding: 0 }}><div><h2 className="card-title">Your data</h2><div className="card-meta">Portable, inspectable and yours</div></div><Download size={17} color="#8a65ae" /></div><div className="settings-list" style={{ marginTop: 16 }}><div className="settings-row"><FileSpreadsheet size={18} /><main><strong>Export complete backup</strong><small>JSON with original currency values and history.</small></main><div style={{ display: 'flex', gap: 7 }}><button className="soft-button" onClick={exportData}><Download size={13} /> JSON</button><button className="soft-button" onClick={exportCsv}>CSV</button></div></div><div className="settings-row"><Upload size={18} /><main><strong>Import a spreadsheet</strong><small>CSV preview before commit; XLSX mapping is next.</small></main><button className="soft-button" onClick={() => onQuick('import')}><Upload size={13} /> Import</button></div><div className="settings-row"><LockKeyhole size={18} /><main><strong>Security & sessions</strong><small>{session ? 'Supabase-authenticated account with RLS.' : 'Demo mode — sign in to manage sessions.'}</small></main><ShieldCheck size={17} color="#4ca67e" /></div></div></section></div></div>;
}

function MobileMoreSheet({ open, activeTab, onClose, onNavigate }: { open: boolean; activeTab: Tab; onClose: () => void; onNavigate: (tab: Tab) => void }) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);
  if (!open) return null;
  return <div className="mobile-more-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title">
      <div className="mobile-more-handle" />
      <div className="mobile-more-header"><div><span className="eyebrow"><LayoutGrid size={13} /> More Nett</span><h2 id="mobile-more-title">Everything else</h2><p>Keep the essentials one tap away.</p></div><button className="icon-button" onClick={onClose} aria-label="Close menu"><X size={18} /></button></div>
      <div className="mobile-more-list">{mobileMoreItems.map(({ id, label, description, icon: Icon }) => <button key={id} className={`mobile-more-item ${activeTab === id ? 'active' : ''}`} onClick={() => { onNavigate(id); onClose(); }}><span className="mobile-more-icon"><Icon size={19} /></span><span><strong>{label}</strong><small>{description}</small></span><ChevronDown size={17} className="mobile-more-chevron" /></button>)}<Link href="/changelog" className="mobile-more-item mobile-more-link" onClick={onClose}><span className="mobile-more-icon"><GitCommitHorizontal size={19} /></span><span><strong>Release notes</strong><small>What changed in each Nett release</small></span><ArrowUpRight size={17} className="mobile-more-chevron" /></Link></div>
    </section>
  </div>;
}

function QuickAddSheet({ onClose, onAccount, onSpend, onBill, onRecurring }: { onClose: () => void; onAccount: () => void; onSpend: () => void; onBill: () => void; onRecurring: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);
  const actions = [
    { label: 'Account', copy: 'Add a bank, cash or card balance', icon: Wallet, action: onAccount },
    { label: 'Spend tracker', copy: 'Start a focused car, business or trip ledger', icon: CreditCard, action: onSpend },
    { label: 'Bill', copy: 'Remember a one-time or repeating future cost', icon: CalendarClock, action: onBill },
    { label: 'Recurring', copy: 'Add salary, rent or a subscription rhythm', icon: RefreshCw, action: onRecurring },
  ];
  return <div className="mobile-more-backdrop quick-add-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="mobile-more-sheet quick-add-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-add-title"><div className="mobile-more-handle" /><div className="mobile-more-header"><div><span className="eyebrow"><Plus size={14} /> Quick add</span><h2 id="quick-add-title">What are you adding?</h2><p>Choose one clear starting point.</p></div><button className="icon-button" onClick={onClose} aria-label="Close quick add"><X size={18} /></button></div><div className="quick-add-grid">{actions.map(({ label, copy, icon: Icon, action }) => <button key={label} onClick={action}><span><Icon size={21} /></span><strong>{label}</strong><small>{copy}</small><ArrowUpRight size={17} /></button>)}</div></section></div>;
}

function ModalShell({ title, description, children, onClose }: { title: string; description: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="nett-modal-title"><div className="modal-header"><div><h3 id="nett-modal-title">{title}</h3><p>{description}</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={16} /></button></div>{children}</div></div>;
}

function ReferenceCommitmentModal({ mode, commitment, workspaces, countries, currencies, onClose, onSave }: { mode: 'bill' | 'recurring'; commitment: Commitment | null; workspaces: NettData['workspaces']; countries: CountryOption[]; currencies: string[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  const recurring = mode === 'recurring';
  return <ModalShell title={commitment ? `Edit ${recurring ? 'recurring item' : 'bill'}` : `Add ${recurring ? 'recurring' : 'bill'}`} description={recurring ? 'Add one fixed rhythm. Nett will carry it into your forecast.' : 'Keep one future cost visible until it is paid.'} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><input type="hidden" name="entry_type" value={mode} /><input type="hidden" name="workspace_id" value={commitment?.workspace_id || workspaces[0]?.id || ''} /><div className="form-grid"><label className="full-span">Name<input name="name" required autoFocus defaultValue={commitment?.name || ''} placeholder={recurring ? 'Salary, rent, Spotify…' : 'Insurance, renewal, statement…'} /></label>{recurring && <label>Type<select name="kind" defaultValue={commitment?.expected_income ? 'income' : 'expense'}><option value="income">Income</option><option value="expense">Expense</option></select></label>}<label>Category<input name="category" defaultValue={commitment?.category || ''} placeholder={recurring ? 'Salary, housing, utilities…' : 'Insurance, business, car…'} /></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={commitment?.amount ?? ''} placeholder="0.00" /></label><label>Currency<select name="currency" defaultValue={commitment?.currency || currencies[0] || 'AED'}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label><label>{recurring ? 'Cadence' : 'Recurrence'}<select name="recurrence" defaultValue={commitment?.recurrence || (recurring ? 'monthly' : 'one_time')}>{!recurring && <option value="one_time">One time</option>}<option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>{recurring && <label>Day of month<input name="day_of_month" type="number" min="1" max="31" defaultValue={commitment?.day_of_month || 1} /></label>}<label>{recurring ? 'Starts on' : 'Due date'}<input name={recurring ? 'start_date' : 'due_date'} required type="date" defaultValue={commitment?.due_date || new Date().toISOString().slice(0, 10)} /></label><label>Country<select name="country_code" defaultValue={commitment?.country_code || 'auto'}><option value="auto">Auto (by currency)</option>{countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>{recurring && <label className="check-row full-span"><input type="checkbox" name="active" value="true" defaultChecked={commitment?.active !== false} /> Active and included in forecasts</label>}<label className="full-span">Notes (optional)<textarea name="notes" rows={3} defaultValue={commitment?.notes || ''} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={16} /> {commitment ? 'Save changes' : 'Add'}</button></div></form></ModalShell>;
}

function ReferenceInvestmentModal({ investment, workspaces, countries, currencies, onClose, onSave }: { investment: Investment | null; workspaces: NettData['workspaces']; countries: CountryOption[]; currencies: string[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  const currentPrice = Number(investment?.quantity || 0) > 0 ? Number(investment?.latest_value || 0) / Number(investment?.quantity || 1) : 0;
  return <ModalShell title={investment ? 'Edit holding' : 'Add holding'} description="Track a position manually and refresh its price during your review." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><input type="hidden" name="workspace_id" value={investment?.workspace_id || workspaces[0]?.id || ''} /><div className="form-grid"><label className="full-span">Name<input name="name" required autoFocus defaultValue={investment?.name || ''} placeholder="Apple, Emirates NBD, index fund…" /></label><label>Ticker<input name="symbol" required defaultValue={investment?.symbol || ''} placeholder="AAPL" /></label><label>Market<select name="market" defaultValue={investment?.market || investment?.exchange || 'UAE'}><option>UAE</option><option>India</option><option>US</option></select></label><label>Currency<select name="currency" defaultValue={investment?.holding_currency || currencies[0] || 'AED'}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label><label>Country<select name="country_code" defaultValue={investment?.country_code || 'auto'}><option value="auto">Auto (by currency)</option>{countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Quantity<input name="quantity" required type="number" min="0" step="0.0001" defaultValue={investment?.quantity ?? ''} placeholder="0" /></label><label>Current price<input name="current_price" required type="number" min="0" step="0.0001" defaultValue={currentPrice || ''} placeholder="0.00" /></label><label className="full-span">Price as of<input name="as_of_date" required type="date" defaultValue={investment?.latest_value_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={16} /> {investment ? 'Save changes' : 'Add holding'}</button></div></form></ModalShell>;
}

function SpendTrackerModal({ space, workspaces, countries, currencies, onClose, onSave }: { space: Space | null; workspaces: NettData['workspaces']; countries: CountryOption[]; currencies: string[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  const meta = space ? spendMetadata(space) : {};
  return <ModalShell title={space ? 'Edit spend tracker' : 'New spend tracker'} description="Give a car, business or trip its own ledger without affecting net worth." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><input type="hidden" name="workspace_id" value={space?.workspace_id || workspaces[0]?.id || ''} /><div className="form-grid"><label className="full-span">Name<input name="name" required autoFocus defaultValue={space?.name || ''} placeholder="Benz C300, studio, Japan trip…" /></label><label>Type<select name="tracker_type" defaultValue={space?.tracker_type || meta.trackerType || 'cost'}><option value="cost">Cost tracker</option><option value="business">Business tracker</option><option value="trip">Trip tracker</option></select></label><label>Currency<select name="currency" defaultValue={space?.currency || currencies[0] || 'AED'}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label><label className="full-span">Country<select name="country_code" defaultValue={space?.country_code || meta.countryCode || 'auto'}><option value="auto">Auto (by currency)</option>{countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="full-span">Notes (optional)<textarea name="notes" rows={3} defaultValue={meta.notes || ''} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={16} /> {space ? 'Save changes' : 'Create'}</button></div></form></ModalShell>;
}

function ReferenceAccountModal({ account, workspaces, currencies, countries, onClose, onSave, onDelete }: { account: Account | null; workspaces: NettData['workspaces']; currencies: string[]; countries: CountryOption[]; onClose: () => void; onSave: (form: HTMLFormElement) => void; onDelete: (account: Account) => void }) {
  return <ModalShell title={account ? 'Edit account' : 'Add account'} description="Save only the recognition details you need. Nett never asks for a full account number." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}>{account && <input type="hidden" name="id" value={account.id} />}<input type="hidden" name="workspace_id" value={account?.workspace_id || workspaces[0]?.id || ''} /><div className="form-grid"><label className="full-span">Account name<input name="name" required autoFocus defaultValue={account?.name || ''} placeholder="Wio Personal, SBI Lotus…" /></label><label className="full-span">Bank or institution <span className="field-hint">optional</span><input name="institution_name" defaultValue={account?.institution_name || ''} placeholder="Wio, SBI, Federal Bank…" /></label><label>Currency<select name="currency" defaultValue={account?.currency || currencies[0] || 'AED'}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label><label>Account kind<select name="type" defaultValue={account?.type || 'current'}><option value="current">Current</option><option value="savings">Savings</option><option value="investment">Investment</option><option value="credit_card">Credit</option><option value="other">Other</option></select></label><label>Ownership<select name="ownership_type" defaultValue={account?.ownership_type || 'personal'}><option value="personal">Personal</option><option value="business">Business</option></select></label><label>Last 4 digits<input name="account_last4" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" defaultValue={account?.account_last4 || ''} placeholder="1234" /></label><label>Country<select name="country_code" defaultValue={account?.country_code || countryForCurrency(account?.currency || 'AED')}>{countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Balance<input name="balance" required type="number" step="0.01" defaultValue={account?.estimated_balance ?? account?.verified_balance ?? ''} placeholder="0.00" /></label><label>Balance as of<input name="as_of_date" required type="date" defaultValue={account?.balance_verified_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)} /></label><label className="full-span">Logo image URL <span className="field-hint">optional</span><input name="logo_url" type="url" defaultValue={account?.logo_url || ''} placeholder="https://…" /></label><label className="check-row"><input type="checkbox" name="verified" value="true" defaultChecked={Boolean(account?.balance_verified_at) || !account} /> Balance is verified</label><label className="check-row"><input type="checkbox" name="include_net_worth" value="true" defaultChecked={account?.include_net_worth ?? true} /> Count in net worth</label><label className="check-row"><input type="checkbox" name="include_liquidity" value="true" defaultChecked={account?.include_liquidity ?? true} /> Available as liquid cash</label><label className="full-span">Notes <span className="field-hint">optional</span><textarea name="notes" rows={3} defaultValue={account?.notes || ''} /></label></div><div className="modal-actions">{account && <button type="button" className="danger-button account-delete-action" onClick={() => onDelete(account)}><Trash2 size={16} /> Delete</button>}<button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={16} /> {account ? 'Save changes' : 'Add account'}</button></div></form></ModalShell>;
}

function AccountModal({ account, card, workspaces, currencies = currencyOptions, countries = countryOptions, onClose, onSave, onDelete }: { account: Account | null; card: CreditCardRecord | null; workspaces: NettData['workspaces']; currencies?: string[]; countries?: typeof countryOptions; onClose: () => void; onSave: (form: HTMLFormElement) => void; onDelete: (account: Account) => void }) {
  return <ModalShell title={account ? 'Edit account' : 'Add an account'} description="Keep recognition details useful and private. Full account numbers never belong in Nett." onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}>
      {account && <input type="hidden" name="id" value={account.id} />}
      <div className="account-logo-editor"><AccountLogo account={account || { id: 'new', name: 'New account', institution_name: null, workspace_id: '', type: 'current', currency: 'AED', verified_balance: 0, include_net_worth: true, include_liquidity: true }} size={52} /><div><strong>{account ? 'Account identity' : 'Add a recognizable account'}</strong><p>Use a logo image URL if you have one, otherwise Nett uses initials.</p></div></div>
      <div className="form-grid">
        <label className="full-span">Account name<input name="name" required defaultValue={account?.name || ''} placeholder="Everyday AED" /></label>
        <label>Type<select name="type" defaultValue={account?.type || 'current'}><option value="current">Current account</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="wallet">Wallet</option><option value="business_bank">Business bank</option><option value="credit_card">Credit card</option></select></label>
        <label>Currency<select name="currency" defaultValue={account?.currency || 'AED'}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Bank / institution<input name="institution_name" defaultValue={account?.institution_name || ''} placeholder="Wio, Emirates NBD" /></label>
        <label>Last 4 digits<input name="account_last4" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" defaultValue={account?.account_last4 || ''} placeholder="1234" /></label>
        <label>Country<select name="country_code" defaultValue={account?.country_code || 'AE'}>{countries.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
        <label className="full-span">Logo image URL <span className="field-hint">optional</span><input name="logo_url" type="url" defaultValue={account?.logo_url || ''} placeholder="https://…/bank-logo.png" /></label>
        <label>Workspace<select name="workspace_id" defaultValue={account?.workspace_id || workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Verified balance<input name="balance" type="number" step="0.01" required defaultValue={account?.estimated_balance ?? account?.verified_balance ?? ''} placeholder="0.00" /></label>
        <label className="check-row"><input type="checkbox" name="include_net_worth" value="true" defaultChecked={account?.include_net_worth ?? true} /> Include in net worth</label>
        <label className="check-row"><input type="checkbox" name="include_liquidity" value="true" defaultChecked={account?.include_liquidity ?? true} /> Include in liquid cash</label>
      </div>
      <div className="card-form-section"><div><strong>Credit card details</strong><span>Fill these in for a card account so Nett can show utilisation and payment coverage.</span></div><div className="form-grid"><label>Credit limit<input name="credit_limit" type="number" min="0" step="0.01" defaultValue={card?.credit_limit ?? ''} placeholder="0.00" /></label><label>Current outstanding<input name="current_outstanding" type="number" min="0" step="0.01" defaultValue={card?.current_outstanding ?? ''} placeholder="0.00" /></label><label>Statement balance<input name="statement_balance" type="number" min="0" step="0.01" defaultValue={card?.statement_balance ?? ''} placeholder="0.00" /></label><label>Minimum payment<input name="minimum_payment" type="number" min="0" step="0.01" defaultValue={card?.minimum_payment ?? ''} placeholder="0.00" /></label><label>Statement date<input name="statement_date" type="date" defaultValue={card?.statement_date || ''} /></label><label>Payment due date<input name="payment_due_date" type="date" defaultValue={card?.payment_due_date || ''} /></label></div></div>
      <div className="modal-actions">{account && <button type="button" className="danger-button account-delete-action" onClick={() => onDelete(account)}><Trash2 size={15} /> Delete account</button>}<button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> {account ? 'Save changes' : 'Save account'}</button></div>
    </form>
  </ModalShell>;
}

function MoveAccountCountryModal({ account, countries = countryOptions, onClose, onSave }: { account: Account; countries?: typeof countryOptions; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  return <ModalShell title={`Move ${account.name}`} description="This changes the country used for net-worth and activity views. Existing activity linked to this account will follow the new country." onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}>
      <input type="hidden" name="account_id" value={account.id} />
      <div className="move-account-summary"><AccountLogo account={account} size={46} /><div><strong>{account.name}</strong><span>{account.country_code || 'AE'} · {account.currency}{account.account_last4 ? ` · •••• ${account.account_last4}` : ''}</span></div></div>
      <label>Move to<select name="country_code" defaultValue={account.country_code || 'AE'}>{countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <div className="form-message"><CircleHelp size={15} /> Linked expenses and history will appear under the new country after this change.</div>
      <div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><MoveRight size={15} /> Move account</button></div>
    </form>
  </ModalShell>;
}

function DeleteInvestmentModal({ item, onClose, onDelete }: { item: Investment; onClose: () => void; onDelete: () => void }) { return <ModalShell title={`Delete ${item.name || item.symbol}?`} description="This removes the holding and its saved valuations from Nett." onClose={onClose}><div className="delete-confirmation"><Trash2 size={22} /><strong>Delete this holding?</strong><span>Accounts and spend ledgers are not affected.</span></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep holding</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={16} /> Delete holding</button></div></ModalShell>; }

function CountryModal({ country, onClose, onSave }: { country: CountryConfig | null; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title={country ? 'Edit country' : 'Add country'} description="Add only the financial homes and currencies you actually use." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label>Country code<input name="code" required maxLength={2} defaultValue={country?.code || ''} placeholder="AE" /></label><label>Currency code<input name="currency" required maxLength={3} defaultValue={country?.currency || ''} placeholder="AED" /></label><label className="full-span">Country name<input name="name" required defaultValue={country?.name || ''} placeholder="United Arab Emirates" /></label><input type="hidden" name="sort_order" value={country?.sort_order || 0} /></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={16} /> Save country</button></div></form></ModalShell>; }

function DeleteCountryModal({ item, onClose, onDelete }: { item: CountryConfig; onClose: () => void; onDelete: () => void }) { return <ModalShell title={`Remove ${item.name}?`} description="Move linked records to another country before removing this option." onClose={onClose}><div className="delete-confirmation"><Trash2 size={22} /><strong>Remove this country?</strong><span>{item.code} · {item.currency}</span></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep country</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={16} /> Remove</button></div></ModalShell>; }

function SnapshotModal({ snapshot, rates, onClose, onSave }: { snapshot: Snapshot | null; rates: NettData['fxRates']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { const payload = snapshot?.payload || {}; return <ModalShell title={snapshot ? 'Edit snapshot' : 'Add snapshot'} description="Record the totals you reconciled for this month and the rates used." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Label<input name="label" defaultValue={snapshot?.label || ''} placeholder="August 2026" /></label><label className="full-span">Snapshot date<input name="snapshot_date" type="date" required defaultValue={snapshot?.snapshot_date || new Date().toISOString().slice(0, 10)} /></label><label>AED balance<input name="aed_amount" type="number" min="0" step="0.01" defaultValue={Number(payload.AED || 0)} /></label><label>INR balance<input name="inr_amount" type="number" min="0" step="0.01" defaultValue={Number(payload.INR || 0)} /></label><label>USD balance<input name="usd_amount" type="number" min="0" step="0.01" defaultValue={Number(payload.USD || 0)} /></label><label>1 INR in AED<input name="inr_to_aed" type="number" min="0.000001" step="0.000001" defaultValue={Number(payload.INR_AED || rateFor('INR', 'AED', rates))} /></label><label>1 USD in AED<input name="usd_to_aed" type="number" min="0.000001" step="0.000001" defaultValue={Number(payload.USD_AED || rateFor('USD', 'AED', rates))} /></label><label className="full-span">Notes<textarea name="notes" rows={3} defaultValue={String(payload.notes || '')} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={16} /> Save snapshot</button></div></form></ModalShell>; }

function DeleteSnapshotModal({ item, onClose, onDelete }: { item: Snapshot; onClose: () => void; onDelete: () => void }) { return <ModalShell title={`Delete ${item.label}?`} description="This removes only this saved point from your history." onClose={onClose}><div className="delete-confirmation"><Trash2 size={22} /><strong>Delete this snapshot?</strong><span>Live accounts and balances stay untouched.</span></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep snapshot</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={16} /> Delete snapshot</button></div></ModalShell>; }

function DeleteAccountModal({ account, onClose, onDelete }: { account: Account; onClose: () => void; onDelete: () => void }) {
  return <ModalShell title={`Delete ${account.name}?`} description="Remove this account from Nett permanently." onClose={onClose}>
    <div className="delete-confirmation"><Trash2 size={20} /><strong>This cannot be undone from the app.</strong><span>The account, linked transactions, balance snapshots and card details will be removed. Debts or receivables linked to it will remain, but their account link will be cleared.</span></div>
    <div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep account</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={15} /> Delete account</button></div>
  </ModalShell>;
}

function ReferenceTransactionModal({ transaction, defaultSpaceId, accounts, spaces, onClose, onSave }: { transaction: Transaction | null; defaultSpaceId: string | null; accounts: Account[]; spaces: Space[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  const initialSpaceId = transaction?.space_id || defaultSpaceId || spaces[0]?.id || '';
  const [spaceId, setSpaceId] = useState(initialSpaceId);
  const selectedSpace = spaces.find((item) => item.id === spaceId);
  const trackerType = selectedSpace?.tracker_type || (selectedSpace ? spendMetadata(selectedSpace).trackerType : 'cost') || 'cost';
  const categories = trackerType === 'business' ? ['Sales', 'Client payment', 'Software', 'Marketing', 'Contractor', 'Office', 'Tax', 'Other'] : trackerType === 'trip' ? ['Flights', 'Hotel', 'Food', 'Transport', 'Activities', 'Shopping', 'Refund', 'Other'] : ['Fuel', 'Parking', 'Maintenance', 'Insurance', 'Purchase', 'Fees', 'Cashback', 'Other'];
  const localDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const defaultCurrency = transaction?.currency || selectedSpace?.currency || accounts[0]?.currency || 'AED';
  return <ModalShell title={transaction ? 'Edit entry' : 'Add entry'} description={selectedSpace ? `Keep this entry inside ${selectedSpace.name}.` : 'Log one actual income or expense.'} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid">{spaces.length > 0 && <label className="full-span">Tracker<select name="space_id" value={spaceId} onChange={(event) => setSpaceId(event.target.value)}><option value="">No tracker</option>{spaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<label>Direction<select name="type" defaultValue={transaction?.type === 'credit' ? 'credit' : 'debit'}><option value="debit">{trackerType === 'business' ? 'Expense' : 'Spend'}</option><option value="credit">{trackerType === 'business' ? 'Income' : 'Cashback / refund'}</option></select></label><label>Amount<input required autoFocus name="amount" type="number" min="0.01" step="0.01" defaultValue={transaction?.amount ?? ''} placeholder="0.00" /></label><label>Currency<select name="currency" defaultValue={defaultCurrency}>{currencyOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Account <span className="field-hint">optional</span><select name="account_id" defaultValue={transaction?.account_id || ''}><option value="">Do not change an account balance</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label><label>Date<input name="occurred_at" type="date" defaultValue={localDate(transaction?.occurred_at)} /></label><label>Category<input name="category" list="nett-spend-categories" required defaultValue={transaction?.category || ''} placeholder="Choose or type" /><datalist id="nett-spend-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist></label><label className="full-span">Note <span className="field-hint">optional</span><input name="description" defaultValue={transaction?.description || ''} placeholder="A little context for future you" /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={16} /> {transaction ? 'Save changes' : 'Add entry'}</button></div></form></ModalShell>;
}

function TransactionModalV3({ transaction, defaultSpaceId, accounts, spaces, onClose, onSave }: { transaction: Transaction | null; defaultSpaceId: string | null; accounts: Account[]; spaces: Space[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  const localDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
  return <ModalShell title={transaction ? 'Edit ledger entry' : 'Add ledger entry'} description={transaction ? 'Update this entry without losing its place in the selected pot.' : 'Completed spending or income belongs here. Future or recurring costs belong in Bills.'} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label>Type<select name="type" defaultValue={transaction?.type || 'debit'}><option value="debit">Debit / expense</option><option value="credit">Credit / income</option><option value="adjustment">Balance adjustment</option></select></label><label>Amount<input required name="amount" type="number" min="0.01" step="0.01" defaultValue={transaction?.amount ?? ''} placeholder="0.00" /></label><label>Currency<select name="currency" defaultValue={transaction?.currency || accounts[0]?.currency || 'AED'}><option>AED</option><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label>Account<select name="account_id" required defaultValue={transaction?.account_id || accounts[0]?.id}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label><label>Date<input name="occurred_at" type="datetime-local" defaultValue={localDate(transaction?.occurred_at)} /></label><label>Pot<select name="space_id" defaultValue={transaction?.space_id || defaultSpaceId || ''}><option value="">No pot</option>{spaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="full-span">Category<input name="category" required defaultValue={transaction?.category || ''} placeholder="Groceries, salary, transport…" /></label><label className="full-span">Note (optional)<input name="description" defaultValue={transaction?.description || ''} placeholder="A little context for future you" /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> {transaction ? 'Save changes' : 'Add entry'}</button></div></form></ModalShell>;
}

function TransactionModalV2({ accounts, spaces, onClose, onSave }: { accounts: Account[]; spaces: Space[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <TransactionModalV3 transaction={null} defaultSpaceId={null} accounts={accounts} spaces={spaces} onClose={onClose} onSave={onSave} />; }

function TransactionModal({ accounts, onClose, onSave }: { accounts: Account[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <TransactionModalV2 accounts={accounts} spaces={[]} onClose={onClose} onSave={onSave} />; }

function CheckInModal({ accounts, onClose, onSave }: { accounts: Account[]; onClose: () => void; onSave: (balances: Record<string, number>) => void }) { const [balances, setBalances] = useState<Record<string, number>>(() => Object.fromEntries(accounts.map((item) => [item.id, Number(item.verified_balance)]))); return <ModalShell title="Monthly check-in" description="Verify the balances that shape your reality. No transactions required." onClose={onClose}><div className="status-chip good" style={{ marginBottom: 17 }}><ShieldCheck size={13} /> Saved as an immutable snapshot after confirmation</div><div style={{ display: 'grid', gap: 11 }}>{accounts.map((account) => <label key={account.id}>{account.name} · {account.currency}<input type="number" step="0.01" value={balances[account.id]} onChange={(event) => setBalances((current) => ({ ...current, [account.id]: Number(event.target.value) }))} /></label>)}</div><div className="modal-actions"><button className="soft-button" onClick={onClose}>Later</button><button className="primary-button" onClick={() => onSave(balances)}><Check size={15} /> Confirm check-in</button></div></ModalShell>; }

function WhatIfModal({ safeToSpend, whatIf, setWhatIf, onClose, onRun }: { safeToSpend: number; whatIf: string; setWhatIf: (value: string) => void; onClose: () => void; onRun: () => void }) { return <ModalShell title="What If" description="Try a future decision without touching live data." onClose={onClose}><label>Hypothetical expense<input autoFocus type="number" value={whatIf} onChange={(event) => setWhatIf(event.target.value)} /></label><div style={{ padding: 15, marginTop: 14, borderRadius: 15, background: '#faf5fd', color: '#7e5b87', fontSize: 12 }}>Current Safe to Spend: <strong>{formatCurrency(safeToSpend)}</strong><br /><span style={{ display: 'block', marginTop: 4, opacity: .75 }}>The scenario will only be kept in this session.</span></div><div className="modal-actions"><button className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button gradient" onClick={onRun}><Sparkles size={15} /> See impact</button></div></ModalShell>; }

function CommitmentModalV2({ workspaces, onClose, onSave }: { workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Add a commitment" description="Use this for future, recurring or expected money—not an already completed expense." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Name<input name="name" required placeholder="Rent, insurance, renewal, salary…" /></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00" /></label><label>Currency<select name="currency" defaultValue="AED"><option>AED</option><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label>First due date<input name="due_date" required type="date" /></label><label>Importance<select name="importance" defaultValue="mandatory"><option value="mandatory">Mandatory</option><option value="planned">Planned</option><option value="optional">Optional</option></select></label><label>Recurrence<select name="recurrence" defaultValue="one_time"><option value="one_time">One time</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label><label>Confidence<select name="confidence" defaultValue="confirmed"><option value="confirmed">Confirmed</option><option value="likely">Likely</option><option value="possible">Possible</option></select></label><label>Country<select name="country_code" defaultValue="AE"><option value="AE">UAE</option><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option></select></label><label>Workspace<select name="workspace_id" defaultValue={workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="check-row"><input type="checkbox" name="expected_income" value="true" /> Expected income</label><label className="full-span">Notes<textarea name="notes" rows={2} placeholder="Optional context or payment rule" /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save commitment</button></div></form></ModalShell>; }

function CommitmentEditorModal({ commitment, workspaces, onClose, onSave }: { commitment: Commitment | null; workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title={commitment ? 'Edit commitment' : 'Add a commitment'} description="Keep future and recurring obligations visible before they become surprises." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Name<input name="name" required defaultValue={commitment?.name || ''} placeholder="Rent, insurance, renewal, salary..." /></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={commitment?.amount ?? ''} /></label><label>Currency<select name="currency" defaultValue={commitment?.currency || 'AED'}><option>AED</option><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label>First due date<input name="due_date" required type="date" defaultValue={commitment?.due_date || ''} /></label><label>Importance<select name="importance" defaultValue={commitment?.importance || 'mandatory'}><option value="mandatory">Mandatory</option><option value="planned">Planned</option><option value="optional">Optional</option></select></label><label>Recurrence<select name="recurrence" defaultValue={commitment?.recurrence || 'one_time'}><option value="one_time">One time</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label><label>Confidence<select name="confidence" defaultValue={commitment?.confidence || 'confirmed'}><option value="confirmed">Confirmed</option><option value="likely">Likely</option><option value="possible">Possible</option></select></label><label>Country<select name="country_code" defaultValue={commitment?.country_code || 'AE'}><option value="AE">UAE</option><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option></select></label><label>Workspace<select name="workspace_id" defaultValue={commitment?.workspace_id || workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="check-row"><input type="checkbox" name="expected_income" value="true" defaultChecked={commitment?.expected_income || false} /> Expected income</label><label className="full-span">Notes<textarea name="notes" rows={2} defaultValue={commitment?.notes || ''} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> {commitment ? 'Save changes' : 'Save commitment'}</button></div></form></ModalShell>; }

function CommitmentModal({ workspaces, onClose, onSave }: { workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <CommitmentEditorModal commitment={null} workspaces={workspaces} onClose={onClose} onSave={onSave} />; }

function DebtModal({ debts, accounts, onClose, onSave }: { debts: Debt[]; accounts: Account[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Update a debt" description="Borrow more or record any repayment—your outstanding amount stays persisted." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Debt<select name="debt_id" required defaultValue={debts[0]?.id}>{debts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency} · {formatCurrency(Number(item.outstanding), item.currency)}</option>)}</select></label><label>Event<select name="event_type" defaultValue="repayment"><option value="repayment">Repayment</option><option value="borrowing">Additional borrowing</option></select></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00" /></label><label>Source account<select name="source_account_id" defaultValue=""><option value="">Do not link an account</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label><label className="full-span">Note<input name="note" placeholder="Optional context for your history" /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save debt event</button></div></form></ModalShell>; }

function ReceivableModalV2({ workspaces, onClose, onSave }: { workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Add a receivable" description="Track money owed to you without mistaking it for available cash." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Who owes you?<input name="contact_name" required placeholder="Dad, Alina, client name…" /></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00" /></label><label>Currency<select name="currency" defaultValue="AED"><option>AED</option><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label>Expected date<input name="expected_on" type="date" /></label><label>Confidence<select name="confidence" defaultValue="confirmed"><option value="confirmed">Confirmed</option><option value="likely">Likely</option><option value="uncertain">Uncertain</option></select></label><label>Country<select name="country_code" defaultValue="AE"><option value="AE">UAE</option><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option></select></label><label>Workspace<select name="workspace_id" defaultValue={workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="check-row"><input type="checkbox" name="include_in_net_worth" value="true" /> Include in net worth</label><label className="full-span">Notes<textarea name="notes" rows={2} placeholder="Optional repayment context" /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save receivable</button></div></form></ModalShell>; }

function ReceivableModal({ workspaces, onClose, onSave }: { workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ReceivableModalV2 workspaces={workspaces} onClose={onClose} onSave={onSave} />; }

function InvestmentModal({ workspaces, onClose, onSave }: { workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Add a holding" description="Manual values keep your portfolio useful even without a quote provider." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label>Symbol<input name="symbol" required placeholder="NVDA" /></label><label>Exchange<input name="exchange" placeholder="NASDAQ" /></label><label className="full-span">Name<input name="name" placeholder="Company or fund name" /></label><label>Quantity<input name="quantity" required type="number" min="0" step="0.0001" placeholder="0" /></label><label>Average cost<input name="average_cost" required type="number" min="0" step="0.01" placeholder="0" /></label><label>Current value<input name="value" required type="number" min="0" step="0.01" placeholder="0" /></label><label>Currency<select name="currency" defaultValue="USD"><option>AED</option><option>INR</option><option>USD</option></select></label><label>Workspace<select name="workspace_id" defaultValue={workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save holding</button></div></form></ModalShell>; }

function ImportModalV2({ workspaces, onClose, onImport }: { workspaces: NettData['workspaces']; onClose: () => void; onImport: (items: Account[]) => void | Promise<void> }) { const [fileName, setFileName] = useState(''); const [items, setItems] = useState<Account[]>([]); async function readFile(file: File) { let rows: Array<Record<string, unknown>> = []; if (file.name.toLowerCase().endsWith('.xlsx')) { const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const firstSheet = workbook.Sheets[workbook.SheetNames[0]]; rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' }); } else { const text = await file.text(); const [header, ...lines] = text.trim().split(/\r?\n/); const headers = header.split(',').map((item) => item.trim().toLowerCase()); rows = lines.filter(Boolean).map((line) => { const cells = line.split(',').map((item) => item.trim().replace(/^"|"$/g, '')); return Object.fromEntries(headers.map((key, index) => [key, cells[index] || ''])); }); } const parsed = rows.map((row) => { const get = (key: string, fallback = '') => String(row[key] ?? row[key.replace('_', ' ')] ?? fallback); const balance = Number(get('balance', '0')); return { id: crypto.randomUUID(), workspace_id: workspaces[0]?.id || '', name: get('name', 'Imported account'), type: get('type', 'current'), currency: get('currency', 'AED').toUpperCase(), verified_balance: Number.isFinite(balance) ? balance : 0, estimated_balance: Number.isFinite(balance) ? balance : 0, balance_verified_at: new Date().toISOString(), include_net_worth: true, include_liquidity: true, institution_name: get('institution_name') || null, account_last4: get('account_last4') || null, country_code: get('country_code', 'AE') } as Account; }); setFileName(file.name); setItems(parsed); } return <ModalShell title="Import accounts" description="Preview CSV or XLSX account rows before committing them." onClose={onClose}><label>Spreadsheet file<input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); }} /></label>{fileName && <div className="form-message"><Check size={16} /> {fileName} · {items.length} rows ready for review.</div>}<div className="modal-actions"><button className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!items.length || !workspaces.length} onClick={() => void onImport(items)}><Upload size={15} /> Import and save</button></div></ModalShell>; }

function ImportModal({ workspaces, onClose, onImport }: { workspaces: NettData['workspaces']; onClose: () => void; onImport: (items: Account[]) => void | Promise<void> }) { return <ImportModalV2 workspaces={workspaces} onClose={onClose} onImport={onImport} />; }

function LoanEditorModal({ debt, receivable, workspaces, countries, currencies, onClose, onSave }: { debt: Debt | null; receivable: Receivable | null; workspaces: NettData['workspaces']; countries: CountryOption[]; currencies: string[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  const item = debt || receivable;
  const meta = item ? loanMetadata(item) : {};
  const direction = receivable ? 'owed_to_me' : 'i_owe';
  const editing = Boolean(item);
  const principal = debt?.original_principal ?? receivable?.amount ?? '';
  const includeInNetWorth = receivable ? receivable.include_in_net_worth : meta.includeInNetWorth !== false;
  return <ModalShell title={editing ? 'Edit loan' : 'Add loan'} description="Track money you owe or money owed to you with the same clear flow." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><input type="hidden" name="workspace_id" value={item?.workspace_id || workspaces[0]?.id || ''} />{editing && <input type="hidden" name="direction" value={direction} />}<div className="form-grid"><label className="full-span">Loan title<input name="title" required defaultValue={meta.title || debt?.name || ''} placeholder="e.g. Car loan, SupplyBridge" /></label><label className="full-span">Who<input name="who" required defaultValue={meta.who || receivable?.contact_name || ''} placeholder="e.g. Dad, Ahmed" /></label><label>Direction<select name={editing ? undefined : 'direction'} disabled={editing} defaultValue={direction}><option value="i_owe">I owe them</option><option value="owed_to_me">They owe me</option></select></label><label>Currency<select name="currency" defaultValue={item?.currency || currencies[0] || 'AED'}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label><label className="full-span">Principal amount<input name="principal" required type="number" min="0.01" step="0.01" defaultValue={principal} placeholder="0.00" /></label><label className="full-span">Country<select name="country_code" defaultValue={editing ? item?.country_code || countryForCurrency(item?.currency || 'AED') : 'auto'}><option value="auto">Auto (by currency)</option>{countries.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}</select></label><label className="check-row full-span"><input type="checkbox" name="include_in_net_worth" value="true" defaultChecked={includeInNetWorth} /> Count in net worth</label><label className="full-span">Description (optional)<textarea name="description" rows={3} defaultValue={meta.description || ''} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> {editing ? 'Save changes' : 'Add'}</button></div></form></ModalShell>;
}

function DebtEditorModal({ debt, workspaces, onClose, onSave }: { debt: Debt | null; workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title={debt ? 'Edit debt or loan' : 'Add a debt or loan'} description="Track what you owe, whether it is a formal loan or a flexible IOU." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Name<input name="name" required defaultValue={debt?.name || ''} placeholder="Car loan, family IOU..." /></label><label>Type<select name="debt_class" defaultValue={debt?.debt_class || 'mandatory'}><option value="mandatory">Mandatory loan</option><option value="flexible">Flexible IOU</option></select></label><label>Currency<select name="currency" defaultValue={debt?.currency || 'AED'}><option>AED</option><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label>Original principal<input name="original_principal" required type="number" min="0.01" step="0.01" defaultValue={debt?.original_principal ?? ''} /></label><label>Current outstanding<input name="outstanding" required type="number" min="0" step="0.01" defaultValue={debt?.outstanding ?? ''} /></label><label>Comfortable payment<input name="comfortable_target" type="number" min="0" step="0.01" defaultValue={debt?.comfortable_target ?? ''} /></label><label>Next due date<input name="due_date" type="date" defaultValue={debt?.due_date || ''} /></label><label>Country<select name="country_code" defaultValue={debt?.country_code || 'AE'}><option value="AE">UAE</option><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option></select></label><label>Workspace<select name="workspace_id" required defaultValue={debt?.workspace_id || workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="full-span">Notes<textarea name="notes" rows={3} defaultValue={debt?.notes || ''} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> {debt ? 'Save changes' : 'Add debt'}</button></div></form></ModalShell>; }

function DebtCreateModal({ workspaces, onClose, onSave }: { workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <DebtEditorModal debt={null} workspaces={workspaces} onClose={onClose} onSave={onSave} />; }

function TransferModal({ accounts, onClose, onSave }: { accounts: Account[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Move money" description="Record both sides of a transfer, including cross-currency conversion and fees." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label>From account<select name="source_account_id" required defaultValue={accounts[0]?.id}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label><label>To account<select name="destination_account_id" required defaultValue={accounts[1]?.id || accounts[0]?.id}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label><label>Amount sent<input name="source_amount" required type="number" min="0.01" step="0.01" placeholder="0.00" /></label><label>Amount received<input name="destination_amount" required type="number" min="0.01" step="0.01" placeholder="Same if no conversion" /></label><label>Fee<input name="fee" type="number" min="0" step="0.01" defaultValue="0" /></label><label className="full-span">Description<input name="description" placeholder="Move to savings, exchange, rent…" /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><MoveRight size={15} /> Save transfer</button></div></form></ModalShell>; }

function ReceivableEventModal({ receivables, accounts, onClose, onSave }: { receivables: Receivable[]; accounts: Account[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Record money received" description="Partial payments reduce the receivable and can credit an account." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Receivable<select name="receivable_id" required defaultValue={receivables[0]?.id}>{receivables.map((item) => <option key={item.id} value={item.id}>{item.contact_name} · {formatCurrency(Number(item.outstanding), item.currency)}</option>)}</select></label><label>Amount received<input name="amount" required type="number" min="0.01" step="0.01" /></label><label>Deposit into<select name="destination_account_id" defaultValue=""><option value="">Do not link an account</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label><label className="full-span">Note<input name="note" placeholder="Partial payment, settlement…" /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Save payment</button></div></form></ModalShell>; }

function ReceivablePaymentModal({ receivables, defaultReceivableId, onClose, onSave }: { receivables: Receivable[]; defaultReceivableId: string | null; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  const selected = receivables.find((item) => item.id === defaultReceivableId) || receivables[0];
  return <ModalShell title="Log payment" description="Record money paid back to you and reduce the remaining balance." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><input type="hidden" name="receivable_id" value={selected?.id || ''} /><div className="form-grid"><label className="full-span">Amount ({selected?.currency || ''})<input name="amount" required autoFocus type="number" min="0.01" max={Number(selected?.outstanding || 0)} step="0.01" placeholder="0.00" /></label><label className="full-span">Note (optional)<input name="note" placeholder="Partial payment, settlement…" /></label><label className="full-span">Date<input name="occurred_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> Log payment</button></div></form></ModalShell>;
}

function ReserveModal({ workspaces, onClose, onSave }: { workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="Add a reserve" description="Protect money for a future goal without counting it twice in net worth." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Reserve name<input name="name" required placeholder="Car maintenance, taxes…" /></label><label>Target amount<input name="target_amount" required type="number" min="0.01" step="0.01" /></label><label>Already funded<input name="funded_amount" type="number" min="0" step="0.01" defaultValue="0" /></label><label>Currency<select name="currency" defaultValue="AED"><option>AED</option><option>INR</option><option>USD</option></select></label><label>Due date<input name="due_date" type="date" /></label><label>Workspace<select name="workspace_id" required defaultValue={workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Target size={15} /> Add reserve</button></div></form></ModalShell>; }

function WorkspaceModal({ onClose, onSave }: { onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title="New workspace" description="Keep personal and business money separate while retaining one total view." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Workspace name<input name="name" required placeholder="Freelance studio" /></label><label className="full-span">Type<select name="kind" defaultValue="business"><option value="business">Business</option><option value="personal">Personal</option><option value="other">Other</option></select></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><BriefcaseBusiness size={15} /> Create workspace</button></div></form></ModalShell>; }

function SpaceModal({ space, workspaces, onClose, onSave }: { space: Space | null; workspaces: NettData['workspaces']; onClose: () => void; onSave: (form: HTMLFormElement) => void }) { return <ModalShell title={space ? 'Edit Space' : 'Create a Space'} description="Give a goal or budget its own calm mini-ledger." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Name<input name="name" required defaultValue={space?.name || ''} placeholder="Holiday, rent, tax buffer…" /></label><label>Budget<input name="budget" type="number" min="0" step="0.01" defaultValue={space?.budget ?? ''} /></label><label>Allocated<input name="allocation" type="number" min="0" step="0.01" defaultValue={space?.allocation ?? ''} /></label><label>Currency<select name="currency" defaultValue={space?.currency || 'AED'}><option>AED</option><option>INR</option><option>USD</option></select></label><label>Colour<input name="color" type="color" defaultValue={space?.color || '#ff8dc7'} /></label><label>Workspace<select name="workspace_id" required defaultValue={space?.workspace_id || workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="full-span">Notes<textarea name="notes" rows={2} defaultValue={space?.notes || ''} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Target size={15} /> {space ? 'Save changes' : 'Create Space'}</button></div></form></ModalShell>; }

function PotEditorModal({ space, workspaces, countries, currencies, onClose, onSave }: { space: Space | null; workspaces: NettData['workspaces']; countries: CountryOption[]; currencies: string[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  const meta = space ? potMetadata(space) : {};
  return <ModalShell title={space ? 'Edit pot' : 'New pot'} description="Keep one loan and every repayment in the same focused ledger." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><input type="hidden" name="workspace_id" value={space?.workspace_id || workspaces[0]?.id || ''} /><div className="form-grid"><label className="full-span">Pot name<input name="name" required defaultValue={space?.name || ''} placeholder="e.g. Car loan from Dad" /></label><label>Currency<select name="currency" defaultValue={space?.currency || currencies[0] || 'AED'}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label><label>Loan amount<input name="loan_amount" required type="number" min="0.01" step="0.01" defaultValue={space?.budget ?? ''} placeholder="0.00" /></label><label className="full-span">Country<select name="country_code" defaultValue={space ? meta.countryCode || countryForCurrency(space.currency) : 'auto'}><option value="auto">Auto (by currency)</option>{countries.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}</select></label><label className="full-span">Notes (optional)<textarea name="notes" rows={3} defaultValue={meta.notes || ''} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Target size={15} /> {space ? 'Save changes' : 'Create'}</button></div></form></ModalShell>;
}

function PotEventModal({ space, eventType, onClose, onSave }: { space: Space; eventType: 'borrowing' | 'repayment'; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  const borrowing = eventType === 'borrowing';
  return <ModalShell title={borrowing ? 'Add to loan' : 'Log payment'} description={borrowing ? 'Increase this loan when you borrow more for the same purpose.' : 'Record a repayment and move the progress forward.'} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Amount ({space.currency})<input name="amount" required autoFocus type="number" min="0.01" step="0.01" placeholder="0.00" /></label><label className="full-span">{borrowing ? 'What was it for' : 'Note (optional)'}<input name="note" placeholder={borrowing ? 'e.g. Car repair' : 'Optional'} /></label><label className="full-span">Date<input name="occurred_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={15} /> {borrowing ? 'Add to loan' : 'Log payment'}</button></div></form></ModalShell>;
}

function DeleteSpaceModal({ space, onClose, onDelete }: { space: Space; onClose: () => void; onDelete: () => void }) { return <ModalShell title={`Delete ${space.name}?`} description="Transactions linked to this Space will stay in your activity history, but the Space itself will be removed from your plan." onClose={onClose}><div className="delete-confirmation"><Trash2 size={20} /><strong>This cannot be undone from the app.</strong><span>Your account data remains private and only this Space is archived.</span></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep Space</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={15} /> Delete Space</button></div></ModalShell>; }

function DeleteTransactionModal({ item, onClose, onDelete }: { item: Transaction; onClose: () => void; onDelete: () => void }) { return <ModalShell title="Delete this ledger entry?" description="The entry will be removed and its linked account estimate will be restored." onClose={onClose}><div className="delete-confirmation"><Trash2 size={20} /><strong>{item.category || item.description || 'Ledger entry'}</strong><span>{formatCurrency(Number(item.amount), item.currency)} · {formatShortDate(item.occurred_at)}</span></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep entry</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={15} /> Delete entry</button></div></ModalShell>; }

function DeleteCommitmentModal({ item, onClose, onDelete }: { item: Commitment; onClose: () => void; onDelete: () => void }) { return <ModalShell title={`Delete ${item.name}?`} description="This removes the future commitment from your plan and Safe to Spend calculations." onClose={onClose}><div className="delete-confirmation"><Trash2 size={20} /><strong>Delete this commitment?</strong><span>It will be removed from your signed-in Nett account.</span></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep commitment</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={15} /> Delete commitment</button></div></ModalShell>; }

function ReferenceForecastScenarioModal({ scenario, workspaces, countries, currencies, onClose, onSave }: { scenario: ForecastScenario | null; workspaces: NettData['workspaces']; countries: CountryOption[]; currencies: string[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  return <ModalShell title={scenario ? 'Edit scenario' : 'Add scenario'} description="Test a purchase, debt or income change without touching live balances." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><input type="hidden" name="workspace_id" value={scenario?.workspace_id || workspaces[0]?.id || ''} /><div className="form-grid"><label className="full-span">Scenario name<input name="name" required autoFocus defaultValue={scenario?.name || ''} placeholder="Buy a phone, new retainer…" /></label><label>Type<select name="kind" defaultValue={scenario?.kind || 'expense'}><option value="expense">Expense</option><option value="income">Income</option><option value="debt">New debt</option></select></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={scenario?.amount ?? ''} placeholder="0.00" /></label><label>Currency<select name="currency" defaultValue={scenario?.currency || currencies[0] || 'AED'}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label><label>Starts<select name="month_offset" defaultValue={scenario?.month_offset ?? 1}><option value="0">This month</option><option value="1">In 1 month</option><option value="2">In 2 months</option><option value="3">In 3 months</option><option value="6">In 6 months</option><option value="12">In 12 months</option><option value="24">In 24 months</option></select></label><label>Pattern<select name="recurrence" defaultValue={scenario?.recurrence || 'one_time'}><option value="one_time">One time</option><option value="recurring">Recurring monthly</option></select></label><label>Duration <span className="field-hint">months, optional</span><input name="duration_months" type="number" min="1" max="60" defaultValue={scenario?.duration_months || ''} placeholder="Until horizon" /></label><label>Country<select name="country_code" defaultValue={scenario?.country_code || 'AE'}>{countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="check-row"><input type="checkbox" name="active" value="true" defaultChecked={scenario?.active !== false} /> Active in forecast</label><label className="full-span">Notes <span className="field-hint">optional</span><textarea name="notes" rows={3} defaultValue={scenario?.notes || ''} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Sparkles size={16} /> {scenario ? 'Save changes' : 'Add scenario'}</button></div></form></ModalShell>;
}

function ReferenceBudgetLineModal({ line, workspaces, countries, currencies, month, onClose, onSave }: { line: BudgetLine | null; workspaces: NettData['workspaces']; countries: CountryOption[]; currencies: string[]; month: string; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  return <ModalShell title={line ? 'Edit planned line' : 'Add planned line'} description="Plan one expected income or expense and optionally carry it into future months." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><input type="hidden" name="workspace_id" value={line?.workspace_id || workspaces[0]?.id || ''} /><div className="form-grid"><label className="full-span">Name<input name="name" required autoFocus defaultValue={line?.name || ''} placeholder="Salary, rent, groceries…" /></label><label>Type<select name="kind" defaultValue={line?.kind || 'expense'}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Category<input name="category" defaultValue={line?.category || ''} placeholder="Housing, food, business…" /></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={line?.amount ?? ''} placeholder="0.00" /></label><label>Currency<select name="currency" defaultValue={line?.currency || currencies[0] || 'AED'}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label><label>Month<input name="month" required type="month" defaultValue={line?.month?.slice(0, 7) || month} /></label><label>Country<select name="country_code" defaultValue={line?.country_code || 'AE'}>{countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="check-row full-span"><input type="checkbox" name="is_template" value="true" defaultChecked={line?.is_template !== false} /> Use this planned line in every month</label><label className="full-span">Notes <span className="field-hint">optional</span><textarea name="notes" rows={3} defaultValue={line?.notes || ''} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={16} /> {line ? 'Save changes' : 'Add planned line'}</button></div></form></ModalShell>;
}

function ForecastScenarioModal({ scenario, workspaces, countries, currencies, onClose, onSave }: { scenario: ForecastScenario | null; workspaces: NettData['workspaces']; countries: CountryOption[]; currencies: string[]; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  return <ModalShell title={scenario ? 'Edit scenario' : 'Add scenario'} description="Test a decision without changing saved balances or activity." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Scenario name<input name="name" required defaultValue={scenario?.name || ''} placeholder="Buy a phone, new client retainer…" /></label><label>Type<select name="kind" defaultValue={scenario?.kind || 'expense'}><option value="expense">Expense</option><option value="income">Income</option><option value="debt">New debt</option></select></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={scenario?.amount ?? ''} placeholder="4000" /></label><label>Currency<select name="currency" defaultValue={scenario?.currency || currencies[0] || 'AED'}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label><label>When<select name="month_offset" defaultValue={scenario?.month_offset ?? 1}><option value="0">This month</option><option value="1">In 1 month</option><option value="2">In 2 months</option><option value="3">In 3 months</option><option value="6">In 6 months</option><option value="12">In 12 months</option></select></label><label>Country<select name="country_code" defaultValue={scenario?.country_code || 'AE'}>{countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Workspace<select name="workspace_id" defaultValue={scenario?.workspace_id || workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="full-span">Notes (optional)<textarea name="notes" rows={2} defaultValue={scenario?.notes || ''} placeholder="What are you testing?" /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Sparkles size={15} /> {scenario ? 'Save changes' : 'Add scenario'}</button></div></form></ModalShell>;
}

function DeleteForecastScenarioModal({ item, onClose, onDelete }: { item: ForecastScenario; onClose: () => void; onDelete: () => void }) { return <ModalShell title={`Delete ${item.name}?`} description="This removes the scenario from your forecast only. Live data is not changed." onClose={onClose}><div className="delete-confirmation"><Trash2 size={20} /><strong>Delete this scenario?</strong><span>Your balances and ledger remain untouched.</span></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep scenario</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={15} /> Delete scenario</button></div></ModalShell>; }

function BudgetLineModal({ line, workspaces, countries, currencies, month, onClose, onSave }: { line: BudgetLine | null; workspaces: NettData['workspaces']; countries: CountryOption[]; currencies: string[]; month: string; onClose: () => void; onSave: (form: HTMLFormElement) => void }) {
  return <ModalShell title={line ? 'Edit planned line' : 'Plan a budget line'} description="Keep an expected income or expense visible for this month." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><div className="form-grid"><label className="full-span">Name<input name="name" required defaultValue={line?.name || ''} placeholder="Rent, salary, groceries…" /></label><label>Type<select name="kind" defaultValue={line?.kind || 'expense'}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={line?.amount ?? ''} placeholder="0.00" /></label><label>Currency<select name="currency" defaultValue={line?.currency || currencies[0] || 'AED'}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label><label>Month<input name="month" required type="month" defaultValue={line?.month?.slice(0, 7) || month} /></label><label>Category<input name="category" defaultValue={line?.category || ''} placeholder="Housing, food, business…" /></label><label>Country<select name="country_code" defaultValue={line?.country_code || 'AE'}>{countries.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Workspace<select name="workspace_id" defaultValue={line?.workspace_id || workspaces[0]?.id}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="full-span">Notes (optional)<textarea name="notes" rows={2} defaultValue={line?.notes || ''} /></label></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="primary-button"><Target size={15} /> {line ? 'Save changes' : 'Add planned line'}</button></div></form></ModalShell>;
}

function DeleteBudgetLineModal({ item, onClose, onDelete }: { item: BudgetLine; onClose: () => void; onDelete: () => void }) { return <ModalShell title={`Delete ${item.name}?`} description="This removes the planned amount from the selected month. Actual transactions are not removed." onClose={onClose}><div className="delete-confirmation"><Trash2 size={20} /><strong>Delete this planned line?</strong><span>Your activity ledger and account balances remain unchanged.</span></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep line</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={15} /> Delete planned line</button></div></ModalShell>; }

function DeleteDebtModal({ item, onClose, onDelete }: { item: Debt; onClose: () => void; onDelete: () => void }) { return <ModalShell title={`Delete ${item.name}?`} description="This removes the debt from your plan and net-worth calculations." onClose={onClose}><div className="delete-confirmation"><Trash2 size={20} /><strong>Delete this debt?</strong><span>Existing account activity is not removed.</span></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep debt</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={15} /> Delete debt</button></div></ModalShell>; }

function DeleteReceivableModal({ item, onClose, onDelete }: { item: Receivable; onClose: () => void; onDelete: () => void }) { const title = loanMetadata(item).title || item.contact_name; return <ModalShell title={`Delete ${title}?`} description="This removes the money owed to you from Loans and net-worth calculations." onClose={onClose}><div className="delete-confirmation"><Trash2 size={20} /><strong>Delete this loan?</strong><span>Existing account activity is not removed.</span></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep loan</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={15} /> Delete loan</button></div></ModalShell>; }

function DeleteDebtEventModal({ item, onClose, onDelete }: { item: DebtEvent; onClose: () => void; onDelete: () => void }) { return <ModalShell title="Delete this loan entry?" description="The loan balance and linked account estimate will be recalculated." onClose={onClose}><div className="delete-confirmation"><Trash2 size={20} /><strong>{item.note || (item.event_type === 'borrowing' ? 'Additional borrowing' : 'Repayment')}</strong><span>{formatCurrency(Number(item.amount), item.currency)} · {formatShortDate(item.occurred_at)}</span></div><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Keep entry</button><button type="button" className="danger-button" onClick={onDelete}><Trash2 size={15} /> Delete entry</button></div></ModalShell>; }

function urlBase64ToUint8Array(base64String: string) { const padding = '='.repeat((4 - base64String.length % 4) % 4); const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/'); const rawData = window.atob(base64); return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0))); }
