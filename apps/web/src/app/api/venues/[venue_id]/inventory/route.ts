import { NextRequest } from 'next/server';
import { CreateInventorySchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator } from '@/lib/api';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('venue_id', params.venue_id)
      .order('name');
    if (error) throw new Error(error.message);

    const lowStock = (items ?? []).filter((i) => Number(i.quantity) <= Number(i.par_level));

    return Response.json({ items: items ?? [], low_stock: lowStock });
  });
}

export async function POST(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, CreateInventorySchema);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('inventory_items')
      .insert({ ...body, venue_id: params.venue_id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return Response.json(data, { status: 201 });
  });
}
