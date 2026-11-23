-- Modelos de to-do com etapas prontas (ex.: "Rodar a operação" com as 5 etapas)
create table public.modelos_todo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 160),
  etapas text[] not null default '{}' check (cardinality(etapas) <= 40),
  criado_em timestamptz not null default now(),
  unique (user_id, titulo)
);
alter table public.modelos_todo enable row level security;
revoke all on public.modelos_todo from anon;
grant select, insert, update, delete on public.modelos_todo to authenticated;
create policy "dono vê" on public.modelos_todo for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.modelos_todo for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono altera" on public.modelos_todo for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.modelos_todo for delete to authenticated using (user_id = (select auth.uid()));
