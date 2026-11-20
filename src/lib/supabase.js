import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'

// Cada aba tem o seu próprio login: entrar ou sair numa aba não muda as outras.
// A sessão fica guardada só na aba (sessionStorage) com um nome próprio, para
// que as abas também não avisem umas às outras quando alguém entra ou sai.
const novoId = () => Math.random().toString(36).slice(2, 10)
let aba = null
try {
  aba = window.sessionStorage.getItem('sessao-aba')
  if (!aba) {
    aba = novoId()
    window.sessionStorage.setItem('sessao-aba', aba)
  }
  // Login antigo, de antes das abas separadas: apaga para não confundir
  for (const k of Object.keys(window.localStorage)) {
    if (/^sb-.*-auth-token$/.test(k)) window.localStorage.removeItem(k)
  }
} catch {
  aba = null
}

// Aba duplicada (ou aberta a partir de outra) chega com uma cópia da sessão da
// aba de origem. Se outra aba aberta já usa o mesmo código, esta ganha um código
// novo e recarrega, começando na tela de entrar.
if (aba && typeof BroadcastChannel !== 'undefined') {
  try {
    const canal = new BroadcastChannel('3s-rotina-abas')
    const inst = novoId()
    const desde = Date.now()
    let trocou = false
    canal.onmessage = (e) => {
      const m = e.data || {}
      if (m.id !== aba || m.inst === inst) return
      if (m.tipo === 'quem') canal.postMessage({ tipo: 'meu', id: aba, inst, desde })
      else if (m.tipo === 'meu' && !trocou && m.desde < desde) {
        trocou = true
        window.sessionStorage.setItem('sessao-aba', novoId())
        window.location.reload()
      }
    }
    canal.postMessage({ tipo: 'quem', id: aba, inst, desde })
  } catch {
    /* navegador sem suporte: segue normal */
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
    ...(aba ? { storage: window.sessionStorage, storageKey: `sb-aba-${aba}` } : {}),
  },
})

// Executa uma consulta e devolve os dados (ou lança o erro)
export async function dados(consulta) {
  const { data, error } = await consulta
  if (error) throw error
  return data
}

// Executa uma contagem (select com { count: 'exact', head: true })
export async function contar(consulta) {
  const { count, error } = await consulta
  if (error) throw error
  return count ?? 0
}
