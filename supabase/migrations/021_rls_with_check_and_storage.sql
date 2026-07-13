-- 021_rls_with_check_and_storage.sql
-- TAB-22 / TAB-13 follow-up (TAB-14 F10+F11): explicit WITH CHECK on FOR ALL
-- policies + venue-scoped menu-images storage.
--
-- Forward: apply after 020_floor_server_assignment.sql
-- Rollback notes:
--   Revert storage policies to 011 auth.role()-based inserts/updates (not recommended);
--   Drop helper public.storage_menu_image_venue_id;
--   Recreate 010 FOR ALL policies without WITH CHECK / TO authenticated if needed.
-- Risk: low for product paths (API uses service_role). Browser JWT writers must use
--   object keys menu-images/{venue_id}/... matching staff membership.
-- Lenses: Complete Mediation, Least Privilege, Secure Defaults, Fail Securely.

-- ---------------------------------------------------------------------------
-- F10) Explicit WITH CHECK + TO authenticated on venue-scoped FOR ALL policies
-- Postgres copies USING → WITH CHECK when omitted; we still pin both for clarity
-- and restrict policies to authenticated (deny-by-default for anon).
-- ---------------------------------------------------------------------------

-- Venues (owner write path; select remains via venue_owner_select)
drop policy if exists venue_owner_all on public.venues;
create policy venue_owner_all on public.venues
  for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists venue_tables_staff on public.venue_tables;
create policy venue_tables_staff on public.venue_tables
  for all
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id))
  with check (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

drop policy if exists table_sessions_staff on public.table_sessions;
create policy table_sessions_staff on public.table_sessions
  for all
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id))
  with check (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

drop policy if exists session_guests_staff on public.session_guests;
create policy session_guests_staff on public.session_guests
  for all
  to authenticated
  using (
    session_id in (
      select id from public.table_sessions
      where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)
    )
  )
  with check (
    session_id in (
      select id from public.table_sessions
      where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)
    )
  );

drop policy if exists menu_categories_write on public.menu_categories;
create policy menu_categories_write on public.menu_categories
  for all
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id))
  with check (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

drop policy if exists menu_items_write on public.menu_items;
create policy menu_items_write on public.menu_items
  for all
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id))
  with check (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

drop policy if exists menu_modifiers_write on public.menu_item_modifiers;
create policy menu_modifiers_write on public.menu_item_modifiers
  for all
  to authenticated
  using (
    item_id in (
      select id from public.menu_items
      where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)
    )
  )
  with check (
    item_id in (
      select id from public.menu_items
      where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)
    )
  );

drop policy if exists menu_options_write on public.menu_modifier_options;
create policy menu_options_write on public.menu_modifier_options
  for all
  to authenticated
  using (
    modifier_id in (
      select m.id
      from public.menu_item_modifiers m
      join public.menu_items i on i.id = m.item_id
      where is_venue_owner(i.venue_id) or is_staff_at_venue(i.venue_id)
    )
  )
  with check (
    modifier_id in (
      select m.id
      from public.menu_item_modifiers m
      join public.menu_items i on i.id = m.item_id
      where is_venue_owner(i.venue_id) or is_staff_at_venue(i.venue_id)
    )
  );

drop policy if exists orders_staff on public.orders;
create policy orders_staff on public.orders
  for all
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id))
  with check (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

drop policy if exists order_items_staff on public.order_items;
create policy order_items_staff on public.order_items
  for all
  to authenticated
  using (
    order_id in (
      select id from public.orders
      where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)
    )
  )
  with check (
    order_id in (
      select id from public.orders
      where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)
    )
  );

