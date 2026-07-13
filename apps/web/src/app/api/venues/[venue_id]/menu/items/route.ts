import { NextRequest } from 'next/server';
import { CreateMenuItemSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator } from '@/lib/api';

export async function POST(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, CreateMenuItemSchema);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('menu_items')
      .insert({ ...body, venue_id: params.venue_id })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return Response.json(data, { status: 201 });
  });
}
