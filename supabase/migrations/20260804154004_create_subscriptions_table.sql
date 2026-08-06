-- Applied directly to wonderword-dev via Supabase MCP on 2026-08-04.
-- This file makes that change reproducible through your normal
-- migration pipeline (dev → PR → merge to main → staging).

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'plan1', 'plan2')),
  billing_interval text check (billing_interval in ('monthly', 'annual')),
  status text not null default 'active' check (
    status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')
  ),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_user_id_key on public.subscriptions(user_id);
create index subscriptions_stripe_customer_id_idx on public.subscriptions(stripe_customer_id);

alter table public.subscriptions enable row level security;

-- Parents can read their own subscription row.
create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (
    user_id in (select id from public.users where auth_id = auth.uid())
  );

-- Only the service role (webhook/server routes) writes to this table —
-- no insert/update/delete policy for authenticated users on purpose.
