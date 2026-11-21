import { valoresOcultos } from './privacidade.js'
// Datas, horas e textos usados no app inteiro (sempre no horário local)

export const pad = (n) => String(n).padStart(2, '0')
export const isoDia = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const deIso = (s) => {
  const [a, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, d)
}
export const inicioDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const hoje = () => inicioDia(new Date())
export const addDias = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const difDias = (a, b) => Math.round((inicioDia(a) - inicioDia(b)) / 86400000)
// Segunda-feira da semana de uma data
export const inicioSemana = (d) => {
  const x = inicioDia(d)
  return addDias(x, -((x.getDay() + 6) % 7))
}

export const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const dataLonga = (d) => `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
export const dataCurta = (d) => `${DIAS_CURTOS[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`

// "08:00:00" -> 8, "21:30" -> 21.5
export const horas = (t) => {
  if (!t) return null
  const [h, m] = String(t).split(':').map(Number)
  return h + (m || 0) / 60
}
// 21.5 -> "21:30"
export const hhmm = (h) => {
  const tot = Math.round(h * 60)
  return `${pad(Math.floor(tot / 60) % 24)}:${pad(tot % 60)}`
}
export const fmtHora = (t) => (t ? String(t).slice(0, 5) : '')

// 90 -> "1h30", 45 -> "45 min"
export function duracao(min) {
  const m = Math.round(Number(min) || 0)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h${pad(r)}` : `${h}h`
}

export function saudacao(d = new Date()) {
  const h = d.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// Avisado quando um erro vindo do servidor aparece (registro de problemas)
let aoErroServidor = null
export function quandoErroServidor(fn) { aoErroServidor = fn }

export function msgErro(e) {
  const m = e?.message || String(e || '')
  if (aoErroServidor && e && typeof e === 'object' && (e.code || e.status || e.details) &&
      !/Invalid login credentials|rate limit|too many|Email not confirmed/i.test(m)) {
    aoErroServidor(m, [e.code, e.details, e.hint].filter(Boolean).join(' · '))
  }
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.'
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).'
  if (/Password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
  if (/row-level security|permission denied/i.test(m)) return 'Você não tem permissão para fazer isso.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Sem conexão. Verifique a internet e tente de novo.'
  return m || 'Algo deu errado. Tente de novo.'
}

// R$ 1.234,56 (ou R$ ••••• quando o olhinho está fechado)
const fmtReal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const reais = (v) => (valoresOcultos() ? 'R$ •••••' : fmtReal.format(Number(v) || 0))
// "1.234,56" ou "12,5" -> 1234.56
export function lerValor(txt) {
  const limpo = String(txt || '').replace(/[^\d,.-]/g, '')
  const n = limpo.includes(',') ? Number(limpo.replace(/\./g, '').replace(',', '.')) : Number(limpo)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}
