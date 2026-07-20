import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getSupabase, withHandler, getStripe, auditLog } from '@/lib/api';
import { fireKitchenAfterPayment } from './fire-kitchen-after-payment';

async function recordWebhookEvent(
  supabase: ReturnType<typeof getSupabase>,
  event: Stripe.Event
): Promise<boolean> {
  const { error } = await supabase.from('stripe_webhook_events').insert({
    id: event.id,
    event_type: event.type,
  });
  if (error?.code === '23505') return false;
  if (error) throw error;
  return true;
}

export async function POST(req: Request) {
  return withHandler(async () => {
    const stripe = getStripe();
    // Fail closed: if Stripe is configured, webhook secret is mandatory.
    // Only skip when payments are entirely disabled (no secret key).
    if (!stripe) {
      return Response.json({ received: true, skipped: true });
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return Response.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    const body = await req.text();
    const signature = headers().get('stripe-signature');
    if (!signature) {
      return Response.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = getSupabase();
    const isNew = await recordWebhookEvent(supabase, event);
    if (!isNew) {
      return Response.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { data: payment } = await supabase
          .from('payments')
          .update({ status: 'authorized' })
          .eq('stripe_payment_intent', pi.id)
          .select('id, venue_id, session_id, order_id')
          .single();

        if (payment) {
          await fireKitchenAfterPayment(supabase, {
            venueId: payment.venue_id,
            sessionId: payment.session_id,
            orderId: payment.order_id ?? (pi.metadata?.order_id || null),
            source: 'payment_intent.amount_capturable_updated',
          });
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { data: payment } = await supabase
          .from('payments')
          .update({
            status: 'captured',
            captured_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent', pi.id)
          .select('id, venue_id, session_id, order_id')
          .single();

        if (payment) {
          await auditLog(payment.venue_id, null, 'payment.succeeded', 'payment', payment.id);
          await fireKitchenAfterPayment(supabase, {
            venueId: payment.venue_id,
            sessionId: payment.session_id,
            orderId: payment.order_id ?? (pi.metadata?.order_id || null),
            source: 'payment_intent.succeeded',
          });
          if (pi.metadata?.close_session === 'true') {
            await supabase
              .from('table_sessions')
              .update({ status: 'closed', closed_at: new Date().toISOString() })
              .eq('id', payment.session_id);
            await auditLog(payment.venue_id, null, 'session.closed', 'table_session', payment.session_id);
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabase.from('payments').update({ status: 'failed' }).eq('stripe_payment_intent', pi.id);
        break;
      }
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const onboarded = account.charges_enabled && account.payouts_enabled;
        const { data: venue } = await supabase
          .from('venues')
          .update({ stripe_onboarded: onboarded })
          .eq('stripe_account_id', account.id)
          .select('id')
          .single();
        if (venue && onboarded) {
          await auditLog(venue.id, null, 'activation.stripe_connected', 'venue', venue.id);
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          const { data: payment } = await supabase
            .from('payments')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent', charge.payment_intent as string)
            .select('id, venue_id')
            .single();
          if (payment) {
            await auditLog(payment.venue_id, null, 'payment.refunded', 'payment', payment.id);
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const venueId = sub.metadata?.venue_id;
        const plan = sub.metadata?.plan ?? 'starter';
        if (venueId) {
          await supabase
            .from('venues')
            .update({
              stripe_subscription_id: sub.id,
              subscription_status: sub.status,
              plan,
            })
            .eq('id', venueId);
          if (sub.status === 'active') {
            await auditLog(venueId, null, 'activation.subscribed', 'venue', venueId, { plan });
          }
        } else if (sub.customer) {
          await supabase
            .from('venues')
            .update({
              stripe_subscription_id: sub.id,
              subscription_status: sub.status,
            })
            .eq('stripe_customer_id', sub.customer as string);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const venueId = sub.metadata?.venue_id;
        const query = venueId
          ? supabase.from('venues').update({ subscription_status: 'canceled' }).eq('id', venueId)
          : supabase
              .from('venues')
              .update({ subscription_status: 'canceled' })
              .eq('stripe_subscription_id', sub.id);
        await query;
        break;
      }
      case 'invoice.paid': {
        // Only matches rows created via POST /api/venues/[venue_id]/invoices (one-off charges);
        // SaaS subscription invoices from Checkout have no venue_invoices row and no-op here.
        const invoice = event.data.object as Stripe.Invoice;
        const { data: venueInvoice } = await supabase
          .from('venue_invoices')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('stripe_invoice_id', invoice.id)
          .select('id, venue_id')
          .single();
        if (venueInvoice) {
          await auditLog(venueInvoice.venue_id, null, 'invoice.paid', 'venue_invoice', venueInvoice.id);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await supabase
          .from('venue_invoices')
          .update({ status: 'open' })
          .eq('stripe_invoice_id', invoice.id);
        break;
      }
      case 'invoice.voided':
      case 'invoice.marked_uncollectible': {
        const invoice = event.data.object as Stripe.Invoice;
        const status = event.type === 'invoice.voided' ? 'void' : 'uncollectible';
        await supabase
          .from('venue_invoices')
          .update({
            status,
            ...(status === 'void' ? { voided_at: new Date().toISOString() } : {}),
          })
          .eq('stripe_invoice_id', invoice.id);
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.metadata?.venue_id) {
          await supabase
            .from('venues')
            .update({
              plan: session.metadata.plan ?? 'starter',
              subscription_status: 'active',
            })
            .eq('id', session.metadata.venue_id);
          await auditLog(
            session.metadata.venue_id,
            null,
            'activation.subscribed',
            'venue',
            session.metadata.venue_id,
            { plan: session.metadata.plan }
          );
        }
        break;
      }
    }

    return Response.json({ received: true });
  });
}
