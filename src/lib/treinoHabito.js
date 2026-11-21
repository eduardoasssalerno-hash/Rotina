// O hábito Calistenia (plano 'treino') e o bloco fixo "Treino" do dia andam juntos:
// concluir o treino, marcar o hábito ou marcar o bloco deixa os outros marcados também.
import { deIso } from './util.js'

export const habitoTreino = (d) => d.habitos.find((h) => h.plano === 'treino' && h.ativo)
export const ehBlocoTreino = (b) => b && /treino/i.test(b.titulo)
export const blocoTreinoDoDia = (d, data) => d.blocos_fixos.find((b) => b.ativo && ehBlocoTreino(b) && b.dias.includes(data.getDay()))

export async function marcarTreino({ d, gravar, apagar }, iso, feito, { habito = true, bloco = true } = {}) {
  const h = habito ? habitoTreino(d) : null
  if (h) {
    const tem = d.habito_marcas.some((m) => m.habito_id === h.id && m.dia === iso && m.valor >= h.meta)
    if (feito && !tem) await gravar('habito_marcas', { habito_id: h.id, dia: iso, valor: h.meta })
    if (!feito && tem) await apagar('habito_marcas', { habito_id: h.id, dia: iso })
  }
  const b = bloco ? blocoTreinoDoDia(d, deIso(iso)) : null
  if (b) {
    const tem = d.blocos_feitos.some((x) => x.bloco_id === b.id && x.dia === iso)
    if (feito && !tem) await gravar('blocos_feitos', { bloco_id: b.id, dia: iso })
    if (!feito && tem) await apagar('blocos_feitos', { bloco_id: b.id, dia: iso })
  }
}
