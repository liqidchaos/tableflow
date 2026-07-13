import type { TabMode } from '@tableflow/types';
import { getSupabase, auditLog } from '@/lib/api';
import {
  enqueueOrderToKitchen,
  enqueueSessionPendingOrders,
  shouldEnqueueSessionPendingOnPayment,
} from '@/lib/kitchen-enqueue';

/** Exported for regression tests (TAB-42). Kept out of route.ts so Next route types stay clean. */
export async function fireKitchenAfterPayment(
  supabase: ReturnType<typeof getSupabase>,
  args: {
    venueId: string;
    sessionId: string;
    orderId?: string | null;
    source: string;
  }
) {
  const paidAt = new Date().toISOString();

  const { data: session } = await supabase
    .from('table_sessions')
    .select('tab_mode')
    .eq('id', args.sessionId)
    .single();

  const tabMode = (session?.tab_mode ?? 'pay_per_order') as TabMode;

  if (args.orderId) {
    const result = await enqueueOrderToKitchen(supabase, args.orderId, { paidAt });
    if (result.enqueued) {
      await auditLog(args.venueId, null, 'kitchen.enqueued', 'order', args.orderId, {
        reason: args.source,
      });
    }
  }

  // pay_per_order: only the cleared order fires. Session-wide promote would
  // push declined / never-paid tickets onto the KDS (TAB-42).
  if (!shouldEnqueueSessionPendingOnPayment(tabMode)) {
    return;
  }

  const sessionEnqueued = await enqueueSessionPendingOrders(supabase, args.sessionId, { paidAt });
  for (const orderId of sessionEnqueued) {
    if (orderId === args.orderId) continue;
    await auditLog(args.venueId, null, 'kitchen.enqueued', 'order', orderId, {
      reason: args.source,
    });
  }
}
