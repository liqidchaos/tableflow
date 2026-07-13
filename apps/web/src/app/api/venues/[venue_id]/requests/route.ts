import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getStaffOrOperator } from '@/lib/api';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    const auth = await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();
    const status = new URL(req.url).searchParams.get('status') ?? 'pending';
    const mineOnly = new URL(req.url).searchParams.get('mine') === '1';

    const query = supabase
      .from('item_requests')
      .select(
        'id, venue_id, session_id, table_id, request_type, custom_text, status, created_at, fulfilled_at, venue_tables(name, assigned_staff_id)'
      )
      .eq('venue_id', params.venue_id)
      .eq('status', status)
      .order('created_at');

    const { data } = await query;

    let requests = data ?? [];

    // Servers default to their assigned tables when mine=1 (mobile floor).
    if (mineOnly && auth.role === 'server' && auth.staffId) {
      requests = requests.filter((r) => {
        const table = Array.isArray(r.venue_tables) ? r.venue_tables[0] : r.venue_tables;
        const assigned = table?.assigned_staff_id ?? null;
        return !assigned || assigned === auth.staffId;
      });
    }

    return Response.json({
      requests: requests.map((r) => {
        const table = Array.isArray(r.venue_tables) ? r.venue_tables[0] : r.venue_tables;
        const { venue_tables: _, ...rest } = r;
        void _;
        return {
          ...rest,
          table_name: table?.name ?? null,
          assigned_staff_id: table?.assigned_staff_id ?? null,
        };
      }),
    });
  });
}
