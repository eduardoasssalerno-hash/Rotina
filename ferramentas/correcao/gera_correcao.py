"""Gera o PDF da correção de uma lista (3S Rotina) a partir de um JSON.

Uso (a partir da raiz do repositório):
    python3 ferramentas/correcao/gera_correcao.py correcao.json

O JSON (veja exemplo.json) tem a nota da atividade (1 a 10), a nota de português (1 a 10, à parte),
o que foi bem, o que reforçar, cada questão corrigida e os pontos de português.

Saída:
  - public/arquivos/<arquivo>.pdf
  - public/arquivos/paginas/<arquivo>/1.jpg, 2.jpg… (prévia no app)
  - o SQL para gravar a nota, o feedback e o anexo (imprime na tela)
"""
import json, os, subprocess, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base import *  # noqa: F401,F403 (estilos e fontes do esquema padrão)
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, CondPageBreak
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.pagesizes import A4

VERDE = colors.HexColor("#15703A"); LARANJA = colors.HexColor("#C2410C"); AMARELO = colors.HexColor("#A16207")
STATUS = {"certo": ("Certo", VERDE, "#DCEFE3"), "parcial": ("Parcialmente certo", AMARELO, "#FDF3D8"), "errado": ("Errado", LARANJA, "#FBE9DF"), "branco": ("Em branco", LARANJA, "#FBE9DF")}

