// Abas deixadas abertas continuam com a versão antiga do app até recarregar.
// Aqui a página confere de tempos em tempos se saiu versão nova e oferece atualizar.
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

  function mostrarAviso() {
    avisado = true
    // Na tela de entrar não há nada para perder: atualiza direto
    if (window.location.pathname.startsWith('/entrar')) return window.location.reload()
    const faixa = document.createElement('div')
    faixa.setAttribute('role', 'status')
    faixa.className = 'aviso-versao'
    faixa.innerHTML = '<span>Saiu uma versão nova do app.</span>'
    const botao = document.createElement('button')
    botao.type = 'button'
    botao.textContent = 'Atualizar agora'
    botao.onclick = () => window.location.reload()
    faixa.appendChild(botao)
    document.body.appendChild(faixa)
  }

  setInterval(checar, 3 * 60 * 1000)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checar() })
  setTimeout(checar, 5000)
}
