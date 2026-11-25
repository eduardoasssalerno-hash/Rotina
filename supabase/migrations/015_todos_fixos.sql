-- To-dos que se repetem todo dia dentro de um bloco fixo (ex.: no Estágio, "Bater a carteira do IMOB").
-- O app cria a tarefa do dia quando o Diário abre aquele dia (de hoje em diante); com modelo, ela já nasce com as etapas.
alter table public.modelos_todo add constraint modelos_todo_id_user unique (id, user_id);

create table public.todos_fixos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bloco_id uuid not null,
  titulo text not null check (char_length(titulo) between 1 and 160),
  modelo_id uuid,
  ordem integer not null default 0,
  ativo boolean not null default true,
  desde date not null default current_date,
  criado_em timestamptz not null default now(),
  unique (id, user_id),
  foreign key (bloco_id, user_id) references public.blocos_fixos (id, user_id) on delete cascade,
  foreign key (modelo_id, user_id) references public.modelos_todo (id, user_id) on delete set null (modelo_id)
);
create index todos_fixos_user on public.todos_fixos (user_id);
create index todos_fixos_bloco on public.todos_fixos (bloco_id);

alter table public.tarefas add column if not exists todo_fixo_id uuid;
alter table public.tarefas add constraint tarefas_todo_fixo_fk
  foreign key (todo_fixo_id, user_id) references public.todos_fixos (id, user_id) on delete set null (todo_fixo_id);
-- um por dia: abrir o Diário duas vezes não duplica
create unique index tarefas_todo_fixo_dia on public.tarefas (todo_fixo_id, dia) where todo_fixo_id is not null;

alter table public.todos_fixos enable row level security;
revoke all on public.todos_fixos from anon;
grant select, insert, update, delete on public.todos_fixos to authenticated;
create policy "dono vê" on public.todos_fixos for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.todos_fixos for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono altera" on public.todos_fixos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.todos_fixos for delete to authenticated using (user_id = (select auth.uid()));
