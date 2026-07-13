import { NextRequest } from 'next/server';
import { getSupabase, withHandler } from '@/lib/api';

const CATEGORY_COLUMNS = 'id, venue_id, name, description, sort_order, is_active';
const ITEM_COLUMNS =
  'id, venue_id, category_id, name, description, price, image_url, allergens, dietary_tags, prep_time_minutes, is_available, sort_order';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const availableOnly = searchParams.get('available_only') !== 'false';
    const categoryId = searchParams.get('category_id');

    let itemsQuery = supabase
      .from('menu_items')
      .select(ITEM_COLUMNS)
      .eq('venue_id', params.venue_id)
      .is('deleted_at', null)
      .order('sort_order');

    if (availableOnly) itemsQuery = itemsQuery.eq('is_available', true);
    if (categoryId) itemsQuery = itemsQuery.eq('category_id', categoryId);

    const { data: categories } = await supabase
      .from('menu_categories')
      .select(CATEGORY_COLUMNS)
      .eq('venue_id', params.venue_id)
      .eq('is_active', true)
      .order('sort_order');

    const { data: items } = await itemsQuery;

    const { data: modifiers } = await supabase
      .from('menu_item_modifiers')
      .select('id, item_id, group_name, is_required, min_select, max_select, menu_modifier_options(id, name, price_delta, sort_order)')
      .in('item_id', (items ?? []).map((i) => i.id));

    const categoriesWithItems = (categories ?? []).map((cat) => ({
      ...cat,
      items: (items ?? [])
        .filter((i) => i.category_id === cat.id)
        .map((item) => ({
          ...item,
          modifiers: (modifiers ?? [])
            .filter((m) => m.item_id === item.id)
            .map((m) => ({
              id: m.id,
              group_name: m.group_name,
              is_required: m.is_required,
              min_select: m.min_select,
              max_select: m.max_select,
              options: m.menu_modifier_options ?? [],
            })),
        })),
    }));

    return Response.json({ venue_id: params.venue_id, categories: categoriesWithItems });
  });
}
