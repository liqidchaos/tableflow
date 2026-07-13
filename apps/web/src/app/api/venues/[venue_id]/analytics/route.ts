import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getStaffOrOperator } from '@/lib/api';
import type { AnalyticsSummary, TopMenuItem } from '@tableflow/types';

function periodStart(period: 'day' | 'week' | 'month'): string {
  const now = new Date();
  if (period === 'day') {
    now.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    now.setDate(now.getDate() - 7);
  } else {
    now.setMonth(now.getMonth() - 1);
  }
  return now.toISOString();
}

async function computePeriodStats(
  supabase: ReturnType<typeof getSupabase>,
  venueId: string,
  period: 'day' | 'week' | 'month'
): Promise<AnalyticsSummary> {
  const since = periodStart(period);

  const { data: orders } = await supabase
    .from('orders')
    .select('subtotal, session_id')
    .eq('venue_id', venueId)
    .gte('created_at', since)
    .neq('status', 'cancelled');

  const revenue = (orders ?? []).reduce((sum, o) => sum + Number(o.subtotal), 0);
  const orderCount = orders?.length ?? 0;
  const covers = new Set((orders ?? []).map((o) => o.session_id)).size;

  return {
    period,
    revenue,
    covers,
    avg_check: covers > 0 ? revenue / covers : 0,
    order_count: orderCount,
  };
}

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const [daily, weekly, monthly] = await Promise.all([
      computePeriodStats(supabase, params.venue_id, 'day'),
      computePeriodStats(supabase, params.venue_id, 'week'),
      computePeriodStats(supabase, params.venue_id, 'month'),
    ]);

    const since = periodStart('month');
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('item_id, quantity, total_price, menu_items(name)')
      .gte('created_at', since);

    const itemMap = new Map<string, TopMenuItem>();
    for (const oi of orderItems ?? []) {
      const menuItem = oi.menu_items as unknown as { name: string } | null;
      const existing = itemMap.get(oi.item_id) ?? {
        item_id: oi.item_id,
        name: menuItem?.name ?? 'Unknown',
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += oi.quantity;
      existing.revenue += Number(oi.total_price);
      itemMap.set(oi.item_id, existing);
    }

    const topItems = [...itemMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const slowItems = [...itemMap.values()]
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5);

    return Response.json({
      summaries: { daily, weekly, monthly },
      top_items: topItems,
      slow_items: slowItems,
    });
  });
}
