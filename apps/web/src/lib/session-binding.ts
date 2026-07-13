import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionTokenPayload } from '@tableflow/db';
import { throwError } from '@tableflow/types';

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
