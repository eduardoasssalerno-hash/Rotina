import { PLANETAS } from '../lib/desenhos.js'
import { FASES } from '../lib/planetas.js'

// Desenho do planeta em cada fase. Sem atividade há 7 dias, perde o brilho.
export default function Planeta({ fase = 1, tamanho = 120, apagado = false, rotulo }) {
  const f = Math.max(1, Math.min(5, fase))
  return (
    <div className={`planeta ${apagado ? 'apagado' : ''}`} style={{ width: tamanho, height: tamanho }}
      role="img" aria-label={rotulo || `Planeta na fase ${FASES[f]}${apagado ? ', sem brilho' : ''}`}
      dangerouslySetInnerHTML={{ __html: PLANETAS[f - 1] }} />
  )
}
