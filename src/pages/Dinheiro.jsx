import { useEffect, useRef, useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { supabase } from '../lib/supabase.js'
import Classificar from '../components/dinheiro/Classificar.jsx'
import Investimentos from '../components/dinheiro/Investimentos.jsx'
import Conexoes from '../components/dinheiro/Conexoes.jsx'
import Mae, { resumoMae } from '../components/dinheiro/Mae.jsx'
import { dataCurta, deIso, hoje, isoDia, lerValor, MESES, pad, reais } from '../lib/util.js'
import { Botao, Field, Icone, Modal, Segmentos, Vazio, useToast } from '../components/ui.jsx'
import { Cabecalho } from './Shell.jsx'

const chaveMes = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

// Atualiza Nubank e BTG pelo Open Finance (a chave da Pluggy fica só no Supabase)
function useSincronia() {
  const { d, carregar } = useDados()
  const toast = useToast()
  const [rodando, setRodando] = useState(false)
  const automatico = useRef(false)
  async function sincronizar(silencioso = false) {
    setRodando(true)
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-sync', { method: 'POST' })
      let corpo = data
      if (error) {
        try { corpo = await error.context?.json?.() } catch { corpo = null }
        throw new Error(corpo?.erro || 'Não deu para atualizar agora.')
      }
      await carregar()
      if (!silencioso || corpo?.novos) toast(corpo?.erros?.length ? `Atualizado com avisos: ${corpo.erros.join(' · ')}` : `Atualizado: ${corpo?.novos || 0} lançamentos novos`, corpo?.erros?.length ? 'erro' : 'ok')
    } catch (e) {
      if (!silencioso) toast(e.message, 'erro')
    }
    setRodando(false)
  }
  // ao abrir a tela, atualiza sozinho se a última vez foi há mais de 6 horas
  useEffect(() => {
    if (automatico.current || !d.conexoes.length) return
    automatico.current = true
    const ultima = d.conexoes.map((c) => c.ultima_sincronia).filter(Boolean).sort()[0]
    if (!ultima || Date.now() - new Date(ultima).getTime() > 6 * 3600000) sincronizar(true)
  }, [d.conexoes.length]) // eslint-disable-line react-hooks/exhaustive-deps
  return { rodando, sincronizar }
}

