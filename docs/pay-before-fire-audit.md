# Pay-before-fire gap audit (TAB-5)

**Date:** 2026-07-12  
**Invariant:** Kitchen enqueue requires successful payment — never fire unpaid tickets.

## Trace: order → payment → KDS

| Path | Before | After |
|---|---|---|
| `POST /api/orders` | Inserted `status=received` immediately | Inserts `pending_payment`; enqueues to `received` only if preauth/bar_tab session already has authorized/captured payment |
| Guest web `/g/[code]` pay_per_order | Order created then pay sheet; KDS already showed ticket | Order stays `pending_payment` until Stripe succeeds |
| `POST /api/payments/charge` | Captured payment; no kitchen transition | On success → `enqueueOrderToKitchen(order_id)` |
| `POST /api/payments/authorize` | Session preauth only | On authorize → enqueue all session `pending_payment` orders |
| `POST /api/payments/capture` | Closed tab; no kitchen link | Enqueues any lingering session pending orders |
| `POST /api/payments/intent` | No `payments.order_id` | Persists `order_id` for webhook resolution |
| Stripe webhook `payment_intent.*` | Updated payment row only | On authorize/capture → enqueue order + session pending |
| `GET /api/venues/:id/kds` | All `received\|preparing\|ready` | Same statuses; `pending_payment` excluded; age from `paid_at` |
| `useKDSFeed` realtime | Alerted on any order INSERT | Alerts only when status is/becomes `received` |
| Inventory trigger | Fired on order INSERT | Fires on status → `received` only |
| Staff cash / Stripe-off | Unpaid tickets still hit KDS | Staff `PATCH .../status` with `received` marks paid and fires |

## Critical holes closed

1. Unpaid order create → KDS visibility  
2. Missing kitchen enqueue on payment success (API + webhook)  
3. Realtime kitchen alert on unpaid insert  
4. Inventory decrement before payment  

## Residual / follow-ups

- Operator UI affordance for “Mark paid / fire” on `pending_payment` rows (API exists; dashboard button not yet).  
- Refund after fire does not auto-recall KDS tickets (out of scope for this audit).  
- Apply migration `018_pay_before_fire.sql` in each environment.

## Regression check

```bash
npm test --workspace=web -- kitchen-enqueue
```

Covers clearance statuses, pay_per_order gate, preauth gate, payments-disabled gate, and KDS visibility filter.
