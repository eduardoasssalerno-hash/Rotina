import { useEffect, useRef, useState } from 'react'
import { useDados } from '../../lib/dados.jsx'
import { supabase } from '../../lib/supabase.js'
import { dataCurta, deIso, hoje, isoDia, lerValor, pad, reais } from '../../lib/util.js'
import { Botao, Field, Icone, Modal, Segmentos, Vazio, useToast } from '../ui.jsx'

export const TIPOS_INV = {
  FIXED_INCOME: 'Renda fixa', MUTUAL_FUND: 'Fundos', EQUITY: 'Ações', FII: 'FIIs e ETFs', ETF: 'ETFs', SECURITY: 'Previdência e títulos',
  COE: 'COE', OTHER: 'Outros', outro: 'Outros',
}
const SUBTIPOS = { TREASURY: 'Tesouro', CDB: 'CDB', LCI: 'LCI', LCA: 'LCA', LC: 'LC', CRI: 'CRI', CRA: 'CRA', DEBENTURES: 'Debênture' }
// Tesouro Direto vira um grupo próprio (Pluggy manda como renda fixa, subtipo TREASURY)
const ehTesouro = (i) => i.subtipo === 'TREASURY' || /tesouro/i.test(i.nome || '')
const nomeTipo = (t) => TIPOS_INV[t] || t
const grupoDe = (i) => (ehTesouro(i) ? 'Tesouro Direto' : nomeTipo(i.tipo))
const pct = (v) => `${v >= 0 ? '+' : ''}${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export default function Investimentos() {
  const { d, salvar } = useDados()
  const [novoRF, setNovoRF] = useState(null) // {} = novo; investimento = editar
  const [novaOp, setNovaOp] = useState(false)
  const { atualizar, rodando } = useAtualizarInvest()
  const manuais = d.investimentos.filter((i) => i.origem === 'manual')
  // atualiza sozinho (índices e cotações) se a última vez foi há mais de 3 horas
  const auto = useRef(false)
  useEffect(() => {
    if (auto.current || (!manuais.length && !d.operacoes_bolsa.length)) return
    auto.current = true
    const ultima = Math.max(0, ...manuais.map((i) => new Date(i.atualizado_em).getTime()))
    if (Date.now() - ultima > 3 * 3600000) atualizar(true)
  }) // eslint-disable-line react-hooks/exhaustive-deps
  const barra = (
    <div className="acoes-invest">
      <button type="button" className="btn btn-sec" onClick={() => setNovoRF({})}><Icone nome="mais" tamanho={18} />Renda fixa / Tesouro</button>
      <button type="button" className="btn btn-sec" onClick={() => setNovaOp(true)}><Icone nome="mais" tamanho={18} />Bolsa</button>
      {(manuais.length > 0 || d.operacoes_bolsa.length > 0) && <Botao className="btn btn-sec" carregando={rodando} onClick={() => atualizar(false)}>Atualizar cotações</Botao>}
    </div>
  )
  const janelas = (
    <>
      {novoRF && <EditorRendaFixa inv={novoRF.id ? novoRF : null} aoFechar={(ok) => { setNovoRF(null); if (ok) atualizar(true) }} />}
      {novaOp && <EditorOperacao aoFechar={(ok) => { setNovaOp(false); if (ok) atualizar(true) }} />}
    </>
  )
  // posições zeradas (CDB já resgatado) não aparecem
  // o que está marcado como AP (ex.: caixinha com o dinheiro das contas da mãe) fica fora do patrimônio
  const ativos = d.investimentos.filter((i) => i.ativo && Number(i.saldo) > 0 && i.grupo !== 'mae')
  const doAp = d.investimentos.filter((i) => i.ativo && Number(i.saldo) > 0 && i.grupo === 'mae')
  const total = ativos.reduce((s, i) => s + Number(i.saldo || 0), 0)
  const aplicado = ativos.reduce((s, i) => s + Number(i.aplicado ?? i.saldo ?? 0), 0)
  const ganho = total - aplicado
  const grupos = new Map()
  for (const i of ativos) {
    const k = grupoDe(i)
    grupos.set(k, [...(grupos.get(k) || []), i])
  }
  const lista = [...grupos.entries()].map(([nome, itens]) => ({ nome, itens, soma: itens.reduce((s, i) => s + Number(i.saldo || 0), 0) })).sort((a, b) => b.soma - a.soma)
  const atualizado = ativos.map((i) => i.atualizado_em).sort().pop()

  if (!d.investimentos.length) {
    return <>{barra}<div className="cartao"><Vazio>Os investimentos aparecem aqui pelo Open Finance ou quando você lança um à mão.</Vazio></div>{janelas}</>
  }
  return (
    <>
      {barra}
      <div className="resumo-dinheiro">
        <div className="cartao"><span className="suave">Patrimônio investido</span><strong>{reais(total)}</strong></div>
        <div className="cartao"><span className="suave">Total aplicado</span><strong>{reais(aplicado)}</strong></div>
        <div className="cartao"><span className="suave">Rendeu</span><strong className={ganho < 0 ? 'valor-negativo' : 'valor-entrada'}>{reais(ganho)}{aplicado > 0 ? ` (${pct(ganho / aplicado)})` : ''}</strong></div>
      </div>
      {doAp.length > 0 && (
        <section className="cartao">
          <div className="cab-cartao"><h2>Guardado para o AP</h2><span className="suave">{reais(doAp.reduce((s, i) => s + Number(i.saldo), 0))} · fora do seu patrimônio</span></div>
          {doAp.map((i) => (
            <div key={i.id} className="investimento">
              <div className="investimento-textos"><strong>{i.nome}</strong><span className="suave">{i.instituicao}</span></div>
              <div className="investimento-valores">
                <strong>{reais(i.saldo)}</strong>
                <button type="button" className="btn-texto" onClick={() => salvar('investimentos', { id: i.id, grupo: null })}>não é do AP</button>
              </div>
            </div>
          ))}
        </section>
      )}
      <Evolucao />
      <Rendimentos />
      <div className="grade-hoje">
        {lista.map((g) => (
          <section key={g.nome} className="cartao">
            <div className="cab-cartao"><h2>{g.nome}</h2><span className="suave">{reais(g.soma)} · {total ? Math.round((100 * g.soma) / total) : 0}%</span></div>
            {g.itens.sort((a, b) => b.saldo - a.saldo).map((i) => {
              const ap = Number(i.aplicado ?? i.saldo)
              const r = ap > 0 ? (Number(i.saldo) - ap) / ap : 0
              return (
                <div key={i.id} className="investimento">
                  <div className="investimento-textos">
                    <strong>{i.nome}</strong>
                    <span className="suave">{[i.instituicao, SUBTIPOS[i.subtipo] || i.subtipo, i.taxa, i.vencimento ? `vence ${deIso(i.vencimento).toLocaleDateString('pt-BR')}` : null].filter(Boolean).join(' · ')}</span>
                  </div>
                  <div className="investimento-valores">
                    <strong>{reais(i.saldo)}</strong>
                    {i.aplicado != null && <span className={r < 0 ? 'valor-negativo' : 'valor-entrada'}>{pct(r)}</span>}
                    <button type="button" className="btn-texto btn-ap" title="Este investimento guarda dinheiro do AP" onClick={() => salvar('investimentos', { id: i.id, grupo: 'mae' })}>é do AP</button>
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </div>
      <Manuais aoEditar={setNovoRF} aoMudar={() => atualizar(true)} />
      {atualizado && <p className="suave">Atualizado em {new Date(atualizado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}. Renda fixa lançada à mão: valor bruto estimado pelos índices do Banco Central.</p>}
      {janelas}
    </>
  )
}

// Gráfico da evolução do patrimônio (soma dos saldos de cada dia guardado)
function Evolucao() {
  const { d } = useDados()
  const [foco, setFoco] = useState(null)
  const porDia = new Map()
  const foraAp = new Set(d.investimentos.filter((i) => i.grupo === 'mae').map((i) => i.id))
  for (const h of d.investimento_historico) if (!foraAp.has(h.investimento_id)) porDia.set(h.dia, (porDia.get(h.dia) || 0) + Number(h.saldo))
  const pontos = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  if (pontos.length < 2) {
    return <div className="cartao"><div className="cab-cartao"><h2>Evolução do patrimônio</h2></div><Vazio>O gráfico aparece a partir do segundo dia de atualização.</Vazio></div>
  }
  const W = 640, H = 200, P = 8
  const vals = pontos.map((p) => p[1])
  const min = Math.min(...vals), max = Math.max(...vals)
  const faixa = max - min || 1
  const x = (i) => P + (i / (pontos.length - 1)) * (W - 2 * P)
  const y = (v) => H - P - ((v - min) / faixa) * (H - 2 * P)
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ')
  const ativo = foco ?? pontos.length - 1
  return (
    <section className="cartao">
      <div className="cab-cartao">
        <h2>Evolução do patrimônio</h2>
        <span className="suave">{dataCurta(deIso(pontos[ativo][0]))}: <strong>{reais(pontos[ativo][1])}</strong></span>
      </div>
      <svg className="evolucao" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`Patrimônio de ${reais(pontos[0][1])} em ${dataCurta(deIso(pontos[0][0]))} para ${reais(pontos[pontos.length - 1][1])} hoje`}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setFoco(Math.round(((e.clientX - r.left) / r.width) * (pontos.length - 1))) }}
        onPointerLeave={() => setFoco(null)}>
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--linha)" strokeWidth="1" />
        <path d={`${linha} L${x(pontos.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill="var(--acento)" opacity="0.08" />
        <path d={linha} fill="none" stroke="var(--acento)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <line x1={x(ativo)} x2={x(ativo)} y1={P} y2={H - P} stroke="var(--borda-forte)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="escala"><span>{dataCurta(deIso(pontos[0][0]))}</span><span>{dataCurta(deIso(pontos[pontos.length - 1][0]))}</span></div>
    </section>
  )
}

