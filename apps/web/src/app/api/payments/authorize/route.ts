import { NextRequest } from 'next/server';
import { AuthorizePaymentSchema } from '@tableflow/types';
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
import { enqueueSessionPendingOrders } from '@/lib/kitchen-enqueue';
import { assertGuestOnSession, assertSessionId } from '@/lib/session-binding';
import {
  canApplyConnectApplicationFee,
  stripeAccountOptions,
  venuePaymentsEnabled,
} from '@/lib/stripe-venue';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'payments/authorize'), 30);
    const supabase = getSupabase();

    return withIdempotency(supabase, req, 'payments/authorize', async () => {
      const sessionAuth = await getSessionAuth(req);
      const body = await parseBody(req, AuthorizePaymentSchema);

      assertSessionId(sessionAuth, body.session_id);
      await assertGuestOnSession(supabase, body.guest_id, body.session_id);

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
          message: 'Preauth is unavailable until Stripe is configured.',
        });
      }

      const stripe = requireStripe();
      const platformFee = canApplyConnectApplicationFee(venue)
        ? calcPlatformFeeCents(body.amount, Number(venue.service_fee_pct))
        : 0;

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: body.amount,
          currency: 'usd',
          payment_method: body.payment_method_id,
          capture_method: 'manual',
          confirm: true,
          ...(platformFee > 0 ? { application_fee_amount: platformFee } : {}),
          metadata: {
            session_id: sessionAuth.session_id,
            guest_id: body.guest_id,
            venue_id: sessionAuth.venue_id,
          },
        },
        stripeAccountOptions(venue)
      );

      const authorized =
        paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded';

      const { data: payment, error } = await supabase.from('payments').insert({
        venue_id: sessionAuth.venue_id,
        session_id: sessionAuth.session_id,
        guest_id: body.guest_id,
        stripe_payment_intent: paymentIntent.id,
        amount: body.amount / 100,
        platform_fee: platformFee / 100,
        status: authorized ? 'authorized' : 'pending',
      }).select('id').single();

      if (error) failDb(error);
      await auditLog(sessionAuth.venue_id, null, 'payment.authorized', 'payment', payment!.id);

      if (authorized) {
        const enqueued = await enqueueSessionPendingOrders(supabase, sessionAuth.session_id);
        for (const orderId of enqueued) {
          await auditLog(sessionAuth.venue_id, null, 'kitchen.enqueued', 'order', orderId, {
            reason: 'payments.authorize',
          });
        }
      }

      return Response.json({
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
        amount_authorized: body.amount,
      });
    });
  });
}
