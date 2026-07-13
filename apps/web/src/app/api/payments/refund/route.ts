import { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { RefundPaymentSchema, throwError } from '@tableflow/types';
import {
  getSupabase,
  parseBody,
  withHandler,
  getOperatorUser,
  requireStripe,
  auditLog,
  failDb,
} from '@/lib/api';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { platformChargesEnabled, stripeAccountOptions } from '@/lib/stripe-venue';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'payments/refund'), 20);
    const user = await getOperatorUser(req);
    const body = await parseBody(req, RefundPaymentSchema);
    const supabase = getSupabase();
    const stripe = requireStripe();

    const { data: payment } = await supabase
      .from('payments')
      .select('id, venue_id, status, amount, tip_amount, stripe_payment_intent, venues(stripe_account_id, owner_id)')
      .eq('stripe_payment_intent', body.payment_intent_id)
      .single();

    if (!payment) throwError('NOT_FOUND', 'Payment not found');

    const venue = payment.venues as unknown as {
      stripe_account_id: string | null;
      owner_id: string;
    };

    const isOwner = venue.owner_id === user.id;
    if (!isOwner) {
      const { data: staff } = await supabase
        .from('staff')
        .select('role')
        .eq('venue_id', payment.venue_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!staff || (staff.role !== 'owner' && staff.role !== 'manager')) {
        throwError('FORBIDDEN', 'Only owners and managers can issue refunds');
      }
    }

    if (payment.status === 'refunded') {
      throwError('VALIDATION_ERROR', 'Payment is already refunded');
    }

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      throwError('VALIDATION_ERROR', 'Only captured or authorized payments can be refunded');
    }

    if (!venue.stripe_account_id && !platformChargesEnabled()) {
      throwError('VENUE_NOT_ONBOARDED', 'Stripe is not configured for this venue');
    }

    const maxCents = Math.round((Number(payment.amount) + Number(payment.tip_amount ?? 0)) * 100);
    if (body.amount != null && body.amount > maxCents) {
      throwError('VALIDATION_ERROR', 'Refund amount exceeds payment total');
    }

    let refundId: string | null = null;
    const stripeOpts = stripeAccountOptions(venue);

    if (payment.status === 'authorized') {
      await stripe.paymentIntents.cancel(body.payment_intent_id, {}, stripeOpts);
    } else {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: body.payment_intent_id,
        reason: body.reason,
      };
      if (body.amount != null) refundParams.amount = body.amount;

      const refund = await stripe.refunds.create(refundParams, stripeOpts);
      refundId = refund.id;
    }

    const { error } = await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', payment.id);

    if (error) failDb(error);
    await auditLog(payment.venue_id, user.id, 'payment.refund_initiated', 'payment', payment.id, {
      refund_id: refundId,
      amount: body.amount ?? maxCents,
      reason: body.reason,
    });

    return Response.json({
      status: 'refunded',
      payment_id: payment.id,
      refund_id: refundId,
      amount_refunded: body.amount ?? maxCents,
    });
  });
}
