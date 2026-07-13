import { auditLog } from '@/lib/api';

export type ActivationEvent = 'stripe_connected' | 'first_order' | 'subscribed';

/** Light activation instrumentation via audit_log. Safe to call from any route. */
export async function trackActivationEvent(
  venueId: string,
  actorId: string | null,
  event: ActivationEvent,
  metadata: Record<string, unknown> = {}
) {
  await auditLog(venueId, actorId, `activation.${event}`, 'venue', venueId, {
    ...metadata,
    at: new Date().toISOString(),
  });
}
