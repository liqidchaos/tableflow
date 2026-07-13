-- TAB-22 verification queries for 021_rls_with_check_and_storage.sql
-- Run after migrate (local or hosted). Expect non-empty WITH CHECK expressions
-- and staff-scoped menu-images policies (no auth.role()-based writes).

-- 1) Venue-scoped FOR ALL policies must have both qual (USING) and with_check
select
  n.nspname as schema,
  c.relname as table_name,
  p.polname as policy,
  p.polcmd as cmd, -- '*' = ALL
  pg_get_expr(p.polqual, p.polrelid) as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and p.polname in (
    'venue_owner_all',
    'venue_tables_staff',
    'table_sessions_staff',
    'session_guests_staff',
    'menu_categories_write',
    'menu_items_write',
    'menu_modifiers_write',
    'menu_options_write',
    'orders_staff',
    'order_items_staff',
    'item_requests_staff',
    'payments_staff',
    'staff_owner_write',
    'inventory_staff',
    'menu_item_inventory_staff',
    'ai_insights_staff',
    'dynamic_qr_tokens_staff'
  )
order by c.relname, p.polname;

-- Expect: with_check_expr is NOT NULL for every row above.

-- 2) menu-images storage policies
select
  p.polname,
  p.polcmd,
  pg_get_expr(p.polqual, p.polrelid) as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'storage'
  and c.relname = 'objects'
  and p.polname like 'menu_images%'
order by p.polname;

-- Expect policies:
--   menu_images_public_read (SELECT)
--   menu_images_staff_insert / _update / _delete
-- Expect ABSENT:
--   menu_images_authenticated_write
--   menu_images_authenticated_update

-- 3) Helper exists and fail-closes on bad paths
select public.storage_menu_image_venue_id('not-a-uuid/file.jpg') is null as bad_path_null;
select public.storage_menu_image_venue_id(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/item/1.jpg'
) = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as good_path_ok;
