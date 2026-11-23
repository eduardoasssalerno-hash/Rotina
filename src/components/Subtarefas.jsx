import { useEffect, useRef, useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { Icone, useToast } from './ui.jsx'

export const subtarefasDe = (d, tarefaId) => d.subtarefas.filter((s) => s.tarefa_id === tarefaId).sort((a, b) => a.ordem - b.ordem)

// Etapas (checklist) de uma tarefa. Quando todas ficam feitas, a tarefa fica feita sozinha;
// desmarcar uma etapa reabre a tarefa.
export default function Subtarefas({ tarefa, abrirNovo = false }) {
  const { d, salvar, apagar } = useDados()
  const toast = useToast()
  const modelo = d.modelos_todo.find((m) => m.titulo === tarefa.titulo)
  const lista = subtarefasDe(d, tarefa.id)
  const [novo, setNovo] = useState(abrirNovo)
  const [texto, setTexto] = useState('')
  const campo = useRef(null)
  useEffect(() => { if (novo) campo.current?.focus() }, [novo])

  async function marcar(s) {
    const feita = !s.feita
    await salvar('subtarefas', { id: s.id, feita })
    const todas = lista.every((x) => (x.id === s.id ? feita : x.feita))
    if (todas && !tarefa.feita) await salvar('tarefas', { id: tarefa.id, feita: true, feita_em: new Date().toISOString() })
    if (!feita && tarefa.feita) await salvar('tarefas', { id: tarefa.id, feita: false, feita_em: null })
  }
  async function adicionar(e) {
    e.preventDefault()
    const titulo = texto.trim()
    if (!titulo) return
    setTexto('')
    campo.current?.focus()
    await salvar('subtarefas', { tarefa_id: tarefa.id, titulo: titulo.slice(0, 160), ordem: lista.length })
    if (tarefa.feita) await salvar('tarefas', { id: tarefa.id, feita: false, feita_em: null })
  }

  // guarda o título e as etapas para usar de novo em outro dia (+ modelo)
  async function salvarModelo() {
    const etapas = lista.map((s) => s.titulo)
    const ok = modelo
      ? await salvar('modelos_todo', { id: modelo.id, etapas })
      : await salvar('modelos_todo', { titulo: tarefa.titulo.slice(0, 160), etapas })
    if (ok) toast(`Modelo "${tarefa.titulo}" ${modelo ? 'atualizado' : 'salvo'}: use em "+ modelo" dentro do bloco`)
  }

  return (
    <div className="subtarefas">
      {lista.map((s, i) => (
        <div key={s.id} className={`subtarefa ${s.feita ? 'feita' : ''}`}>
          <label className="todo-check">
            <input type="checkbox" checked={s.feita} onChange={() => marcar(s)} />
            <span><em className="num-etapa">{i + 1}.</em> {s.titulo}</span>
          </label>
          <button type="button" className="btn-icone btn-mini" aria-label={`Apagar etapa ${s.titulo}`}
            onClick={() => { if (window.confirm(`Apagar a etapa "${s.titulo}"?`)) apagar('subtarefas', s) }}><Icone nome="fechar" tamanho={14} /></button>
        </div>
      ))}
      {novo ? (
        <form className="todo-novo" onSubmit={adicionar}>
          <input ref={campo} type="text" value={texto} maxLength={160} placeholder="Nova etapa" enterKeyHint="done"
            onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setNovo(false) }}
            onBlur={() => { if (!texto.trim()) setTimeout(() => setNovo(false), 150) }} aria-label={`Nova etapa em ${tarefa.titulo}`} />
          <button type="submit" className="btn btn-primario btn-peq" disabled={!texto.trim()}>Pôr</button>
        </form>
      ) : (
        <div className="todo-acoes">
          <button type="button" className="btn-texto btn-todo" onClick={() => setNovo(true)}>+ etapa</button>
          {lista.length > 0 && (
            <button type="button" className="btn-texto btn-todo suave" onClick={salvarModelo}>
              {modelo ? 'atualizar modelo' : 'salvar como modelo'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
