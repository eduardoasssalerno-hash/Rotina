// Worker do 3S Rotina no Cloudflare.
// Serve o app normalmente, mas os arquivos de /arquivos/ (PDFs de estudo) só saem
// para quem mandar um login válido do Supabase. Usa só a chave pública (publishable).
const SUPABASE_URL = 'https://faachjuysscpxxzmveeg.supabase.co'
const SUPABASE_KEY = 'sb_publishable_tlspc3ka6eMKKcUi-kjoFg_OvBBQBr2'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/arquivos/')) return env.ASSETS.fetch(request)

    const auth = request.headers.get('Authorization') || ''
    if (!/^Bearer [A-Za-z0-9._-]+$/.test(auth)) return new Response('Entre no app para abrir este arquivo.', { status: 401 })
    const conferir = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SUPABASE_KEY } })
    if (!conferir.ok) return new Response('Login expirado. Entre de novo no app.', { status: 401 })

    const arquivo = await env.ASSETS.fetch(new Request(url.origin + url.pathname))
    if (!arquivo.ok || !(arquivo.headers.get('Content-Type') || '').includes('pdf')) {
      return new Response('Arquivo não encontrado.', { status: 404 })
    }
    const cab = new Headers(arquivo.headers)
    cab.set('Cache-Control', 'private, no-store')
    cab.set('X-Robots-Tag', 'noindex')
    return new Response(arquivo.body, { status: 200, headers: cab })
  },
}
