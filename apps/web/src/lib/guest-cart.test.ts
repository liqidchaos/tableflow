import { describe, it, expect } from 'vitest';
import { cartLineKey, cartTotal, lineTotal, unitPrice } from './guest-cart';

describe('guest-cart', () => {
  it('computes unit price with modifiers', () => {
    expect(unitPrice(10, [1.5, 2])).toBe(13.5);
  });

  it('deduplicates cart lines by modifiers and instructions', () => {
    const key1 = cartLineKey({ item_id: 'a', modifiers: [{ modifier_id: 'm1', option_id: 'o1' }], special_instructions: 'no ice' });
    const key2 = cartLineKey({ item_id: 'a', modifiers: [{ modifier_id: 'm1', option_id: 'o1' }], special_instructions: 'no ice' });
    expect(key1).toBe(key2);
  });

  it('computes line total with quantity', () => {
    expect(lineTotal({ price: 10, quantity: 2, modifierPriceDeltas: [1] })).toBe(22);
  });

  it('sums cart total', () => {
    const total = cartTotal([
      { lineKey: '1', item_id: 'a', name: 'A', price: 10, quantity: 1, modifiers: [], course: 'main' },
      { lineKey: '2', item_id: 'b', name: 'B', price: 5, quantity: 2, modifiers: [], course: 'main' },
    ]);
    expect(total).toBe(20);
  });
});
