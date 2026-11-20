import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { infoArea } from '../lib/agenda.js'
import { dataCurta, deIso, difDias, hoje, lerValor, reais } from '../lib/util.js'
import { Botao, Field, Icone, Modal, Segmentos, Vazio } from '../components/ui.jsx'
import { Cabecalho } from './Shell.jsx'

const num = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const mostra = (m, v) => (m.tipo === 'valor' ? reais(v) : `${num(v)}${m.unidade ? ` ${m.unidade}` : ''}`)

export default function Metas() {
  const { d } = useDados()
  const [editando, setEditando] = useState(null)
  const [somando, setSomando] = useState(null)
  const abertas = d.metas.filter((m) => !m.concluida).sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999') || a.ordem - b.ordem)
  const feitas = d.metas.filter((m) => m.concluida)

  return (
    <div className="tela">
      <Cabecalho titulo="Metas" sub="Em contagem (livros, simulados…) ou em valor (R$)">
        <button type="button" className="btn btn-primario" onClick={() => setEditando({})}><Icone nome="mais" tamanho={20} />Meta</button>
      </Cabecalho>
      {abertas.length === 0 && <div className="cartao"><Vazio>Nenhuma meta em andamento. Crie a primeira no botão Meta.</Vazio></div>}
      <div className="lista-metas">
        {abertas.map((m) => <CartaoMeta key={m.id} m={m} aoEditar={() => setEditando(m)} aoSomar={() => setSomando(m)} />)}
      </div>
      {feitas.length > 0 && (
        <section className="cartao">
          <div className="cab-cartao"><h2>Concluídas</h2><span className="suave">{feitas.length}</span></div>
          {feitas.map((m) => (
            <div key={m.id} className="meta-feita"><Icone nome="check" tamanho={18} /><span>{m.nome}</span><span className="suave">{mostra(m, m.alvo)}</span>
              <button type="button" className="btn-icone btn-mini" onClick={() => setEditando(m)} aria-label={`Editar ${m.nome}`}><Icone nome="editar" tamanho={15} /></button></div>
          ))}
        </section>
      )}
      {editando && <EditorMeta meta={editando.id ? editando : null} aoFechar={() => setEditando(null)} />}
      {somando && <Somar meta={somando} aoFechar={() => setSomando(null)} />}
    </div>
  )
}

