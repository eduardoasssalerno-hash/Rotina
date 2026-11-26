import { useDados } from '../../lib/dados.jsx'
import { dataCurta, deIso, hoje, MESES, pad, reais } from '../../lib/util.js'
import { Vazio } from '../ui.jsx'

const chave = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const nomeMes = (k) => { const [a, m] = k.split('-').map(Number); return `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${a}` }

// AP: o pró-labore que passa pela conta (menos a parte que é sua) e as contas pagas com ele
export function resumoMae(lancs, desde = null) {
  const meses = new Map()
  for (const l of lancs) {
    if (l.grupo !== 'mae' || (desde && l.dia < desde)) continue
    const k = l.dia.slice(0, 7)
    const m = meses.get(k) || { recebido: 0, minha: 0, pago: 0, itens: [] }
    if (l.tipo === 'entrada') { m.recebido += Number(l.valor) - Number(l.parte_minha || 0); m.minha += Number(l.parte_minha || 0) }
    else if (l.tipo === 'gasto') m.pago += Number(l.valor)
    m.itens.push(l)
    meses.set(k, m)
  }
  return [...meses.entries()].map(([k, m]) => ({ k, ...m, falta: Math.round((m.recebido - m.pago) * 100) / 100 })).sort((a, b) => b.k.localeCompare(a.k))
}

export default function Mae() {
  const { d } = useDados()
  const desdeAp = d.ajustes[0]?.ap_desde || null
  const meses = resumoMae(d.lancamentos, desdeAp)
  const atual = meses.find((m) => m.k === chave(hoje())) || meses[0]
  // somando todos os meses: o que passou de um mês compensa o que faltou em outro
  const acumulado = Math.round(meses.reduce((s, m) => s + m.falta, 0) * 100) / 100
  const guardado = d.investimentos.filter((i) => i.ativo && i.grupo === 'mae').reduce((t, i) => t + Number(i.saldo || 0), 0)
  const desdeTexto = meses.length ? nomeMes(meses[meses.length - 1].k).replace(/ de \d+$/, '') : ''
  if (!meses.length) {
    return <div className="cartao"><Vazio>Nada no AP ainda. Em qualquer lançamento, marque "AP" para ele sair das suas finanças e entrar aqui.</Vazio></div>
  }
  return (
    <>
      {atual && (
        <section className={`cartao mae-destaque ${atual.falta > 0 ? '' : 'quitado'}`}>
          <span className="suave">{nomeMes(atual.k)}</span>
          {atual.falta > 0
            ? <><strong>Falta pagar no AP: {reais(atual.falta)}</strong><span className="suave">Pró-labore (sem os seus R$ 500) {reais(atual.recebido)} · contas já pagas {reais(atual.pago)}</span></>
            : <><strong>Tudo pago este mês{atual.falta < 0 ? ` (você pagou ${reais(-atual.falta)} a mais)` : ''}</strong><span className="suave">Pró-labore (sem os seus R$ 500) {reais(atual.recebido)} · contas pagas {reais(atual.pago)}</span></>}
          {guardado > 0 && <span className="mae-acumulado">Guardado na caixinha do AP: {reais(guardado)}{acumulado > guardado ? ` · falta separar ${reais(acumulado - guardado)}` : ' · já está tudo separado'}</span>}
          {meses.length > 1 && <span className="mae-acumulado">Somando desde {desdeTexto}: {acumulado > 0 ? `falta ${reais(acumulado)}` : acumulado < 0 ? `você pagou ${reais(-acumulado)} a mais` : 'tudo certo'}</span>}
        </section>
      )}
      <div className="lista-metas">
        {meses.map((m) => (
          <section key={m.k} className="cartao">
            <div className="cab-cartao">
              <h2>{nomeMes(m.k)}</h2>
              <span className={m.falta > 0 ? 'valor-negativo' : 'valor-entrada'}><strong>{m.falta > 0 ? `falta ${reais(m.falta)}` : 'pago'}</strong></span>
            </div>
            <dl className="numeros">
              <div><dt>Pró-labore (sem a sua parte)</dt><dd>{reais(m.recebido)}</dd></div>
              <div><dt>Contas pagas</dt><dd>{reais(m.pago)}</dd></div>
              {m.minha > 0 && <div><dt>Parte sua (foi para as suas entradas)</dt><dd>{reais(m.minha)}</dd></div>}
            </dl>
            <ul className="itens-mae">
              {m.itens.sort((a, b) => a.dia.localeCompare(b.dia)).map((l) => (
                <li key={l.id}>
                  <span className="suave">{dataCurta(deIso(l.dia))}</span>
                  <span>{String(l.descricao || '').replace(/\s*\|\s*/g, ' · ')}</span>
                  <strong className={l.tipo === 'entrada' ? 'valor-entrada' : ''}>{l.tipo === 'entrada' ? '+ ' : '− '}{reais(l.tipo === 'entrada' ? Number(l.valor) - Number(l.parte_minha || 0) : l.valor)}</strong>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="suave">{desdeAp ? `O saldo começa em ${new Date(desdeAp + 'T12:00').toLocaleDateString('pt-BR')}; os meses anteriores estão quitados. ` : ''}O pró-labore, os boletos (Pagamento efetuado), os cartões Caixa e XP e a terapia entram aqui sozinhos. Para mudar, use as regras em Contas e regras.</p>
    </>
  )
}
