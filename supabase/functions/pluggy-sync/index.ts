// 3S Rotina: traz contas, lançamentos e investimentos do Open Finance (Meu Pluggy).
// - As credenciais da Pluggy ficam SÓ nos segredos desta função (PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET).
// - A função age com o login de quem chamou (chave pública + token do usuário): o RLS continua valendo.
import { createClient } from 'npm:@supabase/supabase-js@2'

const PLUGGY = 'https://api.pluggy.ai'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// sem acento e em maiúsculas, para comparar textos do banco
const normal = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
const diaLocal = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

// Categorias da Pluggy (em inglês) -> categorias do app
const MAPA_GASTO: [RegExp, string][] = [
  [/grocer|supermarket|food|restaurant|eating|delivery|bakery/i, 'Alimentação'],
  [/transport|gas station|fuel|taxi|ride|parking|toll|vehicle|automotive/i, 'Transporte'],
  [/pharm|health|medic|hospital|dentist|clinic/i, 'Saúde'],
  [/educat|school|universit|course|book/i, 'Educação'],
  [/leisure|entertain|stream|digital service|game|travel|tourism|hotel|airline|culture/i, 'Lazer'],
  [/housing|rent|electric|water|utilit|telecom|internet|mobile|phone|gas and/i, 'Casa'],
  [/cloth|shopping|beauty|personal care|cosmetic/i, 'Roupas e cuidados'],
]
const TRANSFERENCIA = /same (person|owner)|credit card payment|investment|transfer.*own|proprio|aplica|resgate/i

async function pluggy(caminho: string, apiKey: string) {
  const r = await fetch(`${PLUGGY}${caminho}`, { headers: { 'X-API-KEY': apiKey } })
  if (!r.ok) throw new Error(`Pluggy ${caminho.split('?')[0]}: ${r.status}`)
  return r.json()
}

