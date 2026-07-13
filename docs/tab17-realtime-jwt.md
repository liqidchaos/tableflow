# TAB-17 — Realtime JWT vs RLS

**Date:** 2026-07-13  
**Parent:** TAB-14 F12  
**Owner:** Founding Engineer

## Problem

After migration `019`, public/anon SELECT on `orders` / `item_requests` is gone. Staff Realtime (`orders_staff`, `item_requests_staff`) requires an **authenticated** Supabase JWT. KDS/floor clients called `createBrowserClient()` / `createAnonClient()` with no session → postgres_changes silently dropped events. Refresh still worked via service-role API routes.

Guest `session_token` values are custom HS256 JWTs (`SESSION_JWT_SECRET`), **not** Supabase Auth tokens. Passing them to `realtime.setAuth` would not satisfy `auth.uid()` / `is_staff_at_venue` and must not be used to open a guest SELECT hole without Security review.

## Decision

| Surface | Approach | Why |
|---|---|---|
| KDS (`useKDSFeed`) | `subscribeWithBackoff(..., { accessToken })` → `realtime.setAuth` | Staff login token is Supabase Auth JWT; matches `orders_staff` |
| Floor (`ServerFloorScreen`) | Same with staff `access_token` | Staff policies on orders / item_requests / table_sessions |
| Guest order status | API poll (3s) until terminal | No RLS weaken; session JWT already authorizes `/api/orders/:id` |
| Guest requests (web + mobile) | API poll (4s) | Same |

**Not done:** minting Supabase-signed guest claims + narrow SELECT policies. That would need [@SecurityEngineer](/TAB/agents/securityengineer) if product requires sub-second guest Realtime later.

## Code

- `packages/db/src/clients.ts` — `attachRealtimeAuth`
- `packages/db/src/realtime.ts` — optional `accessToken` on `subscribeWithBackoff`
- `packages/db/src/realtime.test.ts` — setAuth-before-subscribe
- Web/mobile hooks & floor screen as above

## Verify

```bash
cd packages/db && npm test
```

Manual: staff KDS with valid `access_token` should refresh on paid `orders` INSERT/UPDATE without waiting for a full page reload; guest order status advances via poll after pay.
