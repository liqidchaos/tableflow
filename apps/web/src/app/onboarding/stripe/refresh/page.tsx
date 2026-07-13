'use client';

import { useState } from 'react';
import { Button } from '@tableflow/ui';
import { useVenueContext } from '@/hooks/useVenueContext';

export default function StripeRefreshPage() {
  const { authFetch } = useVenueContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function retryOnboarding() {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/auth/stripe-onboard', { method: 'POST' });
      const data = await res.json();
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      } else {
        setError(data.message ?? 'Could not restart Stripe onboarding');
      }
    } catch {
      setError('Something went wrong. Try again or contact support.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-flagship-background p-6">
      <div className="card max-w-md text-center">
        <h1 className="mb-2 font-serif text-3xl font-light">Continue Stripe setup</h1>
        <p className="mb-6 text-luxury-on-surface-variant">
          Your Stripe onboarding session expired. Click below to pick up where you left off.
        </p>
        {error && <p className="mb-4 text-sm text-error">{error}</p>}
        <Button onClick={retryOnboarding} loading={loading} className="w-full">
          Resume Stripe onboarding
        </Button>
      </div>
    </div>
  );
}
