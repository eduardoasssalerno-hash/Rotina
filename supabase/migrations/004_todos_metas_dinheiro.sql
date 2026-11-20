-- To-dos dentro de um bloco do dia (ex.: o que estudar durante as Aulas, o que fazer no Estágio)
alter table public.tarefas add column bloco_id uuid;
alter table public.tarefas
  add constraint tarefas_bloco_fk foreign key (bloco_id, user_id)
  references public.blocos_fixos (id, user_id) on delete set null (bloco_id);
alter table public.tarefas add constraint tarefas_bloco_com_dia check (bloco_id is null or dia is not null);
create index tarefas_bloco on public.tarefas (bloco_id, user_id);

-- Metas com barra de progresso (em valor ou em contagem)
create table public.metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id uuid,
  nome text not null check (char_length(nome) between 1 and 100),
  tipo text not null default 'contagem' check (tipo in ('contagem', 'valor')),
  alvo numeric(12, 2) not null check (alvo > 0),
  atual numeric(12, 2) not null default 0 check (atual >= 0),
  unidade text check (char_length(unidade) <= 20),
  prazo date,
  concluida boolean not null default false,
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete set null (area_id)
);
create index metas_user on public.metas (user_id);
create index metas_area on public.metas (area_id, user_id);

-- Dinheiro: categorias e lançamentos (gastos e entradas)
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 40),
  tipo text not null check (tipo in ('gasto', 'entrada')),
  cor text not null default '#6F8DAB' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem smallint not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (id, user_id)
);
create index categorias_user on public.categorias (user_id);

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('gasto', 'entrada')),
  valor numeric(12, 2) not null check (valor > 0 and valor < 10000000),
  dia date not null,
  categoria_id uuid,
  descricao text check (char_length(descricao) <= 200),
  criado_em timestamptz not null default now(),
  foreign key (categoria_id, user_id) references public.categorias (id, user_id) on delete set null (categoria_id)
);
create index lancamentos_user on public.lancamentos (user_id, dia);
create index lancamentos_categoria on public.lancamentos (categoria_id, user_id);

do $$
declare t text;
begin
  foreach t in array array['metas', 'categorias', 'lancamentos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format($p$create policy "dono vê" on public.%I for select to authenticated using (user_id = (select auth.uid()))$p$, t);
    execute format($p$create policy "dono cria" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))$p$, t);
    execute format($p$create policy "dono altera" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$p$, t);
    execute format($p$create policy "dono apaga" on public.%I for delete to authenticated using (user_id = (select auth.uid()))$p$, t);
  end loop;
end $$;
