import { useEffect, useRef, useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { todosDoBloco } from '../lib/agenda.js'
import { alternarTarefa } from './LinhaTarefa.jsx'
import { Icone } from './ui.jsx'
import Subtarefas, { subtarefasDe } from './Subtarefas.jsx'

// Lista de to-dos dentro de um bloco do dia (Aulas, Estágio...).
// Tocar no nome do bloco abre a caixa; depois de pôr um to-do, a caixa continua aberta para o próximo.
export default function TodosBloco({ bloco, iso, aoEditar, aberto, aoAbrir, aoFechar }) {
  const { d, salvar } = useDados()
  const [abertoLocal, setAbertoLocal] = useState(false)
  const controlado = aberto !== undefined
  const abrindo = controlado ? aberto : abertoLocal
  const abrir = () => (controlado ? aoAbrir?.() : setAbertoLocal(true))
  const fechar = () => (controlado ? aoFechar?.() : setAbertoLocal(false))
  const [texto, setTexto] = useState('')
  const [modelosAbertos, setModelosAbertos] = useState(false)
  const [etapasAbertas, setEtapasAbertas] = useState({}) // to-do → etapas visíveis (padrão: abertas se ainda não terminou)
  const campo = useRef(null)
  const lista = todosDoBloco(d, bloco.id, iso)
  useEffect(() => { if (abrindo) campo.current?.focus() }, [abrindo])

  // cria o to-do já com as etapas do modelo
  async function usarModelo(m) {
    setModelosAbertos(false)
    const t = await salvar('tarefas', { titulo: m.titulo, bloco_id: bloco.id, area_id: bloco.area_id, dia: iso, ordem: lista.length })
    if (!t) return
    for (let i = 0; i < m.etapas.length; i++) await salvar('subtarefas', { tarefa_id: t.id, titulo: m.etapas[i], ordem: i })
    setEtapasAbertas((x) => ({ ...x, [t.id]: true }))
  }

  async function adicionar(e) {
    e.preventDefault()
    const titulo = texto.trim()
    if (!titulo) return
    setTexto('')
    campo.current?.focus()
    await salvar('tarefas', { titulo, bloco_id: bloco.id, area_id: bloco.area_id, dia: iso, ordem: lista.length })
  }

  return (
    <div className="todos-bloco">
      {lista.map((t) => {
        const etapas = subtarefasDe(d, t.id)
        const feitas = etapas.filter((s) => s.feita).length
        const aberta = etapasAbertas[t.id] ?? etapas.length > 0
        return (
          <div key={t.id} className="todo-bloco-item">
            <div className={`todo ${t.feita ? 'feita' : ''}`}>
              <label className="todo-check">
                <input type="checkbox" checked={t.feita} onChange={() => alternarTarefa(salvar, t)} />
                <span>{t.titulo}</span>
              </label>
              {t.todo_fixo_id && d.todos_fixos.some((f) => f.id === t.todo_fixo_id && f.ativo) && (
                <button type="button" className="selo-diario" title="Aparece todo dia neste bloco. Tocar para parar de repetir."
                  onClick={() => { if (window.confirm(`Parar de repetir "${t.titulo}" todo dia? O de hoje continua.`)) salvar('todos_fixos', { id: t.todo_fixo_id, ativo: false }) }}>↻ diário</button>
              )}
              <button type="button" className={`btn-etapas ${etapas.length ? 'tem' : ''}`} aria-expanded={aberta}
                aria-label={etapas.length ? `Etapas de ${t.titulo}: ${feitas} de ${etapas.length}` : `Pôr etapas em ${t.titulo}`}
                onClick={() => setEtapasAbertas((x) => ({ ...x, [t.id]: !aberta }))}>
                {etapas.length ? `${feitas}/${etapas.length}` : <Icone nome="mais" tamanho={14} />}
                <Icone nome={aberta ? 'cima' : 'baixo'} tamanho={13} />
              </button>
              <button type="button" className="btn-icone btn-mini" onClick={() => aoEditar(t)} aria-label={`Editar ${t.titulo}`}><Icone nome="editar" tamanho={15} /></button>
              {!t.todo_fixo_id && (
                <button type="button" className="btn-icone btn-mini" aria-label={`Repetir ${t.titulo} todo dia`} title="Repetir todo dia neste bloco"
                  onClick={async () => {
                    if (!window.confirm(`Repetir "${t.titulo}" todo dia em ${bloco.titulo}?`)) return
                    const m = d.modelos_todo.find((x) => x.titulo === t.titulo)
                    const f = await salvar('todos_fixos', { bloco_id: bloco.id, titulo: t.titulo, modelo_id: m?.id || null, ordem: t.ordem ?? 0, desde: iso })
                    if (f) await salvar('tarefas', { id: t.id, todo_fixo_id: f.id })
                  }}>↻</button>
              )}
            </div>
            {aberta && <Subtarefas tarefa={t} abrirNovo={etapas.length === 0} />}
          </div>
        )
      })}
      {abrindo ? (
        <form className="todo-novo" onSubmit={adicionar}>
          <input ref={campo} type="text" value={texto} maxLength={160} placeholder={`O que fazer em ${bloco.titulo}?`}
            onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') fechar() }}
            onBlur={() => { if (!texto.trim()) setTimeout(fechar, 150) }} aria-label={`Novo to-do em ${bloco.titulo}`} enterKeyHint="done" />
          <button type="submit" className="btn btn-primario btn-peq" disabled={!texto.trim()}>Pôr</button>
        </form>
      ) : (
        <div className="todo-acoes">
          <button type="button" className="btn-texto btn-todo" onClick={abrir}>+ to-do</button>
          {d.modelos_todo.length > 0 && <button type="button" className="btn-texto btn-todo" aria-expanded={modelosAbertos} onClick={() => setModelosAbertos(!modelosAbertos)}>+ modelo</button>}
        </div>
      )}
      {modelosAbertos && (
        <div className="lista-modelos" role="menu">
          {[...d.modelos_todo].sort((a, b) => a.titulo.localeCompare(b.titulo)).map((m) => (
            <button key={m.id} type="button" role="menuitem" className="chip" onClick={() => usarModelo(m)}>{m.titulo} · {m.etapas.length} etapas</button>
          ))}
        </div>
      )}
    </div>
  )
}
