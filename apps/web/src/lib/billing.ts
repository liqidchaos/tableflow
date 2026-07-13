import { throwError } from '@tableflow/types';
import { calcPlatformFeeCents, getPlatformFeePct } from './platform-fee';

export type VenuePlan = 'starter' | 'growth';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export const STARTER_TABLE_CAP = 20;
export const PLATFORM_FEE_CAP_CENTS = 200;

export const PLAN_TABLE_LIMITS: Record<VenuePlan, number | null> = {
  starter: STARTER_TABLE_CAP,
  growth: null,
};

export const PLAN_PRICES: Record<VenuePlan, number> = {
  starter: 99,
  growth: 199,
};

/** Alias for PLAN_PRICES (monthly USD). */
export const PLAN_PRICES_USD = PLAN_PRICES;

export interface VenueBilling {
  id?: string;
  plan: VenuePlan;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus | null;
}

export function calculatePlatformFeeCents(amountCents: number, feePct?: number): number {
  return calcPlatformFeeCents(amountCents, feePct);
}

export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

export { getPlatformFeePct };

export function isInTrial(venue: VenueBilling, now = new Date()): boolean {
  if (!venue.trial_ends_at) return false;
  return new Date(venue.trial_ends_at).getTime() > now.getTime();
}

export function hasActiveAccess(venue: VenueBilling, now = new Date()): boolean {
  return hasWritableAccess(venue, now);
}

export function hasWritableAccess(venue: VenueBilling, now = new Date()): boolean {
  if (isInTrial(venue, now)) return true;
  return venue.subscription_status === 'active';
}

export function trialDaysRemaining(venue: VenueBilling, now = new Date()): number {
  return daysLeftInTrial(venue.trial_ends_at, now);
}

export function daysLeftInTrial(trialEndsAt: string | null, now = new Date()): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function requireActiveSubscription(venue: VenueBilling): void {
  assertWritableAccess(venue);
}

export function assertWritableAccess(venue: VenueBilling, now = new Date()): void {
  if (!hasWritableAccess(venue, now)) {
    throwError(
      'FORBIDDEN',
      'Your free trial has ended. Subscribe to continue using TableFlow.'
    );
  }
}

export function assertStarterTableCap(plan: VenuePlan, currentCount: number): void {
  if (plan === 'starter' && currentCount >= STARTER_TABLE_CAP) {
    throwError(
      'FORBIDDEN',
      `Starter plan supports up to ${STARTER_TABLE_CAP} tables. Upgrade to Growth for unlimited tables.`
    );
  }
}

export function mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
  if (status === 'incomplete_expired') return 'incomplete';
  if (
    status === 'trialing' ||
    status === 'active' ||
    status === 'past_due' ||
    status === 'canceled' ||
    status === 'unpaid' ||
    status === 'incomplete'
  ) {
    return status;
  }
  return 'incomplete';
}

export function getStripePriceId(plan: VenuePlan): string | null {
  if (plan === 'starter') return process.env.STRIPE_PRICE_STARTER ?? null;
  if (plan === 'growth') return process.env.STRIPE_PRICE_GROWTH ?? null;
  return null;
}
