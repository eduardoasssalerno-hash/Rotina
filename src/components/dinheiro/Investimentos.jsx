import { useState } from 'react'
import { useDados } from '../../lib/dados.jsx'
import { dataCurta, deIso, hoje, pad, reais } from '../../lib/util.js'
import { Vazio } from '../ui.jsx'

export const TIPOS_INV = {
  FIXED_INCOME: 'Renda fixa', MUTUAL_FUND: 'Fundos', EQUITY: 'Ações', ETF: 'ETFs', SECURITY: 'Previdência e títulos',
  COE: 'COE', OTHER: 'Outros', outro: 'Outros',
}
const SUBTIPOS = { TREASURY: 'Tesouro', CDB: 'CDB', LCI: 'LCI', LCA: 'LCA', LC: 'LC', CRI: 'CRI', CRA: 'CRA', DEBENTURES: 'Debênture' }
// Tesouro Direto vira um grupo próprio (Pluggy manda como renda fixa, subtipo TREASURY)
const ehTesouro = (i) => i.subtipo === 'TREASURY' || /tesouro/i.test(i.nome || '')
const nomeTipo = (t) => TIPOS_INV[t] || t
const grupoDe = (i) => (ehTesouro(i) ? 'Tesouro Direto' : nomeTipo(i.tipo))
const pct = (v) => `${v >= 0 ? '+' : ''}${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export default function Investimentos() {
  const { d } = useDados()
  // posições zeradas (CDB já resgatado) não aparecem
  const ativos = d.investimentos.filter((i) => i.ativo && Number(i.saldo) > 0)
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
    return <div className="cartao"><Vazio>Os investimentos do BTG aparecem aqui depois que a conexão do Open Finance estiver ligada (aba Contas e regras).</Vazio></div>
  }
  return (
    <>
      <div className="resumo-dinheiro">
        <div className="cartao"><span className="suave">Patrimônio investido</span><strong>{reais(total)}</strong></div>
        <div className="cartao"><span className="suave">Total aplicado</span><strong>{reais(aplicado)}</strong></div>
        <div className="cartao"><span className="suave">Rendeu</span><strong className={ganho < 0 ? 'valor-negativo' : 'valor-entrada'}>{reais(ganho)}{aplicado > 0 ? ` (${pct(ganho / aplicado)})` : ''}</strong></div>
      </div>
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
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </div>
      {atualizado && <p className="suave">Atualizado em {new Date(atualizado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.</p>}
    </>
  )
}

// Gráfico da evolução do patrimônio (soma dos saldos de cada dia guardado)
function Evolucao() {
  const { d } = useDados()
  const [foco, setFoco] = useState(null)
  const porDia = new Map()
  for (const h of d.investimento_historico) porDia.set(h.dia, (porDia.get(h.dia) || 0) + Number(h.saldo))
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
