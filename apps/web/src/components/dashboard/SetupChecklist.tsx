'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@tableflow/ui';
import { Check, Circle } from 'lucide-react';
import { useVenueContext } from '@/hooks/useVenueContext';

type StepId = 'stripe' | 'tables' | 'menu' | 'pricing' | 'test_order';

interface OnboardingStep {
  id: StepId;
  label: string;
  done: boolean;
  href: string;
}

interface OnboardingResponse {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  is_complete: boolean;
  meta?: {
    platform_charges?: boolean;
  };
}

const STEP_COPY: Record<
  StepId,
  { title: string; body: string; actionLabel: string }
> = {
  stripe: {
    title: 'Enable payments',
    body: 'Connect Stripe so guests can pay before the kitchen fires.',
    actionLabel: 'Open settings',
  },
  tables: {
    title: 'Print table QRs',
    body: 'Put a QR on every table so guests can scan and order — no app download.',
    actionLabel: 'Open tables',
  },
  menu: {
    title: 'Confirm your menu',
    body: 'We seeded a demo menu — edit items or keep them for a test order.',
    actionLabel: 'Review menu',
  },
  pricing: {
    title: 'Confirm flat pricing',
    body: 'Starter $99 / Growth $199 — 30-day trial is already active. No POS wiring.',
    actionLabel: 'View billing',
  },
  test_order: {
    title: 'Place a test order',
    body: 'Scan a table QR from your phone, pay, and confirm the ticket hits the kitchen.',
    actionLabel: 'Get QR',
  },
};

export function SetupChecklist() {
  const { venueId, authFetch, loading } = useVenueContext();
  const [data, setData] = useState<OnboardingResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const refresh = useCallback(async () => {
    if (!venueId) return;
    if (localStorage.getItem(`setup_checklist_dismissed_${venueId}`) === '1') {
      setDismissed(true);
    }

    const res = await authFetch(`/api/venues/${venueId}/onboarding`);
    if (res.ok) {
      setData(await res.json());
    }
  }, [venueId, authFetch]);

  useEffect(() => {
    if (!loading && venueId) {
      void refresh();
    }
  }, [loading, venueId, refresh]);

  async function connectStripe() {
    setConnecting(true);
    try {
      const res = await authFetch('/api/auth/stripe-onboard', { method: 'POST' });
      const payload = await res.json();
      if (payload.onboarding_url) {
        window.location.href = payload.onboarding_url;
        return;
      }
      // Platform-charges staging: payments already enabled — refresh checklist.
      await refresh();
      if (payload.message) {
        alert(payload.message);
      }
    } finally {
      setConnecting(false);
    }
  }

  function dismiss() {
    if (venueId) localStorage.setItem(`setup_checklist_dismissed_${venueId}`, '1');
    setDismissed(true);
  }

  if (loading || dismissed || !venueId || !data || data.is_complete) return null;

  const platformCharges = Boolean(data.meta?.platform_charges);

  return (
    <div className="carved-edge mb-8 border-l-2 border-gold bg-luxury-surface-low p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-light text-luxury-on-surface">Get live in under 2 hours</h2>
          <p className="mt-1 text-sm text-luxury-on-surface-variant">
            {data.completed} of {data.total} setup steps complete
            {platformCharges ? ' · staging payments on platform account' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="border-none bg-transparent text-sm text-luxury-on-surface-variant hover:text-luxury-on-surface"
        >
          Dismiss
        </button>
      </div>

      <div className="grid gap-3">
        {data.steps.map((step) => {
          const copy = STEP_COPY[step.id] ?? {
            title: step.label,
            body: '',
            actionLabel: 'Open',
          };
          const stripeBody = platformCharges
            ? 'Guest card payments are ready via the platform test account. Connect Express later for venue payouts.'
            : copy.body;
          return (
            <div
              key={step.id}
              className="flex items-start gap-3 border-t border-luxury-outline-variant/20 py-4 first:border-t-0 first:pt-0"
            >
              <span className={`mt-0.5 ${step.done ? 'text-gold' : 'text-luxury-on-surface-variant'}`}>
                {step.done ? <Check size={18} /> : <Circle size={18} strokeWidth={1.5} />}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`m-0 font-medium ${
                    step.done ? 'text-luxury-on-surface-variant line-through' : 'text-luxury-on-surface'
                  }`}
                >
                  {copy.title}
                </p>
                <p className="mt-1 text-sm text-luxury-on-surface-variant">
                  {step.id === 'stripe' ? stripeBody : copy.body}
                </p>
              </div>
              {!step.done && (
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  {step.id === 'stripe' && !platformCharges ? (
                    <Button
                      onClick={connectStripe}
                      loading={connecting}
                      accentColor="var(--color-gold)"
                      style={{ padding: '8px 14px', minWidth: 0, fontSize: 'var(--text-body-sm)' }}
                    >
                      Connect
                    </Button>
                  ) : (
                    <Link href={step.href}>
                      <Button
                        variant="secondary"
                        style={{ padding: '8px 14px', minWidth: 0, fontSize: 'var(--text-body-sm)' }}
                      >
                        {copy.actionLabel}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
