#!/usr/bin/env python3
"""Refaz a parte da lista de um PDF "com aula" com MAIS ESPAÇO para responder.

- Questões (ou itens) de teoria ganham linhas; as de cálculo ganham QUADRICULADO (5 mm).
- As páginas da aula ficam iguais; só as páginas da lista são remontadas.
- Cada trecho de enunciado é recortado da página original como imagem (tabelas e figuras
  continuam iguais) e o espaço de resposta é desenhado de novo, maior.

Uso (na raiz do repositório):
  python3 ferramentas/listas/espacar.py public/arquivos/Lista_8_...pdf --lista-desde 6 \
      --calculo 1,2,4,5,7 [--saida public/arquivos/Lista_8_...pdf]
Depois: sh ferramentas/paginas.sh <pdf de saída>   (gera a prévia em JPG)

Regras de tipo (teoria x cálculo): cada questão tem um padrão (--calculo lista as de cálculo);
um item com verbo de explicar (Explique, Por que, Cite, Defina, Comente...) vira teoria, e um
item com verbo de conta (Calcule, Determine, Encontre, Qual será o preço...) vira cálculo.
"""
import argparse, io, os, re, subprocess, sys, tempfile
from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont("DV", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
DPI = 150
PX = 72 / DPI                     # pontos por pixel
W, H = A4
MARG_INF = 1.6 * cm
MARG_SUP = 1.5 * cm
COR_LINHA = (0.78, 0.80, 0.83)
COR_GRADE = (0.80, 0.85, 0.91)

TEORIA_RX = re.compile(r"\b(Explique|Por que|Cite|Defina|Comente|Dê um exemplo|Compare e confronte|O que (esse|isso)|"
                       r"Partindo do pressuposto|Qual condição|Em que situações|caracteriza|revela|Justifique|justifique)", re.I)
CALC_RX = re.compile(r"\b(Calcule|Determine|Encontre|Mostre que|Faça as votações|Qual (é|será|deve|a quantidade|o valor)|"
                     r"valor médio|preço|quantidade)", re.I)


def render(pdf, pagina, pasta):
    base = os.path.join(pasta, f"p{pagina}")
    subprocess.run(["pdftoppm", "-gray", "-r", str(DPI), "-f", str(pagina), "-l", str(pagina), "-png", pdf, base], check=True)
    arq = [f for f in os.listdir(pasta) if f.startswith(f"p{pagina}-") or f == f"p{pagina}.png"]
    arq = sorted(os.path.join(pasta, f) for f in arq if f.startswith(f"p{pagina}-"))[0]
    return Image.open(arq).convert("L")


def texto(pdf, pagina, y0, y1, largura):
    r = subprocess.run(["pdftotext", "-r", str(DPI), "-f", str(pagina), "-l", str(pagina), "-x", "0", "-y", str(y0),
                        "-W", str(largura), "-H", str(max(1, y1 - y0)), pdf, "-"], capture_output=True, text=True)
    return " ".join(r.stdout.split())


def trechos(img, gap_max):
    """Faixas (y0, y1) com tinta escura: enunciados, tabelas e figuras. Linhas e caixas cinza-claro ficam de fora."""
    w, h = img.size
    px = img.load()
    linhas = []
    for y in range(h):
        n = 0
        for x in range(int(w * 0.06), int(w * 0.94), 2):
            if px[x, y] < 140:
                n += 1
                if n >= 2:
                    break
        linhas.append(n >= 2)
    faixas, ini, fim = [], None, None
    for y, tem in enumerate(linhas):
        if tem:
            if ini is None:
                ini = y
            elif y - fim > gap_max:
                faixas.append((ini, fim)); ini = y
            fim = y
    if ini is not None:
        faixas.append((ini, fim))
    # tira o número da página (pequeno, lá embaixo)
    return [(a, b) for (a, b) in faixas if not (a > h * 0.93 and b - a < 40)]


def desenha_linhas(c, x0, x1, ytop, altura):
    c.setStrokeColorRGB(*COR_LINHA); c.setLineWidth(0.6)
    y = ytop - 0.9 * cm
    while y > ytop - altura + 0.2 * cm:
        c.line(x0, y, x1, y); y -= 0.9 * cm


def desenha_grade(c, x0, x1, ytop, altura):
    passo = 0.5 * cm
    n = int((x1 - x0) / passo); x1 = x0 + n * passo
    m = int(altura / passo); ybot = ytop - m * passo
    c.setStrokeColorRGB(*COR_GRADE); c.setLineWidth(0.35)
    for i in range(n + 1):
        c.line(x0 + i * passo, ybot, x0 + i * passo, ytop)
    for j in range(m + 1):
        c.line(x0, ybot + j * passo, x1, ybot + j * passo)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--lista-desde", type=int, required=True, help="primeira página da lista (as anteriores são a aula)")
    ap.add_argument("--calculo", default="", help="questões de cálculo, ex.: 1,2,4")
    ap.add_argument("--saida")
    ap.add_argument("--fator", type=float, default=1.7, help="quanto aumentar o espaço de resposta")
    a = ap.parse_args()
    calc = {int(q) for q in a.calculo.split(",") if q.strip()}
    saida = a.saida or a.pdf
    leitor = PdfReader(a.pdf)
    total = len(leitor.pages)
    tmp = tempfile.mkdtemp()

    # 1) recortes da lista, com o espaço que cada um tinha depois
    itens = []
    for pg in range(a.lista_desde, total + 1):
        img = render(a.pdf, pg, tmp)
        w, h = img.size
        fx = trechos(img, gap_max=int(0.55 * cm / PX))
        fundo = h - int(MARG_INF / PX)
        for i, (y0, y1) in enumerate(fx):
            prox = fx[i + 1][0] if i + 1 < len(fx) else fundo
            itens.append({"img": img.crop((0, max(0, y0 - 6), w, min(h, y1 + 6))),
                          "texto": texto(a.pdf, pg, max(0, y0 - 10), y1 + 10, w), "espaco": (prox - y1) * PX})

    # 2) tipo de cada recorte
    q = None
    for it in itens:
        ms = re.findall(r"(?:^|\s)(\d{1,2})[\.\)]\s+[A-ZÁÉÍÓÚ]", it["texto"])
        if ms:
            q = int(ms[0])
        tipo = "calculo" if q in calc else "teoria"
        if TEORIA_RX.search(it["texto"]):
            tipo = "teoria"
        elif CALC_RX.search(it["texto"]) and q in calc:
            tipo = "calculo"
        it["q"], it["tipo"] = q, tipo

    # 3) monta as páginas novas
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    x0, x1 = 2.0 * cm, W - 2.0 * cm
    y = H - MARG_SUP
    pagina = a.lista_desde

    def nova_pagina():
        nonlocal y, pagina
        c.setFont("DV", 8); c.setFillGray(0.5); c.drawRightString(W - 2 * cm, 1.0 * cm, str(pagina)); c.setFillGray(0)
        c.showPage(); y = H - MARG_SUP; pagina += 1

    def minimo_de(it):
        if it["espaco"] < 1.2 * cm:
            return 0.15 * cm
        return 7.5 * cm if it["tipo"] == "calculo" else 5.4 * cm

    for k, it in enumerate(itens):
        iw, ih = it["img"].size
        alt_img = ih * PX
        tem_resposta = it["espaco"] >= 1.2 * cm
        if tem_resposta:
            minimo = 7.5 * cm if it["tipo"] == "calculo" else 5.4 * cm
            maximo = 11.5 * cm if it["tipo"] == "calculo" else 9.0 * cm
            resp = min(max(min(it["espaco"], 7 * cm) * a.fator, minimo), maximo)
        else:
            minimo = resp = 0.15 * cm
        livre = y - alt_img - MARG_INF
        if not tem_resposta and k + 1 < len(itens):
            # enunciado sem espaço próprio (ex.: antes de uma tabela): não deixa sozinho no pé da página
            precisa, j = alt_img, k + 1
            while j < len(itens):
                precisa += itens[j]["img"].size[1] * PX + minimo_de(itens[j])
                if itens[j]["espaco"] >= 1.2 * cm:
                    break
                j += 1
            if y - precisa < MARG_INF and y < H - MARG_SUP - 1:
                nova_pagina(); livre = y - alt_img - MARG_INF
        if resp > livre:
            if livre >= minimo:
                resp = livre          # cabe o mínimo: usa o resto da página
            elif y < H - MARG_SUP - 1:
                nova_pagina()
        c.drawImage(ImageReader(it["img"]), 0, y - alt_img, width=iw * PX, height=alt_img)
        y -= alt_img
        if tem_resposta:
            topo = y - 0.15 * cm
            (desenha_grade if it["tipo"] == "calculo" else desenha_linhas)(c, x0, x1, topo, resp - 0.3 * cm)
        y -= resp
    nova_pagina()
    c.save()

    # 4) junta aula (igual) + lista nova
    novo = PdfReader(io.BytesIO(buf.getvalue()))
    w = PdfWriter()
    for i in range(a.lista_desde - 1):
        w.add_page(leitor.pages[i])
    for p in novo.pages:
        w.add_page(p)
    with open(saida, "wb") as f:
        w.write(f)
    n_calc = sum(1 for it in itens if it["tipo"] == "calculo" and it["espaco"] >= 1.2 * cm)
    n_teo = sum(1 for it in itens if it["tipo"] == "teoria" and it["espaco"] >= 1.2 * cm)
    print(f"{saida}: {len(w.pages)} páginas (aula {a.lista_desde - 1} + lista {len(novo.pages)}); "
          f"espaços: {n_calc} quadriculados, {n_teo} com linhas")
    for it in itens:
        if it["espaco"] >= 1.2 * cm:
            print(f"  Q{it['q']} {it['tipo']:7s} {it['texto'][:70]}")


if __name__ == "__main__":
    main()
