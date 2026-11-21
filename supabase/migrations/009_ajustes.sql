-- Ajustes da conta (uma linha por usuário). ap_desde: o saldo do AP começa nesta data (antes disso está quitado).
create table public.ajustes (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  ap_desde date,
  atualizado_em timestamptz not null default now()
);
alter table public.ajustes enable row level security;
revoke all on public.ajustes from anon;
grant select, insert, update, delete on public.ajustes to authenticated;
create policy "dono vê" on public.ajustes for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.ajustes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono altera" on public.ajustes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.ajustes for delete to authenticated using (user_id = (select auth.uid()));
