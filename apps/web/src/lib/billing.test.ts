import { describe, it, expect } from 'vitest';
import {
  calcPlatformFeeCents,
  platformFeeDollars,
  PLATFORM_FEE_CAP_CENTS,
} from './platform-fee';
import {
  hasActiveAccess,
  isInTrial,
  requireActiveSubscription,
  PLAN_TABLE_LIMITS,
  type VenueBilling,
} from './billing';
import { TableFlowError } from '@tableflow/types';

describe('calcPlatformFeeCents', () => {
  it('applies 0.4% fee', () => {
    expect(calcPlatformFeeCents(10_000, 0.004)).toBe(40);
  });

  it('caps at $2.00', () => {
    expect(calcPlatformFeeCents(100_000, 0.004)).toBe(PLATFORM_FEE_CAP_CENTS);
  });

  it('returns 0 for zero amount', () => {
    expect(calcPlatformFeeCents(0, 0.004)).toBe(0);
  });

  it('converts to dollars', () => {
    expect(platformFeeDollars(10_000, 0.004)).toBe(0.4);
  });
});

describe('billing access', () => {
  const active: VenueBilling = {
    plan: 'starter',
    trial_ends_at: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: 'active',
  };

  it('allows active subscriptions', () => {
    expect(hasActiveAccess(active)).toBe(true);
  });

  it('allows open trials', () => {
    const trial: VenueBilling = {
      ...active,
      subscription_status: 'trialing',
      trial_ends_at: new Date(Date.now() + 86_400_000).toISOString(),
    };
    expect(isInTrial(trial)).toBe(true);
    expect(hasActiveAccess(trial)).toBe(true);
  });

  it('blocks expired trials', () => {
    const expired: VenueBilling = {
      ...active,
      subscription_status: 'trialing',
      trial_ends_at: new Date(Date.now() - 86_400_000).toISOString(),
    };
    expect(hasActiveAccess(expired)).toBe(false);
    expect(() => requireActiveSubscription(expired)).toThrow(TableFlowError);
  });

  it('defines starter table cap of 20', () => {
    expect(PLAN_TABLE_LIMITS.starter).toBe(20);
    expect(PLAN_TABLE_LIMITS.growth).toBeNull();
  });
});
