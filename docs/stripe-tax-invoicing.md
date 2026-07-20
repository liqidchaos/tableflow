# Stripe Tax + Invoicing

Extends TableFlow's existing Stripe Connect/Payments/Billing integration (see
`docs/stripe-connect-enable.md`) with two previously-missing pieces: Stripe Tax on diner
checkout, and the Invoicing API for one-off venue charges. Everything else in the original
integration plan (Express Connect, direct charges + `application_fee_amount`, Billing Checkout
subscriptions) was already built — this doc only covers the new surface area.

## Stripe Tax

**Model:** dine-in, point-of-sale. Diners consume on-premises, so we never collect a diner
address. Tax is calculated using the **venue's own address** as the point of sale, following
Stripe's documented pattern for in-person sales without a customer address on file
(`customer_details.address` = venue address, `address_source: "shipping"`).

**Integration:** the ["simplified" Stripe Tax + PaymentIntents
integration](https://docs.stripe.com/tax/payment-intent/simplified) — a `tax.Calculation` is
created on the **connected account** (`Stripe-Account` header, via `stripeAccountOptions`, same
as the existing direct-charge flow), then linked to the PaymentIntent via
`metadata.tax_calculation`. Stripe automatically creates the Tax Transaction when the
PaymentIntent succeeds and reverses it (flat-amount) on refunds — no manual transaction/reversal
code needed. The connected account (venue) is liable for the tax it collects, consistent with it
already being the merchant of record on direct charges.

**Tax code:** `txcd_30011000` (Prepared Food). All order line items use this code; TableFlow
doesn't yet support per-item tax categories (e.g. alcohol vs. non-food retail).

**Fee semantics:** the platform application fee (`lib/platform-fee.ts`) is computed on the
pre-tax subtotal + tip, *not* the tax amount — the platform never takes a cut of collected sales
tax.

**Opt-in, per venue:** `venues.tax_enabled` defaults to `false`. Stripe Tax calculations incur
fees in live mode and only return non-zero tax in jurisdictions where the venue has an active
[tax registration](https://docs.stripe.com/tax/registering). Ops must confirm a venue has
registered in its jurisdiction (Stripe Dashboard → Tax → Registrations, using the **connected
account's** dashboard, not the platform's) before flipping this on. `calculateOrderTax()` also
requires a complete address (`address`, `city`, `postal_code`, `country`) — venues configure
this from Settings.

**Fail-open on errors:** if the tax calculation call throws (bad address, no registration, API
outage), `calculateOrderTax()` logs and returns `null`, and the payment proceeds untaxed rather
than blocking checkout. This trades a small under-collection risk for payment availability;
watch logs/audit trail if this matters for compliance in a given jurisdiction.

**Preauth tabs:** `payments/authorize` computes tax on the estimated hold amount and holds the
tax-inclusive total. `payments/capture` recomputes tax against the true final amount at
settlement. Capture amounts still can't exceed the original preauth hold (a pre-existing Stripe
constraint, not new here) — if a tab's final tax-inclusive total exceeds the original hold, the
capture call will fail and needs a fresh authorization; this mirrors the existing non-tax risk
if items are added to a tab after the hold is placed.

**Where it's wired in:** `lib/stripe-tax.ts` (calculation + gating logic), used by
`api/payments/intent`, `api/payments/charge`, `api/payments/authorize`, `api/payments/capture`.
Guest `PaymentSheet` reads `tax_amount` / `amount` from the intent response and shows a
tax line + tax-inclusive total after tip is locked so the UI matches what Stripe charges.

## Invoicing

One-off Stripe Invoices billed to a venue's Stripe **Customer** (`venues.stripe_customer_id`) —
for setup fees, hardware charges, or manual adjustments outside the recurring SaaS subscription
(which uses Checkout Sessions, see `lib/billing.ts`).

**Who creates invoices:** `POST /api/venues/[venue_id]/invoices` requires a Supabase Auth
bearer session whose `app_metadata.platform_admin === true` (checked via
`requirePlatformAdmin` in `lib/platform-admin.ts`, with IP rate limit). Grant the role only
via the Auth Admin API / service role — never `user_metadata`. Successful creates audit
`actor_id` to the platform-admin user. Venue owners/staff can only **read** their own
invoices (`GET` on the same route, normal operator auth) and pay via the Stripe-hosted
invoice page, surfaced in Settings.

**Grant platform admin (ops):** with the service role, set
`app_metadata: { platform_admin: true }` on the operator user (Dashboard → Auth → user →
App Metadata, or `auth.admin.updateUserById`). Revoke by clearing / setting `false`, then
ensure existing sessions refresh so JWT claims catch up (`getUser` is used server-side).

**Collection method:** `send_invoice` only. `charge_automatically` stays rejected at the
schema until dual-control exists (auto-debit without interactive consent).

**Flow:** `lib/invoicing.ts` creates an `InvoiceItem` on the venue's customer, creates the
`Invoice` with `auto_advance: false`, then explicitly finalizes and emails it — avoiding a race
with Stripe's own async auto-advance job. A `venue_invoices` row tracks the Stripe invoice
locally for the Settings UI; the webhook handler (`api/webhooks/stripe/route.ts`) syncs
`status`/`paid_at` on `invoice.paid`, `invoice.payment_failed`, `invoice.voided`, and
`invoice.marked_uncollectible`. These handlers match by `stripe_invoice_id`, so subscription
invoices (which have no `venue_invoices` row) safely no-op.

**Not built:** voiding/cancelling an invoice via the API (only via the Stripe Dashboard for
now), and a self-serve venue-facing "request an invoice" flow.

## Migration

`supabase/migrations/023_stripe_tax_and_invoicing.sql` adds `venues.state`,
`venues.postal_code`, `venues.tax_enabled`, `payments.tax_amount`,
`payments.stripe_tax_calculation_id`, and the `venue_invoices` table (RLS: owners/staff can
read their own venue's rows; all writes are service-role only, same pattern as
`stripe_webhook_events`).

Applied to hosted Supabase `cptyjloveecusgvituzo` (verified 2026-07-20 via `supabase migration list --linked`
and column presence on `venues` / `payments` / `venue_invoices`). Push path remains `npx supabase db push --linked`
(see `scripts/supabase-link-hosted.sh`).
