-- 002_tables_sessions.sql
create table if not exists venue_tables (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid references venues(id) on delete cascade not null,
  name            text not null,
  capacity        int default 4,
  qr_code         text unique,
  nfc_uid         text unique,
  is_active       boolean default true,
  position_x      numeric,
  position_y      numeric,
  created_at      timestamptz default now()
);

create table if not exists table_sessions (
  id                    uuid primary key default gen_random_uuid(),
  venue_id              uuid references venues(id) not null,
  table_id              uuid references venue_tables(id) not null,
  status                text default 'open',
  tab_mode              text not null,
  stripe_payment_intent text,
  stripe_customer_id    text,
  opened_at             timestamptz default now(),
  closed_at             timestamptz,
  total_amount          numeric(10,2) default 0,
  tip_amount            numeric(10,2) default 0,
  platform_fee          numeric(10,2) default 0,
  created_at            timestamptz default now()
);

create table if not exists session_guests (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references table_sessions(id) on delete cascade not null,
  user_id         uuid references auth.users(id),
  display_name    text,
  phone           text,
  email           text,
  stripe_pm_id    text,
  joined_at       timestamptz default now()
);
