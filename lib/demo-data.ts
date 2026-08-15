import type { NettData } from './types';

export const demoData: NettData = {
  profile: { id: 'demo', full_name: 'Rohith', display_currency: 'AED', theme: 'light', freshness_days: 31 },
  workspaces: [
    { id: 'personal', name: 'Personal', kind: 'personal' },
    { id: 'studio', name: '8px Studio', kind: 'business' },
  ],
  accounts: [
    { id: 'aed-main', workspace_id: 'personal', name: 'Everyday AED', type: 'current', currency: 'AED', verified_balance: 18420, estimated_balance: 18420, balance_verified_at: '2026-07-31T08:00:00Z', include_net_worth: true, include_liquidity: true },
    { id: 'usd-savings', workspace_id: 'personal', name: 'USD Savings', type: 'savings', currency: 'USD', verified_balance: 1240, estimated_balance: 1240, balance_verified_at: '2026-07-31T08:00:00Z', include_net_worth: true, include_liquidity: true },
    { id: 'inr-wallet', workspace_id: 'personal', name: 'India Wallet', type: 'wallet', currency: 'INR', verified_balance: 92500, estimated_balance: 92500, balance_verified_at: '2026-07-31T08:00:00Z', include_net_worth: true, include_liquidity: true },
    { id: 'studio-bank', workspace_id: 'studio', name: 'Studio Operating', type: 'business_bank', currency: 'AED', verified_balance: 22480, estimated_balance: 22480, balance_verified_at: '2026-07-25T08:00:00Z', include_net_worth: true, include_liquidity: true },
  ],
  debts: [
    { id: 'card', workspace_id: 'personal', name: 'Emirates Card', debt_class: 'mandatory', original_principal: 12000, outstanding: 4380, currency: 'AED', due_date: '2026-08-18', status: 'open' },
    { id: 'family', workspace_id: 'personal', name: 'Family loan', debt_class: 'flexible', original_principal: 77500, outstanding: 77500, currency: 'AED', comfortable_target: 2000, status: 'open' },
  ],
  debtEvents: [],
  receivables: [
    { id: 'alina', workspace_id: 'personal', contact_name: 'Alina Ho', amount: 8475, outstanding: 8475, currency: 'AED', expected_on: '2026-08-12', confidence: 'confirmed', include_in_net_worth: false, status: 'open' },
  ],
  investments: [
    { id: 'nvda', workspace_id: 'personal', symbol: 'NVDA', exchange: 'NASDAQ', name: 'NVIDIA', quantity: 4, holding_currency: 'USD', average_cost: 112, liquid: true, latest_value: 694, latest_value_at: '2026-07-31T08:00:00Z' },
    { id: 'reliance', workspace_id: 'personal', symbol: 'RELIANCE', exchange: 'NSE', name: 'Reliance Industries', quantity: 12, holding_currency: 'INR', average_cost: 2800, liquid: false, latest_value: 38200, latest_value_at: '2026-07-30T08:00:00Z' },
  ],
  commitments: [
    { id: 'insurance', workspace_id: 'personal', name: 'Car insurance', amount: 3200, currency: 'AED', due_date: '2026-08-24', recurrence: 'yearly', importance: 'mandatory', status: 'open' },
    { id: 'license', workspace_id: 'studio', name: 'Trade license renewal', amount: 5800, currency: 'AED', due_date: '2026-09-10', recurrence: 'yearly', importance: 'mandatory', status: 'open' },
    { id: 'travel', workspace_id: 'personal', name: 'October travel', amount: 2500, currency: 'AED', due_date: '2026-10-01', recurrence: 'one_time', importance: 'planned', status: 'open' },
  ],
  reserves: [
    { id: 'car-reserve', workspace_id: 'personal', name: 'Car reserve', target_amount: 6000, funded_amount: 3400, currency: 'AED', due_date: '2026-08-24' },
    { id: 'studio-reserve', workspace_id: 'studio', name: 'Renewal reserve', target_amount: 10000, funded_amount: 5800, currency: 'AED', due_date: '2026-09-10' },
  ],
  transactions: [
    { id: 't1', workspace_id: 'personal', account_id: 'aed-main', type: 'debit', amount: 138, currency: 'AED', category: 'Groceries', description: 'Carrefour', occurred_at: '2026-08-07T10:43:00Z' },
    { id: 't2', workspace_id: 'personal', account_id: 'aed-main', type: 'credit', amount: 8475, currency: 'AED', category: 'Salary', description: 'Monthly salary', occurred_at: '2026-08-06T08:20:00Z' },
    { id: 't3', workspace_id: 'personal', account_id: 'aed-main', type: 'debit', amount: 75, currency: 'AED', category: 'Transport', description: 'Careem', occurred_at: '2026-08-05T17:22:00Z' },
    { id: 't4', workspace_id: 'studio', account_id: 'studio-bank', type: 'credit', amount: 3200, currency: 'AED', category: 'Client payment', description: 'Project retainer', occurred_at: '2026-08-04T12:10:00Z' },
  ],
  creditCards: [],
  spaces: [],
  investmentValues: [],
  fxRates: { AED_USD: 0.2723, USD_AED: 3.6725, AED_INR: 22.58, INR_AED: 0.0443, USD_INR: 82.92, INR_USD: 0.0121 },
};
