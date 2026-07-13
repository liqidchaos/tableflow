import { NextRequest } from 'next/server';
import { AddGuestSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getSessionAuth } from '@/lib/api';
import { throwError } from '@tableflow/types';
import { assertSessionId } from '@/lib/session-binding';

export async function POST(req: NextRequest, { params }: { params: { session_id: string } }) {
  return withHandler(async () => {
    const sessionAuth = await getSessionAuth(req);
    assertSessionId(sessionAuth, params.session_id);
    const body = await parseBody(req, AddGuestSchema);
    const supabase = getSupabase();

    const { data: guest, error } = await supabase
      .from('session_guests')
      .insert({
        session_id: sessionAuth.session_id,
        display_name: body.display_name,
        email: body.email,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return Response.json({ guest_id: guest.id, ...guest }, { status: 201 });
  });
}

export async function GET(req: NextRequest, { params }: { params: { session_id: string } }) {
  return withHandler(async () => {
    const sessionAuth = await getSessionAuth(req);
    assertSessionId(sessionAuth, params.session_id);
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('table_sessions')
      .select('*, session_guests(*), orders(*, order_items(*))')
      .eq('id', sessionAuth.session_id)
      .eq('venue_id', sessionAuth.venue_id)
      .single();

    if (!session) throwError('NOT_FOUND', 'Session not found');
    return Response.json(session);
  });
}
