/**
 * Stripe Tax for dine-in orders (custom Payment Intents flow, "simplified" integration:
 * see docs.stripe.com/tax/payment-intent/simplified).
 *
 * TableFlow venues are point-of-sale, dine-in businesses — the diner consumes on-premises,
 * so the *venue's own address* sources the tax jurisdiction (not a diner home/billing address
 * we never collect). We pass it as `customer_details` with `address_source: "shipping"`,
 * which is Stripe's documented pattern for in-person sales without a customer address on file.
 *
 * The connected account (venue) is liable for the tax it collects — matching how they're
 * already the merchant of record on direct charges (see lib/stripe-venue.ts) — so calculations
 * are created with the `Stripe-Account` header via `stripeAccountOptions`.
 */

import type Stripe from 'stripe';
import { stripeAccountOptions, type VenueStripeFields } from './stripe-venue';

/** Prepared food (restaurants, cafes, dine-in) — see docs.stripe.com/tax/tax-categories. */
export const PREPARED_FOOD_TAX_CODE = 'txcd_30011000';

export type VenueTaxFields = VenueStripeFields & {
  tax_enabled?: boolean | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

/** Tax requires the venue to opt in *and* have a complete point-of-sale address on file. */
export function venueTaxEnabled(venue: VenueTaxFields | null | undefined): venue is VenueTaxFields {
  if (!venue?.tax_enabled) return false;
  return Boolean(venue.address && venue.city && venue.postal_code && venue.country);
}

export interface OrderTaxResult {
  calculationId: string;
  /** Subtotal + tax, in cents. Use as the PaymentIntent amount for the taxed portion. */
  amountTotal: number;
  /** Tax only, in cents. */
  taxAmount: number;
}

/**
 * Calculates tax for a dine-in order subtotal. Returns `null` when tax isn't enabled/configured
 * for the venue, or when the calculation call fails — callers should fall back to charging the
 * untaxed subtotal rather than blocking checkout (see README note in this file's tests).
 */
export async function calculateOrderTax(
  stripe: Stripe,
  venue: VenueTaxFields,
  subtotalCents: number,
  reference: string
): Promise<OrderTaxResult | null> {
  if (!venueTaxEnabled(venue) || subtotalCents <= 0) return null;

  try {
    const calculation = await stripe.tax.calculations.create(
      {
        currency: 'usd',
        line_items: [
          {
            amount: subtotalCents,
            reference,
            tax_code: PREPARED_FOOD_TAX_CODE,
          },
        ],
        customer_details: {
          address: {
            line1: venue.address!,
            city: venue.city!,
            state: venue.state ?? undefined,
            postal_code: venue.postal_code!,
            country: venue.country!,
          },
          address_source: 'shipping',
        },
      },
      stripeAccountOptions(venue)
    );

    // `id` is only null for calculations we can't later reference (shouldn't happen for a
    // freshly-created, non-idempotent-replayed calculation) — without it we can't link the
    // PaymentIntent, so treat it the same as a failed calculation.
    if (!calculation.id) return null;

    return {
      calculationId: calculation.id,
      amountTotal: calculation.amount_total,
      taxAmount: calculation.amount_total - subtotalCents,
    };
  } catch (err) {
    // Fail open: a mis-registered jurisdiction or bad address shouldn't block a diner's
    // payment. Log loudly so ops can catch under-collection via audit_log / error monitoring.
    console.error('[calculateOrderTax] tax calculation failed, charging untaxed subtotal', err);
    return null;
  }
}

/** PaymentIntent metadata key Stripe reads to auto-create/reverse the linked tax transaction. */
export const TAX_CALCULATION_METADATA_KEY = 'tax_calculation';
