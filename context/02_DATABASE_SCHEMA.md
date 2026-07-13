# TableFlow — Database Schema
**Platform:** Supabase (PostgreSQL)  
**Version:** 1.0

---

## Design Principles

- All primary keys are UUIDs (`gen_random_uuid()`)
- All timestamps use `timestamptz` and default to `now()`
- Row Level Security (RLS) enabled on all tables
- Soft deletes via `deleted_at` where data retention matters
- Supabase Realtime enabled on: `orders`, `order_items`, `table_sessions`, `item_requests`

---

## Schema

### `venues`
Represents a single restaurant or bar location.

```sql
create table venues (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique not null,                        -- URL-safe identifier
  owner_id            uuid references auth.users(id) not null,
  stripe_account_id   text,                                        -- Stripe Connect Express account ID
  stripe_onboarded    boolean default false,
  logo_url            text,
  brand_color         text default '#000000',
  address             text,
  city                text,
  country             text default 'US',
  timezone            text default 'America/New_York',
  currency            text default 'usd',
  pos_provider        text,                                        -- 'toast' | 'square' | 'clover' | null
  pos_access_token    text,
  pos_location_id     text,
  qr_mode             text default 'static',                       -- 'static' | 'dynamic'
  nfc_enabled         boolean default false,
  tab_mode            text default 'preauth',                      -- 'preauth' | 'pay_per_order' | 'bar_tab'
  service_fee_pct     numeric(5,4) default 0.004,                  -- Platform fee (0.4%)
  is_active           boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  deleted_at          timestamptz
);
```

---

### `venue_tables`
Physical tables within a venue.

```sql
create table venue_tables (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid references venues(id) on delete cascade not null,
  name            text not null,                                   -- "Table 4", "Bar Seat 2", "Patio A"
  capacity        int default 4,
  qr_code         text unique,                                     -- static QR payload string
  nfc_uid         text unique,                                     -- NFC tag UID
  is_active       boolean default true,
  position_x      numeric,                                         -- floor map coordinates
  position_y      numeric,
  created_at      timestamptz default now()
);
```

---

### `table_sessions`
One active session per table per visit. Ties guest(s) to a table for the duration of their stay.

```sql
create table table_sessions (
  id                    uuid primary key default gen_random_uuid(),
  venue_id              uuid references venues(id) not null,
  table_id              uuid references venue_tables(id) not null,
  status                text default 'open',                       -- 'open' | 'closed' | 'abandoned'
  tab_mode              text not null,                             -- inherited from venue at session open
  stripe_payment_intent text,                                      -- preauth PI id
  stripe_customer_id    text,                                      -- if guest is identified
  opened_at             timestamptz default now(),
  closed_at             timestamptz,
  total_amount          numeric(10,2) default 0,
  tip_amount            numeric(10,2) default 0,
  platform_fee          numeric(10,2) default 0,
  created_at            timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table table_sessions;
```

---

### `session_guests`
Supports multi-guest split billing. Each guest at a table is a row.

```sql
create table session_guests (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references table_sessions(id) on delete cascade not null,
  user_id         uuid references auth.users(id),                  -- null if anonymous
  display_name    text,                                            -- "Guest 1", or real name if logged in
  phone           text,
  email           text,
  stripe_pm_id    text,                                            -- saved payment method
  joined_at       timestamptz default now()
);
```

---

### `menu_categories`
Top-level menu groupings (Appetizers, Mains, Drinks, etc.).

```sql
create table menu_categories (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid references venues(id) on delete cascade not null,
  name        text not null,
  description text,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);
```

---

### `menu_items`
Individual items on the menu.

```sql
create table menu_items (
  id                  uuid primary key default gen_random_uuid(),
  venue_id            uuid references venues(id) on delete cascade not null,
  category_id         uuid references menu_categories(id) on delete set null,
  name                text not null,
  description         text,
  price               numeric(10,2) not null,
  image_url           text,
  is_available        boolean default true,                        -- toggle to 86 instantly
  is_featured         boolean default false,
  allergens           text[] default '{}',                         -- ['gluten','nuts','dairy']
  dietary_tags        text[] default '{}',                         -- ['vegan','vegetarian','gluten-free']
  prep_time_minutes   int,
  calories            int,
  sort_order          int default 0,
  pos_item_id         text,                                        -- external POS reference
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  deleted_at          timestamptz
);
```

---

### `menu_item_modifiers`
Modifier groups for an item (e.g. "Choose a size", "Add-ons").

```sql
create table menu_item_modifiers (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid references menu_items(id) on delete cascade not null,
  group_name      text not null,                                   -- "Size", "Temperature", "Add-ons"
  is_required     boolean default false,
  min_select      int default 0,
  max_select      int default 1,
  sort_order      int default 0
);

create table menu_modifier_options (
  id              uuid primary key default gen_random_uuid(),
  modifier_id     uuid references menu_item_modifiers(id) on delete cascade not null,
  name            text not null,                                   -- "Large", "Extra Shot"
  price_delta     numeric(10,2) default 0,                         -- additive to base price
  is_available    boolean default true,
  sort_order      int default 0
);
```

---

### `orders`
One order per submission from a guest. A session can have multiple orders (reorders).

```sql
create table orders (
  id                  uuid primary key default gen_random_uuid(),
  venue_id            uuid references venues(id) not null,
  session_id          uuid references table_sessions(id) not null,
  guest_id            uuid references session_guests(id),
  status              text default 'received',                     -- 'received' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  subtotal            numeric(10,2) default 0,
  notes               text,
  fired_at            timestamptz,                                 -- when kitchen starts prep
  ready_at            timestamptz,
  delivered_at        timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table orders;
```

---

### `order_items`
Line items within an order.

