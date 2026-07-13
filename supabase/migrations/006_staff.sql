-- 006_staff.sql
create table if not exists staff (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid references venues(id) on delete cascade not null,
  user_id         uuid references auth.users(id) not null,
  role            text not null,
  display_name    text,
  pin             text,
  push_token      text,
  is_active       boolean default true,
  created_at      timestamptz default now()
);
