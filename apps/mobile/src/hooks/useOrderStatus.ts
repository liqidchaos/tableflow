import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { OrderStatus } from '@tableflow/types';

const TERMINAL: OrderStatus[] = ['delivered', 'cancelled'];
const POLL_MS = 3_000;

/**
 * Guest order status via API poll (session JWT ≠ Supabase Auth JWT).
 */
export function useOrderStatus(orderId: string, sessionToken?: string) {
  const [status, setStatus] = useState<OrderStatus>('pending_payment');

  useEffect(() => {
    if (!orderId || orderId === 'pending' || !sessionToken) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const data = await apiFetch(`/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
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
