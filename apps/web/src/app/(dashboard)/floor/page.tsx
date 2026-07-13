'use client';

import { useEffect, useState, useCallback } from 'react';
import { Receipt, Wine } from 'lucide-react';
import { useVenueContext } from '@/hooks/useVenueContext';
import { OperatorPageHeader } from '@/components/dashboard/OperatorPageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { FloorTableCard } from '@/components/dashboard/FloorTableCard';
import type { FloorTable } from '@tableflow/types';

interface VenueRequest {
  id: string;
  table_id: string;
  table_name?: string | null;
  request_type: string;
  custom_text: string | null;
  status: string;
  created_at: string;
  assigned_staff_id?: string | null;
}

const REQUEST_LABELS: Record<string, string> = {
  water: 'Water requested',
  bread: 'Bread requested',
  napkins: 'Napkins requested',
  check: 'Bill requested',
  sommelier: 'Sommelier request',
  custom: 'Guest request',
};

function formatAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function FloorPage() {
  const { venueId, authFetch, loading } = useVenueContext();
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [requests, setRequests] = useState<VenueRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'attention'>('all');
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!venueId) return;
    const [floorRes, reqRes] = await Promise.all([
      authFetch(`/api/venues/${venueId}/floor`),
      authFetch(`/api/venues/${venueId}/requests?status=pending`),
    ]);
    if (floorRes.ok) {
      const data = await floorRes.json();
      setTables(data.tables ?? []);
    }
    if (reqRes.ok) {
      const data = await reqRes.json();
      setRequests(data.requests ?? []);
    }
  }, [venueId, authFetch]);

  useEffect(() => {
    if (!loading && venueId) {
      loadData();
      const interval = setInterval(loadData, 15000);
      return () => clearInterval(interval);
    }
  }, [loading, venueId, loadData]);

  async function fulfillRequest(requestId: string) {
    setFulfillingId(requestId);
    try {
      const res = await authFetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'fulfilled' }),
      });
      if (res.ok) await loadData();
    } finally {
      setFulfillingId(null);
    }
  }

  const activeCount = tables.filter((t) => t.status !== 'empty').length;
  const attentionCount = tables.filter(
    (t) => t.status === 'needs_attention' || t.status === 'paying'
  ).length;
  const openCount = tables.filter((t) => t.status === 'empty').length;
  const pendingCount = tables.filter((t) => t.pending_requests > 0).length;

  const filtered = tables.filter((t) => {
    if (filter === 'active') return t.status !== 'empty';
    if (filter === 'attention') {
      return t.status === 'needs_attention' || t.status === 'paying' || t.pending_requests > 0;
    }
    return true;
  });

  return (
    <div>
      <OperatorPageHeader
        eyebrow="Live service"
        title="Floor Status"
        description="Ordering, eating, and paying stages with guest requests routed to assigned servers."
      />

      <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active Tables" value={activeCount} highlight />
        <StatCard label="Pending" value={pendingCount} />
        <StatCard label="Available" value={openCount} />
        <StatCard label="Alerts" value={attentionCount} />
      </section>

      {requests.length > 0 && (
        <section className="mb-10 flex flex-col gap-4">
          {requests.slice(0, 5).map((req) => {
            const table = tables.find((t) => t.id === req.table_id);
            const isPriority = req.request_type === 'sommelier' || req.request_type === 'check';
            const serverLabel =
              table?.assigned_staff_name ??
              (req.assigned_staff_id ? 'Assigned server' : 'Unassigned — broadcast');
            return (
              <div
                key={req.id}
                className={`carved-edge flex items-start justify-between gap-4 p-6 transition-colors ${
                  isPriority
                    ? 'border-l-2 border-gold bg-luxury-surface-high'
                    : 'bg-luxury-surface-low hover:bg-luxury-surface-highest'
                }`}
              >
                <div className="flex items-start gap-4">
                  {isPriority ? (
                    <Wine className="mt-1 shrink-0 text-gold" size={24} />
                  ) : (
                    <Receipt className="mt-1 shrink-0 text-luxury-on-surface-variant" size={24} />
                  )}
                  <div>
                    <p className="label-caps text-gold">{isPriority ? 'Priority Request' : 'Action Required'}</p>
                    <p className="mt-1 font-serif text-lg text-luxury-on-surface">
                      {REQUEST_LABELS[req.request_type] ?? 'Request'} at{' '}
                      {req.table_name ?? table?.name ?? 'Table'}
                    </p>
                    {req.custom_text && (
                      <p className="mt-1 text-sm text-luxury-on-surface-variant">{req.custom_text}</p>
                    )}
                    <p className="mt-2 text-xs text-luxury-on-surface-variant">Route → {serverLabel}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="label-caps text-luxury-on-surface-variant">{formatAgo(req.created_at)}</span>
                  <button
                    type="button"
                    onClick={() => fulfillRequest(req.id)}
                    disabled={fulfillingId === req.id}
                    className="label-caps rounded-sm border border-gold px-3 py-1.5 text-gold transition-colors hover:bg-luxury-surface-highest disabled:opacity-50"
                  >
                    {fulfillingId === req.id ? '…' : 'Fulfill'}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-serif text-2xl font-light text-luxury-on-surface">Table Grid</h2>
          <div className="flex gap-2">
            {(['all', 'active', 'attention'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`label-caps rounded-sm px-4 py-2 transition-colors ${
                  filter === f
                    ? 'border border-gold bg-luxury-surface-low text-gold glowing-gold'
                    : 'border border-luxury-outline-variant text-luxury-on-surface-variant hover:bg-luxury-surface-highest'
                }`}
              >
                {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Alerts'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((table) => (
            <FloorTableCard key={table.id} table={table} />
          ))}
        </div>
        {filtered.length === 0 && !loading && (
          <p className="py-12 text-center text-luxury-on-surface-variant">No tables match this filter.</p>
        )}
      </section>
    </div>
  );
}
