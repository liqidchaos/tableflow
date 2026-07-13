# TAB-23 — Durable rate limits + guest JWT revoke

**Date:** 2026-07-13  
**Parent:** [TAB-13](/TAB/issues/TAB-13) (S6, S10)  
**Owner:** Founding Engineer

## What shipped

### S6 — Durable rate limits
- Migration `022_rate_limits_session_close.sql`: `api_rate_limits` + atomic `check_api_rate_limit(key, limit, window_ms)`.
- `apps/web/src/lib/rate-limit.ts` calls the RPC for auth/payment (and order/request) routes; shared across instances.
- `X-Forwarded-For` / `X-Real-IP` honored only when `TRUST_PROXY=1|true` or `VERCEL=1` (spoof mitigation).
- Fallback: in-memory buckets if RPC fails or `RATE_LIMIT_BACKEND=memory` / test.

### S10 — Guest JWT on session close
- Default guest JWT TTL shortened **12h → 4h** (`SESSION_JWT_TTL` in `@tableflow/db`).
- `getSessionAuth` rejects tokens whose `table_sessions.status` is `closed` (or missing) with `SESSION_EXPIRED` — effective revoke without a jti denylist.

### F12 coordination
- Staff Realtime JWT attachment already documented in `docs/tab17-realtime-jwt.md` (TAB-14 F12). No further product change in this ticket.

## Verify

```bash
cd apps/web && npm test -- src/lib/rate-limit.test.ts src/lib/billing.test.ts
```

Hosted DB: apply `022`, then `docs/sql/tab23-022-verification.sql`.

Smoke: after closing a session (pay + `close_session`), reuse the guest `session_token` on `/api/orders` → expect 401 `SESSION_EXPIRED`.

## Residual
- Durable limiter falls back to memory if migration not applied / RPC errors (warn-logged).
- No Redis/Upstash — Postgres is the shared store (fits current stack; no new vendor).
