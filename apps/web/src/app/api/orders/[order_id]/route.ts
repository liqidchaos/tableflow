import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getSessionAuth } from '@/lib/api';
import { throwError } from '@tableflow/types';
import { assertOrderBelongsToSession } from '@/lib/session-binding';

export async function GET(req: NextRequest, { params }: { params: { order_id: string } }) {
  return withHandler(async () => {
    const sessionAuth = await getSessionAuth(req);
    const supabase = getSupabase();

    await assertOrderBelongsToSession(supabase, params.order_id, sessionAuth);

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .eq('id', params.order_id)
      .eq('session_id', sessionAuth.session_id)
      .single();

    if (error || !order) throwError('NOT_FOUND', 'Order not found');
    return Response.json(order);
  });
}
