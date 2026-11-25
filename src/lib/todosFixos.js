// To-dos diários de um bloco fixo: na hora de mostrar um dia (de hoje em diante), cria as tarefas que faltam.
import { useEffect, useRef } from 'react'
import { fixosDoDia } from './agenda.js'
import { hoje, isoDia } from './util.js'

export function useTodosFixos({ d, salvar }, data) {
  const criando = useRef(new Set()) // evita criar duas vezes enquanto o banco responde
  const iso = isoDia(data)
  useEffect(() => {
    if (!d.todos_fixos?.length || iso < isoDia(hoje())) return
    const blocos = new Set(fixosDoDia(d, data).map((b) => b.id))
    const faltam = d.todos_fixos.filter((f) => f.ativo && blocos.has(f.bloco_id) && f.desde <= iso &&
      !d.tarefas.some((t) => t.todo_fixo_id === f.id && t.dia === iso) && !criando.current.has(`${f.id}${iso}`))
    if (!faltam.length) return
    // reserva todos antes de começar: o efeito roda de novo a cada tarefa criada
    for (const f of faltam) criando.current.add(`${f.id}${iso}`)
    ;(async () => {
      for (const f of [...faltam].sort((a, b) => a.ordem - b.ordem)) {
        const bloco = d.blocos_fixos.find((b) => b.id === f.bloco_id)
        const t = await salvar('tarefas', { titulo: f.titulo, bloco_id: f.bloco_id, area_id: bloco?.area_id || null, dia: iso, ordem: f.ordem, todo_fixo_id: f.id })
        const modelo = t && f.modelo_id ? d.modelos_todo.find((m) => m.id === f.modelo_id) : null
        if (modelo) for (let i = 0; i < modelo.etapas.length; i++) await salvar('subtarefas', { tarefa_id: t.id, titulo: modelo.etapas[i], ordem: i })
      }
    })()
  }, [iso, d.todos_fixos, d.tarefas]) // eslint-disable-line react-hooks/exhaustive-deps
}
