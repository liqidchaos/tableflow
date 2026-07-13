-- TAB-23 verification helpers (run after applying 022_rate_limits_session_close.sql)

-- 1) Table is service_role-only
select
  has_table_privilege('anon', 'public.api_rate_limits', 'SELECT') as anon_select,
  has_table_privilege('authenticated', 'public.api_rate_limits', 'SELECT') as auth_select,
  has_table_privilege('service_role', 'public.api_rate_limits', 'INSERT') as service_insert;

-- expect: anon_select=false, auth_select=false, service_insert=true

-- 2) Fixed-window limiter increments and trips
select public.check_api_rate_limit('verify:tab23', 2, 60000); -- true
select public.check_api_rate_limit('verify:tab23', 2, 60000); -- true
select public.check_api_rate_limit('verify:tab23', 2, 60000); -- false

-- 3) Cleanup smoke key
delete from public.api_rate_limits where key = 'verify:tab23';
