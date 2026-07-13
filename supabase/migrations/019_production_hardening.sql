-- 019_production_hardening.sql
-- TAB-14: critical RLS/grants, pay-before-fire data invariant, hot-path indexes.
--
-- Forward: apply after 018_pay_before_fire.sql
-- Rollback notes:
--   DROP CONSTRAINT orders_kitchen_requires_paid;
--   ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'received';
--   DROP INDEX idx_table_sessions_venue_status, idx_item_requests_table_status,
--     idx_orders_session_status, idx_payments_stripe_pi_unique;
--   Re-create venue_public_read / venue_tables_public_read / menu_*_read if needed;
--   DROP policies/RLS changes on dynamic_qr_tokens; restore PUBLIC grants carefully.
-- Risk: dropping public SELECT policies breaks any anon PostgREST clients that
--   read venues/menus directly. TableFlow guest + dashboard paths use service_role
--   API routes (verified in apps/web), so this is expand-safe for the product.

-- ---------------------------------------------------------------------------
-- 1) RLS completeness: dynamic_qr_tokens (created in 015, never RLS'd)
-- ---------------------------------------------------------------------------
alter table public.dynamic_qr_tokens enable row level security;

revoke all on table public.dynamic_qr_tokens from anon, authenticated, public;
grant all on table public.dynamic_qr_tokens to service_role;

-- Staff/owner policies kept for defense in depth if grants are restored later.
drop policy if exists dynamic_qr_tokens_staff on public.dynamic_qr_tokens;
create policy dynamic_qr_tokens_staff on public.dynamic_qr_tokens
  for all
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id))
  with check (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

-- ---------------------------------------------------------------------------
-- 2) Data API exposure: complete service-only lockdown for idempotency tables
--    (017 enabled RLS but left default PUBLIC grants)
-- ---------------------------------------------------------------------------
revoke all on table public.stripe_webhook_events from anon, authenticated, public;
grant all on table public.stripe_webhook_events to service_role;

revoke all on table public.api_idempotency_keys from anon, authenticated, public;
grant all on table public.api_idempotency_keys to service_role;

-- ---------------------------------------------------------------------------
-- 3) Tenant isolation / least privilege: remove anon-wide public reads
--    venue_public_read exposed billing + pos_access_token columns via Data API.
--    menu_* using (true) allowed cross-venue menu scraping.
-- ---------------------------------------------------------------------------
drop policy if exists venue_public_read on public.venues;
drop policy if exists venue_tables_public_read on public.venue_tables;
drop policy if exists menu_categories_read on public.menu_categories;
drop policy if exists menu_items_read on public.menu_items;
drop policy if exists menu_modifiers_read on public.menu_item_modifiers;
drop policy if exists menu_options_read on public.menu_modifier_options;
-- Staff/owner SELECT remains covered by existing FOR ALL write policies in 010.

-- ---------------------------------------------------------------------------
-- 4) SECURITY DEFINER helpers: pin search_path (security lens)
-- ---------------------------------------------------------------------------
create or replace function public.is_staff_at_venue(v_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.staff
    where venue_id = v_id
      and user_id = (select auth.uid())
      and is_active = true
  );
$$;

create or replace function public.is_venue_owner(v_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.venues
    where id = v_id
      and owner_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- 5) Invariant integrity: pay-before-kitchen at the data layer
-- ---------------------------------------------------------------------------
alter table public.orders
  alter column status set default 'pending_payment';

-- Backfill so the CHECK can apply to rows already on the line.
update public.orders
set paid_at = coalesce(paid_at, fired_at, created_at)
where status in ('received', 'preparing', 'ready', 'delivered')
  and paid_at is null;

alter table public.orders drop constraint if exists orders_kitchen_requires_paid;
alter table public.orders
  add constraint orders_kitchen_requires_paid
  check (
    status in ('pending_payment', 'cancelled')
    or paid_at is not null
  );

alter table public.orders drop constraint if exists orders_status_allowed;
alter table public.orders
  add constraint orders_status_allowed
  check (
    status in (
      'pending_payment',
      'received',
      'preparing',
      'ready',
      'delivered',
      'cancelled'
    )
  );

-- Idempotency: one payment row per Stripe PaymentIntent
create unique index if not exists idx_payments_stripe_pi_unique
  on public.payments (stripe_payment_intent);

-- ---------------------------------------------------------------------------
-- 6) Index fitness: floor view + session/KDS adjacency
-- ---------------------------------------------------------------------------
create index if not exists idx_table_sessions_venue_status
  on public.table_sessions (venue_id, status);

create index if not exists idx_item_requests_table_status
  on public.item_requests (table_id, status);

create index if not exists idx_orders_session_status
  on public.orders (session_id, status);

comment on constraint orders_kitchen_requires_paid on public.orders is
  'Pay-before-fire: kitchen-visible statuses require paid_at (authorize/capture/staff mark paid).';
