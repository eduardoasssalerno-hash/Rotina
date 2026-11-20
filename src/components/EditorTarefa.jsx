import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { fmtHora } from '../lib/util.js'
import { Botao, Field, Icone, Modal, Segmentos } from './ui.jsx'

const PRIORIDADES = [
  { v: 0, label: 'Nenhuma' }, { v: 1, label: 'Baixa' }, { v: 2, label: 'Média' }, { v: 3, label: 'Alta' },
]

// Criar ou alterar uma tarefa (solta ou etapa de um planeta)
export default function EditorTarefa({ tarefa, padrao = {}, aoFechar }) {
  const { d, salvar, apagar } = useDados()
  const inicial = tarefa || { titulo: '', projeto_id: null, area_id: null, dia: null, inicio: null, minutos: null, prioridade: 0, observacao: '', ...padrao }
  const [t, setT] = useState({ ...inicial, inicio: fmtHora(inicial.inicio) || '' })
  const [salvando, setSalvando] = useState(false)
  const muda = (campos) => setT((x) => ({ ...x, ...campos }))
  const projetos = d.projetos.filter((p) => !p.arquivado && p.tipo === 'geral')

  async function enviar(e) {
    e.preventDefault()
    if (!t.titulo.trim()) return
    setSalvando(true)
    const linha = {
      ...(tarefa ? { id: tarefa.id } : {}),
      titulo: t.titulo.trim(),
      projeto_id: t.projeto_id || null,
      area_id: t.projeto_id ? null : t.area_id || null,
      dia: t.dia || null,
      inicio: t.dia && t.inicio ? t.inicio : null,
      minutos: Number(t.minutos) > 0 ? Math.min(720, Math.round(Number(t.minutos))) : null,
      prioridade: t.prioridade,
      observacao: t.observacao?.trim() || null,
    }
    const ok = await salvar('tarefas', linha)
    setSalvando(false)
    if (ok) aoFechar()
  }

  async function excluir() {
    if (!window.confirm('Apagar esta tarefa?')) return
    await apagar('tarefas', tarefa)
    aoFechar()
  }

  return (
    <Modal titulo={tarefa ? 'Editar tarefa' : 'Nova tarefa'} aoFechar={aoFechar}
      rodape={
        <>
          {tarefa && <button type="button" className="btn btn-perigo" onClick={excluir}><Icone nome="lixo" tamanho={18} />Apagar</button>}
          <div className="espaco" />
          <button type="button" className="btn btn-sec" onClick={aoFechar}>Cancelar</button>
          <Botao type="submit" form="form-tarefa" carregando={salvando}>Salvar</Botao>
        </>
      }>
      <form id="form-tarefa" className="form" onSubmit={enviar}>
        <Field label="O que fazer">
          <input type="text" value={t.titulo} maxLength={160} required autoFocus onChange={(e) => muda({ titulo: e.target.value })} />
        </Field>
        <div className="grade-2">
          <Field label="Planeta (projeto ou matéria)">
            <select value={t.projeto_id || ''} onChange={(e) => muda({ projeto_id: e.target.value || null })}>
              <option value="">Nenhum (tarefa solta)</option>
              {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>
          {!t.projeto_id && (
            <Field label="Área">
              <select value={t.area_id || ''} onChange={(e) => muda({ area_id: e.target.value || null })}>
                <option value="">Sem área</option>
                {d.areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </Field>
          )}
        </div>
        <div className="grade-3">
          <Field label="Dia">
            <input type="date" value={t.dia || ''} onChange={(e) => muda({ dia: e.target.value || null })} />
          </Field>
          <Field label="Começa às" hint={!t.dia ? 'Escolha o dia antes' : null}>
            <input type="time" value={t.inicio} disabled={!t.dia} onChange={(e) => muda({ inicio: e.target.value })} />
          </Field>
          <Field label="Tempo (minutos)">
            <input type="number" inputMode="numeric" min={1} max={720} value={t.minutos ?? ''} onChange={(e) => muda({ minutos: e.target.value })} />
          </Field>
        </div>
        <div className="campo">
          <span className="campo-rotulo">Prioridade</span>
          <Segmentos label="Prioridade" value={t.prioridade} onChange={(v) => muda({ prioridade: v })} options={PRIORIDADES} />
        </div>
        <Field label="Observação">
          <textarea rows={2} maxLength={1000} value={t.observacao || ''} onChange={(e) => muda({ observacao: e.target.value })} />
        </Field>
      </form>
    </Modal>
  )
}
