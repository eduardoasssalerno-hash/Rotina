-- Investimento que guarda dinheiro do AP (ex.: caixinha do Nubank): fica fora do patrimônio e conta como dinheiro separado para as contas
alter table public.investimentos add column if not exists grupo text check (grupo in ('mae'));
