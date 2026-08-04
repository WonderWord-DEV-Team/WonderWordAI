-- Applied directly to wonderword-dev via Supabase MCP on 2026-08-04.
--
-- Every new PARENT account automatically gets 14 days of Plan 2 (Pro), no
-- credit card required, no action from the user. If they never add a
-- payment method and subscribe for real before the trial ends, a daily
-- cron job drops them back to Free automatically.
--
-- This is implemented as a database trigger (not app code) on purpose:
-- it fires no matter which code path inserts the row into public.users,
-- so it can't be forgotten or bypassed by a future signup flow.

-- A card-free trial has no Stripe object at all until the parent actually
-- subscribes for real, so this can no longer be NOT NULL.
alter table public.subscriptions
  alter column stripe_customer_id drop not null;

alter table public.subscriptions
  add column trial_ends_at timestamptz;

create index if not exists subscriptions_trialing_expiry_idx
  on public.subscriptions (trial_ends_at)
  where status = 'trialing';

-- Grants a 14-day Plan 2 trial automatically to every new parent account.
-- SECURITY DEFINER so it works regardless of which role performs the
-- INSERT into public.users (anon during signup, service_role, etc.) —
-- it bypasses RLS/grants on public.subscriptions on purpose.
create or replace function public.start_trial_for_new_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'PARENT' then
    insert into public.subscriptions (user_id, plan, status, trial_ends_at)
    values (new.id, 'plan2', 'trialing', now() + interval '14 days')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_parent_user_created on public.users;
create trigger on_parent_user_created
  after insert on public.users
  for each row
  execute function public.start_trial_for_new_parent();

-- Daily job: any trial past its end date with no real subscription behind
-- it drops back to Free automatically. No card was ever collected, so
-- there's nothing to charge — this is a pure downgrade, not a cancellation.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'expire-plan2-trials',
  '0 3 * * *',
  $$
  update public.subscriptions
  set plan = 'free', status = 'canceled', updated_at = now()
  where status = 'trialing' and trial_ends_at < now();
  $$
);
