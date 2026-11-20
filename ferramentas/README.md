# Ferramentas do 3S Rotina (não vão para o site)

- `correcao/gera_correcao.py`: gera o PDF da correção de uma lista (nota de 1 a 10, nota de português à parte, questão por questão), as páginas de prévia e o SQL para gravar no Supabase. Modelo do JSON em `correcao/exemplo.json`. Precisa de Python com reportlab e Pillow, e do pdftoppm.
- `paginas.sh`: gera as páginas de prévia de qualquer PDF novo em `public/arquivos/`.

Regras dos arquivos:
- Nome do PDF só com letras, números, ponto, `_` e `-`, direto em `public/arquivos/` (sem subpastas).
- Os arquivos só abrem para quem está logado: o `worker.js` confere o login antes de entregar.
- Depois de `git push` na `main`, o Cloudflare publica em cerca de 2 minutos.
