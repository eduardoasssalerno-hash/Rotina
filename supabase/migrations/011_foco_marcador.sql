-- Sessões de foco com marcador (matéria) e origem: as do app e as importadas do Forest.
alter table public.sessoes_foco
  add column if not exists marcador text check (char_length(marcador) <= 60),
  add column if not exists origem text not null default 'app' check (origem in ('app', 'forest')),
  add column if not exists externo_id text check (char_length(externo_id) <= 80);
-- importar de novo o mesmo arquivo não duplica
create unique index if not exists sessoes_foco_externo on public.sessoes_foco (user_id, externo_id);