export default function Dinheiro() {
  const { d } = useDados()
  const [aba, setAba] = useState('mes')
  const [mes, setMes] = useState(() => new Date(hoje().getFullYear(), hoje().getMonth(), 1))
  const [editando, setEditando] = useState(null) // lançamento, ou { tipo } para novo
  const [classificando, setClassificando] = useState(null)
  const { rodando, sincronizar } = useSincronia()
  const k = chaveMes(mes)
  const doMes = d.lancamentos.filter((l) => l.dia.startsWith(k)).sort((a, b) => b.dia.localeCompare(a.dia) || String(b.criado_em).localeCompare(String(a.criado_em)))
  // dinheiro da mãe fica fora; do pró-labore dela, só a parte que é sua entra nas suas entradas
  const contam = doMes.filter((l) => l.tipo !== 'transferencia' && !l.grupo)
  const parteMinha = doMes.filter((l) => l.grupo && l.tipo === 'entrada').reduce((s, l) => s + Number(l.parte_minha || 0), 0)
  const entradas = contam.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0) + parteMinha
  const maeMes = resumoMae(doMes, d.ajustes[0]?.ap_desde || null)[0]
  const gastos = contam.filter((l) => l.tipo === 'gasto').reduce((s, l) => s + Number(l.valor), 0)
  const saldo = entradas - gastos
  const titulo = `${MESES[mes.getMonth()][0].toUpperCase()}${MESES[mes.getMonth()].slice(1)} de ${mes.getFullYear()}`
  const semCategoria = d.lancamentos.filter((l) => l.tipo !== 'transferencia' && !l.grupo && !l.categoria_id && l.origem !== 'manual').sort((a, b) => b.dia.localeCompare(a.dia))
  const ultima = d.conexoes.map((c) => c.ultima_sincronia).filter(Boolean).sort().pop()

  const cabecalho = (
    <>
      <Cabecalho titulo="Dinheiro" sub="Gastos, entradas e investimentos">
        <button type="button" className="btn btn-sec" onClick={() => setEditando({ tipo: 'entrada' })}><Icone nome="mais" tamanho={20} />Entrada</button>
        <button type="button" className="btn btn-primario" onClick={() => setEditando({ tipo: 'gasto' })}><Icone nome="mais" tamanho={20} />Gasto</button>
      </Cabecalho>
      <div className="barra-sincronia">
        <Segmentos label="Parte do Dinheiro" value={aba} onChange={setAba}
          options={[{ v: 'mes', label: 'Mês' }, { v: 'mae', label: 'AP' }, { v: 'investimentos', label: 'Investimentos' }, { v: 'contas', label: 'Contas e regras' }]} />
        {d.conexoes.length > 0 && (
          <span className="sincronia">
            <span className="suave">{d.conexoes.map((c) => c.banco).join(' e ')} · {ultima ? `atualizado ${new Date(ultima).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : 'ainda não atualizado'}</span>
            <Botao className="btn btn-sec btn-peq" carregando={rodando} onClick={() => sincronizar(false)}>Atualizar agora</Botao>
          </span>
        )}
      </div>
    </>
  )
  const modais = (
    <>
      {editando && <EditorLancamento lanc={editando.id ? editando : null} tipoInicial={editando.tipo} aoFechar={() => setEditando(null)} />}
      {classificando && <Classificar lista={classificando} aoFechar={() => setClassificando(null)} />}
    </>
  )
  if (aba === 'investimentos') return <div className="tela">{cabecalho}<Investimentos />{modais}</div>
  if (aba === 'contas') return <div className="tela">{cabecalho}<Conexoes />{modais}</div>
  if (aba === 'mae') return <div className="tela">{cabecalho}<Mae />{modais}</div>

  // gastos por categoria
  const porCat = new Map()
  for (const l of doMes.filter((x) => x.tipo === 'gasto' && !x.grupo)) {
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
      {cabecalho}
      {d.conexoes.length === 0 && (
        <div className="info">Para os gastos do Nubank e do BTG entrarem sozinhos, ligue o Open Finance na aba <strong>Contas e regras</strong>.</div>
      )}
      {semCategoria.length > 0 && (
        <div className="aviso-classificar">
          <span><strong>{semCategoria.length}</strong> {semCategoria.length === 1 ? 'lançamento do banco está' : 'lançamentos do banco estão'} sem categoria.</span>
          <button type="button" className="btn btn-primario btn-peq" onClick={() => setClassificando(semCategoria)}>Classificar</button>
        </div>
      )}
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
      {maeMes && (
        <button type="button" className="aviso-mae" onClick={() => setAba('mae')}>
          <span>{maeMes.falta > 0 ? <>Falta pagar no AP: <strong>{reais(maeMes.falta)}</strong></> : <>AP deste mês: <strong>tudo pago</strong></>}</span>
          <span className="suave">fora das suas finanças · ver detalhes</span>
        </button>
      )}

      <div className="grade-hoje">
        <section className="cartao">
          <div className="cab-cartao"><h2>Lançamentos</h2><span className="suave">{doMes.length}</span></div>
          {doMes.length === 0 && <Vazio>Nenhum lançamento neste mês. Use os botões Gasto e Entrada.</Vazio>}
          {grupos.map((g) => (
            <div key={g.dia} className="grupo-dia">
              <h3>{dataCurta(deIso(g.dia))}</h3>
              {g.itens.map((l) => {
                const c = d.categorias.find((x) => x.id === l.categoria_id)
                const conta = l.conta_id ? d.contas.find((x) => x.id === l.conta_id) : null
                const transf = l.tipo === 'transferencia' || !!l.grupo
                const detalhe = [l.grupo ? `AP${Number(l.parte_minha) > 0 ? ` · ${reais(l.parte_minha)} seus` : ''}` : transf ? 'não conta (transferência)' : c?.nome || (l.origem !== 'manual' ? 'sem categoria' : null), conta ? conta.nome : null, l.parcela ? `parcela ${l.parcela}` : null].filter(Boolean).join(' · ')
                return (
                  <button key={l.id} type="button" className={`lancamento ${transf ? 'transferencia' : ''}`} onClick={() => setEditando(l)}>
                    <i style={{ background: transf ? 'var(--borda-forte)' : c?.cor || '#8A96A3' }} aria-hidden="true" />
                    <span className="lancamento-textos"><strong>{(l.descricao || '').replace(/\s*\|\s*/g, ' · ') || c?.nome || (l.tipo === 'gasto' ? 'Gasto' : 'Entrada')}</strong>{detalhe && <span className="suave">{detalhe}</span>}</span>
                    <span className={l.tipo === 'entrada' && !transf ? 'valor-entrada' : ''}>{transf ? '' : l.tipo === 'entrada' ? '+ ' : '− '}{reais(l.valor)}</span>
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
      {modais}
    </div>
  )
}

function EditorLancamento({ lanc, tipoInicial, aoFechar }) {
  const { d, salvar, apagar } = useDados()
  const [l, setL] = useState(lanc
    ? { ...lanc, valor: Number(lanc.valor).toFixed(2).replace('.', ','), parte_minha: lanc.parte_minha != null ? Number(lanc.parte_minha).toFixed(2).replace('.', ',') : '' }
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
      categoria_id: l.tipo === 'transferencia' || l.grupo ? null : l.categoria_id || null, descricao: l.descricao?.trim() || null,
      grupo: l.tipo === 'transferencia' ? null : l.grupo || null,
      parte_minha: l.grupo === 'mae' && l.tipo === 'entrada' && lerValor(String(l.parte_minha ?? '')) > 0 ? Math.min(valor, lerValor(String(l.parte_minha))) : null,
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
    <Modal titulo={lanc ? 'Editar lançamento' : l.tipo === 'entrada' ? 'Nova entrada' : 'Novo gasto'} aoFechar={aoFechar}
      rodape={<>
        {lanc && <button type="button" className="btn btn-perigo" onClick={excluir}><Icone nome="lixo" tamanho={18} />Apagar</button>}
        <div className="espaco" />
        <button type="button" className="btn btn-sec" onClick={aoFechar}>Cancelar</button>
        <Botao type="submit" form="form-lanc" carregando={salvando}>Salvar</Botao>
      </>}>
      <form id="form-lanc" className="form" onSubmit={enviar}>
        <Segmentos label="Tipo" value={l.tipo} onChange={(v) => muda({ tipo: v, categoria_id: null })} options={[{ v: 'gasto', label: 'Gasto' }, { v: 'entrada', label: 'Entrada' }, { v: 'transferencia', label: 'Não conta' }]} />
        {l.tipo === 'transferencia' && <p className="suave">Transferência entre contas suas, pagamento de fatura ou aplicação: aparece na lista, mas não soma nos gastos nem nas entradas.</p>}
        {lanc?.texto_banco && <p className="suave">Texto do banco: {lanc.texto_banco}</p>}
        <div className="grade-2">
          <Field label="Valor (R$)"><input type="text" inputMode="decimal" value={l.valor} autoFocus placeholder="0,00" onChange={(e) => muda({ valor: e.target.value })} /></Field>
          <Field label="Dia"><input type="date" value={l.dia} onChange={(e) => muda({ dia: e.target.value })} /></Field>
        </div>
        {l.tipo !== 'transferencia' && !l.grupo && <div className="campo">
          <span className="campo-rotulo">Categoria</span>
          <div className="chips">
            {categorias.map((c) => (
              <button key={c.id} type="button" className={`chip chip-cat ${l.categoria_id === c.id ? 'ativo' : ''}`} aria-pressed={l.categoria_id === c.id} onClick={() => muda({ categoria_id: l.categoria_id === c.id ? null : c.id })}>
                <i style={{ background: c.cor }} aria-hidden="true" />{c.nome}
              </button>
            ))}
          </div>
        </div>}
        {l.tipo !== 'transferencia' && (
          <label className="check-simples"><input type="checkbox" checked={l.grupo === 'mae'} onChange={(e) => muda({ grupo: e.target.checked ? 'mae' : null })} />AP (fica fora das minhas finanças)</label>
        )}
        {l.grupo === 'mae' && l.tipo === 'entrada' && (
          <Field label="Quanto disso é seu (R$)" hint="Essa parte entra nas suas entradas; o resto fica no AP."><input type="text" inputMode="decimal" value={l.parte_minha ?? ''} placeholder="0,00" onChange={(e) => muda({ parte_minha: e.target.value })} /></Field>
        )}
        <Field label="Descrição (opcional)"><input type="text" maxLength={200} value={l.descricao || ''} placeholder="Ex.: mercado, gasolina" onChange={(e) => muda({ descricao: e.target.value })} /></Field>
        {erro && <p className="erro">{erro}</p>}
      </form>
    </Modal>
  )
}
