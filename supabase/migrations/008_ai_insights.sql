-- 008_ai_insights.sql
create table if not exists ai_insights (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid references venues(id) on delete cascade not null,
  type        text not null,
  content     text not null,
  metadata    jsonb default '{}',
  is_read     boolean default false,
  created_at  timestamptz default now()
);