drop policy if exists item_requests_staff on public.item_requests;
create policy item_requests_staff on public.item_requests
  for all
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id))
  with check (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

drop policy if exists payments_staff on public.payments;
create policy payments_staff on public.payments
  for all
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id))
  with check (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

drop policy if exists staff_owner_write on public.staff;
create policy staff_owner_write on public.staff
  for all
  to authenticated
  using (is_venue_owner(venue_id))
  with check (is_venue_owner(venue_id));

drop policy if exists inventory_staff on public.inventory_items;
create policy inventory_staff on public.inventory_items
  for all
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id))
  with check (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

drop policy if exists menu_item_inventory_staff on public.menu_item_inventory;
create policy menu_item_inventory_staff on public.menu_item_inventory
  for all
  to authenticated
  using (
    menu_item_id in (
      select id from public.menu_items
      where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)
    )
  )
  with check (
    menu_item_id in (
      select id from public.menu_items
      where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)
    )
  );

drop policy if exists ai_insights_staff on public.ai_insights;
create policy ai_insights_staff on public.ai_insights
  for all
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id))
  with check (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

-- SELECT-only policies: pin TO authenticated (Complete Mediation)
drop policy if exists venue_owner_select on public.venues;
create policy venue_owner_select on public.venues
  for select
  to authenticated
  using (owner_id = (select auth.uid()) or is_staff_at_venue(id));

drop policy if exists staff_venue on public.staff;
create policy staff_venue on public.staff
  for select
  to authenticated
  using (
    is_venue_owner(venue_id)
    or is_staff_at_venue(venue_id)
    or user_id = (select auth.uid())
  );

drop policy if exists audit_log_staff on public.audit_log;
create policy audit_log_staff on public.audit_log
  for select
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

-- dynamic_qr_tokens already has WITH CHECK in 019; ensure TO authenticated remains
drop policy if exists dynamic_qr_tokens_staff on public.dynamic_qr_tokens;
create policy dynamic_qr_tokens_staff on public.dynamic_qr_tokens
  for all
  to authenticated
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id))
  with check (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

-- ---------------------------------------------------------------------------
-- F11) menu-images: venue-folder write lockdown (app keys: {venue_id}/{item_id}/...)
-- Public SELECT retained for CDN image_url; writes require staff/owner on folder venue.
-- ---------------------------------------------------------------------------

create or replace function public.storage_menu_image_venue_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  folder text;
begin
  folder := (storage.foldername(object_name))[1];
  if folder is null or folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return folder::uuid;
exception
  when others then
    return null;
end;
$$;

revoke all on function public.storage_menu_image_venue_id(text) from public;
grant execute on function public.storage_menu_image_venue_id(text) to authenticated, service_role;

drop policy if exists menu_images_authenticated_write on storage.objects;
drop policy if exists menu_images_authenticated_update on storage.objects;
drop policy if exists menu_images_staff_insert on storage.objects;
drop policy if exists menu_images_staff_update on storage.objects;
drop policy if exists menu_images_staff_delete on storage.objects;
drop policy if exists menu_images_public_read on storage.objects;

-- Public read for guest/CDN URLs (bucket is public; policy still required for Data API)
create policy menu_images_public_read on storage.objects
  for select
  using (bucket_id = 'menu-images');

create policy menu_images_staff_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'menu-images'
    and (
      is_venue_owner(public.storage_menu_image_venue_id(name))
      or is_staff_at_venue(public.storage_menu_image_venue_id(name))
    )
  );

create policy menu_images_staff_update on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'menu-images'
    and (
      is_venue_owner(public.storage_menu_image_venue_id(name))
      or is_staff_at_venue(public.storage_menu_image_venue_id(name))
    )
  )
  with check (
    bucket_id = 'menu-images'
    and (
      is_venue_owner(public.storage_menu_image_venue_id(name))
      or is_staff_at_venue(public.storage_menu_image_venue_id(name))
    )
  );

create policy menu_images_staff_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'menu-images'
    and (
      is_venue_owner(public.storage_menu_image_venue_id(name))
      or is_staff_at_venue(public.storage_menu_image_venue_id(name))
    )
  );

comment on function public.storage_menu_image_venue_id(text) is
  'TAB-22: parse menu-images/{venue_uuid}/... object key; null on invalid path (fail closed).';
