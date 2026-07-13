import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getStaffOrOperator } from '@/lib/api';
import type { VenueStats } from '@tableflow/types';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      { count: menuItems },
      { count: activeTables },
      { data: todayOrders },
    ] = await Promise.all([
      supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('venue_id', params.venue_id)
        .is('deleted_at', null),
      supabase
        .from('table_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('venue_id', params.venue_id)
        .eq('status', 'open'),
      supabase
        .from('orders')
        .select('subtotal')
        .eq('venue_id', params.venue_id)
        .gte('created_at', todayStart.toISOString())
        .neq('status', 'cancelled'),
    ]);

    const todayRevenue = (todayOrders ?? []).reduce((sum, o) => sum + Number(o.subtotal), 0);

    const stats: VenueStats = {
      menu_items: menuItems ?? 0,
      active_tables: activeTables ?? 0,
      today_orders: todayOrders?.length ?? 0,
      today_revenue: todayRevenue,
    };

    return Response.json(stats);
  });
}
