import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { Link } from '../lib/router.jsx'
import { infoArea } from '../lib/agenda.js'
import { estadoPlaneta, FASES, LIMITES } from '../lib/planetas.js'
import { dataCurta, deIso, difDias, duracao, hoje } from '../lib/util.js'
import { Botao, Field, Icone, Modal, Segmentos, Vazio } from '../components/ui.jsx'
import Planeta from '../components/Planeta.jsx'
import LinhaTarefa from '../components/LinhaTarefa.jsx'
import EditorTarefa from '../components/EditorTarefa.jsx'
import { Cabecalho } from './Shell.jsx'

const TAMANHO_FASE = [0, 56, 66, 78, 90, 104]

export default function Planetas() {
  const { d } = useDados()
  const [vista, setVista] = useState('sistema')
  const ativos = d.projetos.filter((p) => !p.arquivado).sort((a, b) => a.ordem - b.ordem)
  const [selId, setSelId] = useState(() => ativos[0]?.id || null)
  const [etapasDe, setEtapasDe] = useState(null)
  const [editando, setEditando] = useState(null) // projeto, ou {} para novo
  const sel = ativos.find((p) => p.id === selId) || ativos[0]

  return (
    <div className="tela">
      <Cabecalho titulo="Planetas" sub="Cada projeto ou matéria é um planeta: cresce com as etapas feitas e o tempo de foco">
        <Segmentos label="Ver sistema solar ou lista" value={vista} onChange={setVista}
          options={[{ v: 'sistema', label: 'Sistema solar' }, { v: 'lista', label: 'Lista' }]} />
        <button type="button" className="btn btn-primario" onClick={() => setEditando({})}><Icone nome="mais" tamanho={20} />Planeta</button>
      </Cabecalho>

      {ativos.length === 0 && <div className="cartao"><Vazio>Nenhum planeta ainda. Crie um para cada projeto ou matéria.</Vazio></div>}

      {ativos.length > 0 && vista === 'sistema' && (
        <div className="sistema-area">
          <div className="espaco-sideral" role="group" aria-label="Sistema solar dos seus projetos">
            <Estrelas />
            <div className="orbita o1" /><div className="orbita o2" /><div className="orbita o3" />
            <div className="sol" aria-hidden="true" />
            {ativos.map((p) => {
              const e = estadoPlaneta(d, p)
              const t = TAMANHO_FASE[e.fase]
              return (
                <button key={p.id} type="button" className={`astro ${sel?.id === p.id ? 'sel' : ''}`}
                  style={{ left: `${p.pos_x}%`, top: `${p.pos_y}%` }} onClick={() => setSelId(p.id)}
                  aria-pressed={sel?.id === p.id} aria-label={`${p.nome}, fase ${FASES[e.fase]}${e.apagado ? ', sem brilho' : ''}`}>
                  <Planeta fase={e.fase} apagado={e.apagado} tamanho={t} rotulo="" />
                  <span className="astro-nome">{p.nome}</span>
                </button>
              )
            })}
          </div>
          {sel && <Detalhe p={sel} aoVerEtapas={() => setEtapasDe(sel)} aoEditar={() => setEditando(sel)} />}
        </div>
      )}

      {ativos.length > 0 && vista === 'lista' && (
        <div className="lista-planetas">
          {ativos.map((p) => <Detalhe key={p.id} p={p} compacto aoVerEtapas={() => setEtapasDe(p)} aoEditar={() => setEditando(p)} />)}
        </div>
      )}

      {etapasDe && <Etapas p={etapasDe} aoFechar={() => setEtapasDe(null)} />}
      {editando && <EditorPlaneta projeto={editando.id ? editando : null} aoFechar={(novo) => { setEditando(null); if (novo?.id) setSelId(novo.id) }} />}
    </div>
  )
}

function Estrelas() {
  // estrelas fixas (mesma posição sempre)
  const pts = Array.from({ length: 60 }, (_, i) => [((i * 37) % 100), ((i * 61 + 13) % 100), (i % 3) + 1])
  return (
    <svg className="estrelas" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {pts.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r * 0.12} fill="#FFFFFF" opacity={0.25 + (i % 4) * 0.15} />)}
    </svg>
  )
}

