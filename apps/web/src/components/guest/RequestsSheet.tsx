'use client';

import { useEffect, useState } from 'react';
import { Button, Sheet, StatusPill } from '@tableflow/ui';
import type { ItemRequest, RequestStatus } from '@tableflow/types';
import { Droplets, UtensilsCrossed, ScrollText, Receipt } from 'lucide-react';

const REQUEST_TYPES = [
  { type: 'water' as const, label: 'Water', icon: Droplets },
  { type: 'bread' as const, label: 'Bread', icon: UtensilsCrossed },
  { type: 'napkins' as const, label: 'Napkins', icon: ScrollText },
  { type: 'check' as const, label: 'Check please', icon: Receipt },
];

const STATUS_TONES: Record<RequestStatus, 'progress' | 'ready' | 'neutral'> = {
  pending: 'progress',
  acknowledged: 'progress',
  fulfilled: 'ready',
};

const POLL_MS = 4_000;

interface RequestsSheetProps {
  sessionId: string;
  sessionToken: string;
  tableId: string;
  brandColor: string;
  onClose: () => void;
}

export function RequestsSheet({ sessionId, sessionToken, tableId, brandColor, onClose }: RequestsSheetProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [requests, setRequests] = useState<ItemRequest[]>([]);

  useEffect(() => {
    // Guest session JWTs are not Supabase Auth tokens — poll API instead of Realtime.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/requests`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setRequests(data.requests ?? []);
      } catch {
        /* keep last list */
      }
      if (!cancelled) timer = setTimeout(load, POLL_MS);
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, sessionToken]);

  async function sendRequest(requestType: typeof REQUEST_TYPES[number]['type']) {
    setLoading(requestType);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId, table_id: tableId, request_type: requestType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Request failed');
      }
      setSent(true);
      const listRes = await fetch(`/api/sessions/${sessionId}/requests`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (listRes.ok) {
        const data = await listRes.json();
        setRequests(data.requests ?? []);
      }
    } catch {
      setLoading(null);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Sheet onClose={onClose} title="What do you need?" variant="dark">
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', marginBottom: 4 }}>What do you need?</h2>
      <p style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-6)' }}>Tap to notify your server</p>

      {sent && (
        <p style={{ color: 'var(--color-citrus)', fontWeight: 600, textAlign: 'center', padding: '8px 0 16px' }}>
          Request sent — a server has been notified
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 'var(--space-6)' }}>
        {REQUEST_TYPES.map((req) => {
          const Icon = req.icon;
          return (
            <button
              key={req.type}
              type="button"
              disabled={loading !== null}
              onClick={() => sendRequest(req.type)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: 20,
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                background: 'var(--color-paper)',
                boxShadow: 'var(--shadow-sm)',
                color: brandColor,
                fontWeight: 600,
                fontSize: 14,
                fontFamily: 'var(--font-display)',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'transform var(--transition-spring)',
              }}
            >
              <Icon size={28} />
              {loading === req.type ? 'Sending…' : req.label}
            </button>
          );
        })}
      </div>

      {requests.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-paper)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 12 }}>Your requests</p>
          {requests.map((req) => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
              <span style={{ textTransform: 'capitalize' }}>
                {req.request_type === 'custom' ? req.custom_text : req.request_type}
              </span>
              <StatusPill
                label={req.status === 'pending' ? 'Waiting' : req.status === 'acknowledged' ? 'On the way' : 'Done'}
                tone={STATUS_TONES[req.status]}
                size="sm"
              />
            </div>
          ))}
        </div>
      )}

      <Button variant="secondary" onClick={onClose} style={{ width: '100%' }}>
        Close
      </Button>
    </Sheet>
  );
}
