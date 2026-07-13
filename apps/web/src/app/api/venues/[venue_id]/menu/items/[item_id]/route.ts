import { NextRequest } from 'next/server';
import { UpdateMenuItemSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator, auditLog } from '@/lib/api';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { venue_id: string; item_id: string } }
) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, UpdateMenuItemSchema);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('menu_items')
      .update(body)
      .eq('id', params.item_id)
      .eq('venue_id', params.venue_id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (body.is_available === false) {
      await auditLog(params.venue_id, null, 'item.86d', 'menu_item', params.item_id);
    }
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

    const { data, error } = await supabase
      .from('menu_items')
      .update({ deleted_at: new Date().toISOString(), is_available: false })
      .eq('id', params.item_id)
      .eq('venue_id', params.venue_id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return Response.json(data);
  });
}
