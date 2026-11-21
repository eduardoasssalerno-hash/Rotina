import { useDados } from '../../lib/dados.jsx'
import { dataCurta, deIso, hoje, MESES, pad, reais } from '../../lib/util.js'
import { Vazio } from '../ui.jsx'

const chave = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const nomeMes = (k) => { const [a, m] = k.split('-').map(Number); return `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${a}` }

// Dinheiro da mãe: o pró-labore que passa pela conta (menos a parte que é sua) e o que já foi pago por ela
export function resumoMae(lancs) {
  const meses = new Map()
  for (const l of lancs) {
    if (l.grupo !== 'mae') continue
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
  const meses = resumoMae(d.lancamentos)
  const atual = meses.find((m) => m.k === chave(hoje())) || meses[0]
  if (!meses.length) {
    return <div className="cartao"><Vazio>Nada separado ainda. Em qualquer lançamento, marque "Dinheiro da mãe" para ele sair das suas finanças e entrar aqui.</Vazio></div>
  }
  return (
    <>
      {atual && (
        <section className={`cartao mae-destaque ${atual.falta > 0 ? '' : 'quitado'}`}>
          <span className="suave">{nomeMes(atual.k)}</span>
          {atual.falta > 0
            ? <><strong>Falta pagar para a sua mãe: {reais(atual.falta)}</strong><span className="suave">Recebido para ela {reais(atual.recebido)} · já pago {reais(atual.pago)}</span></>
            : <><strong>Tudo pago este mês{atual.falta < 0 ? ` (você pagou ${reais(-atual.falta)} a mais)` : ''}</strong><span className="suave">Recebido para ela {reais(atual.recebido)} · pago {reais(atual.pago)}</span></>}
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
              <div><dt>Pró-labore (parte dela)</dt><dd>{reais(m.recebido)}</dd></div>
              <div><dt>Já pago por ela</dt><dd>{reais(m.pago)}</dd></div>
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
      <p className="suave">O pró-labore da Ione Vicente Consultoria e os pagamentos dos cartões Caixa e XP entram aqui sozinhos. Para mudar o que entra, use as regras em Contas e regras.</p>
    </>
  )
}
