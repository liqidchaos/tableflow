-- 020_floor_server_assignment.sql
-- Assign a primary server to each table for guest-request routing.

alter table public.venue_tables
  add column if not exists assigned_staff_id uuid references public.staff(id) on delete set null;

create index if not exists idx_venue_tables_assigned_staff
  on public.venue_tables (assigned_staff_id)
  where assigned_staff_id is not null;

comment on column public.venue_tables.assigned_staff_id is
  'Primary server for this table; guest requests prefer this staff push token.';
