# TAB-14 — Schema / RLS / index production audit

**Date:** 2026-07-13  
**Owner:** DBA  
**Scope:** Migrations `001`–`019`, Data API exposure vs RLS, pay-before-fire invariant, floor/KDS indexes.  
**Lenses:** RLS completeness · Tenant isolation · Invariant integrity · Index fitness · Migration safety · Data API exposure · Idempotency & uniqueness · Least privilege · Retention & PII

## Executive summary

Critical gaps found in migration history: one table without RLS (`dynamic_qr_tokens`), idempotency tables with RLS-on but PUBLIC grants still present, anon-readable `venues` rows that included billing/POS secrets, unrestricted menu SELECT policies, and no DB-level pay-before-fire constraint (`orders.status` still defaulted to `received`).  

**Closed in this heartbeat** by migration `019_production_hardening.sql` (see below). Residual medium/low items handed to SecurityEngineer and Founding Engineer.

App paths use `createServiceClient()` (service_role) for CRUD; browser clients use anon primarily for Realtime. Hardening therefore focuses on Data API / Realtime abuse of the publishable key.

---

## Findings

| ID | Severity | Lens | Finding | Disposition |
|---|---|---|---|---|
| F1 | **Critical** | RLS completeness | `dynamic_qr_tokens` (015) had no `ENABLE ROW LEVEL SECURITY` | **Fixed** in `019` — RLS on, revoke anon/authenticated, staff policy + service_role grant |
| F2 | **Critical** | Data API exposure | `stripe_webhook_events`, `api_idempotency_keys` — RLS enabled in 017 but default grants to `anon`/`authenticated` not revoked (unlike `platform_config`) | **Fixed** in `019` — revoke + service_role only |
| F3 | **Critical** | Tenant isolation / least privilege | `venue_public_read` (`is_active = true`) exposed full venue rows to anon, including `pos_access_token`, Stripe billing ids, subscription fields | **Fixed** in `019` — policy dropped; owner/staff policies remain |
| F4 | **High** | Tenant isolation | `menu_*_read` used `USING (true)` / non-tenant filters — cross-venue menu scrape via Data API | **Fixed** in `019` — public read policies dropped |
| F5 | **High** | Tenant isolation | `venue_tables_public_read` enumerated active tables + `qr_code` for all venues | **Fixed** in `019` — policy dropped |
| F6 | **High** | Invariant integrity | `orders.status` default `'received'` (004) still allowed unpaid kitchen inserts if any writer omitted status; no CHECK tying kitchen statuses to `paid_at` | **Fixed** in `019` — default `pending_payment`; `orders_kitchen_requires_paid` + status enum CHECK; backfill `paid_at` |
| F7 | **High** | Idempotency | `payments.stripe_payment_intent` not unique — double-insert race possible | **Fixed** in `019` — unique index `idx_payments_stripe_pi_unique` |
| F8 | **Medium** | Index fitness | Floor path filters `table_sessions` by table+status and `item_requests` by `table_id`+status; missing supporting indexes | **Fixed** in `019` — `idx_table_sessions_venue_status`, `idx_item_requests_table_status`, `idx_orders_session_status` |
| F9 | **Medium** | Least privilege | `is_staff_at_venue` / `is_venue_owner` SECURITY DEFINER without `search_path` | **Fixed** in `019` |
| F10 | **Medium** | RLS completeness | Most `FOR ALL` policies lack explicit `WITH CHECK` (ownership reassignment risk) | **Remediated** in `021` ([TAB-22](/TAB/issues/TAB-22)); apply hosted |
| F11 | **Medium** | Data API / storage | Storage `menu-images` write uses deprecated `auth.role() = 'authenticated'` with no venue prefix — any authenticated user can write bucket | **Remediated** in `021` ([TAB-22](/TAB/issues/TAB-22)); apply hosted |
| F12 | **Medium** | Observability / product | KDS/guest Realtime uses `createBrowserClient()` without attaching staff JWT — RLS may drop events; refresh relies on API | **Open** → Founding Engineer (product) + Security note |
| F13 | **Low** | Retention & PII | `session_guests.phone/email`, `push_token` retained with no retention policy; staff can read guest PII via session policies | **Open** — document retention; no migration this heartbeat |
| F14 | **Low** | Migration safety | No down migrations; 018/019 documented rollback notes in SQL headers only | Acceptable for now; keep header notes |
| F15 | **Info** | Invariant integrity | App-layer pay-before-fire (TAB-5 / 018) already correct; inventory trigger fires on `received` only | Confirmed; DB CHECK now defense-in-depth |

---

## Migration readiness

| Migration | Purpose | Apply risk |
|---|---|---|
| 001–013 | Core schema, RLS, indexes, realtime | Baseline |
| 014 | `platform_config` + cron | Already correctly revoked from anon |
| 015 | QR tokens, push, ack | **Was incomplete** until 019 |
| 016–017 | Billing + RLS enable | **Incomplete grants** until 019 |
| 018 | `paid_at`, payment↔order, inventory-on-fire | Required before/with 019 |
| **019** | Production hardening (this ticket) | Medium: unique PI index fails if duplicate intents exist; CHECK fails if kitchen rows lack timestamps (backfill included) |

**Apply order:** `supabase db push` (or linked reset in non-prod).  
**Verify:** run `docs/sql/tab14-verification.sql` as a privileged role after apply.

---

## Verification queries (summary)

1. Every `public` base table: `relrowsecurity = true`.  
2. No policies named `*_public_read` / `menu_*_read` with `qual = true`.  
3. `dynamic_qr_tokens`, `stripe_webhook_events`, `api_idempotency_keys`, `platform_config`: no privileges for `anon`/`authenticated`.  
4. `orders` default status = `pending_payment`; constraints `orders_kitchen_requires_paid`, `orders_status_allowed` present.  
5. Negative test: `INSERT INTO orders (... status='received', paid_at=NULL)` must fail.  
6. Indexes listed in 019 exist (`pg_indexes`).

---

## Residual risks / follow-ups

1. **SecurityEngineer / DBA:** F10/F11 closed in [TAB-22](/TAB/issues/TAB-22) via `021`; public menu-images SELECT kept for CDN; anon table SELECTs remain dropped. Ops: apply `021` on hosted and run `docs/sql/tab22-021-verification.sql`.  
2. **Founding Engineer:** F12 — pass Supabase session JWT into Realtime clients for staff KDS; optional guest order SELECT policy scoped by session claim if Realtime guest updates are required.  
3. **CPO / DBA later:** guest PII retention (F13); confirm 019 applied on hosted project `cptyjloveecusgvituzo` (this heartbeat audited SQL in-repo; live push needs linked credentials).  
4. Refund-after-fire does not auto-recall KDS (known from TAB-5 audit) — out of scope.

---

## Deliverables

- Audit: this document  
- Patch: `supabase/migrations/019_production_hardening.sql`  
- Verification: `docs/sql/tab14-verification.sql`
