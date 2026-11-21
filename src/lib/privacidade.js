// "Olhinho": esconde todos os valores em R$ (guardado neste aparelho)
const CHAVE = '3s-rotina-ocultar-valores'
let oculto = (() => { try { return localStorage.getItem(CHAVE) === '1' } catch { return false } })()
export const valoresOcultos = () => oculto
export function ocultarValores(v) {
  oculto = !!v
  try { localStorage.setItem(CHAVE, oculto ? '1' : '0') } catch { /* sem armazenamento */ }
}
