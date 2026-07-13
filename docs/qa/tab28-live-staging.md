# TAB-28 live staging — operator notes

**Environment:** local staging against real Supabase + Stripe **test mode**  
**Base URL:** `http://127.0.0.1:3002`  
**Webhook:** `stripe listen --forward-to http://127.0.0.1:3002/api/webhooks/stripe` (must be running)

## Mode note

Stripe Connect is **not** enabled on the current platform account (`kinvisuals` / `acct_1Pq0wFRtZ0unuMCb`). Staging uses `STRIPE_PLATFORM_CHARGES=1` so onboarded venues charge the **platform** test account. Kitchen enqueue still requires a real `payment_intent.succeeded` webhook — same paid-ticket invariant.

Production venue payouts still need Connect signup (Dashboard → Connect → Get started).

## FE smoke (2026-07-13)

| Path | Result |
|------|--------|
| Scan → order `pending_payment` | PASS |
| Live PI create (platform) | PASS |
| Confirm `tok_visa` → webhook 200 → payment `captured` → order `received` + `paid_at` | PASS |
| Decline card → order stays `pending_payment` / unpaid | PASS (re-confirm in UI) |

## QA credentials

Posted on [TAB-28](/TAB/issues/TAB-28) comment (not duplicated here to avoid secret drift).
