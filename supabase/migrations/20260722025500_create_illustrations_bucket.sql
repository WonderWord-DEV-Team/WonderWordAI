-- Drop policies if they already exist
drop policy if exists "Allow public read access to illustrations" on storage.objects;
drop policy if exists "Allow public insert access to illustrations" on storage.objects;

-- Create storage bucket if it does not exist
insert into storage.buckets (id, name, public)
values ('illustrations', 'illustrations', true)
on conflict (id) do nothing;

-- Create policies for storage.objects
create policy "Allow public read access to illustrations"
on storage.objects for select
using (bucket_id = 'illustrations');

create policy "Allow public insert access to illustrations"
on storage.objects for insert
with check (bucket_id = 'illustrations');
