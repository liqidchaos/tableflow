import { NextRequest } from 'next/server';
import { CreateCategorySchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator } from '@/lib/api';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('venue_id', params.venue_id)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error(error.message);
    return Response.json({ categories: data ?? [] });
  });
}

export async function POST(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, CreateCategorySchema);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({ ...body, venue_id: params.venue_id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return Response.json(data, { status: 201 });
  });
}
