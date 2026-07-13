import type { SupabaseClient } from '@supabase/supabase-js';
import { getTimeContext } from './ai';

export async function fetchMenuForVenue(supabase: SupabaseClient, venueId: string) {
  const { data } = await supabase
    .from('menu_items')
    .select('id, name, price, is_available')
    .eq('venue_id', venueId)
    .is('deleted_at', null);

  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    price: Number(m.price),
    is_available: m.is_available,
  }));
}

export async function fetchPopularCombos(supabase: SupabaseClient, venueId: string) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('venue_id', venueId)
    .gte('created_at', weekAgo.toISOString())
    .neq('status', 'cancelled');

  if (!orders?.length) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('order_id, item_id')
    .in('order_id', orderIds);

  const byOrder = new Map<string, string[]>();
  for (const oi of orderItems ?? []) {
    const items = byOrder.get(oi.order_id) ?? [];
    items.push(oi.item_id);
    byOrder.set(oi.order_id, items);
  }

  const comboCounts = new Map<string, number>();
  for (const items of byOrder.values()) {
    const key = [...new Set(items)].sort().join(',');
    comboCounts.set(key, (comboCounts.get(key) ?? 0) + 1);
  }

  return [...comboCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => ({ items: key.split(','), count }));
}

export async function buildUpsellContext(
  supabase: SupabaseClient,
  venueId: string,
  cartItemIds: string[],
  sessionContext?: { time_of_day?: string; day_of_week?: string }
) {
  const { data: venue } = await supabase.from('venues').select('name').eq('id', venueId).single();
  const { timeOfDay, dayOfWeek } = getTimeContext();

  const [menu, popularCombos] = await Promise.all([
    fetchMenuForVenue(supabase, venueId),
    fetchPopularCombos(supabase, venueId),
  ]);

  return {
    venueName: venue?.name ?? 'Restaurant',
    cartItemIds,
    menu,
    popularCombos,
    timeOfDay: sessionContext?.time_of_day ?? timeOfDay,
    dayOfWeek: sessionContext?.day_of_week ?? dayOfWeek,
  };
}
