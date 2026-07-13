'use client';

import { useEffect, useState } from 'react';
import type { OrderStatus } from '@tableflow/types';

const TERMINAL: OrderStatus[] = ['delivered', 'cancelled'];
const POLL_MS = 3_000;

/**
 * Guest order status via API poll.
 * Guest session JWTs are not Supabase Auth tokens, so postgres_changes under
 * orders_staff RLS will never deliver — do not open an anon Realtime socket.
 */
export function useOrderStatus(orderId: string, sessionToken?: string) {
  const [status, setStatus] = useState<OrderStatus>('pending_payment');

  useEffect(() => {
    if (!orderId || orderId === 'pending' || !sessionToken) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const headers: HeadersInit = { Authorization: `Bearer ${sessionToken}` };

    async function poll() {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.status) return;
        setStatus(data.status as OrderStatus);
        if (TERMINAL.includes(data.status as OrderStatus)) return;
      } catch {
        /* keep last known status */
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, sessionToken]);

  return status;
}
