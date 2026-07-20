import { describe, expect, it } from 'vitest';
import { guestPaymentTotals } from './guest-payment-totals';

describe('guestPaymentTotals', () => {
  it('previews subtotal + tip before an intent exists', () => {
    expect(
      guestPaymentTotals({
        subtotalDollars: 40,
        tipFraction: 0.2,
      })
    ).toEqual({
      subtotalDollars: 40,
      tipDollars: 8,
      taxDollars: 0,
      totalDollars: 48,
      hasTax: false,
    });
  });

  it('uses server charged total and surfaces tax after intent', () => {
    expect(
      guestPaymentTotals({
        subtotalDollars: 40,
        tipFraction: 0.2,
        taxAmountCents: 320,
        chargedAmountCents: 5120,
      })
    ).toEqual({
      subtotalDollars: 40,
      tipDollars: 8,
      taxDollars: 3.2,
      totalDollars: 51.2,
      hasTax: true,
    });
  });

  it('ignores zero tax', () => {
    const totals = guestPaymentTotals({
      subtotalDollars: 10,
      tipFraction: 0,
      taxAmountCents: 0,
      chargedAmountCents: 1000,
    });
    expect(totals.hasTax).toBe(false);
    expect(totals.taxDollars).toBe(0);
    expect(totals.totalDollars).toBe(10);
  });
});
