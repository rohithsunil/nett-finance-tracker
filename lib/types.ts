export type Currency = 'AED' | 'INR' | 'USD' | string;
export type Theme = 'light' | 'dark' | 'amoled' | 'system';
export type DebtClass = 'mandatory' | 'flexible';
export type TransactionType = 'credit' | 'debit' | 'transfer' | 'debt_borrowing' | 'debt_repayment' | 'receivable_creation' | 'receivable_repayment' | 'adjustment';
export type CountryCode = string;

export interface Profile {
  id: string;
  full_name: string | null;
  display_currency: Currency;
  theme: Theme;
  freshness_days: number;
}

export interface Workspace {
  id: string;
  name: string;
  kind: 'personal' | 'business' | 'other';
}

export interface Account {
  id: string;
  workspace_id: string;
  name: string;
  type: string;
  currency: Currency;
  verified_balance: number | string;
  estimated_balance?: number | string | null;
  balance_verified_at?: string | null;
  include_net_worth: boolean;
  include_liquidity: boolean;
  institution_name?: string | null;
  account_last4?: string | null;
  country_code?: CountryCode | null;
  logo_url?: string | null;
  notes?: string | null;
  archived?: boolean;
  sort_order?: number;
}

export interface Debt {
  id: string;
  workspace_id: string;
  name: string;
  debt_class: DebtClass;
  original_principal: number | string;
  outstanding: number | string;
  currency: Currency;
  comfortable_target?: number | string | null;
  due_date?: string | null;
  status: string;
  country_code?: CountryCode | null;
  notes?: string | null;
}

export interface Receivable {
  id: string;
  workspace_id: string;
  contact_name: string;
  amount: number | string;
  outstanding: number | string;
  currency: Currency;
  expected_on?: string | null;
  confidence: 'confirmed' | 'likely' | 'uncertain';
  include_in_net_worth: boolean;
  status: string;
  country_code?: CountryCode | null;
  notes?: string | null;
}

export interface Investment {
  id: string;
  workspace_id: string;
  symbol: string;
  exchange?: string | null;
  name?: string | null;
  quantity: number | string;
  holding_currency: Currency;
  average_cost: number | string;
  liquid: boolean;
  archived?: boolean;
  latest_value?: number | string | null;
  latest_value_at?: string | null;
  country_code?: CountryCode | null;
  latest_value_source?: string | null;
}

export interface Commitment {
  id: string;
  workspace_id: string;
  name: string;
  amount: number | string;
  currency: Currency;
  due_date: string;
  recurrence: string;
  importance: 'mandatory' | 'planned' | 'optional';
  status: string;
  country_code?: CountryCode | null;
  expected_income?: boolean;
  confidence?: string;
  notes?: string | null;
}

export interface Reserve {
  id: string;
  workspace_id: string;
  name: string;
  target_amount: number | string;
  funded_amount: number | string;
  currency: Currency;
  due_date?: string | null;
  country_code?: CountryCode | null;
}

export interface CreditCard {
  id: string;
  account_id: string;
  credit_limit: number | string;
  current_outstanding: number | string;
  statement_balance: number | string;
  statement_date?: string | null;
  payment_due_date?: string | null;
  minimum_payment: number | string;
}

export interface Space {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  budget?: number | string | null;
  allocation?: number | string | null;
  currency: Currency;
  notes?: string | null;
}

export interface InvestmentValue {
  id: string;
  investment_id: string;
  value: number | string;
  price?: number | string | null;
  currency: Currency;
  source: string;
  valued_at: string;
}

export interface Transaction {
  id: string;
  workspace_id: string;
  account_id?: string | null;
  space_id?: string | null;
  type: TransactionType;
  amount: number | string;
  currency: Currency;
  category?: string | null;
  description?: string | null;
  occurred_at: string;
}

export interface FxRates {
  [key: string]: number;
}

export interface NettData {
  profile: Profile;
  workspaces: Workspace[];
  accounts: Account[];
  debts: Debt[];
  receivables: Receivable[];
  investments: Investment[];
  commitments: Commitment[];
  reserves: Reserve[];
  transactions: Transaction[];
  creditCards: CreditCard[];
  spaces: Space[];
  investmentValues: InvestmentValue[];
  fxRates: FxRates;
  fxRateSource?: string;
  fxRatesUpdatedAt?: string | null;
}

export interface FinanceMetrics {
  primaryNetWorth: number;
  allDebtNetWorth: number;
  liquidCash: number;
  safeToSpend: number;
  mandatoryDebt: number;
  flexibleDebt: number;
  receivables: number;
  investments: number;
  protectedAmount: number;
  upcomingCommitments: number;
}
