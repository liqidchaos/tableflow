import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getOperatorUser, getStripe } from '@/lib/api';
import { platformChargesEnabled } from '@/lib/stripe-venue';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    const user = await getOperatorUser(req);
    const supabase = getSupabase();

    const { data: venue } = await supabase
      .from('venues')
      .select('id, stripe_account_id, stripe_onboarded')
      .eq('owner_id', user.id)
      .single();

    if (!venue) {
      return Response.json({ onboarding_url: null, message: 'No venue' });
    }

    if (!venue.stripe_account_id) {
      if (platformChargesEnabled()) {
        if (!venue.stripe_onboarded) {
          await supabase
            .from('venues')
            .update({ stripe_onboarded: true })
            .eq('id', venue.id);
        }
        return Response.json({
          onboarding_url: null,
          message:
            'Payments are already enabled via platform charges. Connect Express when the platform account has Connect signup.',
          platform_charges: true,
          onboarded: true,
        });
      }
      return Response.json({ onboarding_url: null, message: 'No Stripe account' });
    }

    const stripe = getStripe();
    if (!stripe) {
      return Response.json({ onboarding_url: null, message: 'Stripe not configured' });
    }
    const accountLink = await stripe.accountLinks.create({
      account: venue.stripe_account_id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/stripe/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/stripe/complete`,
      type: 'account_onboarding',
    });

    return Response.json({ onboarding_url: accountLink.url });
  });
}
