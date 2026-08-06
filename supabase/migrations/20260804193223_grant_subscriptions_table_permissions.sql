-- Applied directly to wonderword-dev via Supabase MCP on 2026-08-04.
-- Fixes "permission denied for table subscriptions" — the table never
-- received the base Postgres GRANTs for service_role/authenticated.
-- (Separate from RLS policies, which control per-row access and were
-- already set up in 20260804154004_create_subscriptions_table.sql.)

grant select, insert, update, delete on public.subscriptions to service_role;
grant select on public.subscriptions to authenticated;
