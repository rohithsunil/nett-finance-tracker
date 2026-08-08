import { describe, expect, it } from 'vitest';
import { calculateMetrics, commitmentOccurrences, convertAmount, debtProgress, hasFxRate, isStale } from '../lib/finance';
import type { Account, Commitment, Debt, Investment, Receivable, Reserve } from '../lib/types';

const account = (overrides: Partial<Account> = {}): Account => ({ id: 'a', workspace_id: 'p', name: 'Cash', type: 'current', currency: 'AED', verified_balance: 10000, include_net_worth: true, include_liquidity: true, ...overrides });
const debt = (overrides: Partial<Debt> = {}): Debt => ({ id: 'd', workspace_id: 'p', name: 'Loan', debt_class: 'mandatory', original_principal: 10000, outstanding: 4000, currency: 'AED', status: 'open', ...overrides });
const empty: [] = [];

describe('Nett financial calculations', () => {
  it('keeps mandatory debt in primary net worth and flexible debt separate', () => {
    const metrics = calculateMetrics([account()], [debt(), debt({ id: 'f', debt_class: 'flexible', outstanding: 3000 })], empty as Receivable[], empty as Investment[], empty as Commitment[], empty as Reserve[], 'AED');
    expect(metrics.primaryNetWorth).toBe(6000);
    expect(metrics.allDebtNetWorth).toBe(3000);
    expect(metrics.mandatoryDebt).toBe(4000);
    expect(metrics.flexibleDebt).toBe(3000);
  });

  it('does not count reserves twice in net worth', () => {
    const metrics = calculateMetrics([account()], empty as Debt[], empty as Receivable[], empty as Investment[], empty as Commitment[], [{ id: 'r', workspace_id: 'p', name: 'Reserve', target_amount: 3000, funded_amount: 3000, currency: 'AED' }], 'AED');
    expect(metrics.primaryNetWorth).toBe(10000);
    expect(metrics.safeToSpend).toBe(7000);
  });

  it('converts currencies using the user-controlled rate map', () => {
    const metrics = calculateMetrics([account({ currency: 'USD', verified_balance: 10000 })], empty as Debt[], empty as Receivable[], empty as Investment[], empty as Commitment[], empty as Reserve[], 'AED', { USD_AED: 3.67 });
    expect(metrics.liquidCash).toBe(36700);
  });

  it('reports debt progress and stale records correctly', () => {
    expect(debtProgress(debt())).toBe(60);
    expect(isStale('2026-07-01T00:00:00.000Z', 31, new Date('2026-08-08T00:00:00.000Z'))).toBe(true);
    expect(isStale('2026-08-01T00:00:00.000Z', 31, new Date('2026-08-08T00:00:00.000Z'))).toBe(false);
  });

  it('does not silently convert an unknown currency as one-to-one', () => {
    expect(convertAmount(100, 'KWD', 'AED', {}).toNumber()).toBe(0);
    expect(hasFxRate('KWD', 'AED', {})).toBe(false);
  });

  it('expands recurring commitments only within the forecast window', () => {
    const dates = commitmentOccurrences({ id: 'c', workspace_id: 'p', name: 'Rent', amount: 100, currency: 'AED', due_date: '2026-08-01', recurrence: 'monthly', importance: 'mandatory', status: 'open' }, new Date('2026-08-01T00:00:00Z'), new Date('2026-10-31T00:00:00Z'));
    expect(dates).toHaveLength(3);
  });
});
