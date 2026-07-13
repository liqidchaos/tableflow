-- 017_billing_rls.sql — lock down idempotency tables (service role only)

alter table stripe_webhook_events enable row level security;
alter table api_idempotency_keys enable row level security;
