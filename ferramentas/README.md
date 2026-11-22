# Ferramentas do 3S Rotina (não vão para o site)

- `correcao/gera_correcao.py`: gera o PDF da correção de uma lista (nota de 1 a 10, nota de português à parte, questão por questão), as páginas de prévia e o SQL para gravar no Supabase. Modelo do JSON em `correcao/exemplo.json`. Precisa de Python com reportlab e Pillow, e do pdftoppm.
- `paginas.sh`: gera as páginas de prévia de qualquer PDF novo em `public/arquivos/`.

Regras dos arquivos:
- Nome do PDF só com letras, números, ponto, `_` e `-`, direto em `public/arquivos/` (sem subpastas).
- Os arquivos só abrem para quem está logado: o `worker.js` confere o login antes de entregar.
- Depois de `git push` na `main`, o Cloudflare publica em cerca de 2 minutos.
- `listas/espacar.py`: refaz a parte da lista de um PDF "com aula" com mais espaço para responder: linhas nas questões de teoria e quadriculado (5 mm) nas de cálculo. A aula fica igual. Ex.: `python3 ferramentas/listas/espacar.py public/arquivos/Lista_9_...pdf --lista-desde 9 --calculo 3,11,12,13,14,18`. Depois rode o `paginas.sh` e atualize `anexos.paginas` no Supabase. Pedido do Eduardo (21/11): toda lista nova já sai assim.
