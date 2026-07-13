import { NextRequest } from 'next/server';
import { BillingCheckoutSchema } from '@tableflow/types';
import {
  getSupabase,
  parseBody,
  withHandler,
  getOperatorUser,
  requireStripe,
} from '@/lib/api';
import { throwError } from '@tableflow/types';
import { getStripePriceId } from '@/lib/billing';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    const user = await getOperatorUser(req);
    const body = await parseBody(req, BillingCheckoutSchema);
    const supabase = getSupabase();
    const stripe = requireStripe();

    const { data: venue } = await supabase
      .from('venues')
      .select('id, stripe_customer_id, name')
      .eq('owner_id', user.id)
      .single();

    if (!venue) throwError('NOT_FOUND', 'Venue not found');

    let customerId = venue.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: venue.name,
        metadata: { venue_id: venue.id },
      });
      customerId = customer.id;
      await supabase
        .from('venues')
        .update({ stripe_customer_id: customerId })
        .eq('id', venue.id);
    }

    const priceId = getStripePriceId(body.plan);
    if (!priceId) {
      throwError('INTERNAL_ERROR', 'Billing is not configured. Set STRIPE_PRICE_STARTER and STRIPE_PRICE_GROWTH.');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId!, quantity: 1 }],
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancel`,
      metadata: { venue_id: venue.id, plan: body.plan },
      subscription_data: { metadata: { venue_id: venue.id, plan: body.plan } },
    });

    return Response.json({ checkout_url: session.url });
  });
}
