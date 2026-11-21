-- Conexão que serve só para investimentos (ex.: BTG corretora com consentimento de investimentos).
-- Assim as contas e os lançamentos dessa mesma instituição não entram duplicados.
alter table public.conexoes add column if not exists so_investimentos boolean not null default false;
