import { describe, expect, it, vi } from 'vitest';
import { calculateOrderTax, venueTaxEnabled, PREPARED_FOOD_TAX_CODE } from './stripe-tax';

const baseVenue = {
  stripe_account_id: 'acct_123',
  tax_enabled: true,
  address: '123 Main St',
  city: 'Seattle',
  state: 'WA',
  postal_code: '98104',
  country: 'US',
};

function mockStripe(create: ReturnType<typeof vi.fn>) {
  return { tax: { calculations: { create } } } as unknown as Parameters<typeof calculateOrderTax>[0];
}

describe('venueTaxEnabled', () => {
  it('requires the opt-in flag', () => {
    expect(venueTaxEnabled({ ...baseVenue, tax_enabled: false })).toBe(false);
  });

  it('requires a complete address', () => {
    expect(venueTaxEnabled({ ...baseVenue, postal_code: null })).toBe(false);
    expect(venueTaxEnabled({ ...baseVenue, address: null })).toBe(false);
    expect(venueTaxEnabled({ ...baseVenue, city: null })).toBe(false);
    expect(venueTaxEnabled({ ...baseVenue, country: null })).toBe(false);
  });

  it('does not require state (not all countries use it)', () => {
    expect(venueTaxEnabled({ ...baseVenue, state: null })).toBe(true);
  });

  it('passes when opted in with a full address', () => {
    expect(venueTaxEnabled(baseVenue)).toBe(true);
  });

  it('rejects null/undefined venues', () => {
    expect(venueTaxEnabled(null)).toBe(false);
    expect(venueTaxEnabled(undefined)).toBe(false);
  });
});

describe('calculateOrderTax', () => {
  it('returns null when the venue has not opted in', async () => {
    const create = vi.fn();
    const result = await calculateOrderTax(
      mockStripe(create),
      { ...baseVenue, tax_enabled: false },
      1000,
      'order_1'
    );
    expect(result).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('returns null for a zero/negative subtotal', async () => {
    const create = vi.fn();
    const result = await calculateOrderTax(mockStripe(create), baseVenue, 0, 'order_1');
    expect(result).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a calculation on the connected account using the venue address as point-of-sale', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'taxcalc_123', amount_total: 1085 });
    const result = await calculateOrderTax(mockStripe(create), baseVenue, 1000, 'order_1');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'usd',
        line_items: [
          expect.objectContaining({
            amount: 1000,
            reference: 'order_1',
            tax_code: PREPARED_FOOD_TAX_CODE,
          }),
        ],
        customer_details: expect.objectContaining({
          address: expect.objectContaining({
            line1: baseVenue.address,
            city: baseVenue.city,
            state: baseVenue.state,
            postal_code: baseVenue.postal_code,
            country: baseVenue.country,
          }),
          address_source: 'shipping',
        }),
      }),
      { stripeAccount: 'acct_123' }
    );

    expect(result).toEqual({
      calculationId: 'taxcalc_123',
      amountTotal: 1085,
      taxAmount: 85,
    });
  });

  it('fails open (returns null) when the calculation call throws', async () => {
    const create = vi.fn().mockRejectedValue(new Error('no active registration'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await calculateOrderTax(mockStripe(create), baseVenue, 1000, 'order_1');

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
