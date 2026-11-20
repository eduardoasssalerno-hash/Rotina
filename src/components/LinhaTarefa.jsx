import { useDados } from '../lib/dados.jsx'
import { infoArea } from '../lib/agenda.js'
import { dataCurta, deIso, duracao, fmtHora } from '../lib/util.js'
import { Bandeira, Icone } from './ui.jsx'
import Anexos from './Anexos.jsx'
import Feedback from './Feedback.jsx'

export function alternarTarefa(salvar, t) {
  return salvar('tarefas', { id: t.id, feita: !t.feita, feita_em: t.feita ? null : new Date().toISOString() })
}

// Uma tarefa com caixinha de feito, faixa da cor da área e bandeira de prioridade
export default function LinhaTarefa({ tarefa: t, aoEditar, mostrarDia = false, mostrarProjeto = true }) {
  const { d, salvar } = useDados()
  const p = t.projeto_id ? d.projetos.find((x) => x.id === t.projeto_id) : null
  const a = infoArea(d, t.area_id || p?.area_id)
  const bloco = t.bloco_id ? d.blocos_fixos.find((b) => b.id === t.bloco_id) : null
  const detalhes = [
    mostrarProjeto && p ? p.nome : bloco ? `durante ${bloco.titulo}` : !p && t.area_id ? a.nome : null,
    mostrarDia && t.dia ? dataCurta(deIso(t.dia)) : null,
    t.inicio ? fmtHora(t.inicio) : null,
    t.minutos ? (t.minutos_real ? `previsto ${duracao(t.minutos)}` : duracao(t.minutos)) : null,
    t.minutos_real ? `levou ${duracao(t.minutos_real)}` : null,
  ].filter(Boolean)
  return (
    <div className={`linha-tarefa ${t.feita ? 'feita' : ''}`}>
      <span className="faixa" style={{ background: a.cor }} aria-hidden="true" />
      <label className="check">
        <input type="checkbox" checked={t.feita} onChange={() => alternarTarefa(salvar, t)} />
        <span className="check-texto">
          <span className="titulo-tarefa">{t.titulo}</span>
          {detalhes.length > 0 && <span className="suave">{detalhes.join(' · ')}</span>}
        </span>
      </label>
      <span className="linha-extras"><Feedback tarefa={t} /><Anexos tarefaId={t.id} /></span>
      <Bandeira nivel={t.prioridade} />
      {aoEditar && (
        <button type="button" className="btn-icone" onClick={() => aoEditar(t)} aria-label={`Editar ${t.titulo}`}>
          <Icone nome="editar" tamanho={18} />
        </button>
      )}
    </div>
  )
}