def esc(t):
    return str(t or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")

def caixa(conteudo, fundo, borda):
    t = Table([[conteudo]], colWidths=[16.4 * cm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(fundo)), ("BOX", (0, 0), (-1, -1), 0.6, borda),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                           ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    return t

def num(n):
    return f"{float(n):.1f}".replace(".0", "").replace(".", ",")

def main(caminho_json):
    c = json.load(open(caminho_json, encoding="utf-8"))
    raiz = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    nome = c["arquivo"]  # ex.: Correcao_Lista_6
    assert all(ch.isalnum() or ch in "._-" for ch in nome), "arquivo: só letras, números, ponto, _ e -"
    pdf = os.path.join(raiz, "public", "arquivos", nome + ".pdf")
    doc = SimpleDocTemplate(pdf, pagesize=A4, leftMargin=2.3 * cm, rightMargin=2.3 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
                            title=f"Correção: {c['atividade']}", author="Claude")
    s = []
    s.append(Paragraph(f"Correção: {esc(c['atividade'])}", atit))
    s.append(Paragraph(f"{esc(c.get('materia', ''))} · corrigida em {esc(c.get('data', ''))}", asub))
    notas = Table([[Paragraph(f"<font size=26><b>{num(c['nota'])}</b></font><br/><font size=9>nota da atividade (1 a 10)</font>", center),
                    Paragraph(f"<font size=26><b>{num(c['nota_portugues'])}</b></font><br/><font size=9>português (1 a 10)<br/>não entra na nota da atividade</font>", center)]],
                  colWidths=[8.2 * cm, 8.2 * cm], rowHeights=[2.6 * cm])
    notas.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#E4EDF4")), ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#F2F5F8")),
                               ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#C9D3DD")),
                               ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#C9D3DD"))]))
    s.append(notas); s.append(Spacer(1, 10))
    s.append(caixa(Paragraph(f"<b>O que você estudou bem</b><br/>{esc(c['bem'])}", quad), "#DCEFE3", VERDE)); s.append(Spacer(1, 6))
    s.append(caixa(Paragraph(f"<b>O que precisa reforçar</b><br/>{esc(c['mal'])}", quad), "#FBE9DF", LARANJA))

    s.append(Paragraph("Questão por questão", ah))
    for q in c["questoes"]:
        rot, cor, fundo = STATUS.get(q.get("status", "errado"), STATUS["errado"])
        bloco = [CondPageBreak(4 * cm),
                 Paragraph(f"<b>Questão {esc(q['numero'])}</b> · <font color='{cor.hexval()[2:] and '#' + cor.hexval()[2:]}'><b>{rot}</b></font>"
                           + (f" · {esc(q['pontos'])}" if q.get("pontos") else ""), ah3)]
        if q.get("enunciado"): bloco.append(Paragraph(f"<i>{esc(q['enunciado'])}</i>", body))
        if q.get("sua_resposta"): bloco.append(Paragraph(f"<b>Sua resposta:</b> {esc(q['sua_resposta'])}", body))
        if q.get("comentario"): bloco.append(caixa(Paragraph(f"<b>{'Por que está certo' if q.get('status') == 'certo' else 'Onde errou'}</b><br/>{esc(q['comentario'])}", quad), fundo, cor))
        if q.get("resolucao"):
            bloco.append(Spacer(1, 4))
            bloco.append(caixa(Paragraph(f"<b>Resolução certa, passo a passo</b><br/>{esc(q['resolucao'])}", call), "#E4EEF8", colors.HexColor("#7FA3C2")))
        s.append(KeepTogether(bloco[:3])); s.extend(bloco[3:])

    if c.get("portugues"):
        s.append(Paragraph("Português (não entra na nota da atividade)", ah))
        dados = [[Paragraph("<b>Você escreveu</b>", cell), Paragraph("<b>O certo</b>", cell), Paragraph("<b>Por quê</b>", cell)]]
        for p in c["portugues"]:
            dados.append([Paragraph(esc(p["trecho"]), quad), Paragraph(esc(p["correcao"]), quad), Paragraph(esc(p.get("explicacao", "")), quad)])
        t = Table(dados, colWidths=[4.8 * cm, 4.8 * cm, 6.8 * cm], repeatRows=1)
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E4EDF4")), ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9D3DD")),
                               ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        s.append(t)
    if c.get("proximos_passos"):
        s.append(Paragraph("Para a próxima", ah))
        for x in c["proximos_passos"]:
            s.append(Paragraph(f"• {esc(x)}", item))
    doc.build(s)

    pasta = os.path.join(raiz, "public", "arquivos", "paginas", nome)
    os.makedirs(pasta, exist_ok=True)
    for f in glob.glob(os.path.join(pasta, "*.jpg")): os.remove(f)
    subprocess.run(["pdftoppm", "-r", "100", "-scale-to-x", "1100", "-scale-to-y", "-1", "-jpeg", "-jpegopt", "quality=72", pdf, os.path.join(pasta, "p")], check=True)
    paginas = sorted(glob.glob(os.path.join(pasta, "p-*.jpg")), key=lambda x: int(x.rsplit("-", 1)[1].split(".")[0]))
    for i, f in enumerate(paginas, 1): os.rename(f, os.path.join(pasta, f"{i}.jpg"))

    q = lambda t: "'" + str(t).replace("'", "''") + "'"
    print(f"PDF: {pdf} ({len(paginas)} páginas)\n\n-- SQL para o Supabase (projeto faachjuysscpxxzmveeg):")
    print(f"""update public.tarefas set feedback_nota = {float(c['nota'])}, feedback_nota_pt = {float(c['nota_portugues'])},
  feedback_bem = {q(c['bem'])}, feedback_mal = {q(c['mal'])}, feedback_em = now(){f", minutos_real = {int(c['minutos_real'])}" if c.get('minutos_real') else ''}
where id = {q(c['tarefa_id'])};
delete from public.anexos where tarefa_id = {q(c['tarefa_id'])} and tipo = 'correcao';
insert into public.anexos (user_id, tarefa_id, nome, caminho, ordem, paginas, arquivo_nome, tipo)
select user_id, id, {q('Correção · ' + c['atividade'])}, {q('/arquivos/' + nome + '.pdf')}, 9, {len(paginas)}, {q('Correção - ' + c['atividade'] + '.pdf')}, 'correcao'
from public.tarefas where id = {q(c['tarefa_id'])};""")

if __name__ == "__main__":
    main(sys.argv[1])
