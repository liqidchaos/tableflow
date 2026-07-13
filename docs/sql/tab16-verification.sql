-- TAB-16 verification queries
-- Run as postgres after applying 021_rls_with_check_and_storage.sql.
-- Expect: zero rows for "fail" queries.

-- A) FOR ALL policies on tenant tables must have WITH CHECK (qual and with_check both set)
select
  n.nspname as schema,
  c.relname as table_name,
  p.polname as policy_name,
  p.polcmd as cmd,
  pg_get_expr(p.polqual, p.polrelid) as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and p.polcmd = '*' -- ALL
  and p.polwithcheck is null
  and c.relname in (
    'venues',
    'venue_tables',
    'table_sessions',
    'session_guests',
    'menu_categories',
    'menu_items',
    'menu_item_modifiers',
    'menu_modifier_options',
    'orders',
    'order_items',
    'item_requests',
    'payments',
    'staff',
    'inventory_items',
    'menu_item_inventory',
    'ai_insights',
    'dynamic_qr_tokens'
  )
order by 2, 3;
-- expect: 0 rows

-- B) Dangerous storage policies must be gone
select pol.polname
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'storage'
  and c.relname = 'objects'
  and pol.polname in (
    'menu_images_authenticated_write',
    'menu_images_authenticated_update'
  );
-- expect: 0 rows

-- C) Venue-scoped storage write policies present
select pol.polname
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'storage'
  and c.relname = 'objects'
  and pol.polname in (
    'menu_images_public_read',
    'menu_images_staff_insert',
    'menu_images_staff_update',
    'menu_images_staff_delete'
  )
order by 1;
-- expect: 4 rows

-- D) Helper exists
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'storage_menu_image_venue_id';
-- expect: 1 row

-- E) 019 public-read drops still absent (regression)
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

-- F) Manual negative tests (as authenticated JWT for venue A; expect 0 rows / error):
--   update public.orders set venue_id = '<venue_b>' where id = '<order_in_a>';
--   insert into storage.objects (bucket_id, name) values ('menu-images', '<venue_b>/evil.jpg');
--   insert into storage.objects (bucket_id, name) values ('menu-images', 'not-a-uuid/evil.jpg');
