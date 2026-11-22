import { EXERCICIOS } from '../lib/desenhos.js'

// Desenho animado de cada exercício do treino
export default function Exercicio({ desenho = 'joelho', largura = 150, nome }) {
  return (
    <div className="desenho-ex" style={{ width: largura, height: Math.round(largura * 2 / 3) }}
      role="img" aria-label={`Desenho animado: ${nome || 'exercício'}`}
      dangerouslySetInnerHTML={{ __html: EXERCICIOS[desenho] || EXERCICIOS.halter }} />
  )
}
