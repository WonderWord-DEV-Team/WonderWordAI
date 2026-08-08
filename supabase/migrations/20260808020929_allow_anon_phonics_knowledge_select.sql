drop policy if exists phonics_knowledge_select on public.phonics_knowledge;

create policy phonics_knowledge_select
  on public.phonics_knowledge
  for select
  using (true);

grant select on public.phonics_knowledge to anon;