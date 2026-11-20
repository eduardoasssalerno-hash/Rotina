import { Link } from '../lib/router.jsx'
import { Icone } from '../components/ui.jsx'
import { Cabecalho } from './Shell.jsx'

const ITENS = [
  { to: '/treino', nome: 'Treino', desc: 'Calistenia: séries, desenhos e feedback', icone: 'treino' },
  { to: '/foco', nome: 'Modo foco', desc: 'Cronômetro de 25, 50 ou 90 minutos', icone: 'relogio' },
  { to: '/habitos', nome: 'Hábitos', desc: 'Criar, editar e ver o histórico', icone: 'check' },
  { to: '/metas', nome: 'Metas', desc: 'Barras de progresso em contagem ou em R$', icone: 'bandeira' },
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
