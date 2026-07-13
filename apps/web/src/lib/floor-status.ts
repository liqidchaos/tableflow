/**
 * Derive live floor stage from session + order/payment + guest-request signals.
 * Priority: empty → needs_attention (non-check) → paying (check) → eating → ordering.
 */
export type FloorStage = 'empty' | 'ordering' | 'eating' | 'paying' | 'needs_attention';

const KITCHEN_OR_SERVED: ReadonlySet<string> = new Set([
  'received',
  'preparing',
  'ready',
  'delivered',
]);

export type FloorStatusInput = {
  hasOpenSession: boolean;
  /** Pending request types for this table (e.g. water, check). */
  pendingRequestTypes: string[];
  /** Order statuses on the open session. */
  orderStatuses: string[];
};

export function deriveFloorStatus(input: FloorStatusInput): FloorStage {
  if (!input.hasOpenSession) return 'empty';

  const pending = input.pendingRequestTypes;
  const hasNonCheckRequest = pending.some((t) => t !== 'check');
  if (hasNonCheckRequest) return 'needs_attention';

  if (pending.includes('check')) return 'paying';

  const hasPaidKitchenOrServed = input.orderStatuses.some((s) => KITCHEN_OR_SERVED.has(s));
  if (hasPaidKitchenOrServed) return 'eating';

  return 'ordering';
}

export function isAttentionStage(status: FloorStage): boolean {
  return status === 'needs_attention' || status === 'paying';
}
