'use client';

import { useCallback, useEffect, useState } from 'react';

interface VenueContext {
  loading: boolean;
  token: string;
  venueId: string;
  venueName: string;
  role: string | null;
}

export function useVenueContext() {
  const [ctx, setCtx] = useState<VenueContext>({
    loading: true,
    token: '',
    venueId: '',
    venueName: '',
    role: null,
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Session expired');
        return r.json();
      })
      .then((data) => {
        if (data.venue_id) {
          localStorage.setItem('venue_id', data.venue_id);
          localStorage.setItem('venue_name', data.venue_name ?? '');
        }
        setCtx({
          loading: false,
          token,
          venueId: data.venue_id ?? localStorage.getItem('venue_id') ?? '',
          venueName: data.venue_name ?? localStorage.getItem('venue_name') ?? 'Your Venue',
          role: data.role ?? null,
        });
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      });
  }, []);

  const authFetch = useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          ...init?.headers,
        },
      }),
    [ctx.token]
  );

  return { ...ctx, authFetch };
}
