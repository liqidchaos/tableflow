-- 007_inventory.sql
create table if not exists inventory_items (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid references venues(id) on delete cascade not null,
  name            text not null,
  unit            text default 'units',
  quantity        numeric(10,2) default 0,
  par_level       numeric(10,2) default 0,
  cost_per_unit   numeric(10,2),
  supplier        text,
  last_restocked  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists menu_item_inventory (
  id                  uuid primary key default gen_random_uuid(),
  menu_item_id        uuid references menu_items(id) on delete cascade not null,
  inventory_item_id   uuid references inventory_items(id) on delete cascade not null,
  quantity_used       numeric(10,4) not null
);

drop trigger if exists inventory_items_updated_at on inventory_items;
create trigger inventory_items_updated_at
  before update on inventory_items
  for each row execute function update_updated_at();
