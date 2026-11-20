# 3S Rotina

App pessoal da Ione para rotina, estudos, treino e dinheiro: dia, semana e mês, projetos como planetas, tarefas, calistenia e gastos.

- Código: React + Vite, app instalável (PWA). Tablet primeiro, também funciona no celular.
- Banco e login: Supabase (projeto `rotina`, região São Paulo). Todas as tabelas com RLS: cada conta só vê o que é seu.
- No código vai só a chave pública (publishable). Nada de chave secreta aqui.
- Publicação: Cloudflare Workers, ligado a este repositório (cada envio para `main` publica sozinho).

## Telas da primeira versão
- **Hoje**: blocos do dia com botão Feito, tarefas, devocional (Bíblia em ordem), próximo treino, provas e prazos.
- **Semana e mês**: blocos coloridos por área.
- **Planetas**: cada projeto ou matéria é um planeta que cresce com as etapas feitas; "Ver etapas" marca as etapas, e elas já aparecem feitas em Hoje.
- **Tarefas**: bandeira de prioridade e faixa da cor da área.
- **Treino**: séries de cada exercício, desenhos animados, feedback do dia seguinte. O planeta Calistenia cresce a cada treino.

## Banco
As mudanças ficam em `supabase/migrations`, na ordem. Depois de cada mudança, rodar o Security Advisor do Supabase.
