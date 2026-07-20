/**
 * One-off Stripe Invoices billed to a venue's Stripe Customer (setup fees, hardware, ad hoc
 * adjustments) — distinct from the recurring SaaS subscription created via Checkout
 * (see lib/billing.ts). Invoices are created on the *platform* Stripe account against the
 * venue's `stripe_customer_id`, mirroring how billing/checkout bills venues for their plan.
 *
 * Creation is gated by platform-admin RBAC (`app_metadata.platform_admin` via
 * requirePlatformAdmin in lib/platform-admin.ts) — not a venue-facing action. TableFlow's own
 * ops/finance team triggers these; venues can view + pay them from Settings.
 */

import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateVenueInvoiceInput {
  description: string;
  /** Cents. */
  amount: number;
  currency?: string;
  /** Only `send_invoice` until charge_automatically has explicit dual-control. */
  collection_method?: 'send_invoice';
  /** Defaults to 14 days. */
  days_until_due?: number;
}

export interface VenueForInvoicing {
  id: string;
  name: string;
  stripe_customer_id: string | null;
}

/** Reuses the venue's existing Stripe Customer, or lazily creates one. */
export async function ensureStripeCustomer(
  stripe: Stripe,
  supabase: SupabaseClient,
  venue: VenueForInvoicing,
  ownerEmail?: string | null
): Promise<string> {
  if (venue.stripe_customer_id) return venue.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: ownerEmail ?? undefined,
    name: venue.name,
    metadata: { venue_id: venue.id },
  });

  await supabase.from('venues').update({ stripe_customer_id: customer.id }).eq('id', venue.id);
  return customer.id;
}

export async function createVenueInvoice(
  stripe: Stripe,
  supabase: SupabaseClient,
  venue: VenueForInvoicing,
  input: CreateVenueInvoiceInput,
  ownerEmail?: string | null
) {
  const customerId = await ensureStripeCustomer(stripe, supabase, venue, ownerEmail);
  const currency = input.currency ?? 'usd';
  const collectionMethod = 'send_invoice' as const;

  const invoiceItem = await stripe.invoiceItems.create({
    customer: customerId,
    amount: input.amount,
    currency,
    description: input.description,
    metadata: { venue_id: venue.id },
  });

  // auto_advance: false + an explicit finalize call below avoids racing Stripe's own async
  // auto-advance job, which would otherwise sometimes finalize the invoice before we do.
  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: collectionMethod,
    auto_advance: false,
    description: input.description,
    days_until_due: input.days_until_due ?? 14,
    metadata: { venue_id: venue.id },
  });

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  await stripe.invoices.sendInvoice(finalized.id);

  const { data: row, error } = await supabase
    .from('venue_invoices')
    .insert({
      venue_id: venue.id,
      stripe_invoice_id: finalized.id,
      stripe_invoice_item_id: invoiceItem.id,
      description: input.description,
      amount: input.amount / 100,
      currency,
      status: finalized.status ?? 'open',
      hosted_invoice_url: finalized.hosted_invoice_url ?? null,
      invoice_pdf: finalized.invoice_pdf ?? null,
      due_date: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString() : null,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
}
