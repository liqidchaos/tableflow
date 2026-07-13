'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@tableflow/ui';
import { useVenueContext } from '@/hooks/useVenueContext';

interface BillingStatus {
  is_active: boolean;
  needs_subscription: boolean;
  trial_days_remaining: number;
  plan: string;
}

export function PaywallGate({ children }: { children: React.ReactNode }) {
  const { authFetch, loading, role } = useVenueContext();
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  useEffect(() => {
    if (!loading && role === 'owner') {
      authFetch('/api/billing/status')
        .then((r) => r.json())
        .then(setBilling)
        .catch(() => {});
    }
  }, [loading, role, authFetch]);

  if (loading || role !== 'owner' || !billing?.needs_subscription) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="pointer-events-none opacity-50 blur-sm">{children}</div>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6">
        <div className="carved-edge max-w-md bg-luxury-surface-low p-8 text-center">
          <h2 className="mb-2 font-serif text-2xl font-light text-luxury-on-surface">Your trial has ended</h2>
          <p className="mb-6 text-luxury-on-surface-variant">
            Subscribe to keep guest ordering, KDS, and payments running. Read-only access remains until you choose a plan.
          </p>
          <Link href="/settings">
            <Button style={{ width: '100%' }}>Choose a plan</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
