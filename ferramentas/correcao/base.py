from reportlab.lib.pagesizes import A4
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Flowable,
                                KeepTogether, CondPageBreak, PageBreak, Image, ListFlowable, ListItem)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from PIL import Image as PILImage

D = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("DV", D + "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DVB", D + "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("DVI", D + "DejaVuSans-Oblique.ttf"))
pdfmetrics.registerFont(TTFont("DVBI", D + "DejaVuSans-BoldOblique.ttf"))
registerFontFamily("DV", normal="DV", bold="DVB", italic="DVI", boldItalic="DVBI")

ACC = colors.HexColor("#1F4E79")
body = ParagraphStyle("b", fontName="DV", fontSize=10, leading=14.5, spaceAfter=4)
item = ParagraphStyle("i", parent=body, leftIndent=18, firstLineIndent=-18, spaceAfter=2)
center = ParagraphStyle("c", parent=body, alignment=1, spaceAfter=1)
inst = ParagraphStyle("in", parent=center, fontName="DVB", fontSize=10.5)
title = ParagraphStyle("t", fontName="DVB", fontSize=14, leading=19, textColor=ACC, alignment=1,
                       spaceBefore=6, spaceAfter=4)
sub = ParagraphStyle("s", parent=center, fontName="DVB", textColor=colors.HexColor("#A33"), spaceAfter=10)
qh = ParagraphStyle("q", parent=body, spaceBefore=10)
eq = ParagraphStyle("e", parent=body, alignment=1, spaceAfter=2)
cell = ParagraphStyle("cl", fontName="DV", fontSize=9.5, leading=12, alignment=1)
quad = ParagraphStyle("qd", parent=body, fontSize=9.5, leading=13.5, spaceAfter=2)
atit = ParagraphStyle("at", fontName="DVB", fontSize=17, leading=22, textColor=ACC, alignment=1, spaceAfter=4)
asub = ParagraphStyle("as", parent=center, textColor=colors.grey, fontSize=9.5, spaceAfter=12)
ah = ParagraphStyle("ah", fontName="DVB", fontSize=12.5, leading=17, textColor=ACC, spaceBefore=14, spaceAfter=6)
ah3 = ParagraphStyle("ah3", fontName="DVB", fontSize=10.5, leading=15, spaceBefore=8, spaceAfter=3)
call = ParagraphStyle("cal", parent=body, fontSize=9.5, leading=13.5, spaceAfter=0,
                      textColor=colors.HexColor("#0C447C"))
cap = ParagraphStyle("cap", parent=center, fontSize=8.5, textColor=colors.grey)


class Linha(Flowable):
    def wrap(self, aw, ah_):
        self.w = aw
        return aw, 0.8 * cm

    def draw(self):
        self.canv.setStrokeColor(colors.HexColor("#C8C8C8"))
        self.canv.setLineWidth(0.5)
        self.canv.line(0, 0, self.w, 0)


class Caixa(Flowable):
    def __init__(self, h, texto):
        super().__init__()
        self.h, self.texto = h, texto

    def wrap(self, aw, ah_):
        self.w = aw
        return aw, self.h

    def draw(self):
        c = self.canv
        c.setStrokeColor(colors.HexColor("#B0B0B0"))
        c.setLineWidth(0.6)
        c.roundRect(0, 0, self.w, self.h, 6)
        c.setFont("DVI", 8.5)
        c.setFillColor(colors.grey)
        c.drawString(8, self.h - 14, self.texto)


story = []


def P(t, s=body):
    story.append(Paragraph(t, s))


def A(n):
    story.append(Spacer(1, 2))
    for _ in range(n):
        story.append(Linha())
    story.append(Spacer(1, 8))


def Q(n, t, need=None):
    if need:
        story.append(CondPageBreak(need * cm))
    story.append(Paragraph(f"<b>{n}.</b> {t}", qh))


def I(letra, t, linhas, need=None):
    if need:
        story.append(CondPageBreak(need * cm))
    story.append(Paragraph(f"{letra}&nbsp;&nbsp;{t}", item))
    A(linhas)


def T(rows, widths, s=cell, valign="MIDDLE", keep=True, cabecalho=True):
    data = [[Paragraph(c, s) for c in r] for r in rows]
    t = Table(data, colWidths=widths, hAlign="CENTER")
    estilo = [
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
        ("VALIGN", (0, 0), (-1, -1), valign),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if cabecalho:
        estilo.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EEF5")))
    t.setStyle(TableStyle(estilo))
    if keep:
        story.append(KeepTogether([Spacer(1, 4), t, Spacer(1, 8)]))
    else:
        t.repeatRows = 1
        story.extend([Spacer(1, 4), t, Spacer(1, 8)])


def AH(t):
    story.append(CondPageBreak(3.5 * cm))
    P(t, ah)


def AH3(t):
    story.append(CondPageBreak(2.5 * cm))
    P(t, ah3)


def UL(itens, numerado=False):
    story.append(ListFlowable(
        [ListItem(Paragraph(i, body), leftIndent=14) for i in itens],
        bulletType="1" if numerado else "bullet", start=None if numerado else "•",
        bulletFontName="DV", bulletFontSize=10 if numerado else 9, leftIndent=16, spaceAfter=4))


def CALL(t, fundo="#E6F1FB", borda="#85B7EB"):
    tb = Table([[Paragraph(t, call)]], colWidths=[17 * cm])
    tb.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(fundo)),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor(borda)),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(Spacer(1, 4))
    story.append(KeepTogether(tb))
    story.append(Spacer(1, 6))


def FIG(arq, largura_cm, legenda):
    w, h = PILImage.open(arq).size
    story.append(KeepTogether([Spacer(1, 4), Image(arq, width=largura_cm * cm, height=largura_cm * cm * h / w),
                               Paragraph(f"<i>{legenda}</i>", cap)]))
    story.append(Spacer(1, 6))


