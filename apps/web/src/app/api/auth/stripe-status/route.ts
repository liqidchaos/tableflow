import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getOperatorUser, getStripe } from '@/lib/api';
import { platformChargesEnabled } from '@/lib/stripe-venue';

export async function GET(req: NextRequest) {
  return withHandler(async () => {
    const user = await getOperatorUser(req);
    const supabase = getSupabase();

    const { data: venue } = await supabase
      .from('venues')
      .select('stripe_account_id, stripe_onboarded')
      .eq('owner_id', user.id)
      .single();

    if (!venue?.stripe_account_id) {
      const platformReady = platformChargesEnabled() && Boolean(venue?.stripe_onboarded);
      return Response.json({
        stripe_account_id: null,
        onboarded: platformReady,
        payouts_enabled: platformReady,
        charges_enabled: platformReady,
        platform_charges: platformChargesEnabled(),
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      return Response.json({
        stripe_account_id: venue.stripe_account_id,
        onboarded: venue.stripe_onboarded,
        payouts_enabled: false,
        charges_enabled: false,
        payments_disabled: true,
        platform_charges: platformChargesEnabled(),
      });
    }
    const account = await stripe.accounts.retrieve(venue.stripe_account_id);

    const onboarded = account.charges_enabled && account.payouts_enabled;
    if (onboarded !== venue.stripe_onboarded) {
      await supabase.from('venues').update({ stripe_onboarded: onboarded }).eq('owner_id', user.id);
    }

    return Response.json({
      stripe_account_id: venue.stripe_account_id,
      onboarded,
      payouts_enabled: account.payouts_enabled,
      charges_enabled: account.charges_enabled,
      platform_charges: platformChargesEnabled(),
    });
  });
}
