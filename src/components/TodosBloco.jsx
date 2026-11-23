import { useEffect, useRef, useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { todosDoBloco } from '../lib/agenda.js'
import { alternarTarefa } from './LinhaTarefa.jsx'
import { Icone } from './ui.jsx'

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
  const campo = useRef(null)
  const lista = todosDoBloco(d, bloco.id, iso)
  useEffect(() => { if (abrindo) campo.current?.focus() }, [abrindo])

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
          <input ref={campo} type="text" value={texto} maxLength={160} placeholder={`O que fazer em ${bloco.titulo}?`}
            onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') fechar() }}
            onBlur={() => { if (!texto.trim()) setTimeout(fechar, 150) }} aria-label={`Novo to-do em ${bloco.titulo}`} enterKeyHint="done" />
          <button type="submit" className="btn btn-primario btn-peq" disabled={!texto.trim()}>Pôr</button>
        </form>
      ) : (
        <button type="button" className="btn-texto btn-todo" onClick={abrir}>+ to-do</button>
      )}
    </div>
  )
}
