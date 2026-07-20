/** Amounts from `/api/payments/intent` (and charge) are in cents. */

export interface GuestPaymentTotalsInput {
  /** Pre-tax order/tab subtotal in dollars. */
  subtotalDollars: number;
  /** Tip percent as a fraction (e.g. 0.2 for 20%). */
  tipFraction: number;
  /** Tax from the payment intent response, in cents. */
  taxAmountCents?: number | null;
  /** Charged total from the payment intent response, in cents (includes tax + tip). */
  chargedAmountCents?: number | null;
}

export interface GuestPaymentTotals {
  subtotalDollars: number;
  tipDollars: number;
  taxDollars: number;
  totalDollars: number;
  hasTax: boolean;
}

/**
 * Prefer the server's charged total once an intent exists so the guest UI
 * matches Stripe (tax-inclusive). Before that, preview subtotal + tip only.
 */
export function guestPaymentTotals({
  subtotalDollars,
  tipFraction,
  taxAmountCents = null,
  chargedAmountCents = null,
}: GuestPaymentTotalsInput): GuestPaymentTotals {
  const tipDollars = Math.round(subtotalDollars * tipFraction * 100) / 100;
  const taxDollars =
    taxAmountCents != null && taxAmountCents > 0
      ? Math.round(taxAmountCents) / 100
      : 0;

  if (chargedAmountCents != null && chargedAmountCents > 0) {
    return {
      subtotalDollars,
      tipDollars,
      taxDollars,
      totalDollars: Math.round(chargedAmountCents) / 100,
      hasTax: taxDollars > 0,
    };
  }

  return {
    subtotalDollars,
    tipDollars,
    taxDollars: 0,
    totalDollars: Math.round((subtotalDollars + tipDollars) * 100) / 100,
    hasTax: false,
  };
}
