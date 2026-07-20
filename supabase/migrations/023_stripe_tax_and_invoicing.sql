-- 023_stripe_tax_and_invoicing.sql — Stripe Tax (dine-in point-of-sale) + Invoicing API

-- Venue address fields needed for Tax Calculation customer_details.address (point-of-sale
-- sourcing: the diner consumes on-premises, so the venue's own address is used).
alter table venues add column if not exists state text;
alter table venues add column if not exists postal_code text;
-- Opt-in per venue: Stripe Tax calculations incur fees in live mode and require the venue's
-- jurisdiction to have an active Stripe Tax registration, so this must not default to on.
alter table venues add column if not exists tax_enabled boolean default false;

-- Track tax collected per payment (venue is liable/merchant of record; see docs/stripe-tax-invoicing.md).
alter table payments add column if not exists tax_amount numeric(10,2) default 0;
alter table payments add column if not exists stripe_tax_calculation_id text;

-- One-off Stripe Invoices billed to a venue's Stripe Customer (setup fees, adjustments, etc.),
-- distinct from the recurring SaaS subscription created via Checkout in 016_billing_launch.sql.
create table if not exists venue_invoices (
  id                          uuid primary key default gen_random_uuid(),
  venue_id                    uuid references venues(id) not null,
  stripe_invoice_id           text not null unique,
  stripe_invoice_item_id      text,
  description                 text not null,
  amount                      numeric(10,2) not null,
  currency                    text default 'usd',
  status                      text default 'draft',
  hosted_invoice_url          text,
  invoice_pdf                 text,
  due_date                    timestamptz,
  created_at                  timestamptz default now(),
  paid_at                     timestamptz,
  voided_at                   timestamptz
);

create index if not exists idx_venue_invoices_venue on venue_invoices(venue_id);

alter table venue_invoices enable row level security;

drop policy if exists venue_invoices_read on venue_invoices;
create policy venue_invoices_read on venue_invoices for select
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

-- No insert/update/delete policy: invoices are only ever written by the service role
-- (POST /api/venues/[venue_id]/invoices, gated by requirePlatformAdmin) and the Stripe
-- webhook handler, matching the stripe_webhook_events / api_idempotency_keys pattern.
