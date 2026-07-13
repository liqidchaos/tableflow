-- 001_venues.sql
create table if not exists venues (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique not null,
  owner_id            uuid references auth.users(id) not null,
  stripe_account_id   text,
  stripe_onboarded    boolean default false,
  logo_url            text,
  brand_color         text default '#E84B2C',
  address             text,
  city                text,
  country             text default 'US',
  timezone            text default 'America/New_York',
  currency            text default 'usd',
  pos_provider        text,
  pos_access_token    text,
  pos_location_id     text,
  qr_mode             text default 'static',
  nfc_enabled         boolean default false,
  tab_mode            text default 'preauth',
  service_fee_pct     numeric(5,4) default 0.004,
  is_active           boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  deleted_at          timestamptz
);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists venues_updated_at on venues;
create trigger venues_updated_at
  before update on venues
  for each row execute function update_updated_at();
