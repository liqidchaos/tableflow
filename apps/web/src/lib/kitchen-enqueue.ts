import type { SupabaseClient } from '@supabase/supabase-js';
import type { TabMode } from '@tableflow/types';

/** Payment statuses that clear the pay-before-fire gate. */
export const KITCHEN_CLEARANCE_STATUSES = ['authorized', 'captured'] as const;

export type KitchenClearanceStatus = (typeof KITCHEN_CLEARANCE_STATUSES)[number];

export function isPaymentClearedForKitchen(
  paymentStatus: string | null | undefined
): boolean {
  return (
    paymentStatus === 'authorized' || paymentStatus === 'captured'
  );
}

/**
 * Decide whether a newly created order may enter the kitchen immediately.
 * pay_per_order always waits for that order's payment.
 * preauth / bar_tab may fire once the session has an authorized or captured payment.
 * When Stripe is not configured, orders stay pending until staff marks them received.
 */
export function shouldEnqueueOnOrderCreate(args: {
  tabMode: TabMode;
  sessionHasClearedPayment: boolean;
  venuePaymentsEnabled: boolean;
}): { enqueue: boolean; reason: string } {
  if (!args.venuePaymentsEnabled) {
    return { enqueue: false, reason: 'payments_disabled_requires_staff_fire' };
  }

  if (args.tabMode === 'pay_per_order') {
    return { enqueue: false, reason: 'awaiting_order_payment' };
  }

  if (args.sessionHasClearedPayment) {
    return { enqueue: true, reason: 'session_payment_cleared' };
  }

  return { enqueue: false, reason: 'awaiting_session_authorization' };
}

/**
 * After a successful payment webhook/route, whether remaining pending_payment
 * orders on the session may be promoted.
 *
 * pay_per_order: never — only the cleared payment.order_id may fire.
 * preauth / bar_tab: yes — session-level clearance covers the tab.
 */
export function shouldEnqueueSessionPendingOnPayment(tabMode: TabMode): boolean {
  return tabMode === 'preauth' || tabMode === 'bar_tab';
}

/** KDS-visible statuses. pending_payment must never appear here. */
export const KDS_VISIBLE_STATUSES = ['received', 'preparing', 'ready'] as const;

export function isKdsVisibleStatus(status: string | null | undefined): boolean {
  return (
    status === 'received' || status === 'preparing' || status === 'ready'
  );
}

export async function sessionHasClearedPayment(
  supabase: SupabaseClient,
  sessionId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('payments')
    .select('id, status')
    .eq('session_id', sessionId)
    .in('status', [...KITCHEN_CLEARANCE_STATUSES])
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/**
 * Transition pending_payment → received (kitchen enqueue).
 * Idempotent: already-received (or later) orders are left unchanged.
 */
export async function enqueueOrderToKitchen(
  supabase: SupabaseClient,
  orderId: string,
  opts?: { paidAt?: string }
): Promise<{ enqueued: boolean; orderId: string }> {
  const paidAt = opts?.paidAt ?? new Date().toISOString();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .single();

  if (!order) return { enqueued: false, orderId };
  if (order.status !== 'pending_payment') {
    return { enqueued: false, orderId };
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update({ status: 'received', paid_at: paidAt })
    .eq('id', orderId)
    .eq('status', 'pending_payment')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return { enqueued: Boolean(updated), orderId };
}

/** Enqueue every pending_payment order on a session (preauth / bar_tab only). */
export async function enqueueSessionPendingOrders(
  supabase: SupabaseClient,
  sessionId: string,
  opts?: { paidAt?: string }
): Promise<string[]> {
  const { data: pending } = await supabase
    .from('orders')
    .select('id')
    .eq('session_id', sessionId)
    .eq('status', 'pending_payment');

  const enqueued: string[] = [];
  for (const row of pending ?? []) {
    const result = await enqueueOrderToKitchen(supabase, row.id, opts);
    if (result.enqueued) enqueued.push(row.id);
  }
  return enqueued;
}
