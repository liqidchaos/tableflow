import type { StripeElements } from '@stripe/stripe-js';

export async function submitPaymentElement(elements: StripeElements): Promise<void> {
  const { error } = await elements.submit();
  if (error) {
    throw error;
  }
}
