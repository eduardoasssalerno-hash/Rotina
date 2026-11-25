# Apoio do trabalho de Macro (grupo): Modelo IS-LM, questões 1 (pressupostos) e 2 (resultados).
# Pedaços de texto para o Eduardo montar a resposta + resumo do que cada livro traz + gráficos + referências ABNT.
# Uso: python3 ferramentas/macro/islm_apoio.py public/arquivos/Macro_ISLM_Q1_Q2_apoio.pdf
import sys, os, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "correcao"))
import base
from base import story, P, AH, AH3, UL, CALL, FIG, atit, asub, body
from reportlab.platypus import SimpleDocTemplate, PageBreak
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

saida = sys.argv[1]
tmp = tempfile.mkdtemp()


def grafico(arq, titulo, desloca):
    fig, ax = plt.subplots(figsize=(4.2, 3.4), dpi=200)
    y = np.linspace(1, 9, 50)
    is0 = 9.5 - y
    lm0 = 0.5 + 0.9 * y * 0.6
    ax.plot(y, is0, color="#1F4E79", lw=2, label="IS")
    ax.plot(y, lm0, color="#C2410C", lw=2, label="LM")
    if desloca == "fiscal":
        ax.plot(y, is0 + 2, color="#1F4E79", lw=2, ls="--", label="IS'")
        novo = (11.0 / 1.54, 11.5 - 11.0 / 1.54)
    else:
        ax.plot(y, lm0 - 1.6, color="#C2410C", lw=2, ls="--", label="LM'")
        novo = (10.6 / 1.54, 9.5 - 10.6 / 1.54)
    velho = (9.0 / 1.54, 9.5 - 9.0 / 1.54)  # IS: i = 9,5 − Y; LM: i = 0,5 + 0,54Y
    ax.plot(*velho, "o", color="#333", ms=4); ax.plot(*novo, "o", color="#333", ms=4)
    ax.annotate("", xy=novo, xytext=velho, arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.set_xlim(1, 9); ax.set_ylim(0, 9)
    ax.set_xlabel("Renda (Y)"); ax.set_ylabel("Taxa de juros (i)")
    ax.set_xticks([]); ax.set_yticks([])
    ax.spines[["top", "right"]].set_visible(False)
    ax.set_title(titulo, fontsize=10)
    ax.legend(frameon=False, fontsize=8)
    fig.tight_layout(); fig.savefig(arq); plt.close(fig)


g1 = os.path.join(tmp, "fiscal.png"); grafico(g1, "Expansão fiscal: Y↑ e i↑ (crowding out)", "fiscal")
g2 = os.path.join(tmp, "monetaria.png"); grafico(g2, "Expansão monetária: i↓ e Y↑", "monetaria")

P("Macroeconomia · Trabalho em grupo", atit)
P("Modelo IS-LM · Questões 1 (pressupostos) e 2 (resultados) · material de apoio para montar a resposta", asub)
CALL("Como usar: os blocos são pedaços soltos. Escolha, reordene e escreva com as suas palavras (cerca de 1 página por questão). "
     "A parte C resume o que cada livro traz, com o capítulo para consultar; confira as páginas na edição que você tiver. "
     "Não há cópia de texto dos livros: tudo é resumo.")

AH("A. Pedaços para a questão 1: pressupostos")
AH3("Origem e horizonte")
UL(["Formalizado por Hicks (1937) como interpretação da <i>Teoria Geral</i> de Keynes; virou o núcleo da síntese neoclássica.",
    "Modelo de <b>curto prazo</b> e de <b>estática comparativa</b>: compara equilíbrios antes e depois de um choque."])
AH3("Preços e oferta")
UL(["<b>Nível de preços fixo</b> (rígido no curto prazo); por isso juro nominal e real se confundem (inflação esperada = 0).",
    "A economia opera <b>abaixo do pleno emprego</b>, com capacidade ociosa: a produção se ajusta à <b>demanda agregada</b>.",
    "<b>Economia fechada</b>, sem setor externo (a versão aberta é o modelo Mundell-Fleming)."])
AH3("Mercado de bens: curva IS")
UL(["Consumo depende da renda disponível: C = C(Y − T), com propensão marginal a consumir entre 0 e 1.",
    "Investimento depende <b>negativamente da taxa de juros</b>: I = I(i).",
    "Gastos do governo (G) e impostos (T) são <b>exógenos</b> (instrumentos da política fiscal).",
    "Equilíbrio: <b>Y = C(Y − T) + I(i) + G</b>. Juros maiores → menos investimento → menos renda: a <b>IS é negativamente inclinada</b>."])
AH3("Mercado monetário: curva LM")
UL(["<b>Oferta de moeda exógena</b>, controlada pelo Banco Central.",
    "Demanda por moeda pela <b>preferência pela liquidez</b>: cresce com a renda (transação) e cai com os juros (especulação/precaução): <b>M/P = L(Y, i)</b>.",
    "Dois ativos, moeda e títulos: pela Lei de Walras, com o mercado monetário em equilíbrio, o de títulos também está.",
    "Mais renda pede mais moeda; com M fixo, os juros sobem: a <b>LM é positivamente inclinada</b>."])
AH3("Equilíbrio")
UL(["Renda e juros são determinados <b>simultaneamente</b>, no cruzamento da IS com a LM.",
    "Expectativas, estoque de capital e tecnologia são dados."])

AH("B. Pedaços para a questão 2: resultados")
AH3("Equilíbrio com desemprego")
UL(["O cruzamento IS-LM dá o único par (Y*, i*) com bens e moeda em equilíbrio ao mesmo tempo.",
    "Esse equilíbrio <b>pode ter desemprego</b>: nada garante que Y* seja o produto de pleno emprego (diferença central em relação ao modelo clássico)."])
AH3("Política fiscal expansionista (G↑ ou T↓)")
UL(["A IS se desloca para a direita: <b>Y sobe e i sobe</b>.",
    "O juro maior reduz parte do investimento: <b>efeito crowding out</b> (deslocamento).",
    "O efeito sobre Y é <b>menor que o multiplicador simples</b> 1/(1 − PMgC)."])
FIG(g1, 9, "Figura 1: a IS se desloca para IS'; o novo equilíbrio tem renda e juros maiores.")
AH3("Política monetária expansionista (M↑)")
UL(["A LM se desloca para a direita/baixo: <b>i cai e Y sobe</b>, porque o investimento reage aos juros.",
    "<b>A moeda não é neutra no curto prazo</b>: afeta o produto, e não só os preços."])
FIG(g2, 9, "Figura 2: a LM se desloca para LM'; o novo equilíbrio tem juros menores e renda maior.")
AH3("Combinação de políticas (policy mix)")
UL(["Expansão fiscal + expansão monetária: Y sobe sem subir os juros (sem crowding out).",
    "Contração fiscal + expansão monetária: reduz o déficit mantendo o produto; muda a composição (mais investimento, menos gasto público)."])
AH3("Casos extremos: a eficácia depende das inclinações")
UL(["<b>Armadilha da liquidez</b> (LM horizontal): a monetária não reduz os juros e fica ineficaz; a fiscal tem efeito pleno.",
    "<b>Investimento insensível aos juros</b> (IS vertical): a monetária é ineficaz; a fiscal é totalmente eficaz.",
    "<b>Caso clássico</b> (LM vertical): crowding out total; a fiscal é ineficaz e só a monetária afeta Y.",
    "Resumo: LM mais inclinada e IS mais plana fortalecem a política monetária; o contrário fortalece a fiscal."])
AH3("Conclusão de política")
UL(["Como o equilíbrio pode ter desemprego, o modelo justifica <b>política ativa</b> (fiscal e monetária) para estabilizar o produto no curto prazo."])

AH("C. O que cada livro traz (resumos, sem cópia)")
AH3("Hicks (1937), Econometrica")
UL(["Artigo que cria o diagrama IS-LL (depois IS-LM) para comparar Keynes com os \"clássicos\".",
    "Mostra que a diferença está na demanda por moeda: quando ela depende muito dos juros, a política monetária perde força, como Keynes dizia; quando depende pouco, volta o resultado clássico.",
    "Bom para o parágrafo de <b>origem</b> da questão 1 e para os <b>casos extremos</b> da questão 2."])
AH3("Blanchard, Macroeconomia (capítulos 3, 4 e 5)")
UL(["Cap. 3 (mercado de bens): demanda agregada, multiplicador e equilíbrio com produção igual à demanda; base da IS.",
    "Cap. 4 (mercados financeiros): demanda por moeda dependendo da renda e dos juros, e o Banco Central fixando a oferta (ou a taxa); base da LM.",
    "Cap. 5 (o modelo IS-LM): junta as duas curvas, analisa as políticas fiscal e monetária e a combinação delas, com exemplos de política dos EUA e da Europa.",
    "Nas edições recentes, a LM aparece como uma reta horizontal na taxa escolhida pelo Banco Central; vale citar isso como versão moderna."])
AH3("Mankiw, Macroeconomia (capítulos de Demanda Agregada I e II)")
UL(["Demanda Agregada I: monta a IS pela cruz keynesiana e a LM pela teoria da preferência pela liquidez.",
    "Demanda Agregada II: usa o IS-LM para analisar choques e políticas, e liga o IS-LM à curva de demanda agregada (quando os preços podem mudar).",
    "Traz a Grande Depressão como aplicação: bom exemplo para os resultados."])
AH3("Froyen, Macroeconomia (capítulos do modelo keynesiano e do IS-LM)")
UL(["Apresenta o modelo clássico antes e o keynesiano depois, o que ajuda a comparar os dois modelos do trabalho.",
    "Discute em detalhe a eficácia relativa das políticas conforme as inclinações das curvas (casos extremos) e o debate keynesianos × monetaristas."])

AH("D. Referências (ABNT)")
P("BLANCHARD, Olivier. <i>Macroeconomia</i>. 7. ed. São Paulo: Pearson Education do Brasil, 2017.")
P("FROYEN, Richard T. <i>Macroeconomia</i>. São Paulo: Saraiva, 1999.")
P("HICKS, John R. Mr. Keynes and the \"Classics\": a suggested interpretation. <i>Econometrica</i>, v. 5, n. 2, p. 147-159, 1937.")
P("MANKIW, N. Gregory. <i>Macroeconomia</i>. 8. ed. Rio de Janeiro: LTC, 2015.")
CALL("Confira edição, ano e capítulos no exemplar que você usar; a numeração muda entre edições.", fundo="#FFF6E5", borda="#E8B04A")

doc = SimpleDocTemplate(saida, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.6 * cm, bottomMargin=1.6 * cm,
                        title="Macro: IS-LM, questões 1 e 2 (apoio)", author="3S Rotina")
doc.build(story)
print("ok", saida)
