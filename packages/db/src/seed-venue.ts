import type { SupabaseClient } from '@supabase/supabase-js';

const DEMO_CATEGORIES = [
  { name: 'Starters', sort_order: 0 },
  { name: 'Mains', sort_order: 1 },
  { name: 'Drinks', sort_order: 2 },
];

const DEMO_ITEMS = [
  { category: 'Starters', name: 'Truffle Fries', description: 'Hand-cut fries, truffle oil, parmesan', price: 12, allergens: ['dairy'], dietary_tags: ['vegetarian'], prep_time_minutes: 8 },
  { category: 'Starters', name: 'Caesar Salad', description: 'Romaine, parmesan, house croutons', price: 14, allergens: ['gluten', 'dairy'], dietary_tags: ['vegetarian'], prep_time_minutes: 6 },
  { category: 'Mains', name: 'Wagyu Burger', description: '8oz wagyu, brioche, aged cheddar', price: 28, allergens: ['gluten', 'dairy'], dietary_tags: [], prep_time_minutes: 14 },
  { category: 'Mains', name: 'Grilled Salmon', description: 'Atlantic salmon, seasonal vegetables', price: 32, allergens: ['fish'], dietary_tags: ['gluten-free'], prep_time_minutes: 18 },
  { category: 'Drinks', name: 'House Red Wine', description: 'Glass of house red', price: 12, allergens: [], dietary_tags: ['vegan'], prep_time_minutes: 1 },
  { category: 'Drinks', name: 'Craft IPA', description: 'Local brewery 16oz draft', price: 8, allergens: ['gluten'], dietary_tags: ['vegan'], prep_time_minutes: 1 },
];

const DEMO_INVENTORY = [
  { name: 'Potatoes', unit: 'lbs', quantity: 50, par_level: 20 },
  { name: 'Salmon Fillets', unit: 'lbs', quantity: 15, par_level: 10 },
  { name: 'House Red Wine', unit: 'bottles', quantity: 24, par_level: 12 },
];

export async function seedVenueIfEmpty(supabase: SupabaseClient, venueId: string): Promise<boolean> {
  const { count: categoryCount } = await supabase
    .from('menu_categories')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venueId);

  if ((categoryCount ?? 0) > 0) return false;

  const categoryIds: Record<string, string> = {};
  for (const cat of DEMO_CATEGORIES) {
    const { data } = await supabase
      .from('menu_categories')
      .insert({ venue_id: venueId, ...cat })
      .select('id, name')
      .single();
    if (data) categoryIds[data.name] = data.id;
  }

  for (const [idx, item] of DEMO_ITEMS.entries()) {
    const categoryId = categoryIds[item.category];
    if (!categoryId) continue;
    await supabase.from('menu_items').insert({
      venue_id: venueId,
      category_id: categoryId,
      name: item.name,
      description: item.description,
      price: item.price,
      allergens: item.allergens,
      dietary_tags: item.dietary_tags,
      prep_time_minutes: item.prep_time_minutes,
      sort_order: idx,
    });
  }

  for (const inv of DEMO_INVENTORY) {
    await supabase.from('inventory_items').insert({ venue_id: venueId, ...inv });
  }

  return true;
}
