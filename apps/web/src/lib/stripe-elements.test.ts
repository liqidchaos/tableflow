import { describe, expect, it, vi } from 'vitest';
import type { StripeElements } from '@stripe/stripe-js';
import { submitPaymentElement } from './stripe-elements';

describe('submitPaymentElement', () => {
  it('throws when the element submit reports an error', async () => {
    const submit = vi.fn(async () => ({ error: { message: 'card validation failed' } }));
    const elements = { submit } as unknown as StripeElements;

    await expect(submitPaymentElement(elements)).rejects.toEqual({
      message: 'card validation failed',
    });
    expect(submit).toHaveBeenCalled();
  });

  it('resolves when the element submits cleanly', async () => {
    const submit = vi.fn(async () => ({ error: undefined }));
    const elements = { submit } as unknown as StripeElements;

    await expect(submitPaymentElement(elements)).resolves.toBeUndefined();
    expect(submit).toHaveBeenCalled();
  });
});