function Detalhe({ p, aoVerEtapas, aoEditar, compacto }) {
  const { d } = useDados()
  const e = estadoPlaneta(d, p)
  const a = infoArea(d, p.area_id)
  const ant = LIMITES[e.fase - 1] ?? 0
  const prox = LIMITES[e.fase]
  const pct = e.fase >= 5 ? 100 : Math.round(((e.energia - ant) / (prox - ant)) * 100)
  const faltam = p.prazo ? difDias(deIso(p.prazo), hoje()) : null
  const treino = p.tipo === 'treino'
  return (
    <section className={`cartao detalhe-planeta ${compacto ? 'compacto' : ''}`}>
      <div className="detalhe-topo">
        <Planeta fase={e.fase} apagado={e.apagado} tamanho={compacto ? 76 : 104} />
        <div className="detalhe-textos">
          <span className="tag" style={{ background: `color-mix(in srgb, ${a.cor} 18%, var(--superficie))`, color: 'var(--tinta)' }}>{a.nome}</span>
          <h2>{p.nome}</h2>
          <span className="suave">Fase {e.fase} de 5 · {FASES[e.fase]}{e.apagado ? ` · sem brilho há ${e.parado} dias` : ''}</span>
        </div>
      </div>
      <div>
        <div className="linha-energia"><span>Energia {e.energia}</span><span className="suave">{e.fase >= 5 ? 'Fase máxima' : `faltam ${e.falta} para ${FASES[e.fase + 1]}`}</span></div>
        <div className="barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Energia até a próxima fase"><div style={{ width: `${pct}%` }} /></div>
      </div>
      <dl className="numeros">
        {treino ? (
          <><div><dt>Treinos concluídos</dt><dd>{e.treinos.length}</dd></div><div><dt>Cada treino</dt><dd>+10 de energia</dd></div></>
        ) : (
          <>
            <div><dt>Etapas</dt><dd>{e.feitas.length} de {e.etapas.length}</dd></div>
            <div><dt>Tempo</dt><dd>{duracao(e.minFeito)} de {duracao(e.minTotal)}</dd></div>
            {e.minFoco > 0 && <div><dt>Foco</dt><dd>{duracao(e.minFoco)}</dd></div>}
            {p.prazo && <div><dt>Prazo</dt><dd>{dataCurta(deIso(p.prazo))}{faltam >= 0 ? ` · ${faltam === 0 ? 'hoje' : faltam === 1 ? 'amanhã' : `em ${faltam} dias`}` : ''}</dd></div>}
          </>
        )}
      </dl>
      {!compacto && p.descricao && <p className="suave">{p.descricao}</p>}
      <div className="acoes">
        {treino
          ? <Link to="/treino" className="btn btn-primario">Abrir o treino</Link>
          : <button type="button" className="btn btn-primario" onClick={aoVerEtapas}>Ver etapas</button>}
        <button type="button" className="btn btn-sec" onClick={aoEditar}><Icone nome="editar" tamanho={18} />Editar</button>
      </div>
    </section>
  )
}

