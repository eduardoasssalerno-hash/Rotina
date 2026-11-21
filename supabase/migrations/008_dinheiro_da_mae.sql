-- "Dinheiro da mãe": dinheiro de outra pessoa que passa pela conta (pró-labore da mãe e os pagamentos feitos por ela).
-- Fica fora das finanças pessoais. Do pró-labore, uma parte é de quem usa o app (parte_minha).
alter table public.lancamentos
  add column grupo text check (grupo in ('mae')),
  add column parte_minha numeric(12, 2) check (parte_minha >= 0);
alter table public.lancamentos
  add constraint lancamentos_parte_minha_ate_valor check (parte_minha is null or parte_minha <= valor);

alter table public.regras_categoria
  add column grupo text check (grupo in ('mae')),
  add column parte_minha numeric(12, 2) check (parte_minha >= 0);
alter table public.regras_categoria drop constraint if exists regras_categoria_check;
alter table public.regras_categoria
  add constraint regras_categoria_check check (transferencia or grupo is not null or categoria_id is not null);
