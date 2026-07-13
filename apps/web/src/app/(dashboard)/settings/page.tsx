'use client';

import { useEffect, useState } from 'react';
import { Button } from '@tableflow/ui';
import { OperatorPageHeader } from '@/components/dashboard/OperatorPageHeader';
import { useVenueContext } from '@/hooks/useVenueContext';
import type { Venue } from '@tableflow/types';

interface BillingStatus {
  plan: string;
  plan_price: number;
  trial_days_remaining: number;
  subscription_status: string | null;
  is_active: boolean;
  in_trial: boolean;
  needs_subscription: boolean;
}

export default function SettingsPage() {
  const { venueId, authFetch, loading } = useVenueContext();
  const [venue, setVenue] = useState<Partial<Venue>>({});
  const [stripeStatus, setStripeStatus] = useState<{
    onboarded: boolean;
    platform_charges?: boolean;
  } | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    if (!loading && venueId) {
      authFetch(`/api/venues/${venueId}`).then((r) => r.json()).then(setVenue);
      authFetch('/api/auth/stripe-status').then((r) => r.json()).then(setStripeStatus);
      authFetch('/api/billing/status').then((r) => r.json()).then(setBilling);
    }
  }, [loading, venueId, authFetch]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    await authFetch(`/api/venues/${venueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: venue.name,
        tab_mode: venue.tab_mode,
        qr_mode: venue.qr_mode,
        brand_color: venue.brand_color,
      }),
    });
  }

  async function connectStripe() {
    const res = await authFetch('/api/auth/stripe-onboard', { method: 'POST' });
    const data = await res.json();
    if (data.onboarding_url) {
      window.location.href = data.onboarding_url;
    } else {
      alert(data.message ?? 'Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local to enable payments.');
    }
  }

  async function subscribe(plan: 'starter' | 'growth') {
    setBillingLoading(true);
    try {
      const res = await authFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.checkout_url) window.location.href = data.checkout_url;
      else alert(data.error?.message ?? 'Checkout unavailable');
    } finally {
      setBillingLoading(false);
    }
  }

  async function openPortal() {
    setBillingLoading(true);
    try {
      const res = await authFetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.portal_url) window.location.href = data.portal_url;
      else alert(data.error?.message ?? 'Billing portal unavailable');
    } finally {
      setBillingLoading(false);
    }
  }

  return (
    <div>
      <OperatorPageHeader title="Settings" description="Venue profile, billing, and Stripe Connect." />

      {billing && billing.needs_subscription && (
        <div className="carved-edge mb-6 max-w-lg border-l-2 border-gold bg-luxury-surface-low p-6">
          <h3 className="mb-2 font-serif text-xl font-light">Subscribe to continue</h3>
          <p className="mb-4 text-luxury-on-surface-variant">
            Your free trial has ended. Choose a plan to keep editing menus, tables, and staff.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => subscribe('starter')} loading={billingLoading}>
              Starter $99/mo
            </Button>
            <Button variant="secondary" onClick={() => subscribe('growth')} loading={billingLoading}>
              Growth $199/mo
            </Button>
          </div>
        </div>
      )}

      {billing && (
        <div className="card mb-6 max-w-lg">
          <h3 className="mb-3 font-serif text-lg font-light">Billing</h3>
          <p className="mb-2 text-luxury-on-surface-variant">
            Plan: <strong className="capitalize text-luxury-on-surface">{billing.plan}</strong>
            {billing.in_trial && (
              <span> · {billing.trial_days_remaining} days left in trial</span>
            )}
            {!billing.in_trial && billing.subscription_status && (
              <span> · {billing.subscription_status}</span>
            )}
          </p>
          {billing.needs_subscription ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => subscribe('starter')} loading={billingLoading}>
                Starter $99/mo
              </Button>
              <Button variant="secondary" onClick={() => subscribe('growth')} loading={billingLoading}>
                Growth $199/mo
              </Button>
            </div>
          ) : billing.subscription_status === 'active' ? (
            <Button variant="secondary" onClick={openPortal} loading={billingLoading}>
              Manage subscription
            </Button>
          ) : billing.in_trial ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => subscribe('starter')} loading={billingLoading}>
                Subscribe early — Starter
              </Button>
              <Button variant="secondary" onClick={() => subscribe('growth')} loading={billingLoading}>
                Growth
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <form onSubmit={saveSettings} className="card mb-6 max-w-lg">
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            Venue Name
            <input className="input" value={venue.name ?? ''} onChange={(e) => setVenue({ ...venue, name: e.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm">
            Tab Mode
            <select
              className="input"
              value={venue.tab_mode ?? 'preauth'}
              onChange={(e) => setVenue({ ...venue, tab_mode: e.target.value as Venue['tab_mode'] })}
            >
              <option value="preauth">Preauth</option>
              <option value="pay_per_order">Pay Per Order</option>
              <option value="bar_tab">Bar Tab</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            QR Mode
            <select
              className="input"
              value={venue.qr_mode ?? 'static'}
              onChange={(e) => setVenue({ ...venue, qr_mode: e.target.value as Venue['qr_mode'] })}
            >
              <option value="static">Static (permanent table QR)</option>
              <option value="dynamic">Dynamic (expiring session QR)</option>
            </select>
            <p className="text-sm text-luxury-on-surface-variant">
              Dynamic mode generates short-lived QR codes from the Tables page for added security.
            </p>
          </label>
          <label className="grid gap-1.5 text-sm">
            Brand Color
            <input className="input h-10 w-full cursor-pointer" type="color" value={venue.brand_color ?? '#f2ca50'} onChange={(e) => setVenue({ ...venue, brand_color: e.target.value })} />
          </label>
          <Button type="submit">Save Settings</Button>
        </div>
      </form>

      <div className="card max-w-lg">
        <h3 className="mb-3 font-serif text-lg font-light">Stripe Connect</h3>
        <p className="mb-4 text-luxury-on-surface-variant">
          {stripeStatus === null
            ? 'Checking Stripe status…'
            : stripeStatus.onboarded && stripeStatus.platform_charges
              ? 'Payments ready via platform charges (staging). Guest cards work; venue Express payouts need Connect enablement.'
              : stripeStatus.onboarded
                ? 'Connected and ready to accept payments'
                : 'Connect your Stripe account to accept guest card payments. Works without Stripe keys — ordering and KDS still function.'}
        </p>
        {!stripeStatus?.onboarded && <Button onClick={connectStripe}>Connect Stripe</Button>}
      </div>
    </div>
  );
}
