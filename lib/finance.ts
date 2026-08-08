import Decimal from 'decimal.js';
import type { Account, Commitment, Debt, FinanceMetrics, FxRates, Investment, Receivable, Reserve } from './types';

const money = (value: number | string | Decimal | null | undefined) => new Decimal(value ?? 0);

export function convertAmount(value: number | string | Decimal, from: string, to: string, rates: FxRates = {}) {
  if (from === to) return money(value);
  const direct = rates[`${from}_${to}`];
  const inverse = rates[`${to}_${from}`];
  if (direct) return money(value).mul(direct);
  if (inverse) return money(value).div(inverse);
  // Never silently treat two different currencies as equal. Callers can use
  // hasFxRate() to show a clear “rate unavailable” state in the interface.
  return new Decimal(0);
}

export function hasFxRate(from: string, to: string, rates: FxRates = {}) {
  return from === to || Boolean(rates[`${from}_${to}`] || rates[`${to}_${from}`]);
}

export function displayAmount(value: number | string, currency: string, displayCurrency: string, rates: FxRates = {}) {
  return convertAmount(value, currency, displayCurrency, rates).toNumber();
}

export function getAccountBalance(account: Account) {
  return money(account.estimated_balance ?? account.verified_balance);
}

function latestInvestmentValue(investment: Investment) {
  return money(investment.latest_value);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function commitmentOccurrences(commitment: Commitment, from: Date, to: Date) {
  const first = new Date(`${commitment.due_date}T12:00:00`);
  if (Number.isNaN(first.getTime()) || first > to) return [] as Date[];
  const recurrence = commitment.recurrence || 'one_time';
  if (recurrence === 'one_time') return first >= from ? [first] : [];
  const dates: Date[] = [];
  let cursor = first;
  let guard = 0;
  while (cursor <= to && guard < 260) {
    if (cursor >= from) dates.push(new Date(cursor));
    guard += 1;
    if (recurrence === 'weekly') cursor.setDate(cursor.getDate() + 7);
    else if (recurrence === 'monthly') cursor = addMonths(cursor, 1);
    else if (recurrence === 'quarterly') cursor = addMonths(cursor, 3);
    else cursor = addMonths(cursor, 12);
  }
  return dates;
}

export function calculateMetrics(
  accounts: Account[],
  debts: Debt[],
  receivables: Receivable[],
  investments: Investment[],
  commitments: Commitment[],
  reserves: Reserve[],
  displayCurrency: string,
  rates: FxRates = {},
  today = new Date(),
): FinanceMetrics {
  const includedAccounts = accounts.filter((account) => !account.archived && account.include_net_worth);
  const liquidCash = accounts
    .filter((account) => !account.archived && account.include_liquidity)
    .reduce((sum, account) => sum.plus(convertAmount(getAccountBalance(account), account.currency, displayCurrency, rates)), new Decimal(0));
  const cash = includedAccounts.reduce((sum, account) => sum.plus(convertAmount(getAccountBalance(account), account.currency, displayCurrency, rates)), new Decimal(0));
  const mandatoryDebt = debts.filter((debt) => debt.status === 'open' && debt.debt_class === 'mandatory').reduce((sum, debt) => sum.plus(convertAmount(debt.outstanding, debt.currency, displayCurrency, rates)), new Decimal(0));
  const flexibleDebt = debts.filter((debt) => debt.status === 'open' && debt.debt_class === 'flexible').reduce((sum, debt) => sum.plus(convertAmount(debt.outstanding, debt.currency, displayCurrency, rates)), new Decimal(0));
  const receivableValue = receivables.filter((item) => item.status === 'open' && item.include_in_net_worth).reduce((sum, item) => sum.plus(convertAmount(item.outstanding, item.currency, displayCurrency, rates)), new Decimal(0));
  const allReceivables = receivables.filter((item) => item.status === 'open').reduce((sum, item) => sum.plus(convertAmount(item.outstanding, item.currency, displayCurrency, rates)), new Decimal(0));
  const investmentsValue = investments.filter((item) => !item.archived).reduce((sum, item) => sum.plus(convertAmount(latestInvestmentValue(item), item.holding_currency, displayCurrency, rates)), new Decimal(0));
  const protectedAmount = reserves.reduce((sum, reserve) => sum.plus(convertAmount(reserve.funded_amount, reserve.currency, displayCurrency, rates)), new Decimal(0));
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 90);
  const upcomingCommitments = commitments
    .filter((item) => item.status === 'open' && item.importance === 'mandatory')
    .reduce((sum, item) => {
      const occurrences = commitmentOccurrences(item, today, windowEnd);
      return sum.plus(convertAmount(item.amount, item.currency, displayCurrency, rates).mul(occurrences.length));
    }, new Decimal(0));

  return {
    primaryNetWorth: cash.plus(investmentsValue).plus(receivableValue).minus(mandatoryDebt).toNumber(),
    allDebtNetWorth: cash.plus(investmentsValue).plus(receivableValue).minus(mandatoryDebt).minus(flexibleDebt).toNumber(),
    liquidCash: liquidCash.toNumber(),
    safeToSpend: liquidCash.minus(protectedAmount).minus(upcomingCommitments).toNumber(),
    mandatoryDebt: mandatoryDebt.toNumber(),
    flexibleDebt: flexibleDebt.toNumber(),
    receivables: allReceivables.toNumber(),
    investments: investmentsValue.toNumber(),
    protectedAmount: protectedAmount.toNumber(),
    upcomingCommitments: upcomingCommitments.toNumber(),
  };
}

export function debtProgress(debt: Debt) {
  const principal = money(debt.original_principal);
  if (principal.isZero()) return 0;
  return Math.min(100, Math.max(0, principal.minus(money(debt.outstanding)).div(principal).mul(100).toNumber()));
}

export function isStale(date: string | null | undefined, thresholdDays: number, today = new Date()) {
  if (!date) return true;
  const age = today.getTime() - new Date(date).getTime();
  return age > thresholdDays * 86_400_000;
}

export function formatCurrency(value: number | string, currency = 'AED', compact = false) {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact ? 'compact' : 'standard',
  }).format(Number(value));
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('en-AE', { month: 'short', day: 'numeric' }).format(new Date(date));
}
