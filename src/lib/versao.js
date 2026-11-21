// Abas deixadas abertas continuam com a versão antiga do app até recarregar.
// Aqui a página confere de tempos em tempos se saiu versão nova e se atualiza sozinha.
export function vigiarVersao() {
  const atual = document.querySelector('script[type="module"][src]')?.getAttribute('src')
  if (!atual) return
  let avisado = false

  async function checar() {
    if (avisado) return
    try {
      const r = await fetch(`/?versao=${Date.now()}`, { cache: 'no-store' })
      const html = await r.text()
      const m = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/) || html.match(/<script[^>]*src="([^"]+)"[^>]*type="module"/)
      if (m && m[1] !== atual) mostrarAviso()
    } catch {
      /* sem internet: tenta depois */
    }
  }

  // Sem aviso na tela: quando sai versão nova, o app se atualiza sozinho num momento seguro
  // (ao trocar de tela ou ao sair do app), para não perder nada que esteja digitando.
  function mostrarAviso() {
    avisado = true
    if (window.location.pathname.startsWith('/entrar')) return window.location.reload()
    const recarregar = () => window.location.reload()
    window.addEventListener('rota', recarregar, { once: true })
    window.addEventListener('popstate', recarregar, { once: true })
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') recarregar() })
  }

  setInterval(checar, 3 * 60 * 1000)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checar() })
  setTimeout(checar, 5000)
}