// Lançamentos: /v2/transactions com cursor (o /transactions antigo responde 410).
// Repete enquanto a resposta trouxer "next".
async function todosLancamentos(accountId: string, desde: string, apiKey: string) {
  const itens: any[] = []
  let caminho = `/v2/transactions?accountId=${encodeURIComponent(accountId)}&dateFrom=${desde}`
  for (let pagina = 0; pagina < 60 && caminho; pagina++) {
    const r = await pluggy(caminho, apiKey)
    itens.push(...(r.results || []))
    const prox = r.next
    if (!prox) break
    if (/^https?:\/\//.test(prox)) caminho = prox.replace(PLUGGY, '')
    else if (prox.startsWith('?')) caminho = `/v2/transactions${prox}`
    else if (prox.startsWith('/')) caminho = prox
    else caminho = `/v2/transactions?accountId=${encodeURIComponent(accountId)}&after=${encodeURIComponent(prox)}`
  }
  return itens
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405)
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    })
    const { data: quem } = await sb.auth.getUser()
    if (!quem?.user) return json({ erro: 'Entre no app de novo.' }, 401)

    const clientId = Deno.env.get('PLUGGY_CLIENT_ID')
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET')
    if (!clientId || !clientSecret) return json({ erro: 'Falta guardar o Client ID e o Client Secret da Pluggy nos segredos da função.' }, 400)

    const rAuth = await fetch(`${PLUGGY}/auth`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    })
    if (!rAuth.ok) return json({ erro: 'A Pluggy recusou o Client ID ou o Client Secret. Confira os segredos.' }, 400)
    const { apiKey } = await rAuth.json()

    const [{ data: conexoes }, { data: regras }, { data: categorias }] = await Promise.all([
      sb.from('conexoes').select('*'),
      sb.from('regras_categoria').select('*').order('ordem'),
      sb.from('categorias').select('*'),
    ])
    if (!conexoes?.length) return json({ erro: 'Nenhuma conexão cadastrada. Cole o itemId de cada banco no app.' }, 400)
    const catPorNome = new Map((categorias || []).map((c: any) => [`${c.tipo}:${c.nome}`, c.id]))
    const catTipo = new Map((categorias || []).map((c: any) => [c.id, c.tipo]))

    function classificar(texto: string, catBanco: string, tipo: 'gasto' | 'entrada'): { tipo: string; categoria_id: string | null; grupo?: string | null; parte_minha?: number | null } {
      const t = normal(texto)
      for (const r of regras || []) {
        if (!t.includes(normal(r.texto))) continue
        // dinheiro da mãe: fora das finanças pessoais (do que entra, parte_minha é de quem usa o app)
        if (r.grupo) return { tipo, categoria_id: null, grupo: r.grupo, parte_minha: tipo === 'entrada' && r.parte_minha ? Number(r.parte_minha) : null }
        if (r.transferencia) return { tipo: 'transferencia', categoria_id: null }
        if (catTipo.get(r.categoria_id) === tipo) return { tipo, categoria_id: r.categoria_id }
      }
      if (TRANSFERENCIA.test(catBanco)) return { tipo: 'transferencia', categoria_id: null }
      if (tipo === 'gasto') {
        for (const [re, nome] of MAPA_GASTO) if (re.test(catBanco)) return { tipo, categoria_id: catPorNome.get(`gasto:${nome}`) ?? null }
      } else if (/salar|payroll|wage|income/i.test(catBanco)) {
        return { tipo, categoria_id: catPorNome.get('entrada:Estágio') ?? null }
      }
      return { tipo, categoria_id: null } // fica em "A classificar"
    }

    const agora = new Date().toISOString()
    const hoje = diaLocal(agora)
    const resumo = { novos: 0, contas: 0, investimentos: 0, erros: [] as string[] }

    for (const c of conexoes) {
      try {
        const item = await pluggy(`/items/${c.item_id}`, apiKey)
        const banco = c.banco || item?.connector?.name || 'Banco'
        // conexão "só investimentos": não traz contas nem lançamentos (já vêm pela outra conexão)
        const contas = c.so_investimentos ? [] : (await pluggy(`/accounts?itemId=${c.item_id}`, apiKey)).results || []
        const desde = new Date(Date.now() - (c.ultima_sincronia ? 15 : 120) * 86400000).toISOString().slice(0, 10)

        for (const a of contas) {
          const tipoConta = a.type === 'CREDIT' ? 'cartao' : a.type === 'BANK' ? 'corrente' : 'outra'
          const { data: conta, error: eConta } = await sb.from('contas').upsert({
            externo_id: a.id, item_id: c.item_id, banco,
            nome: String(a.marketingName || a.name || banco).slice(0, 80), tipo: tipoConta,
            saldo: a.balance ?? null, atualizado_em: agora,
          }, { onConflict: 'user_id,externo_id' }).select().single()
          if (eConta) throw eConta
          resumo.contas++

          const txs = await todosLancamentos(a.id, desde, apiKey)
          const linhas = txs.map((t: any) => {
            const valor = Math.abs(Number(t.amount) || 0)
            const saida = t.type ? t.type === 'DEBIT' : Number(t.amount) < 0
            let base: 'gasto' | 'entrada' = saida ? 'gasto' : 'entrada'
            const texto = String(t.descriptionRaw || t.description || '')
            let cl = classificar(`${texto} ${t.description || ''}`, String(t.category || ''), base)
            // no cartão, crédito é pagamento da fatura (ou estorno): não conta como entrada
            if (tipoConta === 'cartao' && base === 'entrada' && !/estorno|reembolso/i.test(texto)) cl = { tipo: 'transferencia', categoria_id: null }
            const meta = t.creditCardMetadata
            return {
              externo_id: String(t.id), conta_id: conta.id, origem: 'openfinance', dia: diaLocal(t.date), valor,
              tipo: cl.tipo, categoria_id: cl.categoria_id,
              grupo: cl.grupo ?? null, parte_minha: cl.parte_minha != null ? Math.min(cl.parte_minha, valor) : null,
              descricao: String(t.description || texto || banco).slice(0, 200),
              texto_banco: texto.slice(0, 300) || null,
              categoria_banco: t.category ? String(t.category).slice(0, 120) : null,
              parcela: meta?.totalInstallments > 1 ? `${meta.installmentNumber}/${meta.totalInstallments}` : null,
            }
          }).filter((l: any) => l.valor > 0)
          for (let i = 0; i < linhas.length; i += 400) {
            // só insere o que é novo: o que a Ione já classificou não muda
            const { data: novos, error } = await sb.from('lancamentos')
              .upsert(linhas.slice(i, i + 400), { onConflict: 'user_id,externo_id', ignoreDuplicates: true }).select('id')
            if (error) throw error
            resumo.novos += novos?.length || 0
          }
        }

        // investimentos (posição atual + saldo do dia para o gráfico)
        let invs: any[] = []
        let avisoInv: string | null = null
        try { invs = (await pluggy(`/investments?itemId=${c.item_id}`, apiKey)).results || [] }
        catch (e) { invs = []; avisoInv = `Investimentos: ${String((e as Error)?.message || e).slice(0, 150)}` }
        if (!avisoInv && invs.length === 0 && c.so_investimentos) {
          // diagnóstico: o que o item diz sobre investimentos (produtos e status por produto)
          const prods = Array.isArray(item?.products) ? item.products.join(',') : '?'
          const det = item?.statusDetail?.investments
          avisoInv = `Investimentos: 0 · conector=${item?.connector?.name || '?'} · produtos=${prods} · status=${det ? JSON.stringify(det).slice(0, 120) : 'sem detalhe'}`
        }
        for (const v of invs) {
          const taxa = v.rate != null ? `${v.rate}${v.rateType ? ` ${v.rateType}` : ''}` : v.annualRate != null ? `${v.annualRate}% a.a.` : null
          const { data: inv, error } = await sb.from('investimentos').upsert({
            externo_id: String(v.id), instituicao: String(v.institution?.name || banco).slice(0, 60),
            nome: String(v.name || v.code || 'Investimento').slice(0, 120), tipo: String(v.type || 'outro').slice(0, 40),
            subtipo: v.subtype ? String(v.subtype).slice(0, 60) : null,
            aplicado: v.amountOriginal ?? v.amount ?? null, saldo: v.balance ?? v.amount ?? 0,
            taxa: taxa ? String(taxa).slice(0, 60) : null, vencimento: v.dueDate ? String(v.dueDate).slice(0, 10) : null,
            ativo: v.status ? v.status === 'ACTIVE' : true, atualizado_em: agora,
          }, { onConflict: 'user_id,externo_id' }).select().single()
          if (error) throw error
          await sb.from('investimento_historico').upsert({ investimento_id: inv.id, dia: hoje, saldo: inv.saldo }, { onConflict: 'investimento_id,dia' })
          resumo.investimentos++
        }

        await sb.from('conexoes').update({
          status: item?.status || 'UPDATED', erro: avisoInv, ultima_sincronia: agora,
          consentimento_ate: item?.consentExpiresAt || null,
        }).eq('id', c.id)
      } catch (e) {
        const msg = String((e as Error)?.message || e).slice(0, 300)
        resumo.erros.push(`${c.banco}: ${msg}`)
        // não marca a data: na próxima vez, busca de novo o período inteiro
        await sb.from('conexoes').update({ erro: msg }).eq('id', c.id)
      }
    }
    return json(resumo)
  } catch (e) {
    return json({ erro: String((e as Error)?.message || e).slice(0, 300) }, 500)
  }
})
