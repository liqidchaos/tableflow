# KDS paid-only audit (TAB-7)

**Date:** 2026-07-13  
**Invariant:** Kitchen enqueue requires successful payment — never show unpaid tickets on the KDS.

## Deliverable checklist

| # | Deliverable | Status |
|---|---|---|
| 1 | Audit KDS route/UI vs paid-only | Pass — query + mapper + client filter |
| 2 | Live updates for paid tickets + status | Pass — realtime INSERT/UPDATE + age tick |
| 3 | Ticket clarity (table, items, modifiers, urgency) | Pass — TicketCard courses + Paid badge |
| 4 | Prove unpaid never appears | Pass — unit + e2e leak guard |

## Layers

1. **Enqueue gate (TAB-5):** orders insert as `pending_payment`; only payment/staff fire → `received`.
2. **API:** `GET /api/venues/:id/kds` filters `.in(status, received|preparing|ready)`.
3. **Mapper:** `buildKdsTickets` drops any non-KDS status even if the query leaked rows; ages from `paid_at`.
4. **Client:** `useKDSFeed` re-filters with `filterPaidKdsTickets`; realtime ignores unpaid INSERT; alerts only on first `received`.
5. **UI:** every ticket shows a **Paid** badge; empty state says unpaid stay off the board.

## Live feed behavior

| Event | Behavior |
|---|---|
| `orders` INSERT `pending_payment` | No refresh, no alert |
| `orders` INSERT/UPDATE → `received` | Refresh + alert |
| Status `preparing` / `ready` / bump off board | Refresh (ticket updates or leaves) |
| Every 30s | Recompute `age_minutes` from `received_at` for rush coloring |

## Verify

```bash
npm test --workspace=web -- kds-tickets
npm test --workspace=web -- kitchen-enqueue
# e2e (dev server on :3001):
cd apps/web && PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test e2e/order-flow.spec.ts -g "KDS shows paid"
```

Evidence (2026-07-13):

- `kds-tickets` + `kitchen-enqueue`: **11 passed**
- Playwright `KDS shows paid ticket only`: **passed** (paid ticket + modifiers visible; leaked `pending_payment` row hidden)

## Out of scope

- Printer drivers / station routing hardware
- Auto-recall on refund after fire
- Operator “Mark paid / fire” dashboard button (API exists; UI still follow-up)
