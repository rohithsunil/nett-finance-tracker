import Decimal from 'decimal.js';
import type { Account, Commitment, Debt, FinanceMetrics, FxRates, Investment, Receivable, Reserve } from './types';

const money = (value: number | string | Decimal | null | undefined) => new Decimal(value ?? 0);

export function convertAmount(value: number | string | Decimal, from: string, to: string, rates: FxRates = {}) {
  if (from === to) return money(value);
  const direct = rates[`${from}_${to}`];
  const inverse = rates[`${to}_${from}`];
  if (direct) return money(value).mul(direct);
  if (inverse) return money(value).div(inverse);
  return money(value);
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
  const upcomingCommitments = commitments.filter((item) => item.status === 'open' && item.importance === 'mandatory' && new Date(item.due_date) <= windowEnd).reduce((sum, item) => sum.plus(convertAmount(item.amount, item.currency, displayCurrency, rates)), new Decimal(0));

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
