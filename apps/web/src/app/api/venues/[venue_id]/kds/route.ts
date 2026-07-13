import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getStaffOrOperator } from '@/lib/api';
import { KDS_VISIBLE_STATUSES } from '@/lib/kitchen-enqueue';
import { buildKdsTickets, type KdsOrderRow } from '@/lib/kds-tickets';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    // Defense in depth: only paid/fired tickets (never pending_payment).
    const { data: orders } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name)), table_sessions(venue_tables(name))')
      .eq('venue_id', params.venue_id)
      .in('status', [...KDS_VISIBLE_STATUSES])
      .order('paid_at', { ascending: true });

    const tickets = buildKdsTickets((orders ?? []) as KdsOrderRow[]);
    return Response.json({ tickets });
  });
}
