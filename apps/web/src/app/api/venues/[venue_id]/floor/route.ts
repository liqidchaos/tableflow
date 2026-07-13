import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getStaffOrOperator } from '@/lib/api';
import { deriveFloorStatus } from '@/lib/floor-status';
import type { FloorTable } from '@tableflow/types';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    const auth = await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();
    const mineOnly = new URL(req.url).searchParams.get('mine') === '1';

    const { data: allTables } = await supabase
      .from('venue_tables')
      .select('id, name, capacity, qr_code, is_active, assigned_staff_id')
      .eq('venue_id', params.venue_id)
      .eq('is_active', true)
      .order('name');

    let tables = allTables ?? [];

    // Servers with mine=1 see their tables plus unassigned (broadcast) tables.
    if (mineOnly && auth.role === 'server' && auth.staffId) {
      tables = tables.filter(
        (t) => !t.assigned_staff_id || t.assigned_staff_id === auth.staffId
      );
    }

    const tableIds = tables.map((t) => t.id);
    if (tableIds.length === 0) {
      return Response.json({ tables: [] satisfies FloorTable[] });
    }

    const staffIds = [
      ...new Set(
        tables
          .map((t) => t.assigned_staff_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const [{ data: staffRows }, { data: sessions }, { data: pendingRequests }] = await Promise.all([
      staffIds.length
        ? supabase.from('staff').select('id, display_name').in('id', staffIds)
        : Promise.resolve({ data: [] as Array<{ id: string; display_name: string | null }> }),
      supabase
        .from('table_sessions')
        .select('id, table_id, total_amount, session_guests(id)')
        .eq('venue_id', params.venue_id)
        .eq('status', 'open')
        .in('table_id', tableIds),
      supabase
        .from('item_requests')
        .select('id, table_id, request_type')
        .eq('venue_id', params.venue_id)
        .eq('status', 'pending')
        .in('table_id', tableIds),
    ]);

    const staffNameById = new Map(
      (staffRows ?? []).map((s) => [s.id, s.display_name ?? 'Server'] as const)
    );
    const sessionByTable = new Map((sessions ?? []).map((s) => [s.table_id, s] as const));
    const requestsByTable = new Map<string, string[]>();
    for (const reqRow of pendingRequests ?? []) {
      const list = requestsByTable.get(reqRow.table_id) ?? [];
      list.push(reqRow.request_type);
      requestsByTable.set(reqRow.table_id, list);
    }

    const sessionIds = (sessions ?? []).map((s) => s.id);
    const { data: orders } =
      sessionIds.length > 0
        ? await supabase
            .from('orders')
            .select('id, session_id, status')
            .in('session_id', sessionIds)
        : { data: [] as Array<{ id: string; session_id: string; status: string }> };

    const ordersBySession = new Map<string, string[]>();
    const openKitchenBySession = new Map<string, number>();
    for (const order of orders ?? []) {
      const statuses = ordersBySession.get(order.session_id) ?? [];
      statuses.push(order.status);
      ordersBySession.set(order.session_id, statuses);
      if (['received', 'preparing', 'ready'].includes(order.status)) {
        openKitchenBySession.set(
          order.session_id,
          (openKitchenBySession.get(order.session_id) ?? 0) + 1
        );
      }
    }

    const floorTables: FloorTable[] = tables.map((table) => {
      const session = sessionByTable.get(table.id);
      const pendingTypes = requestsByTable.get(table.id) ?? [];
      const orderStatuses = session ? ordersBySession.get(session.id) ?? [] : [];
      const status = deriveFloorStatus({
        hasOpenSession: Boolean(session),
        pendingRequestTypes: pendingTypes,
        orderStatuses,
      });

      const guests = session?.session_guests;
      const guestCount = Array.isArray(guests) ? guests.length : 0;

      return {
        id: table.id,
        name: table.name,
        status,
        guest_count: guestCount,
        open_orders: session ? openKitchenBySession.get(session.id) ?? 0 : 0,
        pending_requests: pendingTypes.length,
        session_id: session?.id ?? null,
        tab_total: Number(session?.total_amount ?? 0),
        assigned_staff_id: table.assigned_staff_id ?? null,
        assigned_staff_name: table.assigned_staff_id
          ? staffNameById.get(table.assigned_staff_id) ?? null
          : null,
      };
    });

    return Response.json({ tables: floorTables });
  });
}
