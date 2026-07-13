-- 014_platform_config.sql
-- Store service role key for DB triggers/cron without ALTER DATABASE

create table if not exists public.platform_config (
  key text primary key,
  value text not null
);

comment on table public.platform_config is
  'Server-side secrets for triggers/cron. Populated via scripts/sync-platform-config.ts';

alter table public.platform_config enable row level security;

-- Block anon/authenticated; service_role bypasses RLS for reads/writes
revoke all on table public.platform_config from anon, authenticated, public;
grant all on table public.platform_config to service_role;

create or replace function public.get_platform_config(p_key text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select value from public.platform_config where key = p_key;
$$;

revoke all on function public.get_platform_config(text) from public;
grant execute on function public.get_platform_config(text) to postgres, service_role;

-- Hardcoded hosted functions URL (not secret)
create or replace function public.notify_inventory_monitor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url constant text := 'https://cptyjloveecusgvituzo.supabase.co/functions/v1/inventory-monitor';
  service_key text;
begin
  service_key := coalesce(public.get_platform_config('service_role_key'), '');

  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('order_id', NEW.id, 'venue_id', NEW.venue_id)
  );

  return NEW;
exception when others then
  raise warning 'inventory-monitor trigger failed: %', SQLERRM;
  return NEW;
end;
$$;

-- Reschedule pg_cron jobs to use platform_config instead of database settings
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in ('demand-forecast-daily', 'insights-generator-daily');

    perform cron.schedule(
      'demand-forecast-daily',
      '0 6 * * *',
      $job$
      select net.http_post(
        url := 'https://cptyjloveecusgvituzo.supabase.co/functions/v1/demand-forecast',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(public.get_platform_config('service_role_key'), '')
        ),
        body := '{}'::jsonb
      );
      $job$
    );

    perform cron.schedule(
      'insights-generator-daily',
      '0 8 * * *',
      $job$
      select net.http_post(
        url := 'https://cptyjloveecusgvituzo.supabase.co/functions/v1/insights-generator',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(public.get_platform_config('service_role_key'), '')
        ),
        body := '{"auto": true}'::jsonb
      );
      $job$
    );
  end if;
exception when others then
  raise notice 'pg_cron reschedule skipped: %', SQLERRM;
end;
$cron$;
