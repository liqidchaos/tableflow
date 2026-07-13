-- 003_menu.sql
create table if not exists menu_categories (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid references venues(id) on delete cascade not null,
  name        text not null,
  description text,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table if not exists menu_items (
  id                  uuid primary key default gen_random_uuid(),
  venue_id            uuid references venues(id) on delete cascade not null,
  category_id         uuid references menu_categories(id) on delete set null,
  name                text not null,
  description         text,
  price               numeric(10,2) not null,
  image_url           text,
  is_available        boolean default true,
  is_featured         boolean default false,
  allergens           text[] default '{}',
  dietary_tags        text[] default '{}',
  prep_time_minutes   int,
  calories            int,
  sort_order          int default 0,
  pos_item_id         text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  deleted_at          timestamptz
);

create table if not exists menu_item_modifiers (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid references menu_items(id) on delete cascade not null,
  group_name      text not null,
  is_required     boolean default false,
  min_select      int default 0,
  max_select      int default 1,
  sort_order      int default 0
);

create table if not exists menu_modifier_options (
  id              uuid primary key default gen_random_uuid(),
  modifier_id     uuid references menu_item_modifiers(id) on delete cascade not null,
  name            text not null,
  price_delta     numeric(10,2) default 0,
  is_available    boolean default true,
  sort_order      int default 0
);

drop trigger if exists menu_items_updated_at on menu_items;
create trigger menu_items_updated_at
  before update on menu_items
  for each row execute function update_updated_at();
