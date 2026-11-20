import { Link } from '../lib/router.jsx'
import { Icone } from '../components/ui.jsx'
import { Cabecalho } from './Shell.jsx'

const ITENS = [
  { to: '/tarefas', nome: 'Tarefas', desc: 'Todas as tarefas, com prioridade e área', icone: 'tarefas' },
  { to: '/relatorios', nome: 'Relatórios', desc: 'Mapa de calor, concluídos por dia, áreas e tempo real', icone: 'grafico' },
  { to: '/ajustes', nome: 'Ajustes', desc: 'Tema, cores das áreas e conta', icone: 'ajustes' },
]

export default function Mais() {
  return (
    <div className="tela">
      <Cabecalho titulo="Mais" />
      <nav className="cartao lista-mais" aria-label="Mais telas">
        {ITENS.map((i) => (
          <Link key={i.to} to={i.to}>
            <span className="mais-icone"><Icone nome={i.icone} /></span>
            <span className="mais-textos"><strong>{i.nome}</strong><span className="suave">{i.desc}</span></span>
            <Icone nome="avancar" tamanho={18} />
          </Link>
        ))}
      </nav>
    </div>
  )
}
