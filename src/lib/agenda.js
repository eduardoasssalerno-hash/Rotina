import { horas, isoDia } from './util.js'

// Cor e nome da área (áreas privadas aparecem só pelo nome, sem descrever a atividade)
export function infoArea(d, areaId) {
  const a = d.areas.find((x) => x.id === areaId)
  return a ? { nome: a.nome, cor: a.cor, privada: a.privada } : { nome: 'Sem área', cor: '#8A96A3', privada: false }
}

export function folgaEm(d, iso) {
  return d.folgas.find((f) => f.inicio <= iso && f.fim >= iso) || null
}

// Compromissos fixos que acontecem num dia
export function fixosDoDia(d, data) {
  const iso = isoDia(data)
  const folga = folgaEm(d, iso)
  return d.blocos_fixos.filter((b) =>
    b.ativo && b.dias.includes(data.getDay()) &&
    (!b.valido_de || b.valido_de <= iso) && (!b.valido_ate || b.valido_ate >= iso) &&
    !(b.pula_folga && folga))
}

// Tudo o que tem horário num dia: compromissos fixos + tarefas com hora (+ hábitos com horário, se pedir)
export function itensDoDia(d, data, { comHabitos = false } = {}) {
  const iso = isoDia(data)
  const itens = []
  for (const b of fixosDoDia(d, data)) {
    const a = infoArea(d, b.area_id)
    itens.push({
      chave: 'b' + b.id, tipo: 'fixo', bloco: b, area: a,
      titulo: a.privada ? a.nome : b.titulo,
      ini: horas(b.inicio), fim: horas(b.fim),
      feito: d.blocos_feitos.some((f) => f.bloco_id === b.id && f.dia === iso),
    })
  }
  for (const t of d.tarefas) {
    if (t.dia !== iso || !t.inicio || t.bloco_id) continue
    const p = t.projeto_id ? d.projetos.find((x) => x.id === t.projeto_id) : null
    const a = infoArea(d, t.area_id || p?.area_id)
    const ini = horas(t.inicio)
    itens.push({
      chave: 't' + t.id, tipo: 'tarefa', tarefa: t, projeto: p, area: a,
      titulo: a.privada ? a.nome : t.titulo,
      ini, fim: ini + (t.minutos || 60) / 60, feito: t.feita,
    })
  }
  if (comHabitos) {
    for (const h of d.habitos) {
      if (!h.ativo || !h.horario || !h.dias.includes(data.getDay())) continue
      const a = infoArea(d, h.area_id)
      const ini = horas(h.horario)
      itens.push({
        chave: 'h' + h.id, tipo: 'habito', habito: h, area: a, titulo: h.nome,
        ini, fim: ini + (h.minutos || 15) / 60,
        feito: d.habito_marcas.some((m) => m.habito_id === h.id && m.dia === iso && m.valor >= h.meta),
      })
    }
  }
  return itens.sort((x, y) => x.ini - y.ini || x.fim - y.fim)
}

// Tarefas do dia sem horário marcado
export function tarefasSemHora(d, data) {
  const iso = isoDia(data)
  return d.tarefas.filter((t) => t.dia === iso && !t.inicio && !t.bloco_id)
    .sort((a, b) => Number(a.feita) - Number(b.feita) || b.prioridade - a.prioridade || a.ordem - b.ordem)
}

// Horas planejadas por área num dia (para o panorama do mês)
export function horasPorArea(d, data) {
  const soma = new Map()
  for (const it of itensDoDia(d, data)) {
    const k = it.area.nome
    const atual = soma.get(k) || { cor: it.area.cor, h: 0 }
    atual.h += Math.max(0, it.fim - it.ini)
    soma.set(k, atual)
  }
  return [...soma.entries()].map(([nome, v]) => ({ nome, ...v }))
}

// To-dos de dentro de um bloco num dia (ex.: o que estudar durante as Aulas)
export function todosDoBloco(d, blocoId, iso) {
  return d.tarefas.filter((t) => t.bloco_id === blocoId && t.dia === iso)
    .sort((a, b) => Number(a.feita) - Number(b.feita) || a.ordem - b.ordem || String(a.criado_em).localeCompare(String(b.criado_em)))
}
