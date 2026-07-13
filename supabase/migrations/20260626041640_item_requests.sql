-- 20260626041640_item_requests.sql
-- Formerly 004b / 0041; timestamp version avoids CLI prefix collision with 004_orders.
create table if not exists item_requests (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid references venues(id) not null,
  session_id      uuid references table_sessions(id) not null,
  table_id        uuid references venue_tables(id) not null,
  request_type    text not null,
  custom_text     text,
  status          text default 'pending',
  created_at      timestamptz default now(),
  fulfilled_at    timestamptz
);
