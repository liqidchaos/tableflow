import { NextRequest } from 'next/server';
import { CreateRequestSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getSessionAuth, auditLog, failDb } from '@/lib/api';
import { throwError } from '@tableflow/types';
import { notifyTableServer } from '@/lib/push';
import { assertSessionId } from '@/lib/session-binding';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'requests'), 40);
    const sessionAuth = await getSessionAuth(req);
    const body = await parseBody(req, CreateRequestSchema);
    assertSessionId(sessionAuth, body.session_id);

    if (body.table_id !== sessionAuth.table_id) {
      throwError('FORBIDDEN', 'Table mismatch');
    }

    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('table_sessions')
      .select('venue_id, status')
      .eq('id', body.session_id)
      .single();

    if (!session || session.status !== 'open') {
      throwError('SESSION_EXPIRED', 'Session not found');
    }

    if (session.venue_id !== sessionAuth.venue_id) {
      throwError('FORBIDDEN', 'Session venue mismatch');
    }

    const { data, error } = await supabase
      .from('item_requests')
      .insert({
        venue_id: sessionAuth.venue_id,
        session_id: sessionAuth.session_id,
        table_id: sessionAuth.table_id,
        request_type: body.request_type,
        custom_text: body.custom_text,
      })
      .select('id, venue_id, session_id, table_id, request_type, status, created_at')
      .single();

    if (error) failDb(error);

    await auditLog(sessionAuth.venue_id, null, 'request.created', 'item_request', data.id);

    const { data: table } = await supabase
      .from('venue_tables')
      .select('name')
      .eq('id', sessionAuth.table_id)
      .single();

    const label = body.request_type === 'custom' ? body.custom_text ?? 'assistance' : body.request_type;
    const routing = await notifyTableServer(supabase, sessionAuth.venue_id, sessionAuth.table_id, {
      title: 'Guest request',
      body: `${table?.name ?? 'Table'} needs ${label}`,
      data: { request_id: data.id, type: 'guest_request', table_id: sessionAuth.table_id },
    }).catch((err) => {
      console.error(err);
      return { routedToStaffId: null, broadcast: true };
    });

    await auditLog(sessionAuth.venue_id, null, 'request.routed', 'item_request', data.id, {
      routed_to_staff_id: routing.routedToStaffId,
      broadcast: routing.broadcast,
    });

    return Response.json(
      { ...data, routed_to_staff_id: routing.routedToStaffId, broadcast: routing.broadcast },
      { status: 201 }
    );
  });
}
