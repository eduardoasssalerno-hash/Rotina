import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useSessao } from '../lib/sessao.jsx'
import { msgErro } from '../lib/util.js'
import { Botao, Erro, Field, Logo, useToast } from '../components/ui.jsx'

function Marca() {
  return (
    <div className="marca">
      <Logo tamanho={34} />
      <strong>3S Rotina</strong>
    </div>
  )
}

// Só a Ione tem conta: não existe "criar conta" aqui
export default function Entrar() {
  const [modo, setModo] = useState('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setAviso('')
    setCarregando(true)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
        if (error) throw error
        setAviso('Se esse e-mail tiver conta, chega um link para criar uma nova senha.')
      }
    } catch (e2) {
      setErro(msgErro(e2))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="entrada">
      <Marca />
      <div>
        <h1>{modo === 'entrar' ? 'Entrar' : 'Recuperar senha'}</h1>
        <p className="suave">Seu dia, sua semana, seus estudos e seu treino em um lugar só.</p>
      </div>
      {aviso && <div className="info">{aviso}</div>}
      <form className="form" onSubmit={enviar}>
        <Field label="E-mail">
          <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {modo === 'entrar' && (
          <Field label="Senha">
            <input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} required />
          </Field>
        )}
        <Erro>{erro}</Erro>
        <Botao type="submit" carregando={carregando} className="btn btn-primario btn-bloco">
          {modo === 'entrar' ? 'Entrar' : 'Enviar link'}
        </Botao>
      </form>
      <button type="button" className="btn-texto" onClick={() => { setModo(modo === 'entrar' ? 'esqueci' : 'entrar'); setErro(''); setAviso('') }}>
        {modo === 'entrar' ? 'Esqueci minha senha' : 'Voltar para entrar'}
      </button>
    </main>
  )
}

export function NovaSenha({ primeiroAcesso = false }) {
  const { fimRecuperacao, sair, nome } = useSessao()
  const toast = useToast()
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    if (senha !== confirma) return setErro('As duas senhas estão diferentes.')
    setCarregando(true)
    const { error } = await supabase.auth.updateUser({ password: senha, data: { trocar_senha: false } })
    setCarregando(false)
    if (error) return setErro(msgErro(error))
    toast(primeiroAcesso ? 'Pronto! Sua senha foi criada.' : 'Senha atualizada')
    fimRecuperacao()
  }

  return (
    <main className="entrada">
      <Marca />
      <h1>{primeiroAcesso ? `Olá${nome ? `, ${nome.split(' ')[0]}` : ''}!` : 'Criar nova senha'}</h1>
      {primeiroAcesso && <p className="suave">Você entrou com uma senha provisória. Crie agora a sua senha para continuar.</p>}
      <form className="form" onSubmit={salvar}>
        <Field label="Nova senha" hint="Mínimo de 6 caracteres">
          <input type="password" autoComplete="new-password" value={senha} minLength={6} required onChange={(e) => setSenha(e.target.value)} />
        </Field>
        <Field label="Repita a nova senha">
          <input type="password" autoComplete="new-password" value={confirma} minLength={6} required onChange={(e) => setConfirma(e.target.value)} />
        </Field>
        <Erro>{erro}</Erro>
        <Botao type="submit" carregando={carregando} className="btn btn-primario btn-bloco">
          {primeiroAcesso ? 'Criar minha senha' : 'Salvar nova senha'}
        </Botao>
        {primeiroAcesso && <button type="button" className="btn-texto" onClick={sair}>Sair</button>}
      </form>
    </main>
  )
}
