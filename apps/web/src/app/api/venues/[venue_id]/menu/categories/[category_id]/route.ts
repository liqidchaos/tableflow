import { NextRequest } from 'next/server';
import { UpdateCategorySchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator } from '@/lib/api';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { venue_id: string; category_id: string } }
) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, UpdateCategorySchema);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('menu_categories')
      .update(body)
      .eq('id', params.category_id)
      .eq('venue_id', params.venue_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return Response.json(data);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { venue_id: string; category_id: string } }
) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('menu_categories')
      .update({ is_active: false })
      .eq('id', params.category_id)
      .eq('venue_id', params.venue_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return Response.json(data);
  });
}
