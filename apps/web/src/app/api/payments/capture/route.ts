import { NextRequest } from 'next/server';
import { CapturePaymentSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, requireStripe, getSessionAuth, auditLog, failDb } from '@/lib/api';
import { throwError } from '@tableflow/types';
import { calcPlatformFeeCents } from '@/lib/platform-fee';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { enqueueSessionPendingOrders, shouldEnqueueSessionPendingOnPayment } from '@/lib/kitchen-enqueue';
import {
  assertAmountCoversOrderSubtotal,
  getPendingPaymentSubtotalDollars,
} from '@/lib/session-binding';
import { canApplyConnectApplicationFee, stripeAccountOptions } from '@/lib/stripe-venue';
import { calculateOrderTax, TAX_CALCULATION_METADATA_KEY } from '@/lib/stripe-tax';
import type { TabMode } from '@tableflow/types';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'payments/capture'), 30);
    const body = await parseBody(req, CapturePaymentSchema);

    const sessionAuth = await getSessionAuth(req);
    const supabase = getSupabase();
    const stripe = requireStripe();

    const { data: payment } = await supabase
      .from('payments')
      .select(
        'id, venue_id, session_id, venues(stripe_account_id, service_fee_pct, tax_enabled, address, city, state, postal_code, country)'
      )
      .eq('stripe_payment_intent', body.payment_intent_id)
      .single();

    if (!payment) throwError('NOT_FOUND', 'Payment not found');

    if (payment.venue_id !== sessionAuth.venue_id || payment.session_id !== sessionAuth.session_id) {
      throwError('FORBIDDEN', 'Payment does not belong to this session');
    }

    const { data: session } = await supabase
      .from('table_sessions')
      .select('tab_mode')
      .eq('id', payment.session_id)
      .single();
    const tabMode = (session?.tab_mode ?? 'pay_per_order') as TabMode;

    // Capture may settle an open tab; never promote pending tickets on pay_per_order.
    if (shouldEnqueueSessionPendingOnPayment(tabMode)) {
      const pendingSubtotal = await getPendingPaymentSubtotalDollars(supabase, payment.session_id);
      assertAmountCoversOrderSubtotal(pendingSubtotal, body.final_amount);
    }

    const venue = payment.venues as unknown as {
      stripe_account_id: string | null;
      service_fee_pct: number;
      tax_enabled?: boolean | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    };
    const platformFee = canApplyConnectApplicationFee(venue)
      ? calcPlatformFeeCents(body.final_amount, Number(venue.service_fee_pct))
      : 0;

    // Recompute tax against the final settled subtotal (may differ from the authorize-time
    // estimate). The capture amount must still fit within the original preauth hold.
    const taxResult = await calculateOrderTax(stripe, venue, body.final_amount, payment.session_id);
    const captureAmount = (taxResult?.amountTotal ?? body.final_amount) + (body.tip_amount ?? 0);

    await stripe.paymentIntents.capture(
      body.payment_intent_id,
      {
        amount_to_capture: captureAmount,
        ...(platformFee > 0 ? { application_fee_amount: platformFee } : {}),
        ...(taxResult ? { metadata: { [TAX_CALCULATION_METADATA_KEY]: taxResult.calculationId } } : {}),
      },
      stripeAccountOptions(venue)
    );

    const { error } = await supabase.from('payments').update({
      status: 'captured',
      tip_amount: (body.tip_amount ?? 0) / 100,
      amount: captureAmount / 100,
      platform_fee: platformFee / 100,
      tax_amount: (taxResult?.taxAmount ?? 0) / 100,
      stripe_tax_calculation_id: taxResult?.calculationId ?? null,
      captured_at: new Date().toISOString(),
    }).eq('stripe_payment_intent', body.payment_intent_id);

    if (error) failDb(error);
    await auditLog(payment.venue_id, null, 'payment.captured', 'payment', payment.id);

    // Capture clears lingering pending tickets only for preauth / bar_tab (TAB-65).
    if (shouldEnqueueSessionPendingOnPayment(tabMode)) {
      const enqueued = await enqueueSessionPendingOrders(supabase, payment.session_id);
      for (const orderId of enqueued) {
        await auditLog(payment.venue_id, null, 'kitchen.enqueued', 'order', orderId, {
          reason: 'payments.capture',
        });
      }
    }

    return Response.json({
      status: 'captured',
      amount_captured: captureAmount,
      tax_amount: taxResult?.taxAmount ?? 0,
      receipt_url: null,
    });
  });
}
