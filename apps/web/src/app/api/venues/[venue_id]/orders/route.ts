import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getStaffOrOperator } from '@/lib/api';
import type { OrderWithDetails } from '@tableflow/types';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const status = searchParams.get('status');

    let query = supabase
      .from('orders')
      .select(`
        id, venue_id, session_id, guest_id, status, subtotal, notes,
        created_at, updated_at,
        table_sessions(table_id, venue_tables(name)),
        order_items(id)
      `)
      .eq('venue_id', params.venue_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status);

    const { data: orders, error } = await query;
    if (error) throw new Error(error.message);

    const result: OrderWithDetails[] = (orders ?? []).map((o) => {
      const session = o.table_sessions as unknown as { venue_tables: { name: string } | null } | null;
      return {
        id: o.id,
        venue_id: o.venue_id,
        session_id: o.session_id,
        guest_id: o.guest_id,
        status: o.status,
        subtotal: Number(o.subtotal),
        notes: o.notes,
        fired_at: null,
        ready_at: null,
        delivered_at: null,
        paid_at: null,
        created_at: o.created_at,
        updated_at: o.updated_at,
        table_name: session?.venue_tables?.name ?? null,
        item_count: (o.order_items as unknown[])?.length ?? 0,
      };
    });

    return Response.json({ orders: result });
  });
}
