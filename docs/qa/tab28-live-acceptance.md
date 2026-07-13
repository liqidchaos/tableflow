# TAB-28 live staging acceptance — FAIL

**Date:** 2026-07-13  
**Environment:** `http://127.0.0.1:3002` + live Stripe test mode + Supabase + `stripe listen`  
**Mode:** `STRIPE_PLATFORM_CHARGES=1` (Connect not enabled)

## Verdict: FAIL (blocker)

Unpaid / declined `pay_per_order` tickets can still reach KDS after a later successful payment on the same session.

| Gate | Result |
|------|--------|
| A Guest scan→cart→pay gate | PASS |
| B Paid → KDS | PASS |
| C Decline → never on KDS | FAIL |
| D Floor Water→Alex Server | PASS |
| Guest Pay Now (Elements) | FAIL (`elements.submit()`) |

## Defects

- TAB-42 (critical): `fireKitchenAfterPayment` → `enqueueSessionPendingOrders` promotes unpaid session orders
- TAB-43 (high): PaymentSheet missing `elements.submit()` before `confirmPayment`

## Evidence

Screenshots under `apps/web/e2e/.evidence/tab28/` (also attached on TAB-28).
