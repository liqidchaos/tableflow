# Operator setup checklist — live in under 2 hours

**Goal:** Venue → tables/QR → menu → flat pricing → paid smoke test, with no legacy POS wiring.

**Claim:** A new venue can go from account creation to a paid kitchen ticket in **under 2 hours**. Measured path below targets **~35–55 minutes** of active work (plus Stripe Express KYC when Connect is required).

---

## Before you start (platform / ops)

| Item | Notes |
|------|--------|
| App URL | Staging example: `http://127.0.0.1:3002` |
| Env | `STRIPE_*`, Supabase keys, `SESSION_JWT_SECRET` |
| Staging payments | `STRIPE_PLATFORM_CHARGES=1` — guest cards charge the **platform** test account; venues skip Express signup |
| Production payments | Connect must be enabled on the Stripe platform (`docs/stripe-connect-enable.md`) |
| Webhooks | `stripe listen --forward-to <APP_URL>/api/webhooks/stripe` for local |

---

## Timed checklist (operator)

| # | Step | Where | Est. | Done when |
|---|------|-------|------|-----------|
| 1 | Create account | `/register` — name, venue, email, password | 3 min | Redirects to dashboard (staging) or Stripe Express (prod) |
| 2 | Confirm trial / plan | `/settings` → Billing | 2 min | Plan shows **starter** · status **trialing** · $99/$199 visible |
| 3 | Payments ready | `/settings` → Stripe | 0–15 min | Staging: “platform charges” ready. Prod: Express KYC complete |
| 4 | Tables + print QRs | `/tables` → **Print all QRs** (or per-table Print) | 10–20 min | One QR sheet per table; tape/place on floor |
| 5 | Review menu | `/menu` — edit seeded demo items or add yours | 10–30 min | At least one available item guests can order |
| 6 | Smoke test (paid) | Phone → scan QR → `/g/<code>` → add item → pay | 5–10 min | Order leaves `pending_payment`; KDS shows ticket **only after** pay |
| 7 | Floor check | `/floor` + `/kds` | 2 min | Table shows active session; kitchen ticket present |

**Target total:** 35–55 min (staging) · up to ~90 min if production Connect KYC is slow.

---

## In-product guide

1. Dashboard checklist: **Get live in under 2 hours** (synced from `/api/venues/:id/onboarding`).
2. Help → setup links for QR, menu, Stripe, KDS.
3. Tables → **Print all QRs** for static mode.

---

## Smoke test detail (invariant)

1. Open guest URL from a printed QR (`/g/<qr_code>`).
2. Add a menu item → checkout.
3. Pay with a Stripe test card (`4242…`) when payments are enabled.
4. Confirm webhook marks payment captured and kitchen enqueue runs.
5. Open `/kds` — ticket must **not** appear before payment succeeds.

Pay-before-fire is non-negotiable.

---

## Remaining blockers (as of 2026-07-13)

| Blocker | Owner | Impact on 2-hour claim |
|---------|-------|------------------------|
| Stripe Connect not enabled on platform account | Ops / Stripe Dashboard owner | Production venue **payouts** blocked; staging OK with `STRIPE_PLATFORM_CHARGES=1` |
| Physical printer / table placement | Venue staff | Wall-clock time, not product time |
| Real menu photography / item count | Venue | Can ship with seeded menu first |

---

## Out of scope

- Legacy POS integration
- Custom enterprise contracts / multi-venue pricing (contact sales)
