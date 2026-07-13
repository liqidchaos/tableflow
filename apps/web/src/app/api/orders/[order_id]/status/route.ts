import { NextRequest } from 'next/server';
import { UpdateOrderStatusSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator, auditLog, failDb } from '@/lib/api';
import { throwError } from '@tableflow/types';
import { notifySessionGuests } from '@/lib/push';

export async function PATCH(req: NextRequest, { params }: { params: { order_id: string } }) {
  return withHandler(async () => {
    const body = await parseBody(req, UpdateOrderStatusSchema);
    const supabase = getSupabase();

    const { data: order } = await supabase
      .from('orders')
      .select('venue_id, status, session_id')
      .eq('id', params.order_id)
      .single();

    if (!order) throwError('NOT_FOUND', 'Order not found');
    await getStaffOrOperator(req, order.venue_id);

    // Staff may mark pending_payment → received after cash/counter payment (manual kitchen fire).
    if (body.status === 'received' && order.status !== 'pending_payment') {
      throwError('VALIDATION_ERROR', 'Only pending_payment orders can be marked received by staff');
    }

    if (body.status !== 'received' && order.status === 'pending_payment') {
      throwError(
        'VALIDATION_ERROR',
        'Pay or mark received before advancing kitchen status'
      );
    }

    const updates: Record<string, unknown> = { status: body.status };
    if (body.status === 'received') {
      updates.paid_at = new Date().toISOString();
    }
    if (body.status === 'preparing') updates.fired_at = new Date().toISOString();
    if (body.status === 'ready') updates.ready_at = new Date().toISOString();
    if (body.status === 'delivered') updates.delivered_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', params.order_id)
      .select()
      .single();

    if (error) failDb(error);

    const auditAction =
      body.status === 'received' ? 'kitchen.enqueued' : 'order.status_updated';
    await auditLog(order.venue_id, null, auditAction, 'order', params.order_id, {
      status: body.status,
      reason: body.status === 'received' ? 'staff_mark_paid' : undefined,
    });

    if (body.status === 'ready' && order.session_id) {
      notifySessionGuests(supabase, order.session_id, {
        title: 'Order ready!',
        body: 'Your food is ready — head to the pass or ask your server.',
        data: { order_id: params.order_id, type: 'order_ready' },
      }).catch(console.error);
    }

    return Response.json(updated);
  });
}
