'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient, subscribeWithBackoff } from '@tableflow/db';
import type { KDSTicket } from '@tableflow/types';
import { filterPaidKdsTickets, refreshTicketAges } from '@/lib/kds-tickets';

function playKDSAlert() {
  if (typeof window === 'undefined') return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.value = 0.1;
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

export function useKDSFeed(venueId: string, accessToken?: string) {
  const [tickets, setTickets] = useState<KDSTicket[]>([]);

  const fetchTickets = useCallback(async () => {
    if (!venueId || !accessToken) return;
    const res = await fetch(`/api/venues/${venueId}/kds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setTickets(filterPaidKdsTickets(data.tickets ?? []));
    }
  }, [venueId, accessToken]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Live urgency: recompute age from received_at every 30s without a network round-trip.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTickets((prev) => refreshTicketAges(prev));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    // Orders Realtime is RLS-gated (orders_staff). Anon sockets never see events.
    if (!venueId || !accessToken) return;
    const supabase = createBrowserClient();

    const teardown = subscribeWithBackoff(
      supabase,
      `kds:${venueId}`,
      (channel) =>
        channel
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders', filter: `venue_id=eq.${venueId}` },
            (payload) => {
              // Unpaid inserts are pending_payment — do not alert the line.
              const status = (payload.new as { status?: string } | null)?.status;
              if (status === 'received') {
                fetchTickets();
                playKDSAlert();
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders', filter: `venue_id=eq.${venueId}` },
            (payload) => {
              const next = (payload.new as { status?: string } | null)?.status;
              const prev = (payload.old as { status?: string } | null)?.status;
              fetchTickets();
              // Alert when payment clears and the ticket first hits the kitchen.
              if (next === 'received' && prev !== 'received') {
                playKDSAlert();
              }
            }
          ),
      { accessToken }
    );

    return teardown;
  }, [venueId, accessToken, fetchTickets]);

  return { tickets, refresh: fetchTickets };
}

export function getAgeColor(ageMinutes: number): string {
  if (ageMinutes < 5) return 'var(--kds-green)';
  if (ageMinutes < 10) return 'var(--kds-yellow)';
  return 'var(--kds-red)';
}
