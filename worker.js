// Worker do 3S Rotina no Cloudflare.
// Serve o app normalmente, mas os arquivos de /arquivos/ (PDFs de estudo e as páginas da prévia)
// só saem para quem mandar um login válido do Supabase. Usa só a chave pública (publishable).
const SUPABASE_URL = 'https://faachjuysscpxxzmveeg.supabase.co'
const SUPABASE_KEY = 'sb_publishable_tlspc3ka6eMKKcUi-kjoFg_OvBBQBr2'
const TIPOS = /pdf|image\/jpeg/

// Logins já conferidos (por alguns minutos), para a prévia de várias páginas não consultar o Supabase a cada imagem
const conferidos = new Map()

async function loginValido(auth) {
  const agora = Date.now()
  const visto = conferidos.get(auth)
  if (visto && visto > agora) return true
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SUPABASE_KEY } })
  if (!r.ok) return false
  if (conferidos.size > 200) conferidos.clear()
  conferidos.set(auth, agora + 5 * 60 * 1000)
  return true
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/arquivos/')) return env.ASSETS.fetch(request)

    const auth = request.headers.get('Authorization') || ''
    if (!/^Bearer [A-Za-z0-9._-]+$/.test(auth)) return new Response('Entre no app para abrir este arquivo.', { status: 401 })
    if (!(await loginValido(auth))) return new Response('Login expirado. Entre de novo no app.', { status: 401 })

    const arquivo = await env.ASSETS.fetch(new Request(url.origin + url.pathname))
    if (!arquivo.ok || !TIPOS.test(arquivo.headers.get('Content-Type') || '')) {
      return new Response('Arquivo não encontrado.', { status: 404 })
    }
    const cab = new Headers(arquivo.headers)
    cab.set('Cache-Control', 'private, max-age=600')
    cab.set('X-Robots-Tag', 'noindex')
    return new Response(arquivo.body, { status: 200, headers: cab })
  },
}
