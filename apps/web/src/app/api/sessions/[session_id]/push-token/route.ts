import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabase, parseBody, withHandler, getSessionAuth } from '@/lib/api';
import { throwError } from '@tableflow/types';

const GuestPushTokenSchema = z.object({
  guest_id: z.string().uuid(),
  push_token: z.string().min(1),
});

export async function PATCH(req: NextRequest, { params }: { params: { session_id: string } }) {
  return withHandler(async () => {
    const sessionAuth = await getSessionAuth(req);
    if (sessionAuth.session_id !== params.session_id) {
      throwError('FORBIDDEN', 'Session mismatch');
    }

    const body = await parseBody(req, GuestPushTokenSchema);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('session_guests')
      .update({ push_token: body.push_token })
      .eq('id', body.guest_id)
      .eq('session_id', params.session_id)
      .select('id, push_token')
      .single();

    if (error || !data) throwError('NOT_FOUND', 'Guest not found');

    return Response.json({ registered: true });
  });
}
