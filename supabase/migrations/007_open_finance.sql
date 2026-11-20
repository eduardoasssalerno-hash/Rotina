-- Open Finance pelo Meu Pluggy (uso pessoal, gratuito): contas, conexões, regras de categoria e investimentos.
-- A chave da Pluggy fica só nos segredos da Edge Function "pluggy-sync"; aqui não há nenhuma chave.

-- Conexões (um "item" da Pluggy por banco: Nubank, BTG)
create table public.conexoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id text not null check (item_id ~ '^[0-9a-fA-F-]{36}$'),
  banco text not null check (char_length(banco) between 1 and 40),
  status text check (char_length(status) <= 40),
  erro text check (char_length(erro) <= 300),
  consentimento_ate timestamptz,
  ultima_sincronia timestamptz,
  criado_em timestamptz not null default now(),
  unique (user_id, item_id)
);
create index conexoes_user on public.conexoes (user_id);

-- Contas (conta corrente, cartão de crédito)
create table public.contas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  externo_id text not null check (char_length(externo_id) <= 80),
  item_id text,
  banco text check (char_length(banco) <= 60),
  nome text not null check (char_length(nome) between 1 and 80),
  tipo text not null check (tipo in ('corrente', 'cartao', 'outra')),
  saldo numeric(14, 2),
  atualizado_em timestamptz,
  unique (id, user_id),
  unique (user_id, externo_id)
);
create index contas_user on public.contas (user_id);

-- Lançamentos vindos do banco: conta, código da Pluggy e texto original
alter table public.lancamentos drop constraint if exists lancamentos_tipo_check;
alter table public.lancamentos add constraint lancamentos_tipo_check check (tipo in ('gasto', 'entrada', 'transferencia'));
alter table public.lancamentos
  add column conta_id uuid,
  add column externo_id text check (char_length(externo_id) <= 80),
  add column origem text not null default 'manual' check (origem in ('manual', 'openfinance', 'extrato')),
  add column texto_banco text check (char_length(texto_banco) <= 300),
  add column categoria_banco text check (char_length(categoria_banco) <= 120),
  add column parcela text check (char_length(parcela) <= 20),
  add constraint lancamentos_conta_fk foreign key (conta_id, user_id) references public.contas (id, user_id) on delete set null (conta_id),
  add constraint lancamentos_externo_unico unique (user_id, externo_id);
create index lancamentos_conta on public.lancamentos (conta_id, user_id);

-- Regras: "se o texto do banco contém X, a categoria é Y"
create table public.regras_categoria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  texto text not null check (char_length(texto) between 2 and 60),
  categoria_id uuid,
  -- transferência entre contas suas, pagamento de fatura, aplicação: não conta como gasto
  transferencia boolean not null default false,
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  foreign key (categoria_id, user_id) references public.categorias (id, user_id) on delete cascade,
  check (transferencia or categoria_id is not null)
);
create index regras_user on public.regras_categoria (user_id);
create index regras_categoria_fk on public.regras_categoria (categoria_id, user_id);

-- Investimentos (posição atual) e o histórico do saldo para o gráfico
create table public.investimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  externo_id text check (char_length(externo_id) <= 80),
  instituicao text check (char_length(instituicao) <= 60),
  nome text not null check (char_length(nome) between 1 and 120),
  tipo text not null default 'outro' check (char_length(tipo) <= 40),
  subtipo text check (char_length(subtipo) <= 60),
  aplicado numeric(14, 2),
  saldo numeric(14, 2) not null default 0,
  taxa text check (char_length(taxa) <= 60),
  vencimento date,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, externo_id)
);
create index investimentos_user on public.investimentos (user_id);

create table public.investimento_historico (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  investimento_id uuid not null,
  dia date not null,
  saldo numeric(14, 2) not null,
  primary key (investimento_id, dia),
  foreign key (investimento_id, user_id) references public.investimentos (id, user_id) on delete cascade
);
create index investimento_historico_user on public.investimento_historico (user_id, dia);
create index investimento_historico_inv on public.investimento_historico (investimento_id, user_id);

do $$
declare t text;
begin
  foreach t in array array['conexoes', 'contas', 'regras_categoria', 'investimentos', 'investimento_historico']
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
