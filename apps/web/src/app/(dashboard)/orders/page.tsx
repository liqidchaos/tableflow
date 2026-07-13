'use client';

import { useEffect, useState } from 'react';
import { OperatorPageHeader } from '@/components/dashboard/OperatorPageHeader';
import { Button } from '@tableflow/ui';
import { useVenueContext } from '@/hooks/useVenueContext';
import type { OrderWithDetails } from '@tableflow/types';

interface PaymentRow {
  id: string;
  stripe_payment_intent: string;
  amount: number;
  tip_amount: number;
  status: string;
  created_at: string;
}

const STATUS_CLASS: Record<string, string> = {
  pending_payment: 'text-gold',
  received: 'text-luxury-on-surface-variant',
  preparing: 'text-gold',
  ready: 'text-citrus',
  delivered: 'text-citrus',
  cancelled: 'text-error',
};

const PAYMENT_STATUS_CLASS: Record<string, string> = {
  captured: 'text-citrus',
  authorized: 'text-gold',
  refunded: 'text-luxury-on-surface-variant',
  failed: 'text-error',
  pending: 'text-luxury-on-surface-variant',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function OrdersPage() {
  const { venueId, authFetch, loading } = useVenueContext();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [tab, setTab] = useState<'orders' | 'payments'>('orders');
  const [refunding, setRefunding] = useState<string | null>(null);

  async function loadOrders() {
    if (!venueId) return;
    const url = filter
      ? `/api/venues/${venueId}/orders?status=${filter}`
      : `/api/venues/${venueId}/orders`;
    const res = await authFetch(url);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
    }
  }

  async function loadPayments() {
    if (!venueId) return;
    const res = await authFetch(`/api/venues/${venueId}/payments`);
    if (res.ok) {
      const data = await res.json();
      setPayments(data.payments ?? []);
    }
  }

  useEffect(() => {
    if (!loading && venueId) {
      loadOrders();
      loadPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, venueId, filter]);

  async function refundPayment(paymentIntentId: string) {
    if (!confirm('Refund this payment? This cannot be undone.')) return;
    setRefunding(paymentIntentId);
    try {
      const res = await authFetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: paymentIntentId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error?.message ?? 'Refund failed');
        return;
      }
      await loadPayments();
    } finally {
      setRefunding(null);
    }
  }

  return (
    <div>
      <OperatorPageHeader title="Orders" description="Guest orders and payment history." />
      <div className="mb-6 flex flex-wrap gap-2">
        {(['orders', 'payments'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`label-caps rounded-sm px-4 py-2 transition-colors ${
              tab === t
                ? 'border border-gold bg-luxury-surface-low text-gold'
                : 'border border-luxury-outline-variant text-luxury-on-surface-variant hover:border-gold/50'
            }`}
          >
            {t === 'orders' ? 'Orders' : 'Payments'}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <>
          <select className="input mb-4 w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['received', 'preparing', 'ready', 'delivered', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          <div className="grid gap-3">
            {orders.map((order) => (
              <div key={order.id} className="card">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-lg font-light">
                      {order.table_name ?? 'Unknown table'}
                    </h3>
                    <p className="font-mono text-sm text-luxury-on-surface-variant">
                      {order.id.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`label-caps ${STATUS_CLASS[order.status] ?? 'text-luxury-on-surface-variant'}`}>
                      {order.status}
                    </span>
                    <p className="mt-1 font-mono font-semibold text-gold">
                      {formatCurrency(order.subtotal)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-luxury-on-surface-variant">
                  {order.item_count} item{order.item_count !== 1 ? 's' : ''} · {formatDate(order.created_at)}
                </p>
              </div>
            ))}
            {orders.length === 0 && !loading && (
              <p className="text-luxury-on-surface-variant">No orders yet. Orders appear here when guests place them.</p>
            )}
          </div>
        </>
      )}

      {tab === 'payments' && (
        <div className="grid gap-3">
          {payments.map((payment) => (
            <div key={payment.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm text-luxury-on-surface-variant">
                    {payment.stripe_payment_intent.slice(0, 16)}…
                  </p>
                  <p className="mt-1 font-semibold text-luxury-on-surface">
                    {formatCurrency(Number(payment.amount) + Number(payment.tip_amount))}
                    {Number(payment.tip_amount) > 0 && (
                      <span className="text-sm font-normal text-luxury-on-surface-variant">
                        {' '}(incl. {formatCurrency(Number(payment.tip_amount))} tip)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-luxury-on-surface-variant">{formatDate(payment.created_at)}</p>
                </div>
                <div className="text-right">
                  <span className={`label-caps ${PAYMENT_STATUS_CLASS[payment.status] ?? 'text-luxury-on-surface-variant'}`}>
                    {payment.status}
                  </span>
                  {payment.status === 'captured' && (
                    <div className="mt-2">
                      <Button
                        variant="secondary"
                        onClick={() => refundPayment(payment.stripe_payment_intent)}
                        loading={refunding === payment.stripe_payment_intent}
                        className="text-sm"
                      >
                        Refund
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {payments.length === 0 && !loading && (
            <p className="text-luxury-on-surface-variant">No payments yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
