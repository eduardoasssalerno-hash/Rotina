-- Índices que cobrem as ligações entre tabelas (pedido do assistente de desempenho do Supabase)
drop index if exists public.tarefas_projeto, public.tarefas_area, public.treino_series_exercicio,
  public.sessoes_foco_tarefa, public.sessoes_foco_projeto, public.treino_series_user;

create index areas_user on public.areas (user_id);
create index projetos_user on public.projetos (user_id);
create index projetos_area on public.projetos (area_id, user_id);
create index tarefas_projeto on public.tarefas (projeto_id, user_id);
create index tarefas_area on public.tarefas (area_id, user_id);
create index blocos_fixos_user on public.blocos_fixos (user_id);
create index blocos_fixos_area on public.blocos_fixos (area_id, user_id);
create index blocos_feitos_bloco on public.blocos_feitos (bloco_id, user_id);
create index habitos_user on public.habitos (user_id);
create index habitos_area on public.habitos (area_id, user_id);
create index habito_marcas_habito on public.habito_marcas (habito_id, user_id);
create index exercicios_user on public.exercicios (user_id);
create index treino_series_treino on public.treino_series (treino_id, user_id);
create index treino_series_exercicio on public.treino_series (exercicio_id, user_id);
create index sessoes_foco_tarefa on public.sessoes_foco (tarefa_id, user_id);
create index sessoes_foco_projeto on public.sessoes_foco (projeto_id, user_id);
