-- 016_billing_launch.sql — SaaS billing, webhook idempotency, API idempotency keys

alter table venues add column if not exists plan text default 'starter';
alter table venues add column if not exists trial_ends_at timestamptz;
alter table venues add column if not exists stripe_customer_id text;
alter table venues add column if not exists stripe_subscription_id text;
alter table venues add column if not exists subscription_status text default 'trialing';

create table if not exists stripe_webhook_events (
  id          text primary key,
  event_type  text not null,
  processed_at timestamptz default now()
);

create table if not exists api_idempotency_keys (
  key             text not null,
  route           text not null,
  response_status int,
  response_body   jsonb,
  created_at      timestamptz default now(),
  primary key (key, route)
);

create index if not exists idx_api_idempotency_created on api_idempotency_keys(created_at);
