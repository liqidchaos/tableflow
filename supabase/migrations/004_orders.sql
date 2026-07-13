-- 004_orders.sql
create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  venue_id            uuid references venues(id) not null,
  session_id          uuid references table_sessions(id) not null,
  guest_id            uuid references session_guests(id),
  status              text default 'received',
  subtotal            numeric(10,2) default 0,
  notes               text,
  fired_at            timestamptz,
  ready_at            timestamptz,
  delivered_at        timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid references orders(id) on delete cascade not null,
  item_id             uuid references menu_items(id) not null,
  quantity            int default 1,
  unit_price          numeric(10,2) not null,
  total_price         numeric(10,2) not null,
  modifiers           jsonb default '[]',
  special_instructions text,
  status              text default 'pending',
  course              text default 'main',
  is_held             boolean default false,
  created_at          timestamptz default now()
);

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();
