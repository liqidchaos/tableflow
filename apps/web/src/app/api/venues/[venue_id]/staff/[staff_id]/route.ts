import { NextRequest } from 'next/server';
import { UpdateStaffSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator } from '@/lib/api';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { venue_id: string; staff_id: string } }
) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, UpdateStaffSchema);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('staff')
      .update(body)
      .eq('id', params.staff_id)
      .eq('venue_id', params.venue_id)
      .select('id, venue_id, user_id, role, display_name, is_active, created_at')
      .single();
    if (error) throw new Error(error.message);
    return Response.json(data);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { venue_id: string; staff_id: string } }
) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('staff')
      .update({ is_active: false })
      .eq('id', params.staff_id)
      .eq('venue_id', params.venue_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return Response.json(data);
  });
}