```sql
create table order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid references orders(id) on delete cascade not null,
  item_id             uuid references menu_items(id) not null,
  quantity            int default 1,
  unit_price          numeric(10,2) not null,                      -- price at time of order (snapshot)
  total_price         numeric(10,2) not null,
  modifiers           jsonb default '[]',                          -- snapshot of selected modifier options
  special_instructions text,
  status              text default 'pending',                      -- 'pending' | 'preparing' | 'done' | 'cancelled'
  course              text default 'main',                         -- 'starter' | 'main' | 'dessert' | 'drink'
  is_held             boolean default false,                       -- held by server, not yet fired
  created_at          timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table order_items;
```

---

### `item_requests`
Non-order requests from guests (water, bread, etc.).

```sql
create table item_requests (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid references venues(id) not null,
  session_id      uuid references table_sessions(id) not null,
  table_id        uuid references venue_tables(id) not null,
  request_type    text not null,                                   -- 'water' | 'bread' | 'napkins' | 'check' | 'custom'
  custom_text     text,
  status          text default 'pending',                          -- 'pending' | 'acknowledged' | 'fulfilled'
  created_at      timestamptz default now(),
  fulfilled_at    timestamptz
);

-- Enable Realtime
alter publication supabase_realtime add table item_requests;
```

---

### `payments`
Tracks all payment events per session.

```sql
create table payments (
  id                      uuid primary key default gen_random_uuid(),
  venue_id                uuid references venues(id) not null,
  session_id              uuid references table_sessions(id) not null,
  guest_id                uuid references session_guests(id),
  stripe_payment_intent   text not null,
  stripe_charge_id        text,
  amount                  numeric(10,2) not null,
  tip_amount              numeric(10,2) default 0,
  platform_fee            numeric(10,2) default 0,
  currency                text default 'usd',
  status                  text default 'pending',                  -- 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed'
  payment_method_type     text,                                    -- 'card' | 'apple_pay' | 'google_pay'
  split_type              text,                                    -- 'individual' | 'even' | 'full' | 'custom'
  created_at              timestamptz default now(),
  captured_at             timestamptz
);
```

---

### `staff`
Staff accounts linked to a venue.

```sql
create table staff (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid references venues(id) on delete cascade not null,
  user_id         uuid references auth.users(id) not null,
  role            text not null,                                   -- 'server' | 'kitchen' | 'manager' | 'owner'
  display_name    text,
  pin             text,                                            -- 4-digit PIN for quick login on shared device
  is_active       boolean default true,
  created_at      timestamptz default now()
);
```

---

### `inventory_items`
Tracks ingredients or stockable items.

```sql
create table inventory_items (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid references venues(id) on delete cascade not null,
  name            text not null,
  unit            text default 'units',                            -- 'kg' | 'liters' | 'units' | 'portions'
  quantity        numeric(10,2) default 0,
  par_level       numeric(10,2) default 0,                         -- alert threshold
  cost_per_unit   numeric(10,2),
  supplier        text,
  last_restocked  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
```

---

### `menu_item_inventory`
Links menu items to inventory ingredients (for deduction on order).

```sql
create table menu_item_inventory (
  id                  uuid primary key default gen_random_uuid(),
  menu_item_id        uuid references menu_items(id) on delete cascade not null,
  inventory_item_id   uuid references inventory_items(id) on delete cascade not null,
  quantity_used       numeric(10,4) not null                       -- e.g. 0.25 kg per portion
);
```

---

### `ai_insights`
Stores AI-generated operator insights.

```sql
create table ai_insights (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid references venues(id) on delete cascade not null,
  type        text not null,                                       -- 'daily_summary' | 'inventory_alert' | 'demand_forecast' | 'upsell_suggestion'
  content     text not null,                                       -- plain English insight
  metadata    jsonb default '{}',                                  -- structured data supporting the insight
  is_read     boolean default false,
  created_at  timestamptz default now()
);
```

---

### `audit_log`
Immutable event log for compliance and debugging.

```sql
create table audit_log (
  id          bigserial primary key,
  venue_id    uuid references venues(id),
  actor_id    uuid,                                                -- user or system
  action      text not null,                                       -- 'order.created' | 'payment.captured' | 'item.86d'
  entity_type text,
  entity_id   uuid,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);
```

---

## Row Level Security Policies

```sql
-- Venues: only owner can read/write their venue
create policy "venue_owner_only" on venues
  using (owner_id = auth.uid());

-- Staff: can only see their own venue's data
create policy "staff_venue_access" on orders
  using (venue_id in (
    select venue_id from staff where user_id = auth.uid()
  ));

-- Guests: can only see their own session
create policy "guest_session_access" on orders
  using (session_id in (
    select id from table_sessions
    where id = session_id
    -- further restricted by session token passed at scan time
  ));
```

---

## Indexes

```sql
-- High-frequency query paths
create index idx_orders_session on orders(session_id);
create index idx_orders_venue_status on orders(venue_id, status);
create index idx_order_items_order on order_items(order_id);
create index idx_table_sessions_table on table_sessions(table_id, status);
create index idx_item_requests_session on item_requests(session_id, status);
create index idx_menu_items_venue on menu_items(venue_id, is_available);
create index idx_inventory_venue on inventory_items(venue_id);
create index idx_payments_session on payments(session_id);
create index idx_ai_insights_venue on ai_insights(venue_id, is_read);
```

---

## Realtime Subscriptions (Client-Side)

| Table | Channel | Who Subscribes |
|---|---|---|
| `orders` | `orders:venue_id=eq.{id}` | KDS, server app |
| `order_items` | `order_items:order_id=eq.{id}` | Guest app (status updates) |
| `table_sessions` | `table_sessions:table_id=eq.{id}` | Server app |
| `item_requests` | `item_requests:venue_id=eq.{id}` | Server app |
