import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionTokenPayload } from '@tableflow/db';
import type { TabMode } from '@tableflow/types';
import { throwError } from '@tableflow/types';
import { shouldEnqueueSessionPendingOnPayment } from './kitchen-enqueue';

/** Complete mediation: body/path session must match the guest JWT. */
export function assertSessionId(
  auth: SessionTokenPayload,
  sessionId: string,
  message = 'Session mismatch'
): void {
  if (auth.session_id !== sessionId) {
    throwError('FORBIDDEN', message);
  }
}

/**
 * Session-wide kitchen clearance (authorize / preauth intent / capture promote) is only
 * valid for preauth and bar_tab. pay_per_order must never use this path — otherwise a
 * guest can authorize $0.01 and fire every pending ticket (pay-before-kitchen break).
 */
export function assertTabModeAllowsSessionClearance(tabMode: TabMode | string | null | undefined): void {
  const mode = (tabMode ?? 'pay_per_order') as TabMode;
  if (!shouldEnqueueSessionPendingOnPayment(mode)) {
    throwError('FORBIDDEN', 'Session payment clearance is not available for this tab mode');
  }
}

/** Sum of pending_payment order subtotals (dollars) for session-liability mediation. */
export async function getPendingPaymentSubtotalDollars(
  supabase: SupabaseClient,
  sessionId: string
): Promise<number> {
  const { data } = await supabase
    .from('orders')
    .select('subtotal')
    .eq('session_id', sessionId)
    .eq('status', 'pending_payment');

  return (data ?? []).reduce((sum, row) => sum + Number(row.subtotal ?? 0), 0);
}

/**
 * Guest rows can be added after scan; JWT guest_id is the scanner.
 * Always verify the guest row belongs to the authenticated session.
 */
export async function assertGuestOnSession(
  supabase: SupabaseClient,
  guestId: string,
  sessionId: string
): Promise<void> {
  const { data } = await supabase
    .from('session_guests')
    .select('id')
    .eq('id', guestId)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (!data) {
    throwError('FORBIDDEN', 'Guest does not belong to this session');
  }
}

export async function assertOrderBelongsToSession(
  supabase: SupabaseClient,
  orderId: string,
  auth: SessionTokenPayload
): Promise<{ id: string; session_id: string; venue_id: string; status: string; subtotal: number }> {
  const { data: order } = await supabase
    .from('orders')
    .select('id, session_id, venue_id, status, subtotal')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) throwError('NOT_FOUND', 'Order not found');
  if (order.session_id !== auth.session_id || order.venue_id !== auth.venue_id) {
    throwError('FORBIDDEN', 'Order does not belong to this session');
  }
  return order;
}

/**
 * Client-supplied payment amounts must cover the server-side order subtotal.
 * Tip is separate and may be zero.
 */
export function assertAmountCoversOrderSubtotal(
  orderSubtotalDollars: number,
  amountCents: number
): void {
  const expectedCents = Math.round(Number(orderSubtotalDollars) * 100);
  if (!Number.isFinite(expectedCents) || expectedCents < 0) {
    throwError('VALIDATION_ERROR', 'Order total is invalid');
  }
  // Allow 1¢ float rounding drift only.
  if (amountCents + 1 < expectedCents) {
    throwError('VALIDATION_ERROR', 'Payment amount is less than order total');
  }
}
