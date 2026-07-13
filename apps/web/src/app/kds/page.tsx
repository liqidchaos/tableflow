'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useKDSFeed } from '@/hooks/useKDSFeed';
import { TicketCard } from '@/components/kds/TicketCard';

type FilterMode = 'all' | 'fire' | 'rush';

export default function KDSPage() {
  const [venueId, setVenueId] = useState('');
  const [token, setToken] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const { tickets, refresh } = useKDSFeed(venueId, token);

  useEffect(() => {
    setVenueId(localStorage.getItem('venue_id') ?? '');
    setToken(localStorage.getItem('access_token') ?? '');
  }, []);

  const updateStatus = useCallback(
    async (orderId: string, status: string) => {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      refresh();
    },
    [token, refresh]
  );

  const markItemDone = useCallback(
    async (itemId: string) => {
      await fetch(`/api/order-items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'done' }),
      });
      refresh();
    },
    [token, refresh]
  );

  const filteredTickets = useMemo(() => {
    if (filter === 'rush') return tickets.filter((t) => t.age_minutes >= 20);
    if (filter === 'fire') return tickets.filter((t) => t.status === 'received' || t.status === 'preparing');
    return tickets;
  }, [tickets, filter]);

  const activeCovers = tickets.reduce(
    (sum, t) => sum + t.items.filter((i) => i.status !== 'done' && i.status !== 'cancelled').length,
    0
  );

  return (
    <div className="min-h-screen bg-luxury-bg text-luxury-on-surface">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-luxury-outline-variant/30 bg-luxury-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-container items-center justify-between px-gutter py-6">
          <div className="flex items-center gap-4">
            <span className="font-serif text-xl uppercase tracking-[0.2em] text-gold">TableFlow</span>
            <span className="hidden h-6 w-px bg-luxury-outline-variant/50 md:block" aria-hidden />
            <span className="label-caps hidden text-luxury-on-surface-variant md:block">
              Kitchen Display
            </span>
          </div>
          <p className="hidden text-sm text-luxury-on-surface-variant md:block">
            Paid tickets only
          </p>
          <button
            type="button"
            onClick={refresh}
            className="label-caps rounded-sm bg-gold px-6 py-3 text-gold-on transition-opacity hover:opacity-90"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-container px-gutter pb-section-gap pt-32">
        <div className="mb-8 flex flex-col gap-4 border-b border-luxury-outline-variant/20 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] font-light text-luxury-on-surface">
              Kitchen Display
            </h1>
            <p className="mt-2 text-luxury-on-surface-variant">
              {activeCovers} active items · {tickets.length} paid ticket
              {tickets.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex gap-3" role="group" aria-label="Ticket filters">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'fire', label: 'Fire' },
                { id: 'rush', label: 'Rush' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`label-caps rounded-sm px-4 py-2 transition-colors ${
                  filter === f.id
                    ? 'border border-gold bg-luxury-surface-low text-gold glowing-gold'
                    : 'border border-luxury-outline-variant text-luxury-on-surface-variant hover:bg-luxury-surface-highest'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTickets.length === 0 && (
          <p className="text-luxury-on-surface-variant">
            {filter === 'all'
              ? 'No paid tickets yet. Unpaid orders stay off this board.'
              : 'No tickets match this filter.'}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.order_id}
              ticket={ticket}
              onStatusChange={updateStatus}
              onItemDone={markItemDone}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
