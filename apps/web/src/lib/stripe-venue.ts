/** Venue Stripe Connect helpers. Staging may charge the platform when Connect is unset. */

import type Stripe from 'stripe';

export type VenueStripeFields = {
  stripe_account_id: string | null;
  stripe_onboarded?: boolean | null;
};

/** When `STRIPE_PLATFORM_CHARGES=1`, venues marked onboarded can charge the platform account (no Connect). */
export function platformChargesEnabled(): boolean {
  return process.env.STRIPE_PLATFORM_CHARGES === '1';
}

export function venuePaymentsEnabled(venue: VenueStripeFields | null | undefined): venue is VenueStripeFields {
  if (!venue?.stripe_onboarded) return false;
  if (venue.stripe_account_id) return true;
  return platformChargesEnabled();
}

/** Stripe request options for connected-account charges; `undefined` for platform charges. */
export function stripeAccountOptions(
  venue: Pick<VenueStripeFields, 'stripe_account_id'>
): Stripe.RequestOptions | undefined {
  if (venue.stripe_account_id) return { stripeAccount: venue.stripe_account_id };
  return undefined;
}

export function canApplyConnectApplicationFee(
  venue: Pick<VenueStripeFields, 'stripe_account_id'>
): boolean {
  return Boolean(venue.stripe_account_id);
}
