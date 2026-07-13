'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@tableflow/ui';
import { useVenueContext } from '@/hooks/useVenueContext';

export default function StripeCompletePage() {
  const router = useRouter();
  const { authFetch } = useVenueContext();

  async function refreshStatus() {
    await authFetch('/api/auth/stripe-status');
    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-flagship-background p-6">
      <div className="card max-w-md text-center">
        <h1 className="mb-2 font-serif text-3xl font-light">Stripe connected</h1>
        <p className="mb-6 text-luxury-on-surface-variant">
          Your payment account is set up. Continue to your dashboard to print QR codes and place a test order.
        </p>
        <Button onClick={refreshStatus} className="mb-3 w-full">
          Go to dashboard
        </Button>
        <Link href="/tables" className="label-caps text-sm text-gold no-underline hover:underline">
          Print table QR codes →
        </Link>
      </div>
    </div>
  );
}
