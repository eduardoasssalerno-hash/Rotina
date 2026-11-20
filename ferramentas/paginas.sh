#!/bin/sh
# Gera as páginas de prévia (JPG) de um PDF que está em public/arquivos/
# Uso: sh ferramentas/paginas.sh public/arquivos/Nome_do_arquivo.pdf   (mostra quantas páginas gerou)
set -e
f="$1"; b=$(basename "$f" .pdf); d="public/arquivos/paginas/$b"
rm -rf "$d"; mkdir -p "$d"
pdftoppm -r 100 -scale-to-x 1100 -scale-to-y -1 -jpeg -jpegopt quality=72 "$f" "$d/p"
i=1; for p in $(ls "$d"/p-*.jpg | sort -V); do mv "$p" "$d/$i.jpg"; i=$((i+1)); done
echo "$((i-1)) páginas em $d"
