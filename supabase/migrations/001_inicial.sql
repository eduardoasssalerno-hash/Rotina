-- 3S Rotina: estrutura inicial
-- App de uso pessoal: cada linha pertence a um usuário (user_id) e só ele vê e mexe.
-- Todas as tabelas têm RLS ligado desde o início.
-- As ligações entre tabelas usam (id, user_id), para que nada aponte para dados de outra pessoa.

-- ---------------------------------------------------------------
-- Áreas da vida (Faculdade, Trabalho, Pessoal, Igreja, Intercâmbio, Carreira)
-- ---------------------------------------------------------------
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 40),
  cor text not null default '#0A2240' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  -- área privada: nas telas aparece só o nome da área, sem descrever a atividade
  privada boolean not null default false,
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  unique (id, user_id)
);

-- ---------------------------------------------------------------
-- Projetos e matérias (cada um é um planeta)
-- ---------------------------------------------------------------
create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id uuid,
  nome text not null check (char_length(nome) between 1 and 80),
  descricao text check (char_length(descricao) <= 500),
  prazo date,
  -- 'geral' cresce com etapas feitas e tempo de foco; 'treino' cresce com treinos concluídos
  tipo text not null default 'geral' check (tipo in ('geral', 'treino')),
  -- energia inicial (planetas que já tinham progresso antes do app)
  energia_base smallint not null default 0 check (energia_base between 0 and 100),
  -- posição no sistema solar (0 a 100)
  pos_x numeric(5, 2) not null default 50 check (pos_x between 0 and 100),
  pos_y numeric(5, 2) not null default 50 check (pos_y between 0 and 100),
  arquivado boolean not null default false,
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  unique (id, user_id),
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete set null (area_id)
);

-- ---------------------------------------------------------------
-- Tarefas (soltas ou etapas de um projeto). Com dia e hora viram um bloco na semana.
-- ---------------------------------------------------------------
create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  projeto_id uuid,
  area_id uuid,
  titulo text not null check (char_length(titulo) between 1 and 160),
  observacao text check (char_length(observacao) <= 1000),
  minutos smallint check (minutos between 1 and 720),
  dia date,
  inicio time,
  -- 0 sem prioridade, 1 baixa, 2 média, 3 alta
  prioridade smallint not null default 0 check (prioridade between 0 and 3),
  feita boolean not null default false,
  feita_em timestamptz,
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  unique (id, user_id),
  foreign key (projeto_id, user_id) references public.projetos (id, user_id) on delete cascade,
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete set null (area_id),
  check (inicio is null or dia is not null)
);
create index tarefas_dia on public.tarefas (user_id, dia);
create index tarefas_projeto on public.tarefas (projeto_id);
create index tarefas_area on public.tarefas (area_id);

-- ---------------------------------------------------------------
-- Compromissos fixos da semana (aulas, estágio, Pessoal, igreja, devocional, treino)
-- dias: 0 = domingo ... 6 = sábado
-- ---------------------------------------------------------------
create table public.blocos_fixos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id uuid,
  titulo text not null check (char_length(titulo) between 1 and 80),
  dias smallint[] not null check (dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[] and cardinality(dias) between 1 and 7),
  inicio time not null,
  fim time not null,
  -- não acontece em feriados e férias (aulas, estágio)
  pula_folga boolean not null default false,
  valido_de date,
  valido_ate date,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (id, user_id),
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete set null (area_id),
  check (fim > inicio)
);

-- Botão "Feito" de um compromisso fixo em um dia
create table public.blocos_feitos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bloco_id uuid not null,
  dia date not null,
  criado_em timestamptz not null default now(),
  primary key (bloco_id, dia),
  foreign key (bloco_id, user_id) references public.blocos_fixos (id, user_id) on delete cascade
);
create index blocos_feitos_user on public.blocos_feitos (user_id, dia);

-- Feriados e férias (dias em que aulas e estágio não acontecem)
create table public.folgas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  inicio date not null,
  fim date not null,
  nome text not null check (char_length(nome) between 1 and 60),
  check (fim >= inicio)
);
create index folgas_user on public.folgas (user_id, inicio);

-- ---------------------------------------------------------------
-- Hábitos (água, devocional...) e as marcações de cada dia
-- ---------------------------------------------------------------
create table public.habitos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id uuid,
  nome text not null check (char_length(nome) between 1 and 40),
  -- quantas vezes por dia conta como completo (ex.: 8 copos de água)
  meta smallint not null default 1 check (meta between 1 and 50),
  unidade text check (char_length(unidade) <= 20),
  horario time,
  minutos smallint check (minutos between 1 and 240),
  dias smallint[] not null default array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    check (dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[] and cardinality(dias) between 1 and 7),
  -- plano em andamento (ex.: leitura da Bíblia em ordem: "Gênesis 5")
  plano text check (char_length(plano) <= 200),
  proximo text check (char_length(proximo) <= 80),
  ativo boolean not null default true,
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  unique (id, user_id),
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete set null (area_id)
);

