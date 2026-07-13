'use client';

import { useState } from 'react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Button } from '@tableflow/ui';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

const stripeCache = new Map<string, Promise<Stripe | null>>();

export function getConnectedStripe(stripeAccountId: string) {
  if (!publishableKey) return null;
  const cached = stripeCache.get(stripeAccountId);
  if (cached) return cached;
  const promise = loadStripe(publishableKey, { stripeAccount: stripeAccountId });
  stripeCache.set(stripeAccountId, promise);
  return promise;
}

interface StripeElementsFormProps {
  clientSecret: string;
  stripeAccountId: string;
  brandColor: string;
  submitLabel: string;
  onReadyPaymentMethod: (paymentMethodId: string) => Promise<void>;
  onError: (message: string) => void;
}

function ConfirmForm({
  brandColor,
  submitLabel,
  onReadyPaymentMethod,
  onError,
}: Omit<StripeElementsFormProps, 'clientSecret' | 'stripeAccountId'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      // Stripe Payment Element requires submit() before confirmSetup.
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message ?? 'Card validation failed');
        return;
      }

      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message ?? 'Card confirmation failed');
        return;
      }

      const paymentMethodId =
        typeof setupIntent?.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent?.payment_method?.id;

      if (!paymentMethodId) {
        onError('No payment method returned');
        return;
      }

      await onReadyPaymentMethod(paymentMethodId);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      <Button
        type="submit"
        disabled={!stripe || !elements || submitting}
        style={{ width: '100%', background: brandColor, marginBottom: 8 }}
      >
        {submitting ? 'Processing' : submitLabel}
      </Button>
    </form>
  );
}

export function StripeElementsForm({
  clientSecret,
  stripeAccountId,
  brandColor,
  submitLabel,
  onReadyPaymentMethod,
  onError,
}: StripeElementsFormProps) {
  const stripePromise = getConnectedStripe(stripeAccountId);
  if (!stripePromise) {
    return (
      <p style={{ color: 'var(--color-muted)', marginBottom: 16 }}>
        Stripe publishable key is not configured.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: { colorPrimary: brandColor },
        },
      }}
    >
      <ConfirmForm
        brandColor={brandColor}
        submitLabel={submitLabel}
        onReadyPaymentMethod={onReadyPaymentMethod}
        onError={onError}
      />
    </Elements>
  );
}
