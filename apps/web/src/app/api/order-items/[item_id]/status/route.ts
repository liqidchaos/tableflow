import { NextRequest } from 'next/server';
import { UpdateOrderItemStatusSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator } from '@/lib/api';

export async function PATCH(req: NextRequest, { params }: { params: { item_id: string } }) {
  return withHandler(async () => {
    const body = await parseBody(req, UpdateOrderItemStatusSchema);
    const supabase = getSupabase();

    const { data: orderItem } = await supabase
      .from('order_items')
      .select('order_id, orders(venue_id)')
      .eq('id', params.item_id)
      .single();

    const venueId = (orderItem?.orders as unknown as { venue_id: string })?.venue_id;
    await getStaffOrOperator(req, venueId);

    const { data, error } = await supabase
      .from('order_items')
      .update({ status: body.status })
      .eq('id', params.item_id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return Response.json(data);
  });
}