// Rendimentos que caem na conta (ex.: conta remunerada do BTG): ficam aqui, fora das entradas do mês
function Rendimentos() {
  const { d } = useDados()
  const ids = new Set(d.categorias.filter((c) => c.nome === 'Rendimentos').map((c) => c.id))
  const lista = d.lancamentos.filter((l) => ids.has(l.categoria_id)).sort((a, b) => b.dia.localeCompare(a.dia))
  if (!lista.length) return null
  const k = `${hoje().getFullYear()}-${pad(hoje().getMonth() + 1)}`
  const doMes = lista.filter((l) => l.dia.startsWith(k)).reduce((s, l) => s + Number(l.valor), 0)
  const total = lista.reduce((s, l) => s + Number(l.valor), 0)
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Rendimentos da conta</h2><span className="suave">este mês {reais(doMes)} · desde o início {reais(total)}</span></div>
      <ul className="itens-mae">
        {lista.slice(0, 8).map((l) => {
          const conta = d.contas.find((c) => c.id === l.conta_id)
          return (
            <li key={l.id}>
              <span className="suave">{dataCurta(deIso(l.dia))}</span>
              <span>{conta?.nome || 'Conta'}</span>
              <strong className="valor-entrada">+ {reais(l.valor)}</strong>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// Chama a função que recalcula a renda fixa (índices do Banco Central) e busca as cotações da bolsa
function useAtualizarInvest() {
  const { carregar } = useDados()
  const toast = useToast()
  const [rodando, setRodando] = useState(false)
  async function atualizar(silencioso) {
    setRodando(true)
    try {
      const { data, error } = await supabase.functions.invoke('investimentos-sync', { method: 'POST' })
      let corpo = data
      if (error) {
        try { corpo = await error.context?.json?.() } catch { corpo = null }
        throw new Error(corpo?.erro || 'Não deu para atualizar os investimentos agora.')
      }
      await carregar()
      if (corpo?.avisos?.length) toast(corpo.avisos.join(' · '), 'erro')
      else if (!silencioso) toast(`Atualizado: ${corpo?.titulos || 0} títulos e ${corpo?.ativos || 0} ativos da bolsa`)
    } catch (e) {
      if (!silencioso) toast(e.message, 'erro')
    }
    setRodando(false)
  }
  return { atualizar, rodando }
}

const MODELOS = [
  { v: 'selic', label: 'Tesouro Selic', nome: 'Tesouro Selic', taxa: null },
  { v: 'prefixado', label: 'Tesouro Prefixado', nome: 'Tesouro Prefixado', taxa: '% ao ano' },
  { v: 'ipca', label: 'Tesouro IPCA+', nome: 'Tesouro IPCA+', taxa: '% ao ano (além do IPCA)' },
  { v: 'cdi', label: 'CDB / LCI / LCA (% do CDI)', nome: 'CDB', taxa: '% do CDI' },
  { v: 'fixo', label: 'Outro (eu digito o valor)', nome: '', taxa: null },
]
const textoTaxa = (ix, t) => (ix === 'selic' ? 'Selic' : ix === 'prefixado' ? `${t}% a.a.` : ix === 'ipca' ? `IPCA + ${t}%` : ix === 'cdi' ? `${t}% do CDI` : null)

function EditorRendaFixa({ inv, aoFechar }) {
  const { salvar } = useDados()
  const [f, setF] = useState(() => (inv
    ? { indexador: inv.indexador || 'fixo', nome: inv.nome, instituicao: inv.instituicao || 'BTG', aplicado: String(inv.aplicado ?? '').replace('.', ','), aplicado_em: inv.aplicado_em || '', taxa: inv.taxa_num != null ? String(inv.taxa_num).replace('.', ',') : '', vencimento: inv.vencimento || '', atual: String(inv.saldo ?? '').replace('.', ',') }
    : { indexador: 'selic', nome: 'Tesouro Selic ', instituicao: 'BTG', aplicado: '', aplicado_em: isoDia(hoje()), taxa: '', vencimento: '', atual: '' }))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const muda = (c) => setF((x) => ({ ...x, ...c }))
  const modelo = MODELOS.find((m) => m.v === f.indexador)

  async function enviar(e) {
    e.preventDefault()
    const aplicado = lerValor(f.aplicado)
    const taxa = f.taxa ? lerValor(f.taxa) : null
    const atual = f.indexador === 'fixo' ? lerValor(f.atual || f.aplicado) : aplicado
    if (!f.nome.trim()) return setErro('Dê um nome, ex.: Tesouro Selic 2029.')
    if (!(aplicado > 0)) return setErro('Coloque o valor aplicado, ex.: 1.000,00.')
    if (f.indexador !== 'fixo' && !f.aplicado_em) return setErro('Coloque a data da aplicação.')
    if (modelo.taxa && !(taxa > 0)) return setErro(`Coloque a taxa (${modelo.taxa}).`)
    setSalvando(true)
    const ok = await salvar('investimentos', {
      ...(inv ? { id: inv.id } : { origem: 'manual' }),
      nome: f.nome.trim().slice(0, 120), instituicao: f.instituicao.trim().slice(0, 60) || null,
      tipo: 'FIXED_INCOME', subtipo: f.indexador === 'cdi' ? 'CDB' : f.indexador === 'fixo' ? null : 'TREASURY',
      indexador: f.indexador, taxa_num: modelo.taxa ? taxa : null, taxa: textoTaxa(f.indexador, String(taxa ?? '').replace('.', ',')),
      aplicado, aplicado_em: f.aplicado_em || null, vencimento: f.vencimento || null,
      saldo: inv && f.indexador !== 'fixo' ? inv.saldo : atual, ativo: true, atualizado_em: new Date().toISOString(),
    })
    setSalvando(false)
    if (ok) aoFechar(true)
  }

  return (
    <Modal titulo={inv ? 'Editar investimento' : 'Novo investimento de renda fixa'} aoFechar={() => aoFechar(false)}
      rodape={<><div className="espaco" /><button type="button" className="btn btn-sec" onClick={() => aoFechar(false)}>Cancelar</button><Botao type="submit" form="form-rf" carregando={salvando}>Salvar</Botao></>}>
      <form id="form-rf" className="form" onSubmit={enviar}>
        <Field label="Tipo">
          <select value={f.indexador} onChange={(e) => { const m = MODELOS.find((x) => x.v === e.target.value); muda({ indexador: m.v, nome: inv ? f.nome : `${m.nome}${m.v === 'fixo' ? '' : ' '}` }) }}>
            {MODELOS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
          </select>
        </Field>
        <div className="grade-2">
          <Field label="Nome" hint="Ex.: Tesouro Selic 2029"><input type="text" value={f.nome} maxLength={120} onChange={(e) => muda({ nome: e.target.value })} /></Field>
          <Field label="Instituição"><input type="text" value={f.instituicao} maxLength={60} onChange={(e) => muda({ instituicao: e.target.value })} /></Field>
        </div>
        <div className="grade-2">
          <Field label="Valor aplicado (R$)"><input type="text" inputMode="decimal" value={f.aplicado} placeholder="1.000,00" onChange={(e) => muda({ aplicado: e.target.value })} /></Field>
          <Field label="Data da aplicação"><input type="date" value={f.aplicado_em} max={isoDia(hoje())} onChange={(e) => muda({ aplicado_em: e.target.value })} /></Field>
        </div>
        <div className="grade-2">
          {modelo.taxa && <Field label={`Taxa (${modelo.taxa})`}><input type="text" inputMode="decimal" value={f.taxa} placeholder={f.indexador === 'cdi' ? '100' : '6,5'} onChange={(e) => muda({ taxa: e.target.value })} /></Field>}
          {f.indexador === 'fixo' && <Field label="Valor de hoje (R$)" hint="Atualize quando quiser olhando o extrato"><input type="text" inputMode="decimal" value={f.atual} placeholder="igual ao aplicado" onChange={(e) => muda({ atual: e.target.value })} /></Field>}
          <Field label="Vencimento (opcional)"><input type="date" value={f.vencimento} onChange={(e) => muda({ vencimento: e.target.value })} /></Field>
        </div>
        {f.indexador !== 'fixo' && <p className="suave">O app estima o valor de hoje (bruto, sem IR) com os índices do Banco Central. Se tiver várias aplicações no mesmo título em datas diferentes, lance cada uma.</p>}
        {erro && <p className="erro">{erro}</p>}
      </form>
    </Modal>
  )
}

function EditorOperacao({ aoFechar }) {
  const { salvar } = useDados()
  const [f, setF] = useState({ ticker: '', tipo: 'compra', quantidade: '', preco: '', taxas: '', dia: isoDia(hoje()), instituicao: 'BTG' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const muda = (c) => setF((x) => ({ ...x, ...c }))
  async function enviar(e) {
    e.preventDefault()
    const ticker = f.ticker.trim().toUpperCase()
    const q = Number(String(f.quantidade).replace(',', '.'))
    const preco = lerValor(f.preco)
    if (!/^[A-Z0-9]{4,8}$/.test(ticker)) return setErro('Código do ativo como na B3, ex.: PETR4, MXRF11, BOVA11.')
    if (!(q > 0)) return setErro('Quantidade maior que zero.')
    if (!(preco >= 0)) return setErro('Preço por cota, ex.: 35,50.')
    setSalvando(true)
    const ok = await salvar('operacoes_bolsa', { ticker, tipo: f.tipo, quantidade: q, preco, taxas: lerValor(f.taxas) || 0, dia: f.dia, instituicao: f.instituicao.trim().slice(0, 60) || null })
    setSalvando(false)
    if (ok) aoFechar(true)
  }
  return (
    <Modal titulo="Compra ou venda na bolsa" aoFechar={() => aoFechar(false)}
      rodape={<><div className="espaco" /><button type="button" className="btn btn-sec" onClick={() => aoFechar(false)}>Cancelar</button><Botao type="submit" form="form-op" carregando={salvando}>Salvar</Botao></>}>
      <form id="form-op" className="form" onSubmit={enviar}>
        <Segmentos label="Operação" value={f.tipo} onChange={(v) => muda({ tipo: v })} options={[{ v: 'compra', label: 'Compra' }, { v: 'venda', label: 'Venda' }]} />
        <div className="grade-2">
          <Field label="Código do ativo" hint="Ex.: PETR4, ITSA4, MXRF11"><input type="text" value={f.ticker} maxLength={8} autoCapitalize="characters" spellCheck={false} onChange={(e) => muda({ ticker: e.target.value.toUpperCase() })} /></Field>
          <Field label="Data"><input type="date" value={f.dia} max={isoDia(hoje())} onChange={(e) => muda({ dia: e.target.value })} /></Field>
        </div>
        <div className="grade-3">
          <Field label="Quantidade"><input type="text" inputMode="decimal" value={f.quantidade} placeholder="10" onChange={(e) => muda({ quantidade: e.target.value })} /></Field>
          <Field label="Preço por cota (R$)"><input type="text" inputMode="decimal" value={f.preco} placeholder="35,50" onChange={(e) => muda({ preco: e.target.value })} /></Field>
          <Field label="Taxas (R$, opcional)"><input type="text" inputMode="decimal" value={f.taxas} placeholder="0,00" onChange={(e) => muda({ taxas: e.target.value })} /></Field>
        </div>
        <Field label="Instituição"><input type="text" value={f.instituicao} maxLength={60} onChange={(e) => muda({ instituicao: e.target.value })} /></Field>
        {erro && <p className="erro">{erro}</p>}
      </form>
    </Modal>
  )
}

// O que foi lançado à mão: renda fixa (editar/apagar) e operações da bolsa (apagar)
function Manuais({ aoEditar, aoMudar }) {
  const { d, apagar } = useDados()
  const rf = d.investimentos.filter((i) => i.origem === 'manual' && !i.ticker && i.ativo).sort((a, b) => String(a.aplicado_em).localeCompare(String(b.aplicado_em)))
  const ops = [...d.operacoes_bolsa].sort((a, b) => b.dia.localeCompare(a.dia))
  if (!rf.length && !ops.length) return null
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Lançados à mão</h2><span className="suave">{rf.length} em renda fixa · {ops.length} operações na bolsa</span></div>
      {rf.map((i) => (
        <div key={i.id} className="conexao">
          <div className="conexao-textos"><strong>{i.nome}</strong><span className="suave">{[i.instituicao, i.taxa, i.aplicado_em ? `aplicado ${reais(i.aplicado)} em ${deIso(i.aplicado_em).toLocaleDateString('pt-BR')}` : null].filter(Boolean).join(' · ')}</span></div>
          <button type="button" className="btn-icone" aria-label={`Editar ${i.nome}`} onClick={() => aoEditar(i)}><Icone nome="editar" tamanho={18} /></button>
          <button type="button" className="btn-icone" aria-label={`Apagar ${i.nome}`} onClick={() => { if (window.confirm(`Apagar ${i.nome}? O histórico dele some do gráfico.`)) apagar('investimentos', i) }}><Icone nome="lixo" tamanho={18} /></button>
        </div>
      ))}
      {ops.map((o) => {
        const c = d.cotacoes.find((x) => x.ticker === o.ticker)
        return (
          <div key={o.id} className="conexao">
            <div className="conexao-textos">
              <strong>{o.tipo === 'compra' ? 'Compra' : 'Venda'} · {o.ticker}</strong>
              <span className="suave">{dataCurta(deIso(o.dia))} · {Number(o.quantidade).toLocaleString('pt-BR')} × {reais(o.preco)}{c ? ` · hoje ${reais(c.preco)}` : ''}</span>
            </div>
            <button type="button" className="btn-icone" aria-label={`Apagar operação de ${o.ticker}`} onClick={() => { if (window.confirm(`Apagar esta ${o.tipo} de ${o.ticker}?`)) apagar('operacoes_bolsa', o).then(aoMudar) }}><Icone nome="lixo" tamanho={18} /></button>
          </div>
        )
      })}
    </section>
  )
}
