import { Link } from '../lib/router.jsx'
import { DadosProvider, useDados } from '../lib/dados.jsx'
import { Botao, Carregando, Erro, Icone, Logo, useToast } from '../components/ui.jsx'
import Hoje from './Hoje.jsx'
import Semana from './Semana.jsx'
import Planetas from './Planetas.jsx'
import Tarefas from './Tarefas.jsx'
import Treino from './Treino.jsx'
import Ajustes from './Ajustes.jsx'
import Relatorios from './Relatorios.jsx'
import Mais from './Mais.jsx'
import Foco from './Foco.jsx'
import Habitos from './Habitos.jsx'
import Metas from './Metas.jsx'
import Dinheiro from './Dinheiro.jsx'

export const MENU = [
  { to: '/', nome: 'Diário', icone: 'hoje' },
  { to: '/semana', nome: 'Semana e mês', icone: 'semana' },
  { to: '/planetas', nome: 'Planetas', icone: 'planetas' },
  { to: '/tarefas', nome: 'Tarefas', icone: 'tarefas' },
  { to: '/foco', nome: 'Modo foco', icone: 'relogio' },
  { to: '/habitos', nome: 'Hábitos', icone: 'check' },
  { to: '/metas', nome: 'Metas', icone: 'bandeira' },
  { to: '/treino', nome: 'Treino', icone: 'treino' },
  { to: '/dinheiro', nome: 'Dinheiro', icone: 'dinheiro' },
  { to: '/relatorios', nome: 'Relatórios', icone: 'grafico' },
]

// No celular cabem 5 abas: o resto fica em "Mais"
const ABAS = [
  { to: '/', nome: 'Diário', icone: 'hoje' },
  { to: '/semana', nome: 'Semana', icone: 'semana' },
  { to: '/planetas', nome: 'Planetas', icone: 'planetas' },
  { to: '/dinheiro', nome: 'Dinheiro', icone: 'dinheiro' },
  { to: '/mais', nome: 'Mais', icone: 'menu', inclui: ['/mais', '/tarefas', '/relatorios', '/ajustes', '/treino', '/foco', '/habitos', '/metas'] },
]

const TELAS = { '/': Hoje, '/semana': Semana, '/planetas': Planetas, '/tarefas': Tarefas, '/treino': Treino, '/ajustes': Ajustes, '/relatorios': Relatorios, '/mais': Mais, '/foco': Foco, '/habitos': Habitos, '/metas': Metas, '/dinheiro': Dinheiro }

export default function Shell({ path }) {
  const toast = useToast()
  return (
    <DadosProvider aoErro={(m) => toast(m, 'erro')}>
      <Estrutura path={path} />
    </DadosProvider>
  )
}

function Estrutura({ path }) {
  const { pronto, erro, carregar } = useDados()
  const Tela = TELAS[path] || Hoje
  const ativo = (to) => (to === '/' ? path === '/' || !TELAS[path] : path.startsWith(to))
  return (
    <div className="app">
      <nav className="lado" aria-label="Menu principal">
        <Link to="/" className="lado-marca"><Logo tamanho={26} /><span>3S Rotina</span></Link>
        {MENU.map((m) => (
          <Link key={m.to} to={m.to} className={ativo(m.to) ? 'ativo' : ''} aria-current={ativo(m.to) ? 'page' : undefined}>
            <Icone nome={m.icone} />{m.nome}
          </Link>
        ))}
        <div className="espaco" />
        <Link to="/ajustes" className={ativo('/ajustes') ? 'ativo' : ''} aria-current={ativo('/ajustes') ? 'page' : undefined}>
          <Icone nome="ajustes" />Ajustes
        </Link>
      </nav>

      <main className="principal">
        {erro && !pronto ? (
          <div className="cartao" style={{ maxWidth: 480 }}>
            <Erro>Não deu para carregar seus dados. {erro}</Erro>
            <Botao onClick={carregar}>Tentar de novo</Botao>
          </div>
        ) : pronto ? <Tela /> : <Carregando />}
      </main>

      <nav className="abas" aria-label="Menu principal">
        {ABAS.map((m) => {
          const sim = m.inclui ? m.inclui.some((r) => path.startsWith(r)) : ativo(m.to)
          return (
            <Link key={m.to} to={m.to} className={sim ? 'ativo' : ''} aria-current={sim ? 'page' : undefined}>
              <Icone nome={m.icone} />{m.nome}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

// Cabeçalho de cada tela (no celular mostra o botão de Ajustes)
export function Cabecalho({ titulo, sub, children }) {
  return (
    <header className="cab">
      <div className="cab-textos">
        <h1>{titulo}</h1>
        {sub && <div className="suave">{sub}</div>}
      </div>
      <div className="cab-acoes">
        {children}
        <Link to="/ajustes" className="btn-icone so-celular" aria-label="Ajustes"><Icone nome="ajustes" /></Link>
      </div>
    </header>
  )
}
