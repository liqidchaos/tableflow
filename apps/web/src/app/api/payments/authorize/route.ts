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
import {
  assertAmountCoversOrderSubtotal,
  assertGuestOnSession,
  assertSessionId,
  assertTabModeAllowsSessionClearance,
  getPendingPaymentSubtotalDollars,
} from '@/lib/session-binding';
import {
  canApplyConnectApplicationFee,
  stripeAccountOptions,
  venuePaymentsEnabled,
} from '@/lib/stripe-venue';
import { calculateOrderTax, TAX_CALCULATION_METADATA_KEY } from '@/lib/stripe-tax';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'payments/authorize'), 30);
    const supabase = getSupabase();

    return withIdempotency(supabase, req, 'payments/authorize', async () => {
      const sessionAuth = await getSessionAuth(req);
      const body = await parseBody(req, AuthorizePaymentSchema);

      assertSessionId(sessionAuth, body.session_id);
      await assertGuestOnSession(supabase, body.guest_id, body.session_id);

      const { data: session } = await supabase
        .from('table_sessions')
        .select('tab_mode')
        .eq('id', sessionAuth.session_id)
        .single();
      assertTabModeAllowsSessionClearance(session?.tab_mode);

      // Complete mediation: hold must cover existing pending_payment liability (TAB-65).
      const pendingSubtotal = await getPendingPaymentSubtotalDollars(
        supabase,
        sessionAuth.session_id
      );
      assertAmountCoversOrderSubtotal(pendingSubtotal, body.amount);

      const { data: venue } = await supabase
        .from('venues')
        .select(
          'stripe_account_id, stripe_onboarded, service_fee_pct, tax_enabled, address, city, state, postal_code, country'
        )
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

      // `body.amount` is the estimated tab subtotal; hold the tax-inclusive total so the eventual
      // capture (which recomputes tax against the final settled amount) doesn't exceed this hold.
      const taxResult = await calculateOrderTax(stripe, venue, body.amount, sessionAuth.session_id);
      const holdAmount = taxResult?.amountTotal ?? body.amount;

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: holdAmount,
          currency: 'usd',
          payment_method: body.payment_method_id,
          capture_method: 'manual',
          confirm: true,
          ...(platformFee > 0 ? { application_fee_amount: platformFee } : {}),
          metadata: {
            session_id: sessionAuth.session_id,
            guest_id: body.guest_id,
            venue_id: sessionAuth.venue_id,
            ...(taxResult ? { [TAX_CALCULATION_METADATA_KEY]: taxResult.calculationId } : {}),
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
        amount: holdAmount / 100,
        platform_fee: platformFee / 100,
        tax_amount: (taxResult?.taxAmount ?? 0) / 100,
        stripe_tax_calculation_id: taxResult?.calculationId ?? null,
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
        amount_authorized: holdAmount,
        tax_amount: taxResult?.taxAmount ?? 0,
      });
    });
  });
}
