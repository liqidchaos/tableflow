import { NextRequest } from 'next/server';
import { CreatePaymentIntentSchema, throwError } from '@tableflow/types';
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
    await checkRateLimit(rateLimitKey(req, 'payments/intent'), 30);
    const supabase = getSupabase();

    return withIdempotency(supabase, req, 'payments/intent', async () => {
      const sessionAuth = await getSessionAuth(req);
      const body = await parseBody(req, CreatePaymentIntentSchema);

      assertSessionId(sessionAuth, body.session_id);
      await assertGuestOnSession(supabase, body.guest_id, body.session_id);

      if (body.mode === 'preauth') {
        const { data: session } = await supabase
          .from('table_sessions')
          .select('tab_mode')
          .eq('id', sessionAuth.session_id)
          .single();
        assertTabModeAllowsSessionClearance(session?.tab_mode);
        const pendingSubtotal = await getPendingPaymentSubtotalDollars(
          supabase,
          sessionAuth.session_id
        );
        assertAmountCoversOrderSubtotal(pendingSubtotal, body.amount);
      } else if (body.order_id) {
        const order = await assertOrderBelongsToSession(supabase, body.order_id, sessionAuth);
        assertAmountCoversOrderSubtotal(order.subtotal, body.amount);
      } else {
        // pay_order without order_id: no kitchen clearance path, but refuse unbound amounts
        // so clients cannot mint arbitrary PaymentIntents against the venue Connect account.
        throwError('VALIDATION_ERROR', 'order_id is required for pay_order mode');
      }

      const { data: venue } = await supabase
        .from('venues')
        .select(
          'stripe_account_id, stripe_onboarded, service_fee_pct, tax_enabled, address, city, state, postal_code, country'
        )
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
      const tipAmount = body.tip_amount ?? 0;
      const preTaxAmount = body.amount + tipAmount;
      const platformFee = canApplyConnectApplicationFee(venue)
        ? calcPlatformFeeCents(preTaxAmount, Number(venue.service_fee_pct))
        : 0;

      const taxResult = await calculateOrderTax(
        stripe,
        venue,
        body.amount,
        body.order_id ?? sessionAuth.session_id
      );
      const totalAmount = (taxResult?.amountTotal ?? body.amount) + tipAmount;

      const piParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
        amount: totalAmount,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          order_id: body.order_id ?? '',
          session_id: sessionAuth.session_id,
          guest_id: body.guest_id,
          venue_id: sessionAuth.venue_id,
          ...(taxResult ? { [TAX_CALCULATION_METADATA_KEY]: taxResult.calculationId } : {}),
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
          tip_amount: tipAmount / 100,
          platform_fee: platformFee / 100,
          tax_amount: (taxResult?.taxAmount ?? 0) / 100,
          stripe_tax_calculation_id: taxResult?.calculationId ?? null,
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
        amount: totalAmount,
        tax_amount: taxResult?.taxAmount ?? 0,
      });
    });
  });
}
