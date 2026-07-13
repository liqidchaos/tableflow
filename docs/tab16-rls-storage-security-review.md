# TAB-16 — Security review: RLS WITH CHECK + storage after 019

**Date:** 2026-07-13  
**Owner:** SecurityEngineer  
**Parent:** TAB-14  
**Scope:** F10 (WITH CHECK), F11 (menu-images storage), confirm 019 anon public-read drops.

## Verdict

| ID | Class | Severity | Exploitability | Disposition |
|---|---|---|---|---|
| F10 | Broken Access Control / Incomplete Mediation | Medium | Low–Medium | **Remediated in** `021_rls_with_check_and_storage.sql` |
| F11 | Security Misconfiguration / Broken Function-Level Authorization | Medium | High (any authenticated JWT) | **Remediated in** `021` |
| 019 drops | Least Privilege / Minimize Attack Surface | — | — | **Confirmed acceptable** |

## F10 — WITH CHECK gaps

**Class:** Broken Access Control (OWASP A01), Complete Mediation, Secure Defaults.

**Evidence:** `010_rls_policies.sql` defines many `FOR ALL ... USING (...)` policies with no explicit `WITH CHECK` and no `TO authenticated` (e.g. `orders_staff`, `payments_staff`, `venue_owner_all`, menu write policies).

**Attack path (stated risk):** Authenticated staff/owner updates a tenant-scoped row and reassigns `venue_id` / ownership fields so the new row lands outside the intended check.

**Postgres note:** When `WITH CHECK` is omitted on `ALL`/`UPDATE`, Postgres uses the `USING` expression for both. Cross-tenant reassignment *to a venue the actor cannot access* already fails. Explicit `WITH CHECK` still required for Secure Defaults, auditability, and pinning `TO authenticated`.

**Blast radius:** Tenant data integrity under Data API with staff JWT; service_role API paths bypass RLS (defense in depth only).

**Fix shipped:** Migration `021` recreates all listed `FOR ALL` policies with matching `USING` + `WITH CHECK` and `TO authenticated`. SELECT-only policies also pinned to `TO authenticated`.

**Residual risk:** Multi-venue staff can still move rows between venues they legitimately staff. Follow-up: immutable `venue_id` triggers or split INSERT/UPDATE policies that forbid `venue_id` changes (DBA).

## F11 — menu-images storage

**Class:** Security Misconfiguration (A05), Broken Function-Level Authorization (API), deprecated `auth.role()`.

**Evidence:** `011_realtime.sql`:

```sql
create policy menu_images_authenticated_write ...
  with check (bucket_id = 'menu-images' and auth.role() = 'authenticated');
create policy menu_images_authenticated_update ...
  using (bucket_id = 'menu-images' and auth.role() = 'authenticated');
```

No venue path scoping; any authenticated user (including anonymous sign-in if enabled) can write/overwrite any object in the public bucket.

**Attack path:** Obtain any staff/user JWT → Storage API upload to `menu-images/<victim_venue>/...` or overwrite CDN assets → guest-facing image defacement / malware hosting on public URLs.

**Blast radius:** All venues’ menu image CDN; reputation / content integrity. Not payment/PII, but high visibility.

**App path note:** Upload API uses `service_role` with keys `{venue_id}/{item_id}/{ts}.ext` (`menu/items/[item_id]/image/route.ts`) — product path OK; policies protect direct client/Data API abuse.

**Fix shipped:** Drop broad write policies; add `storage_menu_image_venue_id()` (fail-closed on non-UUID folder); staff/owner INSERT/UPDATE/DELETE under `{venue_uuid}/...`; keep public SELECT for CDN.

## 019 anon public menu/venue SELECT drops

**Confirmed acceptable.** Guest + dashboard menu/venue reads go through Next.js API + `createServiceClient()` (service_role). Grep shows no browser `from('menu_*')` Data API reads; browser clients use anon mainly for Realtime. Dropping `venue_public_read` / `menu_*_read` removes billing/POS token and cross-venue scrape exposure without breaking guest web (no app download) flows.

Public **storage** SELECT on `menu-images` remains intentional for `image_url` CDN.

## Lenses cited

Complete Mediation · Least Privilege · Secure Defaults · Fail Securely · Defense in Depth · Minimize Attack Surface · Zero Trust (Data API not trusted) · STRIDE (T/I on storage) · OWASP A01/A05 · OWASP API BFLA

## Deliverables

- Review: this document  
- Migration: `supabase/migrations/021_rls_with_check_and_storage.sql`  
- Verification: `docs/sql/tab16-verification.sql`  
- Apply/verify: DBA child issue
