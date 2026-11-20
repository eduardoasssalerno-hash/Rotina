-- Correção das listas: nota de 1 a 10 e uma nota de português à parte (não entra na nota da atividade)
alter table public.tarefas drop constraint if exists tarefas_feedback_nota_check;
alter table public.tarefas add constraint tarefas_feedback_nota_check check (feedback_nota between 1 and 10);
alter table public.tarefas
  add column feedback_nota_pt numeric(3, 1) check (feedback_nota_pt between 1 and 10);

-- Arquivos: material de estudo ou PDF da correção feita pelo Claude
alter table public.anexos
  add column tipo text not null default 'material' check (tipo in ('material', 'correcao'));
