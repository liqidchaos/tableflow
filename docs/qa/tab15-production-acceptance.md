# Production acceptance checklist — scan → pay → kitchen → floor

**Issue:** TAB-15  
**Date:** 2026-07-13  
**Environment:** Local Playwright against Next.js (`PLAYWRIGHT_BASE_URL` default `http://127.0.0.1:3100`)  
**Suite command:** `cd apps/web && npm run test:e2e:acceptance`  
**Result:** **7/7 passed** (mocked APIs)

## Go / no-go summary

| Gate | Result | Notes |
|------|--------|-------|
| Guest scan → menu → cart → pay gate | **PASS** | Kitchen-starts-after-pay copy visible |
| Paid-ticket invariant on KDS | **PASS** | Paid ticket renders; leaked `pending_payment` hidden |
| Payment decline → kitchen stays dark | **PASS** | Decline message shown; KDS empty (`0 paid tickets`) |
| Floor request routing + session stage | **PASS** | Water request → Alex Server; Ordering stage |
| Smoke (home / login / register) | **PASS** | Marketing + auth shells load |
| Live Stripe / real Supabase staging | **NOT RUN** | Follow-up: live staging acceptance |

**Local go recommendation (mocked path):** **GO** for client/UX acceptance of the core promise and paid-ticket invariant.  
**Production go:** still requires a live staging pass (Stripe + DB) before customer launch — tracked as a child issue.

---

## Checklist detail

### A. Guest: scan → order → pay → status

| # | Step | Expected | Actual | Status |
|---|------|----------|--------|--------|
| A1 | Open `/g/{qr}` | Venue + menu load | Rusty Anchor + Wagyu Burger | PASS |
| A2 | Add item → View cart | Cart shows line item | `1× Wagyu Burger` | PASS |
| A3 | Continue to pay | Pay sheet; kitchen-after-pay copy | Visible | PASS |
| A4 | Continue with payments disabled | Counter path; kitchen will not start | Visible + Pay at Counter | PASS |

Evidence: `01-guest-pay-gate.png`, `02-guest-pay-at-counter.png`

### B. Paid-ticket invariant (KDS)

| # | Step | Expected | Actual | Status |
|---|------|----------|--------|--------|
| B1 | KDS with paid + unpaid leak in API payload | Only paid ticket UI | Table 1 / Wagyu / Paid; Table 99 absent | PASS |
| B2 | Header / empty copy | “Paid tickets only” | Visible | PASS |
| B3 | After card decline, KDS feed is unpaid-only | No tickets; unpaid stay off board | `0 paid tickets` + empty-state copy | PASS |

Evidence: `03-kds-paid-only.png`, `05-kds-empty-after-decline.png`  
Supporting unit coverage: `kds-tickets`, `kitchen-enqueue` (run separately).

### C. Payment failure (negative)

| # | Step | Expected | Actual | Status |
|---|------|----------|--------|--------|
| C1 | `/api/payments/intent` → 402 declined | Guest sees decline; kitchen not started messaging | Decline alert text shown | PASS |
| C2 | Staff opens KDS | Unpaid order never appears | Empty board | PASS |

Evidence: `04-guest-payment-declined.png`, `05-kds-empty-after-decline.png`

### D. Floor: requests + session states

| # | Step | Expected | Actual | Status |
|---|------|----------|--------|--------|
| D1 | Open `/floor` as staff | Floor Status loads | Visible | PASS |
| D2 | Pending water request | Routed to assigned server | “Water requested at Table 1” → Alex Server | PASS |
| D3 | Table grid stage | Ordering + staff name | Visible | PASS |

Evidence: `06-floor-request-routing.png`

---

## How to re-run locally

```bash
cd apps/web
npm run test:e2e:acceptance
# or full e2e:
npm run test:e2e
```

Playwright auto-starts `next dev -p 3100` when no server is listening (`reuseExistingServer` outside CI).

Screenshots land in `apps/web/e2e/.evidence/tab15/` (gitignored).

---

## Residual risks / owners

| Item | Severity | Owner | Action |
|------|----------|-------|--------|
| Live Stripe + Supabase staging acceptance not executed this run | High for production launch | Founding Engineer + QA | Provide staging credentials/URL; QA re-runs checklist against live APIs |
| Menu item image empty in guest Concierge card (mock had no image URL) | Low / visual | UXDesigner (if real catalog images missing in prod) | Confirm catalog image requirements; not a functional blocker |

No functional bugs filed from this run — suite green.
