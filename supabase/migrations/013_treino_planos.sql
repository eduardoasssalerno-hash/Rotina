-- Aba Treino com vários planos (calistenia, perna na academia, preparo do salto...).
-- Cada plano tem os próprios exercícios, dias e horário. Um treino é de um plano num dia,
-- então o mesmo dia pode ter dois treinos (ex.: sábado com calistenia e preparo do salto).
-- Exercícios de academia guardam também a carga (kg) de cada série.

create table public.treino_planos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 40),
  -- regras e avisos mostrados no topo do treino (ex.: restrições do fisioterapeuta)
  descricao text check (char_length(descricao) <= 1500),
  dias smallint[] not null default '{}'::smallint[] check (dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  inicio time,
  -- o plano principal anda junto com o hábito, o bloco "Treino" e o planeta de treino
  principal boolean not null default false,
  ativo boolean not null default true,
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  unique (id, user_id)
);
create index treino_planos_user on public.treino_planos (user_id);

alter table public.treino_planos enable row level security;
revoke all on public.treino_planos from anon;
grant select, insert, update, delete on public.treino_planos to authenticated;
create policy "dono vê" on public.treino_planos for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.treino_planos for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono altera" on public.treino_planos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.treino_planos for delete to authenticated using (user_id = (select auth.uid()));

-- Cada usuário que já tem exercícios ou treinos ganha o plano Calistenia (principal)
insert into public.treino_planos (user_id, nome, principal, ordem)
select u, 'Calistenia', true, 0
from (select user_id u from public.exercicios union select user_id from public.treinos) x;

-- Exercícios: plano e carga
alter table public.exercicios
  add column plano_id uuid,
  add column usa_carga boolean not null default false,
  add foreign key (plano_id, user_id) references public.treino_planos (id, user_id) on delete cascade;
update public.exercicios e set plano_id = p.id from public.treino_planos p where p.user_id = e.user_id and p.principal;
alter table public.exercicios alter column plano_id set not null;
create index exercicios_plano on public.exercicios (plano_id, user_id);

-- Desenho: os novos exercícios podem não ter desenho próprio (o app mostra um desenho genérico)
alter table public.exercicios drop constraint if exists exercicios_desenho_check;
alter table public.exercicios add constraint exercicios_desenho_check check (desenho ~ '^[a-z0-9_]{1,30}$');
-- "como fazer" mais longo, para caber a explicação dos exercícios de academia
alter table public.exercicios drop constraint if exists exercicios_como_fazer_check;
alter table public.exercicios add constraint exercicios_como_fazer_check check (char_length(como_fazer) <= 1000);

-- Treinos: um por plano por dia
alter table public.treinos add column plano_id uuid,
  add foreign key (plano_id, user_id) references public.treino_planos (id, user_id) on delete cascade;
update public.treinos t set plano_id = p.id from public.treino_planos p where p.user_id = t.user_id and p.principal;
alter table public.treinos alter column plano_id set not null;
alter table public.treinos drop constraint if exists treinos_user_id_dia_key;
alter table public.treinos add constraint treinos_user_dia_plano unique (user_id, dia, plano_id);
create index treinos_plano on public.treinos (plano_id, user_id);

-- Séries: carga em kg de cada série (mesma posição das repetições)
alter table public.treino_series
  add column cargas numeric(6, 1)[] not null default '{}'::numeric[]
  check (cardinality(cargas) <= 10 and 0 <= all (cargas) and 1000 >= all (cargas));
