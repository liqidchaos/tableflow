-- 010_rls_policies.sql
alter table venues enable row level security;
alter table venue_tables enable row level security;
alter table table_sessions enable row level security;
alter table session_guests enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table menu_item_modifiers enable row level security;
alter table menu_modifier_options enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table item_requests enable row level security;
alter table payments enable row level security;
alter table staff enable row level security;
alter table inventory_items enable row level security;
alter table menu_item_inventory enable row level security;
alter table ai_insights enable row level security;
alter table audit_log enable row level security;

-- Helper: check if user is staff at venue
create or replace function is_staff_at_venue(v_id uuid)
returns boolean as $$
  select exists (
    select 1 from staff where venue_id = v_id and user_id = auth.uid() and is_active = true
  );
$$ language sql security definer stable;

create or replace function is_venue_owner(v_id uuid)
returns boolean as $$
  select exists (
    select 1 from venues where id = v_id and owner_id = auth.uid()
  );
$$ language sql security definer stable;

-- Venues
drop policy if exists venue_owner_select on venues;
create policy venue_owner_select on venues for select using (owner_id = auth.uid() or is_staff_at_venue(id));
drop policy if exists venue_owner_all on venues;
create policy venue_owner_all on venues for all using (owner_id = auth.uid());

-- Public read for menu-related venue info (name, brand) via service role in API
drop policy if exists venue_public_read on venues;
create policy venue_public_read on venues for select using (is_active = true);

-- Venue tables
drop policy if exists venue_tables_staff on venue_tables;
create policy venue_tables_staff on venue_tables for all
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));
drop policy if exists venue_tables_public_read on venue_tables;
create policy venue_tables_public_read on venue_tables for select using (is_active = true);

-- Table sessions - staff access
drop policy if exists table_sessions_staff on table_sessions;
create policy table_sessions_staff on table_sessions for all
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

-- Session guests
drop policy if exists session_guests_staff on session_guests;
create policy session_guests_staff on session_guests for all
  using (session_id in (
    select id from table_sessions where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)
  ));

-- Menu - public read, owner write
drop policy if exists menu_categories_read on menu_categories;
create policy menu_categories_read on menu_categories for select using (true);
drop policy if exists menu_categories_write on menu_categories;
create policy menu_categories_write on menu_categories for all
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

drop policy if exists menu_items_read on menu_items;
create policy menu_items_read on menu_items for select using (deleted_at is null);
drop policy if exists menu_items_write on menu_items;
create policy menu_items_write on menu_items for all
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

drop policy if exists menu_modifiers_read on menu_item_modifiers;
create policy menu_modifiers_read on menu_item_modifiers for select using (true);
drop policy if exists menu_modifiers_write on menu_item_modifiers;
create policy menu_modifiers_write on menu_item_modifiers for all
  using (item_id in (select id from menu_items where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)));

drop policy if exists menu_options_read on menu_modifier_options;
create policy menu_options_read on menu_modifier_options for select using (true);
drop policy if exists menu_options_write on menu_modifier_options;
create policy menu_options_write on menu_modifier_options for all
  using (modifier_id in (
    select m.id from menu_item_modifiers m
    join menu_items i on i.id = m.item_id
    where is_venue_owner(i.venue_id) or is_staff_at_venue(i.venue_id)
  ));

-- Orders
drop policy if exists orders_staff on orders;
create policy orders_staff on orders for all
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

-- Order items
drop policy if exists order_items_staff on order_items;
create policy order_items_staff on order_items for all
  using (order_id in (
    select id from orders where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)
  ));

-- Item requests
drop policy if exists item_requests_staff on item_requests;
create policy item_requests_staff on item_requests for all
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

-- Payments
drop policy if exists payments_staff on payments;
create policy payments_staff on payments for all
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

-- Staff
drop policy if exists staff_venue on staff;
create policy staff_venue on staff for select
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id) or user_id = auth.uid());
drop policy if exists staff_owner_write on staff;
create policy staff_owner_write on staff for all using (is_venue_owner(venue_id));

-- Inventory
drop policy if exists inventory_staff on inventory_items;
create policy inventory_staff on inventory_items for all
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

drop policy if exists menu_item_inventory_staff on menu_item_inventory;
create policy menu_item_inventory_staff on menu_item_inventory for all
  using (menu_item_id in (
    select id from menu_items where is_venue_owner(venue_id) or is_staff_at_venue(venue_id)
  ));

-- AI insights
drop policy if exists ai_insights_staff on ai_insights;
create policy ai_insights_staff on ai_insights for all
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));

-- Audit log
drop policy if exists audit_log_staff on audit_log;
create policy audit_log_staff on audit_log for select
  using (is_venue_owner(venue_id) or is_staff_at_venue(venue_id));
