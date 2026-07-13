-- 022_rate_limits_session_close.sql
-- TAB-23: durable shared API rate limits (S6); support guest JWT revoke via session status (S10).
--
-- Forward: apply after 021_rls_with_check_and_storage.sql
-- Rollback notes:
--   DROP FUNCTION public.check_api_rate_limit(text, int, int);
--   DROP TABLE public.api_rate_limits;
-- Risk: low — new service_role-only table; app falls back to in-memory if RPC missing.

create table if not exists public.api_rate_limits (
  key         text primary key,
  count       int not null default 0,
  reset_at    timestamptz not null,
  updated_at  timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;

revoke all on table public.api_rate_limits from anon, authenticated, public;
grant all on table public.api_rate_limits to service_role;

create or replace function public.check_api_rate_limit(
  p_key text,
  p_limit int,
  p_window_ms int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count int;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 256 then
    return false;
  end if;
  if p_limit is null or p_limit < 1 or p_window_ms is null or p_window_ms < 1 then
    return false;
  end if;

  insert into public.api_rate_limits as r (key, count, reset_at, updated_at)
  values (
    p_key,
    1,
    v_now + (p_window_ms * interval '1 millisecond'),
    v_now
  )
  on conflict (key) do update
    set
      count = case
        when r.reset_at <= v_now then 1
        else r.count + 1
      end,
      reset_at = case
        when r.reset_at <= v_now then
          v_now + (p_window_ms * interval '1 millisecond')
        else r.reset_at
      end,
      updated_at = v_now
  returning r.count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_api_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_api_rate_limit(text, int, int) to service_role;

comment on table public.api_rate_limits is
  'Fixed-window counters for auth/payment API abuse controls; service_role only.';
comment on function public.check_api_rate_limit(text, int, int) is
  'Atomically increment a rate-limit bucket; returns true when under limit.';
