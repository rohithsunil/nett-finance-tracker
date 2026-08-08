export type Currency = 'AED' | 'INR' | 'USD' | string;
export type Theme = 'light' | 'dark' | 'amoled' | 'system';
export type DebtClass = 'mandatory' | 'flexible';
export type TransactionType = 'credit' | 'debit' | 'transfer' | 'debt_borrowing' | 'debt_repayment' | 'adjustment';

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
  archived?: boolean;
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
}

export interface Reserve {
  id: string;
  workspace_id: string;
  name: string;
  target_amount: number | string;
  funded_amount: number | string;
  currency: Currency;
  due_date?: string | null;
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
  fxRates: FxRates;
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
