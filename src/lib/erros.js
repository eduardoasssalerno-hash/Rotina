import { supabase } from './supabase.js'

// Registra problemas que acontecem no app, para o Claude ver e corrigir.
// Nunca atrapalha o uso: qualquer falha aqui é ignorada.
let ultimo = ''
export async function registrarErro(mensagem, detalhe = '') {
  try {
    const msg = String(mensagem || '').slice(0, 500)
    if (!msg || msg === ultimo) return
    ultimo = msg
    const { data } = await supabase.auth.getSession()
    if (!data?.session) return
    await supabase.from('erros').insert({
      rota: window.location.pathname.slice(0, 200),
      mensagem: msg,
      detalhe: String(detalhe || '').slice(0, 2000),
      navegador: navigator.userAgent.slice(0, 300),
    })
  } catch {
    /* ignora */
  }
}

export function vigiarErros() {
  window.addEventListener('error', (e) => {
    if (!e.message) return
    registrarErro(e.message, `${e.filename || ''}:${e.lineno || ''}:${e.colno || ''}\n${e.error?.stack || ''}`)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    registrarErro(r?.message || String(r), r?.stack || '')
  })
}
