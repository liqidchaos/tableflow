-- 018_pay_before_fire.sql
-- Kitchen enqueue requires payment clearance. Orders start as pending_payment
-- and only become KDS-visible (received) after authorize/capture or staff fire.

alter table orders
  add column if not exists paid_at timestamptz;

alter table payments
  add column if not exists order_id uuid references orders(id);

create index if not exists idx_orders_venue_status_paid
  on orders(venue_id, status)
  where status in ('pending_payment', 'received', 'preparing', 'ready');

create index if not exists idx_payments_order on payments(order_id);

comment on column orders.paid_at is
  'Set when payment clears (authorize/capture) or staff marks paid and kitchen is enqueued.';
comment on column payments.order_id is
  'Optional link for pay_per_order intents; session-level preauth may leave this null.';

-- Inventory should only decrement when the ticket actually fires to the kitchen.
drop trigger if exists inventory_check_on_order on orders;

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

drop trigger if exists inventory_check_on_order_fire on orders;
create trigger inventory_check_on_order_fire
  after update of status on orders
  for each row
  when (NEW.status = 'received' and OLD.status is distinct from 'received')
  execute function public.notify_inventory_monitor();
