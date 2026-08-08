alter table public.users add column name text;

alter table public.child_profiles
  add column age integer check (age between 3 and 18),
  add column reading_level text check (reading_level in ('starting', 'simple', 'help', 'independent'));