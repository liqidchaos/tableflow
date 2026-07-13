-- 011_realtime.sql
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table order_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'table_sessions'
  ) then
    alter publication supabase_realtime add table table_sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'item_requests'
  ) then
    alter publication supabase_realtime add table item_requests;
  end if;
end $$;

-- Storage bucket for menu images
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists menu_images_public_read on storage.objects;
create policy menu_images_public_read on storage.objects
  for select using (bucket_id = 'menu-images');

drop policy if exists menu_images_authenticated_write on storage.objects;
create policy menu_images_authenticated_write on storage.objects
  for insert with check (bucket_id = 'menu-images' and auth.role() = 'authenticated');

drop policy if exists menu_images_authenticated_update on storage.objects;
create policy menu_images_authenticated_update on storage.objects
  for update using (bucket_id = 'menu-images' and auth.role() = 'authenticated');
