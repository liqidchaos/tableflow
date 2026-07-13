import { NextRequest } from 'next/server';
import { SetupIntentSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getSessionAuth, requireStripe } from '@/lib/api';
import { assertGuestOnSession, assertSessionId } from '@/lib/session-binding';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { stripeAccountOptions, venuePaymentsEnabled } from '@/lib/stripe-venue';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'payments/setup-intent'), 30);
    const sessionAuth = await getSessionAuth(req);
    const body = await parseBody(req, SetupIntentSchema);
    const supabase = getSupabase();

    assertSessionId(sessionAuth, body.session_id);
    await assertGuestOnSession(supabase, body.guest_id, body.session_id);

    const { data: venue } = await supabase
      .from('venues')
      .select('stripe_account_id, stripe_onboarded')
      .eq('id', sessionAuth.venue_id)
      .single();

    if (!venuePaymentsEnabled(venue)) {
      return Response.json({
        client_secret: null,
        stripe_customer_id: null,
        payments_disabled: true,
        message: 'Card setup is unavailable until Stripe is configured for this venue.',
      });
    }

    const stripe = requireStripe();
    const opts = stripeAccountOptions(venue);
    const customer = await stripe.customers.create({}, opts);
    const setupIntent = await stripe.setupIntents.create(
      { customer: customer.id, usage: 'off_session', automatic_payment_methods: { enabled: true } },
      opts
    );

    await supabase
      .from('session_guests')
      .update({ stripe_pm_id: customer.id })
      .eq('id', body.guest_id)
      .eq('session_id', sessionAuth.session_id);

    return Response.json({
      client_secret: setupIntent.client_secret,
      stripe_customer_id: customer.id,
      stripe_account_id: venue.stripe_account_id,
    });
  });
}
