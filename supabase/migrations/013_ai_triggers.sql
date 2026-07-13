-- 013_ai_triggers.sql
-- Inventory monitor trigger + pg_cron schedules for AI edge functions

create extension if not exists pg_net with schema extensions;

-- Fire-and-forget inventory check after each order insert.
-- Does not block order confirmation if the HTTP call fails.
create or replace function public.notify_inventory_monitor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text;
  service_key text;
begin
  fn_url := coalesce(
    current_setting('app.supabase_functions_url', true),
    current_setting('supabase.functions_url', true),
    'http://host.docker.internal:54321/functions/v1/inventory-monitor'
  );
  service_key := coalesce(
    current_setting('app.service_role_key', true),
    current_setting('supabase.service_role_key', true),
    ''
  );

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

drop trigger if exists inventory_check_on_order on orders;
create trigger inventory_check_on_order
  after insert on orders
  for each row
  execute function public.notify_inventory_monitor();

-- pg_cron schedules (requires pg_cron extension on hosted Supabase)
-- Run manually after deploy: set project URL + service role key in vault/settings
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
        url := current_setting('app.supabase_functions_url', true) || '/demand-forecast',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
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
        url := current_setting('app.supabase_functions_url', true) || '/insights-generator',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := '{"auto": true}'::jsonb
      );
      $job$
    );
  end if;
exception when others then
  raise notice 'pg_cron schedules skipped: %', SQLERRM;
end;
$cron$;
