// Tema claro ou escuro, guardado neste aparelho
const CHAVE = '3s-rotina-tema'
export function temaAtual() {
  try { return localStorage.getItem(CHAVE) || 'claro' } catch { return 'claro' }
}
export function aplicarTema(t = temaAtual()) {
  document.documentElement.dataset.tema = t
  document.documentElement.style.colorScheme = t === 'escuro' ? 'dark' : 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', t === 'escuro' ? '#0D1117' : '#0A2240')
}
export function trocarTema(t) {
  try { localStorage.setItem(CHAVE, t) } catch { /* sem armazenamento */ }
  aplicarTema(t)
}
