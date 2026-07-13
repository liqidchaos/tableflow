import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getStaffOrOperator } from '@/lib/api';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = supabase
      .from('ai_insights')
      .select('id, type, content, metadata, created_at, is_read')
      .eq('venue_id', params.venue_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: insights, error } = await query;
    if (error) throw new Error('Failed to fetch AI insights');

    return Response.json({ insights: insights ?? [] });
  });
}