function CartaoMeta({ m, aoEditar, aoSomar }) {
  const { d, salvar } = useDados()
  const a = infoArea(d, m.area_id)
  const pct = Math.min(100, Math.round((100 * Number(m.atual)) / Number(m.alvo)))
  const faltam = m.prazo ? difDias(deIso(m.prazo), hoje()) : null
  const contagem = m.tipo === 'contagem'
  async function mais(n) {
    const atual = Math.max(0, Number(m.atual) + n)
    await salvar('metas', { id: m.id, atual, concluida: atual >= Number(m.alvo) })
  }
  return (
    <section className="cartao meta">
      <div className="meta-topo">
        <span className="faixa" style={{ background: a.cor }} aria-hidden="true" />
        <div className="meta-textos">
          <h2>{m.nome}</h2>
          <span className="suave">{m.area_id ? a.nome : 'Sem área'}{m.prazo ? ` · até ${dataCurta(deIso(m.prazo))}${faltam >= 0 ? ` (${faltam === 0 ? 'hoje' : `faltam ${faltam} dias`})` : ' (prazo passou)'}` : ''}</span>
        </div>
        <button type="button" className="btn-icone" onClick={aoEditar} aria-label={`Editar ${m.nome}`}><Icone nome="editar" tamanho={18} /></button>
      </div>
      <div className="linha-energia"><span>{mostra(m, m.atual)} de {mostra(m, m.alvo)}</span><span className="suave">{pct}%</span></div>
      <div className="barra barra-grossa" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${m.nome}`}><div style={{ width: `${pct}%` }} /></div>
      <div className="acoes">
        {contagem ? (
          <>
            <button type="button" className="btn btn-sec btn-peq" onClick={() => mais(-1)} disabled={Number(m.atual) <= 0} aria-label="Tirar 1">−1</button>
            <button type="button" className="btn btn-primario btn-peq" onClick={() => mais(1)}>+1</button>
          </>
        ) : null}
        <button type="button" className="btn btn-sec btn-peq" onClick={aoSomar}>{contagem ? 'Somar outro número' : 'Somar valor'}</button>
      </div>
    </section>
  )
}

function Somar({ meta, aoFechar }) {
  const { salvar } = useDados()
  const [txt, setTxt] = useState('')
  const [erro, setErro] = useState('')
  async function enviar(e) {
    e.preventDefault()
    const v = lerValor(txt)
    if (!Number.isFinite(v) || v === 0) return setErro('Digite um número, por exemplo 150 ou 12,50. Use − na frente para tirar.')
    const atual = Math.max(0, Number(meta.atual) + v)
    const ok = await salvar('metas', { id: meta.id, atual, concluida: atual >= Number(meta.alvo) })
    if (ok) aoFechar()
  }
  return (
    <Modal titulo={`Somar em ${meta.nome}`} aoFechar={aoFechar}
      rodape={<><div className="espaco" /><button type="button" className="btn btn-sec" onClick={aoFechar}>Cancelar</button><Botao type="submit" form="form-somar">Somar</Botao></>}>
      <form id="form-somar" className="form" onSubmit={enviar}>
        <Field label={meta.tipo === 'valor' ? 'Valor (R$)' : `Quanto somar${meta.unidade ? ` (${meta.unidade})` : ''}`} hint="Para tirar, use o sinal de menos. Ex.: -50">
          <input type="text" inputMode="decimal" value={txt} autoFocus onChange={(e) => { setTxt(e.target.value); setErro('') }} />
        </Field>
        {erro && <p className="erro">{erro}</p>}
      </form>
    </Modal>
  )
}

function EditorMeta({ meta, aoFechar }) {
  const { d, salvar, apagar } = useDados()
  const [m, setM] = useState(meta ? { ...meta, alvo: String(meta.alvo).replace('.', ','), atual: String(meta.atual).replace('.', ',') } : { nome: '', tipo: 'contagem', alvo: '', atual: '0', unidade: '', prazo: '', area_id: null })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const muda = (c) => { setM((x) => ({ ...x, ...c })); setErro('') }

  async function enviar(e) {
    e.preventDefault()
    const alvo = lerValor(m.alvo)
    const atual = lerValor(m.atual || '0')
    if (!m.nome.trim()) return setErro('Dê um nome para a meta.')
    if (!(alvo > 0)) return setErro('O alvo precisa ser maior que zero.')
    if (!(atual >= 0)) return setErro('O valor atual não pode ser negativo.')
    setSalvando(true)
    const ok = await salvar('metas', {
      ...(meta ? { id: meta.id } : { ordem: d.metas.length }),
      nome: m.nome.trim(), tipo: m.tipo, alvo, atual, unidade: m.tipo === 'contagem' ? m.unidade?.trim() || null : null,
      prazo: m.prazo || null, area_id: m.area_id || null, concluida: atual >= alvo,
    })
    setSalvando(false)
    if (ok) aoFechar()
  }

  async function excluir() {
    if (!window.confirm(`Apagar a meta ${meta.nome}?`)) return
    await apagar('metas', meta)
    aoFechar()
  }

  return (
    <Modal titulo={meta ? 'Editar meta' : 'Nova meta'} aoFechar={aoFechar}
      rodape={<>
        {meta && <button type="button" className="btn btn-perigo" onClick={excluir}><Icone nome="lixo" tamanho={18} />Apagar</button>}
        <div className="espaco" />
        <button type="button" className="btn btn-sec" onClick={aoFechar}>Cancelar</button>
        <Botao type="submit" form="form-meta" carregando={salvando}>Salvar</Botao>
      </>}>
      <form id="form-meta" className="form" onSubmit={enviar}>
        <Field label="Meta"><input type="text" value={m.nome} maxLength={100} required autoFocus placeholder="Ex.: Fazer 10 simulados do TOEFL" onChange={(e) => muda({ nome: e.target.value })} /></Field>
        <div className="campo">
          <span className="campo-rotulo">Tipo</span>
          <Segmentos label="Tipo de meta" value={m.tipo} onChange={(v) => muda({ tipo: v })} options={[{ v: 'contagem', label: 'Contagem' }, { v: 'valor', label: 'Valor em R$' }]} />
        </div>
        <div className="grade-3">
          <Field label={m.tipo === 'valor' ? 'Alvo (R$)' : 'Alvo'}><input type="text" inputMode="decimal" value={m.alvo} required onChange={(e) => muda({ alvo: e.target.value })} /></Field>
          <Field label={m.tipo === 'valor' ? 'Já tenho (R$)' : 'Já fiz'}><input type="text" inputMode="decimal" value={m.atual} onChange={(e) => muda({ atual: e.target.value })} /></Field>
          {m.tipo === 'contagem' && <Field label="Unidade (opcional)"><input type="text" maxLength={20} value={m.unidade || ''} placeholder="simulados, livros…" onChange={(e) => muda({ unidade: e.target.value })} /></Field>}
        </div>
        <div className="grade-2">
          <Field label="Prazo (opcional)"><input type="date" value={m.prazo || ''} onChange={(e) => muda({ prazo: e.target.value })} /></Field>
          <Field label="Área (opcional)">
            <select value={m.area_id || ''} onChange={(e) => muda({ area_id: e.target.value || null })}>
              <option value="">Sem área</option>
              {d.areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </Field>
        </div>
        {erro && <p className="erro">{erro}</p>}
      </form>
    </Modal>
  )
}
