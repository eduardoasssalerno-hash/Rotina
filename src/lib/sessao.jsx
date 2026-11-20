import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const Ctx = createContext(null)

export function SessaoProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = carregando
  const [recuperando, setRecuperando] = useState(false)

  useEffect(() => {
    let ativo = true
    supabase.auth.getSession().then(({ data }) => { if (ativo) setSession(data.session) })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      setSession(s)
    })
    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    nome: session?.user?.user_metadata?.nome || 'Ione',
    // conta criada com senha provisória: precisa criar a própria senha
    trocarSenha: session?.user?.user_metadata?.trocar_senha === true,
    recuperando,
    fimRecuperacao: () => setRecuperando(false),
    // scope local: sai só desta aba
    sair: async () => { await supabase.auth.signOut({ scope: 'local' }) },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useSessao = () => useContext(Ctx)
