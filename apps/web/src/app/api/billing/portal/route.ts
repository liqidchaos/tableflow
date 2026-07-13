import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getOperatorUser, requireStripe } from '@/lib/api';
import { throwError } from '@tableflow/types';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    const user = await getOperatorUser(req);
    const supabase = getSupabase();
    const stripe = requireStripe();

    const { data: venue } = await supabase
      .from('venues')
      .select('id, stripe_customer_id')
      .eq('owner_id', user.id)
      .single();

    if (!venue?.stripe_customer_id) {
      throwError('NOT_FOUND', 'No billing account found. Subscribe first.');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: venue.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });

    return Response.json({ portal_url: session.url });
  });
}
