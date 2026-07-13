-- 005_payments.sql
create table if not exists payments (
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
  status                  text default 'pending',
  payment_method_type     text,
  split_type              text,
  created_at              timestamptz default now(),
  captured_at             timestamptz
);
