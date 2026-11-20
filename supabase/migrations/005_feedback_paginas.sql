-- Feedback do Claude em cada atividade (ex.: depois de cada lista): nota, o que foi bem e o que foi mal
alter table public.tarefas
  add column feedback_nota numeric(3, 1) check (feedback_nota between 0 and 10),
  add column feedback_bem text check (char_length(feedback_bem) <= 3000),
  add column feedback_mal text check (char_length(feedback_mal) <= 3000),
  add column feedback_em timestamptz;

-- PDFs: quantas páginas têm prévia em imagem e o nome bonito para baixar
alter table public.anexos
  add column paginas smallint not null default 0 check (paginas between 0 and 200),
  add column arquivo_nome text check (char_length(arquivo_nome) <= 120);
