import { usePath } from './lib/router.jsx'
import { SessaoProvider, useSessao } from './lib/sessao.jsx'
import { Carregando, ToastProvider } from './components/ui.jsx'
import Entrar, { NovaSenha } from './pages/Entrar.jsx'
import Shell from './pages/Shell.jsx'

export default function App() {
  return (
    <ToastProvider>
      <SessaoProvider>
        <Area />
      </SessaoProvider>
    </ToastProvider>
  )
}

function Area() {
  const path = usePath()
  const { session, recuperando, trocarSenha } = useSessao()
  if (session === undefined) return <Carregando tela />
  if (!session) return <Entrar />
  if (recuperando) return <NovaSenha />
  if (trocarSenha) return <NovaSenha primeiroAcesso />
  return <Shell path={path} />
}
