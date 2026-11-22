// 3S Rotina: atualiza os investimentos lançados à mão.
// - Renda fixa: estima o saldo com os índices do Banco Central (Selic e CDI diários, IPCA mensal) ou a taxa prefixada.
// - Bolsa: soma as operações (preço médio) e busca a cotação do dia na brapi.
// - O token da brapi fica SÓ nos segredos desta função (BRAPI_TOKEN). A função age com o login de quem chamou: o RLS continua valendo.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const diaLocal = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
const br = (iso: string) => iso.split('-').reverse().join('/') // 2026-01-10 -> 10/01/2026
const SERIES: Record<string, number> = { selic: 11, cdi: 12, ipca: 433 } // códigos do SGS do Banco Central
// ativos que a brapi responde sem token (para testar)
const SEM_TOKEN = new Set(['PETR4', 'VALE3', 'MGLU3', 'ITUB4'])

async function serieBC(nome: string, desde: string, ate: string): Promise<{ dia: string; valor: number }[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${SERIES[nome]}/dados?formato=json&dataInicial=${br(desde)}&dataFinal=${br(ate)}`
  const r = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error(`Banco Central (${nome}): ${r.status}`)
  const lista = await r.json()
  return (Array.isArray(lista) ? lista : []).map((x: any) => ({ dia: String(x.data).split('/').reverse().join('-'), valor: Number(String(x.valor).replace(',', '.')) }))
    .filter((x) => Number.isFinite(x.valor))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405)
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    })
    const { data: quem } = await sb.auth.getUser()
    if (!quem?.user) return json({ erro: 'Entre no app de novo.' }, 401)

    const agora = new Date()
    const hoje = diaLocal(agora)
    const resumo = { titulos: 0, ativos: 0, avisos: [] as string[] }
    const [{ data: invs, error: e1 }, { data: ops, error: e2 }, { data: cots }] = await Promise.all([
      sb.from('investimentos').select('*').eq('origem', 'manual'),
      sb.from('operacoes_bolsa').select('*').order('dia').order('criado_em'),
      sb.from('cotacoes').select('*'),
    ])
    if (e1 || e2) throw e1 || e2

    async function guardar(id: string, saldo: number, extra: Record<string, unknown> = {}) {
      const { error } = await sb.from('investimentos').update({ saldo, atualizado_em: agora.toISOString(), ...extra }).eq('id', id)
      if (error) throw error
      await sb.from('investimento_historico').upsert({ investimento_id: id, dia: hoje, saldo }, { onConflict: 'investimento_id,dia' })
    }

    // ---------- renda fixa ----------
    const rf = (invs || []).filter((i: any) => !i.ticker && i.indexador && i.indexador !== 'fixo' && i.aplicado_em && i.aplicado != null)
    if (rf.length) {
      const desde = rf.map((i: any) => i.aplicado_em).sort()[0]
      const precisa = new Set<string>(['selic']) // a Selic diária também conta os dias úteis
      for (const i of rf) if (i.indexador === 'cdi' || i.indexador === 'ipca') precisa.add(i.indexador)
      const series: Record<string, { dia: string; valor: number }[]> = {}
      for (const s of precisa) {
        try {
          series[s] = await serieBC(s, desde, hoje)
          const linhas = series[s].map((x) => ({ serie: s, dia: x.dia, valor: x.valor }))
          for (let k = 0; k < linhas.length; k += 500) await sb.from('indices').upsert(linhas.slice(k, k + 500), { onConflict: 'user_id,serie,dia' })
        } catch (e) {
          resumo.avisos.push(String((e as Error).message || e))
          series[s] = []
        }
      }
      for (const i of rf) {
        const depois = (s: string) => (series[s] || []).filter((x) => x.dia > i.aplicado_em)
        const du = depois('selic').length // dias úteis desde a aplicação
        if (!series.selic.length) continue
        let fator = 1
        if (i.indexador === 'selic') for (const x of depois('selic')) fator *= 1 + x.valor / 100
        if (i.indexador === 'cdi') {
          const pct = Number(i.taxa_num ?? 100) / 100
          for (const x of depois('cdi')) fator *= 1 + (x.valor / 100) * pct
        }
        if (i.indexador === 'prefixado') fator = Math.pow(1 + Number(i.taxa_num || 0) / 100, du / 252)
        if (i.indexador === 'ipca') {
          // IPCA dos meses cheios depois da aplicação + taxa real
          const mesAplicacao = i.aplicado_em.slice(0, 7)
          for (const x of series.ipca || []) if (x.dia.slice(0, 7) > mesAplicacao) fator *= 1 + x.valor / 100
          fator *= Math.pow(1 + Number(i.taxa_num || 0) / 100, du / 252)
        }
        await guardar(i.id, Math.round(Number(i.aplicado) * fator * 100) / 100)
        resumo.titulos++
      }
    }

    // valor informado à mão: só guarda o ponto do dia para o gráfico
    for (const i of (invs || []).filter((x: any) => !x.ticker && (x.indexador === 'fixo' || !x.indexador) && x.ativo)) {
      await sb.from('investimento_historico').upsert({ investimento_id: i.id, dia: hoje, saldo: i.saldo }, { onConflict: 'investimento_id,dia' })
    }

    // ---------- bolsa ----------
    const pos = new Map<string, { qtd: number; custo: number; inst: string | null }>()
    for (const o of ops || []) {
      const p = pos.get(o.ticker) || { qtd: 0, custo: 0, inst: o.instituicao }
      const q = Number(o.quantidade)
      if (o.tipo === 'compra') { p.custo += q * Number(o.preco) + Number(o.taxas || 0); p.qtd += q }
      else if (p.qtd > 0) { p.custo -= (p.custo / p.qtd) * Math.min(q, p.qtd); p.qtd = Math.max(0, p.qtd - q) }
      if (o.instituicao) p.inst = o.instituicao
      pos.set(o.ticker, p)
    }
    const token = Deno.env.get('BRAPI_TOKEN')
    let semToken = false
    for (const [ticker, p] of pos) {
      const existente = (invs || []).find((i: any) => i.ticker === ticker)
      if (p.qtd <= 1e-9) {
        if (existente) await sb.from('investimentos').update({ ativo: false, saldo: 0, atualizado_em: agora.toISOString() }).eq('id', existente.id)
        continue
      }
      let preco: number | null = null
      let nome: string | null = null
      let variacao: number | null = null
      if (token || SEM_TOKEN.has(ticker)) {
        try {
          const r = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
          if (!r.ok) throw new Error(`brapi ${ticker}: ${r.status}`)
          const c = (await r.json())?.results?.[0]
          if (c?.regularMarketPrice != null) {
            preco = Number(c.regularMarketPrice)
            nome = c.shortName || c.longName || null
            variacao = c.regularMarketChangePercent != null ? Number(c.regularMarketChangePercent) : null
            await sb.from('cotacoes').upsert({ ticker, preco, nome: nome ? String(nome).slice(0, 120) : null, variacao, atualizado_em: agora.toISOString() }, { onConflict: 'user_id,ticker' })
          }
        } catch (e) {
          resumo.avisos.push(String((e as Error).message || e))
        }
      } else semToken = true
      if (preco == null) preco = Number((cots || []).find((c: any) => c.ticker === ticker)?.preco ?? p.custo / p.qtd)
      const saldo = Math.round(p.qtd * preco * 100) / 100
      const campos = {
        nome: ticker, instituicao: (p.inst || 'BTG').slice(0, 60), tipo: /11$/.test(ticker) ? 'FII' : 'EQUITY',
        subtipo: nome ? String(nome).slice(0, 60) : null, aplicado: Math.round(p.custo * 100) / 100,
        taxa: `${p.qtd.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} cotas`, ativo: true,
      }
      if (existente) await guardar(existente.id, saldo, campos)
      else {
        const { data: novo, error } = await sb.from('investimentos').insert({ ...campos, origem: 'manual', ticker, saldo, atualizado_em: agora.toISOString() }).select().single()
        if (error) throw error
        await sb.from('investimento_historico').upsert({ investimento_id: novo.id, dia: hoje, saldo }, { onConflict: 'investimento_id,dia' })
      }
      resumo.ativos++
    }
    // posição que perdeu todas as operações (apagadas): some da lista
    for (const i of invs || []) if (i.ticker && !pos.has(i.ticker) && i.ativo) await sb.from('investimentos').update({ ativo: false, saldo: 0 }).eq('id', i.id)
    if (semToken) resumo.avisos.push('Falta o token da brapi para as cotações do dia (segredo BRAPI_TOKEN).')
    return json(resumo)
  } catch (e) {
    return json({ erro: String((e as Error)?.message || e).slice(0, 300) }, 500)
  }
})
