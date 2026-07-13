import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { ItemRequest, RequestStatus } from '@tableflow/types';

const POLL_MS = 4_000;

export function useGuestRequests(sessionId: string | null, sessionToken: string | null) {
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId || !sessionToken) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Guest session JWTs are not Supabase Auth tokens — poll API instead of Realtime.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const data = await apiFetch(`/sessions/${sessionId}/requests`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!cancelled) setRequests(data.requests ?? []);
      } catch {
        if (!cancelled) setRequests([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, sessionToken]);

  return { requests, loading };
}

export function requestStatusLabel(status: RequestStatus): string {
  switch (status) {
    case 'pending':
      return 'Waiting for server';
    case 'acknowledged':
      return 'On the way';
    case 'fulfilled':
      return 'Done';
    default:
      return status;
  }
}
