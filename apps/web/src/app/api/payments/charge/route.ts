import { NextRequest } from 'next/server';
import { ChargePaymentSchema } from '@tableflow/types';
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
import { enqueueOrderToKitchen } from '@/lib/kitchen-enqueue';
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
    await checkRateLimit(rateLimitKey(req, 'payments/charge'), 30);
    const supabase = getSupabase();

    return withIdempotency(supabase, req, 'payments/charge', async () => {
      const sessionAuth = await getSessionAuth(req);
      const body = await parseBody(req, ChargePaymentSchema);

      assertSessionId(sessionAuth, body.session_id);
      await assertGuestOnSession(supabase, body.guest_id, body.session_id);
      const order = await assertOrderBelongsToSession(supabase, body.order_id, sessionAuth);
      assertAmountCoversOrderSubtotal(order.subtotal, body.amount);

      const { data: venue } = await supabase
        .from('venues')
        .select('stripe_account_id, stripe_onboarded, service_fee_pct')
        .eq('id', sessionAuth.venue_id)
        .single();

      if (!venuePaymentsEnabled(venue)) {
        return Response.json({
          payment_intent_id: null,
          status: 'skipped',
          payments_disabled: true,
          message: 'Payments are unavailable until Stripe is configured.',
        });
      }

      const stripe = requireStripe();
      const totalAmount = body.amount + (body.tip_amount ?? 0);
      const platformFee = canApplyConnectApplicationFee(venue)
        ? calcPlatformFeeCents(totalAmount, Number(venue.service_fee_pct))
        : 0;

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: totalAmount,
          currency: 'usd',
          payment_method: body.payment_method_id,
          confirm: true,
          ...(platformFee > 0 ? { application_fee_amount: platformFee } : {}),
          metadata: {
            order_id: body.order_id,
            session_id: sessionAuth.session_id,
            venue_id: sessionAuth.venue_id,
            close_session: 'false',
          },
        },
        stripeAccountOptions(venue)
      );

      const cleared = paymentIntent.status === 'succeeded';
      const { data: payment, error } = await supabase.from('payments').insert({
        venue_id: sessionAuth.venue_id,
        session_id: sessionAuth.session_id,
        guest_id: body.guest_id,
        order_id: body.order_id,
        stripe_payment_intent: paymentIntent.id,
        amount: totalAmount / 100,
        tip_amount: (body.tip_amount ?? 0) / 100,
        platform_fee: platformFee / 100,
        status: cleared ? 'captured' : 'pending',
        captured_at: cleared ? new Date().toISOString() : null,
      }).select('id').single();

      if (error) failDb(error);
      await auditLog(sessionAuth.venue_id, null, 'payment.charged', 'payment', payment!.id);

      if (cleared) {
        const result = await enqueueOrderToKitchen(supabase, body.order_id);
        if (result.enqueued) {
          await auditLog(sessionAuth.venue_id, null, 'kitchen.enqueued', 'order', body.order_id, {
            reason: 'payments.charge',
          });
        }
      }

      return Response.json({ payment_intent_id: paymentIntent.id, status: paymentIntent.status });
    });
  });
}
