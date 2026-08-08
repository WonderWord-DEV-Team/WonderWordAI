alter table public.subscriptions
  add column if not exists trial_reminder_sent_at timestamptz;