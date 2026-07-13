-- TAB-14 verification queries
-- Run as postgres / service_role after applying 019_production_hardening.sql.
-- Expect: zero rows for "fail" queries; constraint negative test raises an error.

-- A) RLS enabled on all public base tables
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by 1;
-- expect: 0 rows

-- B) Service-only tables must not grant anon/authenticated
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'platform_config',
    'dynamic_qr_tokens',
    'stripe_webhook_events',
    'api_idempotency_keys'
  )
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by 1, 2, 3;
-- expect: 0 rows

-- C) Dangerous public-read policies should be gone
select pol.polname, c.relname
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and pol.polname in (
    'venue_public_read',
    'venue_tables_public_read',
    'menu_categories_read',
    'menu_items_read',
    'menu_modifiers_read',
    'menu_options_read'
  );
-- expect: 0 rows

-- D) Pay-before-fire constraints + default
select
  column_name,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'orders'
  and column_name = 'status';
-- expect: default contains pending_payment

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.orders'::regclass
  and conname in ('orders_kitchen_requires_paid', 'orders_status_allowed');
-- expect: 2 rows

-- E) Negative invariant test (should ERROR)
-- begin;
-- insert into orders (venue_id, session_id, status, paid_at)
-- values (
--   '00000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000002',
--   'received',
--   null
-- );
-- rollback;

-- F) Hot-path indexes present
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_orders_venue_status',
    'idx_orders_venue_status_paid',
    'idx_orders_session_status',
    'idx_table_sessions_venue_status',
    'idx_item_requests_table_status',
    'idx_payments_stripe_pi_unique',
    'idx_payments_order'
  )
order by 1;
-- expect: all 7 names

-- G) Explain sketches (run with real venue_id / after seed)
-- explain (analyze, buffers)
-- select * from orders
-- where venue_id = $1
--   and status in ('received', 'preparing', 'ready')
-- order by paid_at asc;
--
-- explain (analyze, buffers)
-- select id from item_requests
-- where table_id = $1 and status = 'pending';
--
-- explain (analyze, buffers)
-- select id from table_sessions
-- where venue_id = $1 and status = 'open';