create table public.habito_marcas (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habito_id uuid not null,
  dia date not null,
  valor smallint not null default 1 check (valor between 0 and 50),
  nota text check (char_length(nota) <= 200),
  primary key (habito_id, dia),
  foreign key (habito_id, user_id) references public.habitos (id, user_id) on delete cascade
);
create index habito_marcas_user on public.habito_marcas (user_id, dia);

-- ---------------------------------------------------------------
-- Treino (calistenia)
-- ---------------------------------------------------------------
create table public.exercicios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  foco text check (char_length(foco) <= 40),
  -- desenho animado usado na tela
  desenho text not null default 'joelho' check (desenho in ('joelho', 'inclinada', 'pike', 'escapular', 'remador')),
  -- repetições ou segundos
  medida text not null default 'reps' check (medida in ('reps', 'segundos')),
  -- séries sugeridas para o próximo treino (aprovadas pela Ione)
  alvo smallint[] not null default array[12, 12, 12]::smallint[] check (cardinality(alvo) between 1 and 10),
  como_fazer text check (char_length(como_fazer) <= 600),
  dica text check (char_length(dica) <= 600),
  ativo boolean not null default true,
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  unique (id, user_id)
);

create table public.treinos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dia date not null,
  concluido boolean not null default false,
  concluido_em timestamptz,
  -- feedback do dia seguinte
  dor smallint check (dor between 1 and 5),
  dificuldade text check (dificuldade in ('facil', 'na_medida', 'pesado')),
  comentario text check (char_length(comentario) <= 1000),
  criado_em timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, dia)
);

create table public.treino_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  treino_id uuid not null,
  exercicio_id uuid not null,
  -- o que foi feito em cada série (repetições ou segundos)
  valores smallint[] not null default '{}'::smallint[] check (cardinality(valores) <= 10),
  nota text check (char_length(nota) <= 600),
  unique (treino_id, exercicio_id),
  foreign key (treino_id, user_id) references public.treinos (id, user_id) on delete cascade,
  foreign key (exercicio_id, user_id) references public.exercicios (id, user_id) on delete cascade
);
create index treino_series_user on public.treino_series (user_id);
create index treino_series_exercicio on public.treino_series (exercicio_id);

-- ---------------------------------------------------------------
-- Modo foco: cada sessão concluída
-- ---------------------------------------------------------------
create table public.sessoes_foco (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tarefa_id uuid,
  projeto_id uuid,
  inicio timestamptz not null default now(),
  minutos smallint not null check (minutos between 1 and 240),
  foreign key (tarefa_id, user_id) references public.tarefas (id, user_id) on delete set null (tarefa_id),
  foreign key (projeto_id, user_id) references public.projetos (id, user_id) on delete set null (projeto_id)
);
create index sessoes_foco_user on public.sessoes_foco (user_id, inicio);
create index sessoes_foco_tarefa on public.sessoes_foco (tarefa_id);
create index sessoes_foco_projeto on public.sessoes_foco (projeto_id);

-- ---------------------------------------------------------------
-- Registro de problemas do app (para o Claude ver e corrigir)
-- ---------------------------------------------------------------
create table public.erros (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rota text check (char_length(rota) <= 200),
  mensagem text not null check (char_length(mensagem) <= 500),
  detalhe text check (char_length(detalhe) <= 2000),
  navegador text check (char_length(navegador) <= 300),
  criado_em timestamptz not null default now()
);
create index erros_user on public.erros (user_id, criado_em);

-- ---------------------------------------------------------------
-- Segurança: RLS em todas as tabelas, cada um só vê o que é seu
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['areas', 'projetos', 'tarefas', 'blocos_fixos', 'blocos_feitos', 'folgas',
    'habitos', 'habito_marcas', 'exercicios', 'treinos', 'treino_series', 'sessoes_foco']
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

-- Erros: o app só registra; ler e apagar fica para o painel do Supabase
alter table public.erros enable row level security;
revoke all on public.erros from anon, authenticated;
grant insert on public.erros to authenticated;
create policy "registra o próprio erro" on public.erros for insert to authenticated
  with check (user_id = (select auth.uid()));
