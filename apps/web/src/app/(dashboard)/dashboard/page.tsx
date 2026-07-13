'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useVenueContext } from '@/hooks/useVenueContext';
import { SetupChecklist } from '@/components/dashboard/SetupChecklist';
import { OperatorPageHeader } from '@/components/dashboard/OperatorPageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import type { VenueStats } from '@tableflow/types';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

export default function DashboardPage() {
  const { venueId, venueName, authFetch, loading } = useVenueContext();
  const [stats, setStats] = useState<VenueStats | null>(null);

  const loadStats = useCallback(async () => {
    if (!venueId) return;
    const res = await authFetch(`/api/venues/${venueId}/stats`);
    if (res.ok) setStats(await res.json());
  }, [venueId, authFetch]);

  useEffect(() => {
    if (!loading && venueId) {
      loadStats();
      const interval = setInterval(loadStats, 30000);
      return () => clearInterval(interval);
    }
  }, [loading, venueId, loadStats]);

  return (
    <div>
      <SetupChecklist />

      <OperatorPageHeader
        eyebrow="Venue overview"
        title={venueName ?? 'Dashboard'}
        description="Tonight's pulse at a glance. Jump to Floor or Insights for live operations."
      />

      <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Menu Items" value={stats?.menu_items ?? '—'} />
        <StatCard label="Active Tables" value={stats?.active_tables ?? '—'} highlight />
        <StatCard label="Today Orders" value={stats?.today_orders ?? '—'} />
        <StatCard label="Today Revenue" value={stats ? formatCurrency(stats.today_revenue) : '—'} highlight />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { href: '/floor', title: 'Floor Manager', body: 'Live table grid, guest requests, and service stages.' },
          { href: '/analytics', title: 'Operator Insights', body: 'Revenue velocity, menu performance, and AI summaries.' },
          { href: '/kds', title: 'Kitchen Intelligence', body: 'Paid-only ticket wall with course timing and rush alerts.' },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="carved-edge group bg-luxury-surface-low p-8 no-underline transition-colors hover:bg-luxury-surface-highest"
          >
            <h2 className="font-serif text-xl font-light text-luxury-on-surface transition-colors group-hover:text-gold">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-luxury-on-surface-variant">{card.body}</p>
            <span className="label-caps mt-6 inline-block text-gold">Open →</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
