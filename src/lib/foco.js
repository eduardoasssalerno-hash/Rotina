// Contas do tempo de foco para a aba Planetas (sessões do app e as importadas do Forest).
import { addDias, hoje, inicioSemana, isoDia, MESES } from './util.js'

// Paleta categórica (validada para daltonismo); cor segue a matéria, não a posição no período
export const SERIES = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)', 'var(--serie-4)', 'var(--serie-5)', 'var(--serie-6)', 'var(--serie-7)', 'var(--serie-8)']
export const COR_OUTROS = 'var(--serie-outros)'

// Nome da matéria de uma sessão
export function marcadorDe(d, s) {
  if (s.marcador) return s.marcador
  const t = s.tarefa_id ? d.tarefas.find((x) => x.id === s.tarefa_id) : null
  const pid = s.projeto_id || t?.projeto_id
  const p = pid ? d.projetos.find((x) => x.id === pid) : null
  if (p) return p.nome
  const a = t?.area_id ? d.areas.find((x) => x.id === t.area_id) : null
  return a?.nome || 'Foco livre'
}

// Cor fixa por matéria: as 8 com mais horas em todo o histórico ganham uma cor cada
export function coresDasMaterias(d) {
  const soma = new Map()
  for (const s of d.sessoes_foco) {
    const m = marcadorDe(d, s)
    soma.set(m, (soma.get(m) || 0) + s.minutos)
  }
  const ordem = [...soma.entries()].filter(([m]) => m !== 'Foco livre').sort((a, b) => b[1] - a[1]).map(([m]) => m)
  const cores = new Map(ordem.slice(0, 8).map((m, i) => [m, SERIES[i]]))
  return (m) => cores.get(m) || COR_OUTROS
}

// Período escolhido: 'dia' | 'semana' | 'mes' | 'ano', deslocado n vezes para trás
export function periodo(visao, desloca) {
  const hj = hoje()
  let ini, fim, titulo
  if (visao === 'dia') {
    ini = addDias(hj, desloca)
    fim = ini
    titulo = desloca === 0 ? 'Hoje' : desloca === -1 ? 'Ontem' : `${ini.getDate()}/${ini.getMonth() + 1}/${ini.getFullYear()}`
  } else if (visao === 'semana') {
    ini = addDias(inicioSemana(hj), desloca * 7)
    fim = addDias(ini, 6)
    titulo = desloca === 0 ? 'Esta semana' : `${ini.getDate()}/${ini.getMonth() + 1} a ${fim.getDate()}/${fim.getMonth() + 1}`
  } else if (visao === 'mes') {
    ini = new Date(hj.getFullYear(), hj.getMonth() + desloca, 1)
    fim = new Date(ini.getFullYear(), ini.getMonth() + 1, 0)
    titulo = `${MESES[ini.getMonth()][0].toUpperCase()}${MESES[ini.getMonth()].slice(1)} de ${ini.getFullYear()}`
  } else {
    ini = new Date(hj.getFullYear() + desloca, 0, 1)
    fim = new Date(ini.getFullYear(), 11, 31)
    titulo = String(ini.getFullYear())
  }
  return { ini, fim, titulo, a: isoDia(ini), b: isoDia(fim) }
}

// Sessões dentro do período (pela data local de início)
export function sessoesDo(d, per) {
  return d.sessoes_foco
    .map((s) => ({ ...s, _dt: new Date(s.inicio) }))
    .map((s) => ({ ...s, _dia: isoDia(s._dt) }))
    .filter((s) => s._dia >= per.a && s._dia <= per.b)
    .sort((x, y) => x._dt - y._dt)
}

// Quantos dias do período já aconteceram (para as médias)
export function diasPassados(per) {
  const hj = isoDia(hoje())
  let n = 0
  for (let x = per.ini; isoDia(x) <= per.b && isoDia(x) <= hj; x = addDias(x, 1)) n++
  return Math.max(1, n)
}

// Gerador pseudoaleatório com semente (a galáxia fica igual toda vez que abre)
export function semente(txt) {
  let h = 2166136261
  for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => {
    h += 0x6D2B79F5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