function Etapas({ p, aoFechar }) {
  const { d, salvar } = useDados()
  const [editando, setEditando] = useState(null)
  const [nova, setNova] = useState('')
  const [min, setMin] = useState('')
  const e = estadoPlaneta(d, p)
  const lista = [...e.etapas].sort((a, b) =>
    Number(a.feita) - Number(b.feita) || (a.dia || '9999').localeCompare(b.dia || '9999') || String(a.inicio || '').localeCompare(String(b.inicio || '')) || a.ordem - b.ordem)

  async function adicionar(ev) {
    ev.preventDefault()
    if (!nova.trim()) return
    const ok = await salvar('tarefas', { titulo: nova.trim(), projeto_id: p.id, minutos: Number(min) > 0 ? Math.round(Number(min)) : null, ordem: e.etapas.length })
    if (ok) { setNova(''); setMin('') }
  }

  return (
    <>
      <Modal larga titulo={`Etapas de ${p.nome}`} aoFechar={aoFechar}
        subtitulo={`${e.feitas.length} de ${e.etapas.length} feitas · ${duracao(e.minFeito)} de ${duracao(e.minTotal)} · cada etapa feita dá +10 de energia`}>
        {lista.length === 0 && <Vazio>Nenhuma etapa ainda.</Vazio>}
        <div className="lista-etapas">
          {lista.map((t) => <LinhaTarefa key={t.id} tarefa={t} aoEditar={setEditando} mostrarDia mostrarProjeto={false} />)}
        </div>
        <form className="nova-etapa" onSubmit={adicionar}>
          <Field label="Nova etapa"><input type="text" value={nova} maxLength={160} onChange={(ev) => setNova(ev.target.value)} /></Field>
          <Field label="Minutos"><input type="number" inputMode="numeric" min={1} max={720} value={min} onChange={(ev) => setMin(ev.target.value)} /></Field>
          <Botao type="submit" disabled={!nova.trim()}><Icone nome="mais" tamanho={18} />Adicionar</Botao>
        </form>
      </Modal>
      {editando && <EditorTarefa tarefa={editando} aoFechar={() => setEditando(null)} />}
    </>
  )
}

function EditorPlaneta({ projeto, aoFechar }) {
  const { d, salvar } = useDados()
  const [p, setP] = useState(projeto || { nome: '', area_id: d.areas[0]?.id || null, prazo: '', descricao: '' })
  const [salvando, setSalvando] = useState(false)
  const muda = (c) => setP((x) => ({ ...x, ...c }))

  async function enviar(ev) {
    ev.preventDefault()
    if (!p.nome.trim()) return
    setSalvando(true)
    const linha = { ...(projeto ? { id: projeto.id } : {
      // planeta novo entra numa posição livre do sistema solar
      pos_x: 15 + ((d.projetos.length * 29) % 70), pos_y: 18 + ((d.projetos.length * 41) % 64), ordem: d.projetos.length,
    }), nome: p.nome.trim(), area_id: p.area_id || null, prazo: p.prazo || null, descricao: p.descricao?.trim() || null }
    const ok = await salvar('projetos', linha)
    setSalvando(false)
    if (ok) aoFechar(ok)
  }

  async function arquivar() {
    if (!window.confirm(`Arquivar o planeta ${projeto.nome}? Ele sai do sistema solar, mas nada é apagado.`)) return
    await salvar('projetos', { id: projeto.id, arquivado: true })
    aoFechar()
  }

  return (
    <Modal titulo={projeto ? 'Editar planeta' : 'Novo planeta'} aoFechar={() => aoFechar()}
      rodape={<>
        {projeto && <button type="button" className="btn btn-sec" onClick={arquivar}>Arquivar</button>}
        <div className="espaco" />
        <button type="button" className="btn btn-sec" onClick={() => aoFechar()}>Cancelar</button>
        <Botao type="submit" form="form-planeta" carregando={salvando}>Salvar</Botao>
      </>}>
      <form id="form-planeta" className="form" onSubmit={enviar}>
        <Field label="Nome do projeto ou matéria"><input type="text" value={p.nome} maxLength={80} required autoFocus onChange={(e) => muda({ nome: e.target.value })} /></Field>
        <div className="grade-2">
          <Field label="Área">
            <select value={p.area_id || ''} onChange={(e) => muda({ area_id: e.target.value || null })}>
              <option value="">Sem área</option>
              {d.areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </Field>
          <Field label="Prazo ou prova (opcional)"><input type="date" value={p.prazo || ''} onChange={(e) => muda({ prazo: e.target.value })} /></Field>
        </div>
        <Field label="Descrição (opcional)"><textarea rows={2} maxLength={500} value={p.descricao || ''} onChange={(e) => muda({ descricao: e.target.value })} /></Field>
      </form>
    </Modal>
  )
}
