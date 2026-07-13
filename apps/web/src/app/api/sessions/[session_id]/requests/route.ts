import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getSessionAuth } from '@/lib/api';
import { throwError } from '@tableflow/types';

export async function GET(req: NextRequest, { params }: { params: { session_id: string } }) {
  return withHandler(async () => {
    const sessionAuth = await getSessionAuth(req);
    if (sessionAuth.session_id !== params.session_id) {
      throwError('FORBIDDEN', 'Session mismatch');
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('item_requests')
      .select('id, request_type, custom_text, status, created_at, acknowledged_at, fulfilled_at')
      .eq('session_id', params.session_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throwError('INTERNAL_ERROR', 'Failed to load requests');

    return Response.json({ requests: data ?? [] });
  });
}
