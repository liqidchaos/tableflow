import { NextRequest } from 'next/server';
import { CreatePaymentIntentSchema } from '@tableflow/types';
import {
  getSupabase,
  parseBody,
  withHandler,
  getSessionAuth,
  requireStripe,
  auditLog,
  failDb,
} from '@/lib/api';
import { calcPlatformFeeCents } from '@/lib/platform-fee';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { withIdempotency } from '@/lib/idempotency';
import {
  assertAmountCoversOrderSubtotal,
  assertGuestOnSession,
  assertOrderBelongsToSession,
  assertSessionId,
} from '@/lib/session-binding';
import {
  canApplyConnectApplicationFee,
  stripeAccountOptions,
  venuePaymentsEnabled,
} from '@/lib/stripe-venue';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'payments/intent'), 30);
    const supabase = getSupabase();

    return withIdempotency(supabase, req, 'payments/intent', async () => {
      const sessionAuth = await getSessionAuth(req);
      const body = await parseBody(req, CreatePaymentIntentSchema);

      assertSessionId(sessionAuth, body.session_id);
      await assertGuestOnSession(supabase, body.guest_id, body.session_id);

      if (body.order_id) {
        const order = await assertOrderBelongsToSession(supabase, body.order_id, sessionAuth);
        assertAmountCoversOrderSubtotal(order.subtotal, body.amount);
      }

      const { data: venue } = await supabase
        .from('venues')
        .select('stripe_account_id, stripe_onboarded, service_fee_pct')
        .eq('id', sessionAuth.venue_id)
        .single();

      if (!venuePaymentsEnabled(venue)) {
        return Response.json({
          client_secret: null,
          payments_disabled: true,
          message: 'Payments are unavailable until Stripe is configured.',
        });
      }

      const stripe = requireStripe();
      const totalAmount = body.amount + (body.tip_amount ?? 0);
      const platformFee = canApplyConnectApplicationFee(venue)
        ? calcPlatformFeeCents(totalAmount, Number(venue.service_fee_pct))
        : 0;

      const piParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
        amount: totalAmount,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          order_id: body.order_id ?? '',
          session_id: sessionAuth.session_id,
          guest_id: body.guest_id,
          venue_id: sessionAuth.venue_id,
        },
      };

      if (platformFee > 0) {
        piParams.application_fee_amount = platformFee;
      }

      if (body.mode === 'preauth') {
        piParams.capture_method = 'manual';
      }

      const paymentIntent = await stripe.paymentIntents.create(
        piParams,
        stripeAccountOptions(venue)
      );

      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          venue_id: sessionAuth.venue_id,
          session_id: sessionAuth.session_id,
          guest_id: body.guest_id,
          order_id: body.order_id ?? null,
          stripe_payment_intent: paymentIntent.id,
          amount: totalAmount / 100,
          tip_amount: (body.tip_amount ?? 0) / 100,
          platform_fee: platformFee / 100,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) failDb(error);
      await auditLog(sessionAuth.venue_id, null, 'payment.intent_created', 'payment', payment!.id);

      return Response.json({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        stripe_account_id: venue.stripe_account_id,
      });
    });
  });
}
