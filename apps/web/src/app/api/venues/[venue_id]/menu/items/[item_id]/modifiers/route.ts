import { NextRequest } from 'next/server';
import { CreateModifierSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator } from '@/lib/api';

export async function POST(
  req: NextRequest,
  { params }: { params: { venue_id: string; item_id: string } }
) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, CreateModifierSchema);
    const supabase = getSupabase();

    const { data: item } = await supabase
      .from('menu_items')
      .select('id')
      .eq('id', params.item_id)
      .eq('venue_id', params.venue_id)
      .single();
    if (!item) throw new Error('Menu item not found');

    const { data: modifier, error: modError } = await supabase
      .from('menu_item_modifiers')
      .insert({
        item_id: params.item_id,
        group_name: body.group_name,
        is_required: body.is_required,
        min_select: body.min_select,
        max_select: body.max_select,
      })
      .select()
      .single();
    if (modError) throw new Error(modError.message);

    const options = body.options.map((opt, idx) => ({
      modifier_id: modifier.id,
      name: opt.name,
      price_delta: opt.price_delta,
      sort_order: idx,
    }));
    const { data: createdOptions, error: optError } = await supabase
      .from('menu_modifier_options')
      .insert(options)
      .select();
    if (optError) throw new Error(optError.message);

    return Response.json({ ...modifier, options: createdOptions }, { status: 201 });
  });
}
