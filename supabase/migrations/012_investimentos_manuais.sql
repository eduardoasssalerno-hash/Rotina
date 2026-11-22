-- Investimentos lançados à mão (Tesouro, CDB, bolsa), para o que o Open Finance não traz.
-- Renda fixa: o saldo é estimado pela Selic / CDI / IPCA do Banco Central ou pela taxa prefixada.
-- Bolsa: cada compra ou venda é uma operação; a posição e a cotação do dia viram uma linha em investimentos.

alter table public.investimentos
  add column if not exists origem text not null default 'openfinance' check (origem in ('openfinance', 'manual')),
  add column if not exists aplicado_em date,
  add column if not exists indexador text check (indexador in ('selic', 'cdi', 'ipca', 'prefixado', 'fixo')),
  -- taxa em número: % a.a. (prefixado e IPCA+) ou % do CDI
  add column if not exists taxa_num numeric(8, 4) check (taxa_num between -100 and 1000),
  add column if not exists ticker text check (ticker ~ '^[A-Z0-9]{4,8}$');

create table public.operacoes_bolsa (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dia date not null,
  ticker text not null check (ticker ~ '^[A-Z0-9]{4,8}$'),
  tipo text not null check (tipo in ('compra', 'venda')),
  quantidade numeric(14, 6) not null check (quantidade > 0),
  preco numeric(14, 4) not null check (preco >= 0),
  taxas numeric(12, 2) not null default 0 check (taxas >= 0),
  instituicao text check (char_length(instituicao) <= 60),
  criado_em timestamptz not null default now(),
  unique (id, user_id)
);
create index operacoes_bolsa_user on public.operacoes_bolsa (user_id, ticker);

-- cotação mais recente de cada ativo (gravada pela função investimentos-sync)
create table public.cotacoes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ticker text not null check (ticker ~ '^[A-Z0-9]{4,8}$'),
  nome text check (char_length(nome) <= 120),
  preco numeric(14, 4) not null,
  variacao numeric(8, 4),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, ticker)
);

-- índices do Banco Central usados nas estimativas (Selic e CDI diários, IPCA mensal)
create table public.indices (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  serie text not null check (serie in ('selic', 'cdi', 'ipca')),
  dia date not null,
  valor numeric(12, 8) not null,
  primary key (user_id, serie, dia)
);

do $$
declare t text;
begin
  foreach t in array array['operacoes_bolsa', 'cotacoes', 'indices']
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
