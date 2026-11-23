-- Etapas (checklist) dentro de uma tarefa ou to-do, ex.: "Rodar a operação" → verificar documento, subir o termo...
create table public.subtarefas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tarefa_id uuid not null,
  titulo text not null check (char_length(titulo) between 1 and 160),
  feita boolean not null default false,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  unique (id, user_id),
  foreign key (tarefa_id, user_id) references public.tarefas (id, user_id) on delete cascade
);
create index subtarefas_tarefa on public.subtarefas (tarefa_id);
create index subtarefas_user on public.subtarefas (user_id);

alter table public.subtarefas enable row level security;
revoke all on public.subtarefas from anon;
grant select, insert, update, delete on public.subtarefas to authenticated;
create policy "dono vê" on public.subtarefas for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.subtarefas for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono altera" on public.subtarefas for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.subtarefas for delete to authenticated using (user_id = (select auth.uid()));
