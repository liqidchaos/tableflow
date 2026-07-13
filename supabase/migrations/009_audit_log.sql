-- 009_audit_log.sql
create table if not exists audit_log (
  id          bigserial primary key,
  venue_id    uuid references venues(id),
  actor_id    uuid,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);
