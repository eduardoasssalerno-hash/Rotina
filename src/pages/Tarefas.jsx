import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { addDias, dataLonga, deIso, hoje, isoDia } from '../lib/util.js'
import { Icone, Segmentos, Vazio } from '../components/ui.jsx'
import EditorTarefa from '../components/EditorTarefa.jsx'
import LinhaTarefa from '../components/LinhaTarefa.jsx'
import { Cabecalho } from './Shell.jsx'

const FILTROS = [
  { v: 'proximas', label: 'Próximos dias' },
  { v: 'sem-dia', label: 'Sem dia' },
  { v: 'atrasadas', label: 'Atrasadas' },
  { v: 'feitas', label: 'Feitas' },
]

export default function Tarefas() {
  const { d } = useDados()
  const [filtro, setFiltro] = useState('proximas')
  const [editando, setEditando] = useState(null)
  const iso = isoDia(hoje())
  const limite = isoDia(addDias(hoje(), 13))

  let lista = d.tarefas
  if (filtro === 'proximas') lista = lista.filter((t) => !t.feita && t.dia && t.dia >= iso && t.dia <= limite)
  if (filtro === 'sem-dia') lista = lista.filter((t) => !t.feita && !t.dia)
  if (filtro === 'atrasadas') lista = lista.filter((t) => !t.feita && t.dia && t.dia < iso)
  if (filtro === 'feitas') lista = lista.filter((t) => t.feita).sort((a, b) => String(b.feita_em).localeCompare(String(a.feita_em))).slice(0, 60)
  else lista = [...lista].sort((a, b) => (a.dia || '').localeCompare(b.dia || '') || String(a.inicio || '99').localeCompare(String(b.inicio || '99')) || b.prioridade - a.prioridade)

  // agrupa por dia
  const grupos = []
  for (const t of lista) {
    const chave = filtro === 'feitas' ? String(t.feita_em || '').slice(0, 10) : t.dia || ''
    const g = grupos[grupos.length - 1]
    if (g && g.chave === chave) g.itens.push(t)
    else grupos.push({ chave, itens: [t] })
  }
  const nomeGrupo = (k) => {
    if (!k) return 'Sem dia marcado'
    if (k === iso) return 'Hoje'
    if (k === isoDia(addDias(hoje(), 1))) return 'Amanhã'
    return dataLonga(deIso(k))
  }

  return (
    <div className="tela">
      <Cabecalho titulo="Tarefas" sub="Bandeira = prioridade · faixa = cor da área">
        <button type="button" className="btn btn-primario" onClick={() => setEditando({})}><Icone nome="mais" tamanho={20} />Tarefa</button>
      </Cabecalho>
      <div className="rolagem-x"><Segmentos label="Filtrar tarefas" value={filtro} onChange={setFiltro} options={FILTROS} /></div>
      {grupos.length === 0 && <div className="cartao"><Vazio>Nada por aqui.</Vazio></div>}
      <div className="grupos">
        {grupos.map((g) => (
          <section key={g.chave || 'sem'} className="cartao">
            <div className="cab-cartao"><h2>{nomeGrupo(g.chave)} <span className="suave">· {g.itens.length}</span></h2></div>
            {g.itens.map((t) => <LinhaTarefa key={t.id} tarefa={t} aoEditar={setEditando} />)}
          </section>
        ))}
      </div>
      {editando && <EditorTarefa tarefa={editando.id ? editando : null} padrao={filtro === 'sem-dia' ? {} : { dia: iso }} aoFechar={() => setEditando(null)} />}
    </div>
  )
}
