import { NextRequest } from 'next/server';
import { UpdateInventorySchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator } from '@/lib/api';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { venue_id: string; item_id: string } }
) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, UpdateInventorySchema);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('inventory_items')
      .update(body)
      .eq('id', params.item_id)
      .eq('venue_id', params.venue_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return Response.json(data);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { venue_id: string; item_id: string } }
) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', params.item_id)
      .eq('venue_id', params.venue_id);
    if (error) throw new Error(error.message);
    return Response.json({ deleted: true });
  });
}
