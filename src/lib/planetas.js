import { difDias, hoje } from './util.js'

export const FASES = ['', 'Poeira', 'Rocha', 'Água', 'Vida', 'Florescer']
export const LIMITES = [0, 20, 40, 60, 100]
export const faseDe = (e) => (e >= 100 ? 5 : e >= 60 ? 4 : e >= 40 ? 3 : e >= 20 ? 2 : 1)

// Energia do planeta: cresce com etapas feitas e tempo de foco (ou treinos concluídos).
// Nunca diminui. Sem atividade por 5 dias, o planeta só perde o brilho.
export function estadoPlaneta(d, p) {
  const etapas = d.tarefas.filter((t) => t.projeto_id === p.id)
  const feitas = etapas.filter((t) => t.feita)
  const foco = d.sessoes_foco.filter((s) => s.projeto_id === p.id)
  const minFoco = foco.reduce((s, x) => s + x.minutos, 0)
  const treinos = p.tipo === 'treino' ? d.treinos.filter((t) => t.concluido) : []
  const energia = p.energia_base + 10 * (p.tipo === 'treino' ? treinos.length : feitas.length) + 15 * Math.floor(minFoco / 25)
  const datas = [
    ...feitas.map((t) => t.feita_em), ...foco.map((s) => s.inicio),
    ...treinos.map((t) => t.concluido_em || t.dia), p.criado_em,
  ].filter(Boolean).map((x) => new Date(x))
  const ultima = datas.length ? new Date(Math.max(...datas)) : null
  const parado = ultima ? difDias(hoje(), ultima) : 99
  const fase = faseDe(energia)
  const prox = LIMITES[fase] ?? null
  return {
    etapas, feitas, minFoco, treinos, energia, fase,
    apagado: parado >= 5,
    parado,
    falta: prox != null && fase < 5 ? prox - energia : 0,
    minTotal: etapas.reduce((s, t) => s + (t.minutos || 0), 0),
    minFeito: feitas.reduce((s, t) => s + (t.minutos || 0), 0),
  }
}
