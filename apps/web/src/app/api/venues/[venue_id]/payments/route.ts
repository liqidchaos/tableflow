import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getStaffOrOperator } from '@/lib/api';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();
    const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') ?? '50', 10), 100);

    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, stripe_payment_intent, amount, tip_amount, platform_fee, status, created_at, captured_at')
      .eq('venue_id', params.venue_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return Response.json({ payments: payments ?? [] });
  });
}
