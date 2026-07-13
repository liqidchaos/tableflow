-- 015_p1_features.sql — guest push tokens, request acknowledgement, dynamic QR tokens

alter table session_guests add column if not exists push_token text;

alter table item_requests add column if not exists acknowledged_at timestamptz;

create table if not exists dynamic_qr_tokens (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid references venues(id) on delete cascade not null,
  table_id    uuid references venue_tables(id) on delete cascade not null,
  token       text unique not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz default now()
);

create index if not exists idx_dynamic_qr_tokens_token on dynamic_qr_tokens(token);
create index if not exists idx_dynamic_qr_tokens_expires on dynamic_qr_tokens(expires_at);
