import { describe, it, expect } from 'vitest';
import { cartLineKey, cartTotal, lineTotal, unitPrice } from './cart';

describe('cartLineKey', () => {
  it('differentiates lines with different modifiers', () => {
    const base = { item_id: 'a', special_instructions: undefined as string | undefined };
    const key1 = cartLineKey({ ...base, modifiers: [{ modifier_id: 'm1', option_id: 'o1' }] });
    const key2 = cartLineKey({ ...base, modifiers: [{ modifier_id: 'm1', option_id: 'o2' }] });
    expect(key1).not.toBe(key2);
  });

  it('treats modifier order as equivalent', () => {
    const mods = [
      { modifier_id: 'b', option_id: '2' },
      { modifier_id: 'a', option_id: '1' },
    ];
    const reversed = [...mods].reverse();
    expect(cartLineKey({ item_id: 'item', modifiers: mods })).toBe(
      cartLineKey({ item_id: 'item', modifiers: reversed })
    );
  });
});

describe('cart totals', () => {
  it('includes modifier deltas in line and cart totals', () => {
    const line = {
      item_id: 'burger',
      price: 10,
      quantity: 2,
      modifiers: [{ modifier_id: 'size', option_id: 'large' }],
      modifierPriceDeltas: [2],
    };
    expect(unitPrice(line.price, line.modifierPriceDeltas)).toBe(12);
    expect(lineTotal(line)).toBe(24);
    expect(cartTotal([line])).toBe(24);
  });
});
