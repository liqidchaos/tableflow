'use client';

import { useEffect, useState, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button, Sheet } from '@tableflow/ui';

const TIP_OPTIONS = [
  { label: '15%', value: 0.15 },
  { label: '20%', value: 0.2 },
  { label: '25%', value: 0.25 },
  { label: 'None', value: 0 },
];

interface PaymentSheetProps {
  mode: 'setup' | 'close' | 'pay_order';
  sessionToken: string;
  sessionId: string;
  guestId: string;
  venueName: string;
  brandColor: string;
  tabTotal?: number;
  orderId?: string;
  orderTotal?: number;
  paymentIntentId?: string | null;
  onClose: () => void;
  onCardSaved?: () => void;
  onPaymentIntentCreated?: (id: string) => void;
  onPaymentComplete?: () => void;
}

export function PaymentSheet({
  mode,
  sessionToken,
  sessionId,
  guestId,
  venueName,
  brandColor,
  tabTotal: initialTabTotal = 0,
  orderId,
  orderTotal = 0,
  paymentIntentId,
  onClose,
  onCardSaved,
  onPaymentIntentCreated,
  onPaymentComplete,
}: PaymentSheetProps) {
  const [selectedTip, setSelectedTip] = useState(0.2);
  const [customTip, setCustomTip] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentsDisabled, setPaymentsDisabled] = useState(false);
  const [tabTotal, setTabTotal] = useState(initialTabTotal);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'info' | 'error'>('info');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [intentType, setIntentType] = useState<'setup' | 'payment' | null>(null);
  const [paid, setPaid] = useState(false);
  const [tipLocked, setTipLocked] = useState(false);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripeConfigured = Boolean(publishableKey);

  const stripePromise = useMemo(() => {
    if (!publishableKey || !clientSecret) return null;
    // Connected-account PIs need stripeAccount; platform-charge staging omits it.
    if (stripeAccountId) return loadStripe(publishableKey, { stripeAccount: stripeAccountId });
    return loadStripe(publishableKey);
  }, [publishableKey, stripeAccountId, clientSecret]);

  useEffect(() => {
    if (mode === 'close' && sessionId && sessionToken && !initialTabTotal) {
      fetch(`/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
        .then((r) => r.json())
        .then((data) => setTabTotal(Number(data.total_amount ?? 0)))
        .catch(() => {});
    }
  }, [mode, sessionId, sessionToken, initialTabTotal]);

  function effectiveTipPercent(): number {
    if (customTip) {
      const parsed = parseFloat(customTip);
      if (!Number.isNaN(parsed) && parsed >= 0) return parsed / 100;
    }
    return selectedTip;
  }

  async function initSetupIntent() {
    setLoading(true);
    setMessage('');
    setMessageTone('info');
    try {
      const res = await fetch('/api/payments/setup-intent', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId, guest_id: guestId }),
      });
      const data = await res.json();

      if (data.payments_disabled || !data.client_secret) {
        setPaymentsDisabled(true);
        setMessageTone('info');
        setMessage(data.message ?? 'Pay at the counter. Stripe is not configured for this venue.');
        return;
      }

      if (!stripeConfigured) {
        setMessageTone('info');
        setMessage(`Tip preference saved (${Math.round(effectiveTipPercent() * 100)}%). Pay at the counter when ready.`);
        onCardSaved?.();
        return;
      }

      setClientSecret(data.client_secret);
      setStripeAccountId(data.stripe_account_id);
      setIntentType('setup');
    } catch (err) {
      setMessageTone('error');
      setMessage(err instanceof Error ? err.message : 'Payment setup failed');
    } finally {
      setLoading(false);
    }
  }

  async function initPaymentIntent() {
    const tip = effectiveTipPercent();
    const subtotalCents = Math.round(orderTotal * 100);
    const tipCents = Math.round(orderTotal * tip * 100);

    setLoading(true);
    setMessage('');
    setMessageTone('info');
    try {
      const res = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `pay-${orderId ?? sessionId}-${subtotalCents}-${tipCents}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          guest_id: guestId,
          order_id: orderId,
          amount: subtotalCents,
          tip_amount: tipCents,
          mode: 'pay_order',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message ?? 'Could not start checkout');
      }

      if (data.payments_disabled || !data.client_secret) {
        setPaymentsDisabled(true);
        setMessageTone('info');
        setMessage(
          data.message ??
            'Pay at the counter. Your order stays with the server until payment clears — the kitchen will not start yet.'
        );
        return;
      }

      setTipLocked(true);
      setClientSecret(data.client_secret);
      setStripeAccountId(data.stripe_account_id);
      setIntentType('payment');
      if (data.payment_intent_id) {
        onPaymentIntentCreated?.(data.payment_intent_id);
      }
    } catch (err) {
      setMessageTone('error');
      setMessage(err instanceof Error ? err.message : 'Could not start checkout');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Setup intent can auto-start; pay_order waits for tip confirmation so tip matches PI amount.
    if (mode === 'setup' && stripeConfigured && !paymentsDisabled && !clientSecret) {
      void initSetupIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function closeTab() {
    const tip = effectiveTipPercent();
    const subtotalCents = Math.round(tabTotal * 100);
    const tipCents = Math.round(tabTotal * tip * 100);
    const finalAmount = subtotalCents + tipCents;

    if (paymentsDisabled || !stripeConfigured || !paymentIntentId) {
      setMessageTone('info');
      setMessage(
        `Your total is $${tabTotal.toFixed(2)} plus ${Math.round(tip * 100)}% tip. Ask your server for the check.`
      );
      return;
    }

    setLoading(true);
    setMessageTone('info');
    try {
      const res = await fetch('/api/payments/capture', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          final_amount: finalAmount,
          tip_amount: tipCents,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Payment failed');
      }
      setPaid(true);
      setMessageTone('info');
      setMessage(`Payment complete: $${(finalAmount / 100).toFixed(2)} including tip.`);
      onPaymentComplete?.();
    } catch (err) {
      setMessageTone('error');
      setMessage(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  }

  function handlePaymentSuccess() {
    setPaid(true);
    setMessageTone('info');
    setMessage('Payment cleared. Sending your order to the kitchen…');
    onPaymentComplete?.();
  }

  const showElements = Boolean(clientSecret && stripePromise && (mode === 'setup' || mode === 'pay_order'));
  const tip = effectiveTipPercent();
  const payPreview =
    mode === 'pay_order'
      ? orderTotal + orderTotal * tip
      : mode === 'close'
        ? tabTotal + tabTotal * tip
        : 0;

  const stripeAppearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: brandColor,
      colorBackground: '#1c1b1b',
      colorText: '#e5e2e1',
      colorDanger: '#ffb4ab',
      fontFamily: 'Space Grotesk, Inter, sans-serif',
      borderRadius: '4px',
    },
    rules: {
      '.Input': { border: '1px solid #4d4635', backgroundColor: '#2a2a2a' },
      '.Input:focus': { boxShadow: `0 0 0 3px ${brandColor}33` },
    },
  };

  return (
    <Sheet onClose={onClose} maxWidth={480} title="Payment" variant="dark">
      <h2 className="mb-2 font-serif text-2xl font-light text-luxury-on-surface">
        {paid
          ? 'Paid'
          : mode === 'close'
            ? 'Close Tab'
            : mode === 'pay_order'
              ? 'Pay for Order'
              : 'Payment'}
      </h2>
      <p className="mb-6 text-luxury-on-surface-variant">
        {paid
          ? 'Thank you — the kitchen only sees paid tickets.'
          : mode === 'close'
            ? `Pay your tab at ${venueName}`
            : mode === 'pay_order'
              ? `Pay now at ${venueName}. Kitchen starts after payment clears.`
              : `Save your card and pay at the end of your meal at ${venueName}`}
      </p>

      {mode === 'close' && !paid && (
        <div className="carved-edge mb-6 bg-luxury-surface-high p-4 text-center">
          <p className="m-0 text-sm text-luxury-on-surface-variant">Tab total</p>
          <p className="m-0 mt-1 font-serif text-3xl font-light text-gold">${tabTotal.toFixed(2)}</p>
        </div>
      )}

      {mode === 'pay_order' && !paid && (
        <div className="carved-edge mb-6 bg-luxury-surface-high p-4 text-center">
          <p className="m-0 text-sm text-luxury-on-surface-variant">Order total</p>
          <p className="m-0 mt-1 font-serif text-3xl font-light text-gold">${orderTotal.toFixed(2)}</p>
          {tipLocked && (
            <p className="m-0 mt-2 text-sm text-luxury-on-surface-variant">
              With tip: ${payPreview.toFixed(2)}
            </p>
          )}
        </div>
      )}

      {paid ? (
        <div className="mb-6 rounded-sm border border-gold/30 bg-gold/10 p-4 text-center">
          <p className="m-0 font-serif text-xl font-light text-gold">You&apos;re all set</p>
          <p className="mt-2 text-sm text-luxury-on-surface-variant">{message}</p>
          <Button
            onClick={onClose}
            accentColor={brandColor}
            style={{ width: '100%', marginTop: 16 }}
          >
            Back to menu
          </Button>
        </div>
      ) : (
        <>
          {!tipLocked && (
            <>
              <p className="mb-3 font-medium text-luxury-on-surface">Select tip</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {TIP_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setSelectedTip(opt.value);
                      setCustomTip('');
                    }}
                    className={`label-caps rounded-sm px-4 py-2 transition-colors ${
                      selectedTip === opt.value && !customTip
                        ? 'bg-gold text-gold-on'
                        : 'border border-luxury-outline-variant bg-luxury-surface-low text-luxury-on-surface-variant hover:border-gold/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Custom tip %"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                className="input mb-2"
              />
              {(mode === 'pay_order' || mode === 'close') && (
                <p className="mb-6 text-sm text-luxury-on-surface-variant">
                  Total with tip: ${payPreview.toFixed(2)}
                </p>
              )}
            </>
          )}

          {tipLocked && mode === 'pay_order' && (
            <p className="mb-4 text-sm text-luxury-on-surface-variant">
              Tip locked at {Math.round(tip * 100)}% · ${payPreview.toFixed(2)} total
            </p>
          )}

          {showElements && clientSecret && stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
              <StripeConfirm
                intentType={intentType!}
                clientSecret={clientSecret}
                sessionToken={sessionToken}
                sessionId={sessionId}
                guestId={guestId}
                tabTotal={tabTotal}
                brandColor={brandColor}
                loading={loading}
                message={message}
                onCardSaved={onCardSaved}
                onPaymentIntentCreated={onPaymentIntentCreated}
                onPaymentComplete={handlePaymentSuccess}
              />
            </Elements>
          )}

          {!showElements && message && (
            <p
              className={`mb-4 rounded-sm border p-3 text-sm ${
                messageTone === 'error'
                  ? 'border-error/40 bg-error/10 text-error'
                  : 'border-gold/30 bg-gold/10 text-gold'
              }`}
              role={messageTone === 'error' ? 'alert' : undefined}
            >
              {message}
            </p>
          )}

          {!showElements && (
            <Button
              onClick={
                mode === 'close'
                  ? closeTab
                  : mode === 'pay_order'
                    ? () => initPaymentIntent()
                    : () => initSetupIntent()
              }
              disabled={loading}
              style={{ width: '100%', background: brandColor, marginBottom: 8 }}
            >
              {loading
                ? 'Processing…'
                : mode === 'close'
                  ? paymentsDisabled || !paymentIntentId
                    ? 'Pay at Counter'
                    : 'Pay & Close Tab'
                  : mode === 'pay_order'
                    ? paymentsDisabled
                      ? 'Pay at Counter'
                      : `Continue to pay · $${payPreview.toFixed(2)}`
                    : paymentsDisabled
                      ? 'Pay at Counter'
                      : 'Save Card & Open Tab'}
            </Button>
          )}
        </>
      )}

      {!paid && (
        <button
          type="button"
          onClick={onClose}
          className="label-caps w-full border-none bg-transparent py-3 text-luxury-on-surface-variant hover:text-luxury-on-surface"
        >
          {mode === 'pay_order' ? 'Pay later' : 'Cancel'}
        </button>
      )}
    </Sheet>
  );
}

function StripeConfirm({
  intentType,
  clientSecret,
  sessionToken,
  sessionId,
  guestId,
  tabTotal,
  brandColor,
  loading,
  message,
  onCardSaved,
  onPaymentIntentCreated,
  onPaymentComplete,
}: {
  intentType: 'setup' | 'payment';
  clientSecret: string;
  sessionToken: string;
  sessionId: string;
  guestId: string;
  tabTotal: number;
  brandColor: string;
  loading: boolean;
  message: string;
  onCardSaved?: () => void;
  onPaymentIntentCreated?: (id: string) => void;
  onPaymentComplete?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');
    try {
      // Stripe Payment Element requires submit() before confirmPayment/confirmSetup.
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message);

      if (intentType === 'setup') {
        const result = await stripe.confirmSetup({
          elements,
          clientSecret,
          confirmParams: { return_url: window.location.href },
          redirect: 'if_required',
        });
        if (result.error) throw new Error(result.error.message ?? 'Card setup failed');

        const pmId =
          typeof result.setupIntent?.payment_method === 'string'
            ? result.setupIntent.payment_method
            : result.setupIntent?.payment_method?.id;

        if (pmId) {
          const authRes = await fetch('/api/payments/authorize', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': `auth-${sessionId}-${guestId}`,
            },
            body: JSON.stringify({
              session_id: sessionId,
              guest_id: guestId,
              amount: Math.max(Math.round(tabTotal * 100), 5000),
              payment_method_id: pmId,
            }),
          });
          if (!authRes.ok) {
            const err = await authRes.json();
            throw new Error(err.error?.message ?? 'Authorization failed');
          }
          const authData = await authRes.json();
          if (authData.payment_intent_id) {
            onPaymentIntentCreated?.(authData.payment_intent_id);
          }
        }
        onCardSaved?.();
        return;
      }

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });
      if (result.error) throw new Error(result.error.message ?? 'Payment failed');
      onPaymentComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {(message || error) && (
        <p
          className={`mb-4 rounded-sm border p-3 text-sm ${
            error
              ? 'border-error/40 bg-error/10 text-error'
              : 'border-gold/30 bg-gold/10 text-gold'
          }`}
          role={error ? 'alert' : undefined}
        >
          {error || message}
        </p>
      )}
      <Button
        type="submit"
        disabled={!stripe || loading || submitting}
        style={{ width: '100%', background: brandColor, marginBottom: 8 }}
      >
        {submitting || loading ? 'Processing…' : intentType === 'setup' ? 'Save Card & Open Tab' : 'Pay Now'}
      </Button>
    </form>
  );
}
