import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { todosDoBloco } from '../lib/agenda.js'
import { alternarTarefa } from './LinhaTarefa.jsx'
import { Icone } from './ui.jsx'

// Lista de to-dos dentro de um bloco do dia (Aulas, Estágio...)
export default function TodosBloco({ bloco, iso, aoEditar }) {
  const { d, salvar } = useDados()
  const [abrindo, setAbrindo] = useState(false)
  const [texto, setTexto] = useState('')
  const lista = todosDoBloco(d, bloco.id, iso)

  async function adicionar(e) {
    e.preventDefault()
    const titulo = texto.trim()
    if (!titulo) return
    setTexto('')
    await salvar('tarefas', { titulo, bloco_id: bloco.id, area_id: bloco.area_id, dia: iso, ordem: lista.length })
  }

  return (
    <div className="todos-bloco">
      {lista.map((t) => (
        <div key={t.id} className={`todo ${t.feita ? 'feita' : ''}`}>
          <label className="todo-check">
            <input type="checkbox" checked={t.feita} onChange={() => alternarTarefa(salvar, t)} />
            <span>{t.titulo}</span>
          </label>
          <button type="button" className="btn-icone btn-mini" onClick={() => aoEditar(t)} aria-label={`Editar ${t.titulo}`}><Icone nome="editar" tamanho={15} /></button>
        </div>
      ))}
      {abrindo ? (
        <form className="todo-novo" onSubmit={adicionar}>
          <input type="text" value={texto} maxLength={160} autoFocus placeholder={`O que fazer em ${bloco.titulo}?`}
            onChange={(e) => setTexto(e.target.value)} onBlur={() => { if (!texto.trim()) setAbrindo(false) }} aria-label={`Novo to-do em ${bloco.titulo}`} />
          <button type="submit" className="btn btn-primario btn-peq" disabled={!texto.trim()}>Pôr</button>
        </form>
      ) : (
        <button type="button" className="btn-texto btn-todo" onClick={() => setAbrindo(true)}>+ to-do</button>
      )}
    </div>
  )
}
