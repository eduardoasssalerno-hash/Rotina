#!/usr/bin/env python3
"""Simulado: prova de Microeconomia II de anos anteriores (enviada pelo Eduardo em 23/11/2026).
Só as questões, com linhas (teoria) e quadriculado de 5 mm (cálculo). Sem gabarito no PDF.
Uso (na raiz do repositório): python3 ferramentas/listas/simulado_prova_anterior.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "correcao"))
from base import *  # noqa: F401,F403  (estilos e fontes)
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Flowable, KeepTogether
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle

SAIDA = "public/arquivos/Simulado_Micro_II_Prova_Anterior.pdf"


class Grade(Flowable):
    def __init__(self, h):
        super().__init__(); self.h = h

    def wrap(self, aw, ah_):
        self.w = aw; return aw, self.h + 0.3 * cm

    def draw(self):
        c = self.canv; p = 0.5 * cm
        n = int(self.w / p); m = int(self.h / p)
        c.setStrokeColor(colors.HexColor("#CCD8E8")); c.setLineWidth(0.35)
        for i in range(n + 1):
            c.line(i * p, 0.3 * cm, i * p, 0.3 * cm + m * p)
        for j in range(m + 1):
            c.line(0, 0.3 * cm + j * p, n * p, 0.3 * cm + j * p)


class Linhas(Flowable):
    def __init__(self, h):
        super().__init__(); self.h = h

    def wrap(self, aw, ah_):
        self.w = aw; return aw, self.h

    def draw(self):
        c = self.canv; c.setStrokeColor(colors.HexColor("#C8C8C8")); c.setLineWidth(0.5)
        y = self.h - 0.9 * cm
        while y > 0.1 * cm:
            c.line(0, y, self.w, y); y -= 0.9 * cm


def it(texto, resp=None):
    """Item + espaço de resposta, sempre juntos na mesma página."""
    partes = [Paragraph(texto, item)]
    if resp is not None:
        partes.append(resp)
    return KeepTogether(partes)


def q(num, texto):
    return Paragraph(f"<b>{num}. (2 pts)</b> {texto}", qh)


def junta_enunciados(fl):
    """Agrupa cada enunciado de questão com tudo até o 1º item com espaço de resposta (não fica sozinho no pé da página)."""
    out, grupo = [], None
    for f in fl:
        if isinstance(f, Paragraph) and f.style is qh:
            if grupo:
                out.append(KeepTogether(grupo))
            grupo = [f]
        elif grupo is not None:
            grupo.append(f)
            if isinstance(f, KeepTogether):
                out.append(KeepTogether(grupo)); grupo = None
        else:
            out.append(f)
    if grupo:
        out.append(KeepTogether(grupo))
    return out


s = []
s.append(Paragraph("UNIVERSIDADE FEDERAL DE GOIÁS – UFG", inst))
s.append(Paragraph("FACE – MICROECONOMIA II", center))
s.append(Paragraph("Simulado: prova de anos anteriores", title))
s.append(Paragraph("2 horas · sem consultar · 5 questões de 2 pontos (total 10)", sub))
s.append(Paragraph("Anote a hora em que começou e a hora em que terminou. Responda no próprio PDF, no app de notas. "
                   "Nas linhas vão as respostas de teoria; no quadriculado, as contas, os gráficos e as árvores.", quad))
s.append(Paragraph("Início: ______ h ______    Término: ______ h ______", quad))

# Questão 1 (teoria, V ou F) — fica logo abaixo do cabeçalho, sem agrupar
s.append(Paragraph("<b>1. (2 pts)</b> " + "A respeito das formas de corrigir falhas de mercado, classifique as afirmativas abaixo em (V) Verdadeira "
              "ou (F) Falsa. <u>Não é preciso justificar nenhuma resposta, mas 1 resposta errada anula 1 resposta certa.</u> "
              "Logo, na dúvida, deixe a classificação em branco.", ParagraphStyle("q1", parent=qh)))
for t in ["Em mercados com externalidade negativa, a quantidade produzida pelo mercado competitivo tende a ser menor "
          "que a quantidade socialmente ótima.",
          "Internalizar uma externalidade negativa sempre reduz a quantidade ofertada e diminui o preço de equilíbrio.",
          "Com informações limitadas e custos elevados de monitoramento, um sistema de permissões negociáveis pode ser "
          "ineficiente, especialmente se o número total de permissões for definido incorretamente, elevando os custos de "
          "redução e até levando algumas empresas à falência.",
          "Os impostos ambientais permitem que o mesmo nível total de emissão seja alcançado a um custo menor do que "
          "padrões uniformes, pois as empresas com menores custos de redução tendem a reduzir mais, enquanto as de custos "
          "maiores reduzem menos.",
          "Como o governo pode impor regras e exigências adicionais de transparência, sua atuação tende a reduzir "
          "significativamente os efeitos do problema da ação oculta, podendo em alguns casos eliminar completamente o problema."]:
    s.append(it(f"(&nbsp;&nbsp;&nbsp;&nbsp;) {t}"))
    s.append(Spacer(1, 0.25 * cm))
s.append(Paragraph("Rascunho (opcional):", quad))
s.append(Grade(3.5 * cm))

# Questão 2 (cálculo)
s.append(q(2, "Suponha dois consumidores, Maria e Pedro, cujas funções de utilidade sejam dadas, respectivamente, por:"))
s.append(Paragraph("Maria: U = 2x + y &nbsp;&nbsp;&nbsp;&nbsp; Pedro: U = min{x, 2y}", eq))
s.append(Paragraph("Maria detém inicialmente 0 unidades de y e 10 unidades de x, enquanto Pedro detém 0 unidades de x e "
                   "20 unidades de y. Considerando o equilíbrio competitivo, apresente:", body))
s.append(it("a) A razão de preços associada à alocação do equilíbrio competitivo (x*, y*).", Grade(6.5 * cm)))
s.append(it("b) As funções de restrição orçamentária dos consumidores.", Grade(5 * cm)))
s.append(it("c) A cesta de consumo ótima dos consumidores.", Grade(7 * cm)))
s.append(it("d) Desenhe uma caixa de Edgeworth, apresentando as dotações inicial e final.", Grade(10 * cm)))

# Questão 3 (cálculo: árvore)
s.append(q(3, "Considere um mercado oligopolista no qual a empresa AlfaQuímica, já estabelecida, enfrenta a possibilidade "
              "de entrada de uma nova concorrente, chamada NovaTec. A AlfaQuímica pode escolher entre duas estratégias:"))
s.append(Paragraph("• Confrontar (C): reduzir preços agressivamente para tornar a entrada pouco lucrativa;", item))
s.append(Paragraph("• Cooperar (K): aceitar a entrada e dividir o mercado.", item))
s.append(Paragraph("Por sua vez, a NovaTec decide primeiro se Entra (E) ou Permanece Fora (F) do mercado. Os payoffs (lucros) "
                   "associados a cada combinação estratégica estão na matriz abaixo, no formato (AlfaQuímica, NovaTec):", body))
t = Table([["", "Entrar (E)", "Ficar Fora (F)"], ["Confrontar (C)", "(5, −4)", "(5, 1)"], ["Cooperar (K)", "(6, 3)", "(5, 2)"]],
          colWidths=[4 * cm, 3.5 * cm, 3.5 * cm])
t.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, -1), "DV"), ("FONTSIZE", (0, 0), (-1, -1), 10),
                       ("GRID", (0, 0), (-1, -1), 0.6, colors.black), ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                       ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E4EDF4"))]))
s.append(t); s.append(Spacer(1, 0.3 * cm))
s.append(Paragraph("Supondo que a NovaTec toma sua decisão primeiro e que a AlfaQuímica reage após observar o movimento "
                   "da rival, apresente:", body))
s.append(it("a) O jogo na forma extensiva.", Grade(9 * cm)))
s.append(it("b) Ameaças por parte da empresa AlfaQuímica de confrontar são críveis?", Grade(5 * cm)))
s.append(it("c) A entrante NovaTec deve entrar ou não no mercado?", Grade(5 * cm)))

# Questão 4 (cálculo: externalidade)
s.append(q(4, "Considere uma empresa de produtos químicos, cuja curva de demanda pelo produto químico é dada por "
              "Q = 24 − 0,5P, onde Q é a quantidade consumida em milhões de toneladas por ano e P é o preço por tonelada. "
              "A curva de custo marginal privado é dada por CMgP = 2 + Q. A indústria emite considerável quantidade de "
              "poluente por cada tonelada de produto químico produzido, cujo custo marginal externo (CMgE) é positivo: "
              "CMgE = 2 + Q. Pede-se:"))
s.append(it("a) Represente graficamente as curvas de demanda, oferta, custo marginal externo e custo marginal social.",
            Grade(11 * cm)))
s.append(it("b) Calcule preço e quantidade de equilíbrio sem correção para a externalidade.", Grade(6 * cm)))
s.append(it("c) Qual deve ser o preço e a quantidade de equilíbrio socialmente eficiente?", Grade(6 * cm)))
s.append(it("d) Compare os resultados obtidos nos itens b) e c).", Linhas(5.4 * cm)))

# Questão 5 (teoria)
s.append(q(5, "<i>“O rompimento da barragem de rejeitos da Mina Córrego do Feijão, da empresa Vale, em Brumadinho (2019), "
              "liberou cerca de 12 milhões de m³ de lama tóxica, destruindo comunidades inteiras, causou 272 mortes e "
              "impactou de forma severa o Rio Paraopeba e toda a bacia hidrográfica ao redor. Investigações revelaram "
              "falhas nos laudos estruturais da barragem, assimetrias de informação entre a empresa, certificadoras e o "
              "poder público, além de sistemas de fiscalização insuficientes. O desastre é considerado um dos maiores "
              "crimes socioambientais da história do Brasil.”</i>"))
s.append(Paragraph("Analisando o cenário acima e a partir dos conceitos de falhas de mercado vistos em aula, pergunta-se:", body))
s.append(it("a) Identifique quais falhas de mercado estão presentes no caso descrito e explique como elas contribuíram "
            "para a ocorrência e a ampliação dos danos socioambientais.", Linhas(9 * cm)))
s.append(it("b) De que maneira o Estado deve atuar para reduzir a probabilidade de desastres como este e para corrigir "
            "as falhas de mercado presentes no setor?", Linhas(8.1 * cm)))
s.append(it("c) Analise como essas falhas de mercado afetam os incentivos das empresas em adotar padrões mais elevados "
            "de segurança, prevenção e responsabilidade socioambiental.", Linhas(8.1 * cm)))


def rodape(c, d):
    c.setFont("DV", 8); c.setFillGray(0.5)
    c.drawString(2 * cm, 1.0 * cm, "Simulado · Microeconomia II · prova de anos anteriores")
    c.drawRightString(A4[0] - 2 * cm, 1.0 * cm, str(d.page))


doc = SimpleDocTemplate(SAIDA, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.6 * cm, bottomMargin=1.6 * cm,
                        title="Simulado de Micro II: prova de anos anteriores")
doc.build(junta_enunciados(s), onFirstPage=rodape, onLaterPages=rodape)
print(SAIDA)
