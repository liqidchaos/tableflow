import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getSessionAuth } from '@/lib/api';
import { assertSessionId } from '@/lib/session-binding';

export async function GET(req: NextRequest, { params }: { params: { session_id: string } }) {
  return withHandler(async () => {
    const sessionAuth = await getSessionAuth(req);
    assertSessionId(sessionAuth, params.session_id);
    const supabase = getSupabase();

    const { data: orders } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('session_id', sessionAuth.session_id)
      .order('created_at', { ascending: false });

    return Response.json({ orders: orders ?? [] });
  });
}
