import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { dataCurta, deIso, hoje, isoDia, lerValor, MESES, pad, reais } from '../lib/util.js'
import { Botao, Field, Icone, Modal, Segmentos, Vazio } from '../components/ui.jsx'
import { Cabecalho } from './Shell.jsx'

const chaveMes = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

export default function Dinheiro() {
  const { d } = useDados()
  const [mes, setMes] = useState(() => new Date(hoje().getFullYear(), hoje().getMonth(), 1))
  const [editando, setEditando] = useState(null) // lançamento, ou { tipo } para novo
  const k = chaveMes(mes)
  const doMes = d.lancamentos.filter((l) => l.dia.startsWith(k)).sort((a, b) => b.dia.localeCompare(a.dia) || String(b.criado_em).localeCompare(String(a.criado_em)))
  const entradas = doMes.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
  const gastos = doMes.filter((l) => l.tipo === 'gasto').reduce((s, l) => s + Number(l.valor), 0)
  const saldo = entradas - gastos
  const titulo = `${MESES[mes.getMonth()][0].toUpperCase()}${MESES[mes.getMonth()].slice(1)} de ${mes.getFullYear()}`

  // gastos por categoria
  const porCat = new Map()
  for (const l of doMes.filter((x) => x.tipo === 'gasto')) {
    const c = d.categorias.find((x) => x.id === l.categoria_id)
    const nome = c?.nome || 'Sem categoria'
    const atual = porCat.get(nome) || { cor: c?.cor || '#8A96A3', v: 0 }
    atual.v += Number(l.valor)
    porCat.set(nome, atual)
  }
  const cats = [...porCat.entries()].map(([nome, x]) => ({ nome, ...x })).sort((a, b) => b.v - a.v)
  const maxCat = Math.max(1, ...cats.map((c) => c.v))

  // agrupa a lista por dia
  const grupos = []
  for (const l of doMes) {
    const g = grupos[grupos.length - 1]
    if (g && g.dia === l.dia) g.itens.push(l)
    else grupos.push({ dia: l.dia, itens: [l] })
  }

  return (
    <div className="tela">
      <Cabecalho titulo="Dinheiro" sub="Gastos pessoais e da casa, e entradas">
        <button type="button" className="btn btn-sec" onClick={() => setEditando({ tipo: 'entrada' })}><Icone nome="mais" tamanho={20} />Entrada</button>
        <button type="button" className="btn btn-primario" onClick={() => setEditando({ tipo: 'gasto' })}><Icone nome="mais" tamanho={20} />Gasto</button>
      </Cabecalho>
      <div className="navegar">
        <button type="button" className="btn-icone" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mês anterior"><Icone nome="voltar" /></button>
        <strong>{titulo}</strong>
        <button type="button" className="btn-icone" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} aria-label="Próximo mês"><Icone nome="avancar" /></button>
      </div>

      <div className="resumo-dinheiro">
        <div className="cartao"><span className="suave">Entradas</span><strong className="valor-entrada">{reais(entradas)}</strong></div>
        <div className="cartao"><span className="suave">Gastos</span><strong>{reais(gastos)}</strong></div>
        <div className="cartao"><span className="suave">Saldo do mês</span><strong className={saldo < 0 ? 'valor-negativo' : 'valor-entrada'}>{reais(saldo)}</strong></div>
      </div>

      <div className="grade-hoje">
        <section className="cartao">
          <div className="cab-cartao"><h2>Lançamentos</h2><span className="suave">{doMes.length}</span></div>
          {doMes.length === 0 && <Vazio>Nenhum lançamento neste mês. Use os botões Gasto e Entrada.</Vazio>}
          {grupos.map((g) => (
            <div key={g.dia} className="grupo-dia">
              <h3>{dataCurta(deIso(g.dia))}</h3>
              {g.itens.map((l) => {
                const c = d.categorias.find((x) => x.id === l.categoria_id)
                return (
                  <button key={l.id} type="button" className="lancamento" onClick={() => setEditando(l)}>
                    <i style={{ background: c?.cor || '#8A96A3' }} aria-hidden="true" />
                    <span className="lancamento-textos"><strong>{l.descricao || c?.nome || (l.tipo === 'gasto' ? 'Gasto' : 'Entrada')}</strong>{l.descricao && c && <span className="suave">{c.nome}</span>}</span>
                    <span className={l.tipo === 'entrada' ? 'valor-entrada' : ''}>{l.tipo === 'entrada' ? '+' : '−'} {reais(l.valor)}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </section>
        <section className="cartao">
          <div className="cab-cartao"><h2>Gastos por categoria</h2></div>
          {cats.length === 0 && <Vazio>Sem gastos neste mês.</Vazio>}
          <ul className="cats">
            {cats.map((c) => (
              <li key={c.nome}>
                <div className="cats-topo"><span><i style={{ background: c.cor }} aria-hidden="true" />{c.nome}</span><strong>{reais(c.v)}</strong></div>
                <div className="barra" aria-hidden="true"><div style={{ width: `${(c.v / maxCat) * 100}%`, background: c.cor }} /></div>
                <span className="suave">{Math.round((100 * c.v) / gastos)}% dos gastos</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {editando && <EditorLancamento lanc={editando.id ? editando : null} tipoInicial={editando.tipo} aoFechar={() => setEditando(null)} />}
    </div>
  )
}

function EditorLancamento({ lanc, tipoInicial, aoFechar }) {
  const { d, salvar, apagar } = useDados()
  const [l, setL] = useState(lanc
    ? { ...lanc, valor: Number(lanc.valor).toFixed(2).replace('.', ',') }
    : { tipo: tipoInicial || 'gasto', valor: '', dia: isoDia(hoje()), categoria_id: null, descricao: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const muda = (c) => { setL((x) => ({ ...x, ...c })); setErro('') }
  const categorias = d.categorias.filter((c) => c.tipo === l.tipo && c.ativo).sort((a, b) => a.ordem - b.ordem)

  async function enviar(e) {
    e.preventDefault()
    const valor = lerValor(l.valor)
    if (!(valor > 0)) return setErro('Digite o valor, por exemplo 35,90.')
    if (!l.dia) return setErro('Escolha o dia.')
    setSalvando(true)
    const ok = await salvar('lancamentos', {
      ...(lanc ? { id: lanc.id } : {}), tipo: l.tipo, valor, dia: l.dia,
      categoria_id: l.categoria_id || null, descricao: l.descricao?.trim() || null,
    })
    setSalvando(false)
    if (ok) aoFechar()
  }

  async function excluir() {
    if (!window.confirm('Apagar este lançamento?')) return
    await apagar('lancamentos', lanc)
    aoFechar()
  }

  return (
    <Modal titulo={lanc ? 'Editar lançamento' : l.tipo === 'gasto' ? 'Novo gasto' : 'Nova entrada'} aoFechar={aoFechar}
      rodape={<>
        {lanc && <button type="button" className="btn btn-perigo" onClick={excluir}><Icone nome="lixo" tamanho={18} />Apagar</button>}
        <div className="espaco" />
        <button type="button" className="btn btn-sec" onClick={aoFechar}>Cancelar</button>
        <Botao type="submit" form="form-lanc" carregando={salvando}>Salvar</Botao>
      </>}>
      <form id="form-lanc" className="form" onSubmit={enviar}>
        <Segmentos label="Tipo" value={l.tipo} onChange={(v) => muda({ tipo: v, categoria_id: null })} options={[{ v: 'gasto', label: 'Gasto' }, { v: 'entrada', label: 'Entrada' }]} />
        <div className="grade-2">
          <Field label="Valor (R$)"><input type="text" inputMode="decimal" value={l.valor} autoFocus placeholder="0,00" onChange={(e) => muda({ valor: e.target.value })} /></Field>
          <Field label="Dia"><input type="date" value={l.dia} onChange={(e) => muda({ dia: e.target.value })} /></Field>
        </div>
        <div className="campo">
          <span className="campo-rotulo">Categoria</span>
          <div className="chips">
            {categorias.map((c) => (
              <button key={c.id} type="button" className={`chip chip-cat ${l.categoria_id === c.id ? 'ativo' : ''}`} aria-pressed={l.categoria_id === c.id} onClick={() => muda({ categoria_id: l.categoria_id === c.id ? null : c.id })}>
                <i style={{ background: c.cor }} aria-hidden="true" />{c.nome}
              </button>
            ))}
          </div>
        </div>
        <Field label="Descrição (opcional)"><input type="text" maxLength={200} value={l.descricao || ''} placeholder="Ex.: mercado, gasolina" onChange={(e) => muda({ descricao: e.target.value })} /></Field>
        {erro && <p className="erro">{erro}</p>}
      </form>
    </Modal>
  )
}
