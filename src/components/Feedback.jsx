import { useState } from 'react'
import { dataCurta } from '../lib/util.js'
import { Icone, Modal } from './ui.jsx'

const fmtNota = (n) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
const corNota = (n) => (n >= 8 ? 'nota-boa' : n >= 6 ? 'nota-media' : 'nota-baixa')

// Nota e feedback do Claude numa atividade (ex.: depois de corrigir uma lista)
export function TextoFeedback({ t }) {
  return (
    <div className="feedback">
      <div className="feedback-nota">
        <span className={`nota ${corNota(t.feedback_nota)}`}>{fmtNota(t.feedback_nota)}</span>
        <span className="suave">nota do Claude{t.feedback_em ? ` · ${dataCurta(new Date(t.feedback_em))}` : ''}</span>
      </div>
      {t.feedback_bem && <div className="caixa caixa-dica"><strong>O que você estudou bem</strong><span className="texto-livre">{t.feedback_bem}</span></div>}
      {t.feedback_mal && <div className="caixa caixa-atencao"><strong>O que precisa reforçar</strong><span className="texto-livre">{t.feedback_mal}</span></div>}
    </div>
  )
}

export default function Feedback({ tarefa: t }) {
  const [aberto, setAberto] = useState(false)
  if (t.feedback_nota == null) return null
  return (
    <>
      <button type="button" className={`selo-nota ${corNota(t.feedback_nota)}`} onClick={() => setAberto(true)} aria-label={`Nota ${fmtNota(t.feedback_nota)}: ver o feedback`}>
        <Icone nome="estrela" tamanho={14} />Nota {fmtNota(t.feedback_nota)}
      </button>
      {aberto && (
        <Modal titulo={`Feedback: ${t.titulo}`} aoFechar={() => setAberto(false)}>
          <TextoFeedback t={t} />
        </Modal>
      )}
    </>
  )
}
