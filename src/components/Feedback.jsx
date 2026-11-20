import { useState } from 'react'
import { dataCurta } from '../lib/util.js'
import { Icone, Modal } from './ui.jsx'
import Anexos from './Anexos.jsx'

const fmtNota = (n) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
export const corNota = (n) => (n >= 8 ? 'nota-boa' : n >= 6 ? 'nota-media' : 'nota-baixa')

// Correção do Claude numa atividade: nota de 1 a 10, nota de português à parte e o PDF da correção
export function TextoFeedback({ t }) {
  return (
    <div className="feedback">
      <div className="feedback-notas">
        <div className="feedback-nota">
          <span className={`nota ${corNota(t.feedback_nota)}`}>{fmtNota(t.feedback_nota)}</span>
          <span className="suave">nota da atividade{t.feedback_em ? ` · ${dataCurta(new Date(t.feedback_em))}` : ''}</span>
        </div>
        {t.feedback_nota_pt != null && (
          <div className="feedback-nota">
            <span className={`nota nota-pt ${corNota(t.feedback_nota_pt)}`}>{fmtNota(t.feedback_nota_pt)}</span>
            <span className="suave">português<br />(não entra na nota da atividade)</span>
          </div>
        )}
      </div>
      {t.feedback_bem && <div className="caixa caixa-dica"><strong>O que você estudou bem</strong><span className="texto-livre">{t.feedback_bem}</span></div>}
      {t.feedback_mal && <div className="caixa caixa-atencao"><strong>O que precisa reforçar</strong><span className="texto-livre">{t.feedback_mal}</span></div>}
      <Anexos tarefaId={t.id} tipo="correcao" />
    </div>
  )
}

export default function Feedback({ tarefa: t }) {
  const [aberto, setAberto] = useState(false)
  if (t.feedback_nota == null) return null
  return (
    <>
      <button type="button" className={`selo-nota ${corNota(t.feedback_nota)}`} onClick={() => setAberto(true)}
        aria-label={`Nota ${fmtNota(t.feedback_nota)}${t.feedback_nota_pt != null ? `, português ${fmtNota(t.feedback_nota_pt)}` : ''}: ver a correção`}>
        <Icone nome="estrela" tamanho={14} />Nota {fmtNota(t.feedback_nota)}{t.feedback_nota_pt != null ? ` · Port. ${fmtNota(t.feedback_nota_pt)}` : ''}
      </button>
      {aberto && (
        <Modal titulo={`Correção: ${t.titulo}`} aoFechar={() => setAberto(false)}>
          <TextoFeedback t={t} />
        </Modal>
      )}
    </>
  )
}
