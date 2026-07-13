# TAB-13 — Threat model + security remediations (payments / auth / RLS)

**Date:** 2026-07-13  
**Owner:** SecurityEngineer  
**Lenses:** STRIDE · Complete Mediation · Fail Securely · Least Privilege · OWASP API (BOLA/IDOR, Broken AuthZ, Unrestricted Business Flows) · Defense in Depth

## 1. STRIDE — guest → pay → kitchen

| Step | Asset | Spoofing | Tampering | Repudiation | Info disclosure | DoS | Elevation |
|---|---|---|---|---|---|---|---|
| QR scan → guest JWT | Session identity | Stolen QR / replayed JWT | Forge claims if secret weak | — | Session/order dump via IDOR | Scan spam | Guest acts as another table |
| Create order | Order + menu pricing | — | Cross-venue menu items; client price ignored (server priced) | Audit log | Order contents | Order flood | Unpaid kitchen fire |
| Payment intent/charge/authorize | Money + kitchen gate | Stolen JWT | **session_id / order_id / amount mismatch** | Audit | Payment rows | PI create flood | Fire victim kitchen unpaid / underpay |
| Stripe webhook | Payment truth | Unsigned events | Event replay | Event id table | — | Flood | Mark paid / fire kitchen |
| Staff KDS / status | Kitchen queue | Stolen staff JWT | Status skip unpaid | Audit | Cross-venue floor | — | Staff fire without pay (intentional cash path) |

**Trust boundaries:** browser guest → Next.js API (service_role) → Stripe Connect → webhook → DB; staff JWT → venue-scoped APIs; anon key → Data API/Realtime (RLS; see [TAB-14](/TAB/issues) audit).

**Invariant:** `pending_payment` must never be KDS-visible; only `authorized`/`captured` (or staff mark-received) enqueue.

## 2. Findings

| ID | Sev | Class | Evidence | Fix | Status |
|---|---|---|---|---|---|
| S1 | **Critical** | BOLA / Broken Access Control | `payments/intent\|authorize\|charge` trusted `body.session_id` for payment rows + `enqueueSessionPendingOrders` without matching guest JWT | Bind to JWT `session_id`; guest must be on session; order must belong to session | **Remediated** |
| S2 | **Critical** | Unrestricted Sensitive Business Flow | `charge`/`intent` accepted client `amount` → underpay then kitchen enqueue | Server asserts amount ≥ order.subtotal (¢) | **Remediated** |
| S3 | **High** | BOLA / IDOR | `GET /orders/:id`, `GET/POST /sessions/:id`, `POST /requests` authenticated but not session-bound | `assertSessionId` / `assertOrderBelongsToSession` | **Remediated** |
| S4 | **High** | Security Misconfiguration / Fail Open | Webhook returned 200 `skipped` when Stripe key set but `STRIPE_WEBHOOK_SECRET` missing | Fail closed 503 if Stripe configured without webhook secret; require signature header | **Remediated** |
| S5 | **High** | Broken Access Control | Order create loaded menu items by id only (cross-venue items) | `.eq('venue_id', sessionAuth.venue_id)` | **Remediated** |
| S6 | **Medium** | Unrestricted Resource Consumption | In-memory IP rate limits (lost across instances; spoofable `X-Forwarded-For`) | Durable Postgres `check_api_rate_limit`; trust XFF only behind proxy (`TRUST_PROXY` / Vercel) | **Remediated** in [TAB-23](/TAB/issues/TAB-23) |
| S7 | **Medium** | RLS WITH CHECK gaps | TAB-14 F10 | Migration WITH CHECK | **Remediated** in `021` ([TAB-22](/TAB/issues/TAB-22)); apply on hosted |
| S8 | **Medium** | Storage misconfig | TAB-14 F11 `menu-images` any authenticated writer | Venue-scoped storage policies | **Remediated** in `021` ([TAB-22](/TAB/issues/TAB-22)); apply on hosted |
| S9 | **Medium** | Insecure Design | Refund does not recall KDS tickets | Product decision + FE | Residual |
| S10 | **Low** | Cryptographic / session | Guest JWT HS256 12h, no jti/revocation on session close | TTL 4h + reject when `table_sessions.status=closed` | **Remediated** in [TAB-23](/TAB/issues/TAB-23) |

## 3. Code landed this heartbeat

- `apps/web/src/lib/session-binding.ts` (+ unit tests)
- Payment routes: intent, authorize, charge, setup-intent
- Guest routes: orders GET, sessions GET/POST, requests POST, orders create (venue menu filter)
- Stripe webhook fail-closed
- Refund rate limit

## 4. Residual risk

- Preauth `authorize` amount still client-chosen (hold size); kitchen fires on any authorized hold — consider min hold vs open tab.
- Capture `final_amount` client-chosen up to Stripe auth ceiling.
- Rate-limit durable backend falls back to per-instance memory if `check_api_rate_limit` RPC fails (warn-logged); apply migration `022` on hosted.
- Refund-after-fire still open; Realtime staff JWT (TAB-14 F12) addressed in `docs/tab17-realtime-jwt.md`.
- Hosted apply of migrations 019–022 still ops-owned.

## 5. Follow-ups

1. ~~DBA: RLS WITH CHECK + storage policies~~ → done in [TAB-22](/TAB/issues/TAB-22) (`021`); ops apply hosted.
2. ~~Founding Engineer: durable rate limits; JWT revoke on session close; Realtime auth~~ → [TAB-23](/TAB/issues/TAB-23) + TAB-17 notes.
3. QA: regression cases for S1–S5 (session mismatch → 403; underpay → 422; webhook no secret → 503); S6 multi-instance 429; S10 closed session → 401.
