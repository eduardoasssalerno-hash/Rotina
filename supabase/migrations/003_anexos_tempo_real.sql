-- Tempo que a tarefa levou de verdade (para comparar com o previsto)
alter table public.tarefas
  add column minutos_real smallint check (minutos_real between 1 and 720);

-- Arquivos (PDFs das listas com aula) ligados a cada tarefa.
-- O arquivo fica no site, numa pasta que só abre com o login (o Worker do Cloudflare confere).
create table public.anexos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tarefa_id uuid not null,
  nome text not null check (char_length(nome) between 1 and 120),
  caminho text not null check (caminho ~ '^/arquivos/[A-Za-z0-9._-]+\.pdf$'),
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  unique (tarefa_id, caminho),
  foreign key (tarefa_id, user_id) references public.tarefas (id, user_id) on delete cascade
);
create index anexos_tarefa on public.anexos (tarefa_id, user_id);
create index anexos_user on public.anexos (user_id);

alter table public.anexos enable row level security;
revoke all on public.anexos from anon;
grant select, insert, update, delete on public.anexos to authenticated;
create policy "dono vê" on public.anexos for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.anexos for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono altera" on public.anexos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.anexos for delete to authenticated using (user_id = (select auth.uid()));
