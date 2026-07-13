import type { SupabaseClient } from '@supabase/supabase-js';

export async function sendExpoPush(
  tokens: string[],
  message: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  const valid = tokens.filter((t) => t.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      valid.map((to) => ({
        to,
        title: message.title,
        body: message.body,
        data: message.data,
        sound: 'default',
      }))
    ),
  });
}

export async function notifyVenueServers(
  supabase: SupabaseClient,
  venueId: string,
  message: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  const { data: staff } = await supabase
    .from('staff')
    .select('push_token')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .in('role', ['server', 'manager'])
    .not('push_token', 'is', null);

  const tokens = (staff ?? []).map((s) => s.push_token).filter(Boolean) as string[];
  await sendExpoPush(tokens, message);
}

export type RouteAssignee = {
  id: string;
  push_token: string | null;
  is_active: boolean;
  role: string;
};

/** Pure decision: prefer assigned server with a usable push token. */
export function resolveRequestRouteTarget(args: {
  assignedStaffId: string | null;
  assignee: RouteAssignee | null;
}): { mode: 'assigned' | 'broadcast'; staffId: string | null; pushToken: string | null } {
  const { assignedStaffId, assignee } = args;
  if (
    assignedStaffId &&
    assignee?.is_active &&
    assignee.push_token &&
    ['server', 'manager'].includes(assignee.role)
  ) {
    return { mode: 'assigned', staffId: assignee.id, pushToken: assignee.push_token };
  }
  return { mode: 'broadcast', staffId: assignedStaffId, pushToken: null };
}

/**
 * Prefer the table's assigned server; fall back to all venue servers/managers
 * when unassigned or the assignee has no push token.
 */
export async function notifyTableServer(
  supabase: SupabaseClient,
  venueId: string,
  tableId: string,
  message: { title: string; body: string; data?: Record<string, unknown> }
): Promise<{ routedToStaffId: string | null; broadcast: boolean }> {
  const { data: table } = await supabase
    .from('venue_tables')
    .select('assigned_staff_id')
    .eq('id', tableId)
    .eq('venue_id', venueId)
    .maybeSingle();

  const assignedStaffId = table?.assigned_staff_id ?? null;
  let assignee: RouteAssignee | null = null;

  if (assignedStaffId) {
    const { data } = await supabase
      .from('staff')
      .select('id, push_token, is_active, role')
      .eq('id', assignedStaffId)
      .eq('venue_id', venueId)
      .maybeSingle();
    assignee = data;
  }

  const target = resolveRequestRouteTarget({ assignedStaffId, assignee });

  if (target.mode === 'assigned' && target.pushToken && target.staffId) {
    await sendExpoPush([target.pushToken], {
      ...message,
      data: { ...message.data, routed_to_staff_id: target.staffId },
    });
    return { routedToStaffId: target.staffId, broadcast: false };
  }

  await notifyVenueServers(supabase, venueId, {
    ...message,
    data: { ...message.data, routed_to_staff_id: null, broadcast: true },
  });
  return { routedToStaffId: assignedStaffId, broadcast: true };
}

export async function notifySessionGuests(
  supabase: SupabaseClient,
  sessionId: string,
  message: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  const { data: guests } = await supabase
    .from('session_guests')
    .select('push_token')
    .eq('session_id', sessionId)
    .not('push_token', 'is', null);

  const tokens = (guests ?? []).map((g) => g.push_token).filter(Boolean) as string[];
  await sendExpoPush(tokens, message);
}
