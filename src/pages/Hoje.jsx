import { useEffect, useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { useSessao } from '../lib/sessao.jsx'
import { Link } from '../lib/router.jsx'
import { folgaEm, itensDoDia, tarefasSemHora, todosDoBloco } from '../lib/agenda.js'
import { estadoPlaneta } from '../lib/planetas.js'
import { ehBlocoTreino, marcarTreino } from '../lib/treinoHabito.js'
import { addDias, dataCurta, dataLonga, deIso, difDias, hhmm, hoje, isoDia, saudacao } from '../lib/util.js'
import { Icone, Vazio } from '../components/ui.jsx'
import EditorTarefa from '../components/EditorTarefa.jsx'
import LinhaTarefa, { alternarTarefa } from '../components/LinhaTarefa.jsx'
import Habitos from '../components/Habitos.jsx'
import Planeta from '../components/Planeta.jsx'
import Anexos from '../components/Anexos.jsx'
import TodosBloco from '../components/TodosBloco.jsx'
import { useTodosFixos } from '../lib/todosFixos.js'
import Feedback from '../components/Feedback.jsx'
import { Cabecalho } from './Shell.jsx'

// Hora atual, atualizada a cada minuto (para destacar o que está acontecendo agora)
export function useAgora() {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60000)
    return () => clearInterval(t)
  }, [])
  return agora
}

export default function Hoje() {
  const dados = useDados()
  const { d, salvar, gravar, apagar } = dados
  const { nome } = useSessao()
  const agora = useAgora()
  // Diário: dá para voltar aos dias anteriores e também ver os próximos dias (até 1 ano)
  const [volta, setVolta] = useState(0) // 0 = hoje, 1 = ontem, -1 = amanhã ...
  const [todoAberto, setTodoAberto] = useState(null) // bloco com a caixa de to-do aberta
  const dia = addDias(hoje(), -volta)
  const iso = isoDia(dia)
  const ehHoje = volta === 0
  useTodosFixos(dados, dia) // to-dos diários dos blocos (ex.: Estágio)
  const limite = isoDia(addDias(hoje(), -399)) // os dados carregados vão até 400 dias atrás
  function irPara(valor) {
    if (!valor) return
    const n = difDias(hoje(), deIso(valor))
    setVolta(Math.min(399, Math.max(-365, n)))
  }
  const [editando, setEditando] = useState(null) // tarefa, ou {} para nova
  const folga = folgaEm(d, iso)
  const itens = itensDoDia(d, dia)
  const soltas = tarefasSemHora(d, dia)
  const atrasadas = !ehHoje ? [] : d.tarefas.filter((t) => !t.feita && t.dia && t.dia < iso).sort((a, b) => a.dia.localeCompare(b.dia))
  const feitos = itens.filter((i) => i.feito).length + soltas.filter((t) => t.feita).length
  const total = itens.length + soltas.length
  const h = agora.getHours() + agora.getMinutes() / 60

  function alternar(it) {
    if (it.tipo === 'tarefa') return alternarTarefa(salvar, it.tarefa)
    const linha = { bloco_id: it.bloco.id, dia: iso }
    // bloco Treino: o hábito Calistenia do dia acompanha
    if (ehBlocoTreino(it.bloco)) marcarTreino(dados, iso, !it.feito, { bloco: false })
    return it.feito ? apagar('blocos_feitos', linha) : gravar('blocos_feitos', linha)
  }

  return (
    <div className="tela">
      <Cabecalho titulo={ehHoje ? (nome ? `${saudacao(agora)}, ${nome.split(' ')[0]}` : saudacao(agora)) : 'Diário'} sub={ehHoje ? dataLonga(dia) : `${volta === 1 ? 'Ontem · ' : volta === -1 ? 'Amanhã · ' : ''}${dataLonga(dia)}`}>
        <button type="button" className="btn btn-primario" onClick={() => setEditando({})}><Icone nome="mais" tamanho={20} />Tarefa</button>
      </Cabecalho>
      <div className="navegar navegar-dia">
        <button type="button" className="btn-icone" onClick={() => setVolta((v) => Math.min(399, v + 1))} aria-label="Dia anterior"><Icone nome="voltar" /></button>
        <label className="dia-escolher">
          <strong>{ehHoje ? 'Hoje' : volta === 1 ? 'Ontem' : volta === -1 ? 'Amanhã' : dataCurta(dia)}</strong>
          <input type="date" value={iso} min={limite} max={isoDia(addDias(hoje(), 365))} aria-label="Escolher o dia" onChange={(e) => irPara(e.target.value)} />
        </label>
        <button type="button" className="btn-icone" onClick={() => setVolta((v) => Math.max(-365, v - 1))} aria-label="Próximo dia"><Icone nome="avancar" /></button>
        {!ehHoje && <button type="button" className="btn btn-sec btn-peq" onClick={() => setVolta(0)}>Hoje</button>}
      </div>
      {folga && <div className="info">{ehHoje ? 'Hoje é' : volta < 0 ? 'Vai ser' : 'Foi'} {folga.nome}: sem aula e sem estágio.</div>}

      <div className="grade-hoje">
        <div className="coluna">
          <section className="cartao">
            <div className="cab-cartao">
              <h2>Seu dia <span className="suave">· {feitos} de {total} feitos</span></h2>
              <Link to="/semana">Semana</Link>
            </div>
            {itens.length === 0 && <Vazio>{ehHoje ? 'Nada com horário hoje.' : 'Nada com horário neste dia.'}</Vazio>}
            {itens.map((it) => {
              const agoraAqui = ehHoje && h >= it.ini && h < it.fim
              const detalhe = it.tipo === 'tarefa'
                ? [it.projeto?.nome || it.area.nome, `até ${hhmm(it.fim)}`]
                : it.area.privada || it.titulo === it.area.nome ? [`até ${hhmm(it.fim)}`, 'fixo'] : [it.area.nome, `até ${hhmm(it.fim)}`, 'fixo']
              return (
                <div key={it.chave} className={`item-dia ${agoraAqui ? 'agora' : ''} ${it.feito ? 'feito' : ''}`}>
                  <span className="faixa" style={{ background: it.area.cor }} aria-hidden="true" />
                  <span className="hora">{hhmm(it.ini)}</span>
                  <div className="item-textos">
                    {it.tipo === 'tarefa'
                      ? <button type="button" className="link-titulo" onClick={() => setEditando(it.tarefa)}>{it.titulo}</button>
                      : !it.area.privada
                        ? <button type="button" className="link-titulo" aria-expanded={todoAberto === it.chave} onClick={() => setTodoAberto(todoAberto === it.chave ? null : it.chave)}>{it.titulo}</button>
                        : <strong>{it.titulo}</strong>}
                    <span className="suave">{detalhe.join(' · ')}{agoraAqui ? ' · agora' : ''}{(() => {
                      if (it.tipo !== 'fixo' || it.area.privada) return ''
                      const t = todosDoBloco(d, it.bloco.id, iso)
                      return t.length ? ` · ${t.filter((x) => x.feita).length}/${t.length} to-dos` : ''
                    })()}</span>
                    {it.tipo === 'tarefa' && <span className="linha-extras"><Feedback tarefa={it.tarefa} /><Anexos tarefaId={it.tarefa.id} /></span>}
                  </div>
                  <button type="button" className={`btn-feito ${it.feito ? 'sim' : ''}`} aria-pressed={it.feito} onClick={() => alternar(it)}>
                    {it.feito ? <><Icone nome="check" tamanho={16} />Feito</> : 'Feito'}
                  </button>
                  {it.tipo === 'fixo' && !it.area.privada && (
                    <div className="todos-linha">
                      <TodosBloco bloco={it.bloco} iso={iso} aoEditar={setEditando}
                        aberto={todoAberto === it.chave} aoAbrir={() => setTodoAberto(it.chave)} aoFechar={() => setTodoAberto((x) => (x === it.chave ? null : x))} />
                    </div>
                  )}
                </div>
              )
            })}
          </section>

          <section className="cartao">
            <div className="cab-cartao">
              <h2>{ehHoje ? 'Tarefas de hoje' : 'Tarefas do dia'} <span className="suave">· {soltas.filter((t) => t.feita).length} de {soltas.length}</span></h2>
              <Link to="/tarefas">Todas</Link>
            </div>
            {soltas.length === 0 && <Vazio>{ehHoje ? 'Sem tarefas soltas para hoje.' : 'Sem tarefas soltas neste dia.'}</Vazio>}
            {soltas.map((t) => <LinhaTarefa key={t.id} tarefa={t} aoEditar={setEditando} />)}
            {atrasadas.length > 0 && (
              <div className="atrasadas">
                <h3>Ficaram para trás</h3>
                {atrasadas.slice(0, 5).map((t) => (
                  <div key={t.id} className="atrasada">
                    <LinhaTarefa tarefa={t} aoEditar={setEditando} mostrarDia />
                    <button type="button" className="btn btn-sec btn-peq" onClick={() => salvar('tarefas', { id: t.id, dia: iso, inicio: null })}>Passar para hoje</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="coluna">
          <Habitos data={dia} />
          {ehHoje && <ProximoTreino />}
          {ehHoje && <Prazos />}
        </div>
      </div>
      {editando && <EditorTarefa tarefa={editando.id ? editando : null} padrao={{ dia: iso }} aoFechar={() => setEditando(null)} />}
    </div>
  )
}

function ProximoTreino() {
  const { d } = useDados()
  const blocos = d.blocos_fixos.filter((b) => b.ativo && /treino/i.test(b.titulo))
  // planos da aba Treino com dia e horário (calistenia, perna, preparo do salto...)
  const planos = (d.treino_planos || []).filter((p) => p.ativo && p.dias.length && p.inicio)
  if (!blocos.length && !planos.length) return null
  const iso = isoDia(hoje())
  const feitoHoje = d.treinos.some((t) => t.dia === iso && t.concluido)
  // próximo treino ainda não feito (hoje conta)
  let dia = null
  let bloco = null
  for (let i = 0; i < 9 && !dia; i++) {
    const x = addDias(hoje(), i)
    const xi = isoDia(x)
    if (planos.length) {
      // hoje: o treino que já passou há mais de 2 horas não conta mais
      const ag = new Date(Date.now() - 2 * 3600000)
      const limite = i === 0 && ag.getDate() === x.getDate() ? `${String(ag.getHours()).padStart(2, '0')}:${String(ag.getMinutes()).padStart(2, '0')}` : ''
      const p = planos.filter((y) => y.dias.includes(x.getDay()) && y.inicio.slice(0, 5) >= limite && !d.treinos.some((t) => t.dia === xi && t.plano_id === y.id && t.concluido))
        .sort((a, b) => a.inicio.localeCompare(b.inicio))[0]
      if (p) { dia = x; bloco = p }
    } else if (!(i === 0 && feitoHoje)) {
      const b = blocos.find((y) => y.dias.includes(x.getDay()))
      if (b) { dia = x; bloco = b }
    }
  }
  if (!dia) return null
  const quando = difDias(dia, hoje()) === 0 ? 'hoje' : difDias(dia, hoje()) === 1 ? 'amanhã' : dataCurta(dia)
  const pendente = d.treinos.filter((t) => t.concluido && !t.dor && t.dia < iso).sort((a, b) => b.dia.localeCompare(a.dia))[0]
  return (
    <section className="cartao cartao-link">
      <Link to="/treino">
        <div className="cab-cartao"><h2>Treino</h2><span className="link">Abrir</span></div>
        <p>{feitoHoje ? 'Treino de hoje concluído. ' : ''}Próximo: <strong>{quando}</strong>, às {bloco.inicio.slice(0, 5)}{bloco.nome ? ` · ${bloco.nome}` : ''}.</p>
        {pendente && <p className="aviso-peq">Falta o feedback do treino de {dataCurta(deIso(pendente.dia))}.</p>}
      </Link>
    </section>
  )
}

function Prazos() {
  const { d } = useDados()
  const iso = isoDia(hoje())
  const lista = d.projetos.filter((p) => !p.arquivado && p.prazo && p.prazo >= iso).sort((a, b) => a.prazo.localeCompare(b.prazo)).slice(0, 4)
  if (!lista.length) return null
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Provas e prazos</h2><Link to="/planetas">Planetas</Link></div>
      {lista.map((p) => {
        const e = estadoPlaneta(d, p)
        const faltam = difDias(deIso(p.prazo), hoje())
        const pct = e.etapas.length ? Math.round((100 * e.feitas.length) / e.etapas.length) : 0
        return (
          <div key={p.id} className="prazo">
            <Planeta fase={e.fase} apagado={e.apagado} tamanho={44} />
            <div className="prazo-textos">
              <div className="prazo-topo"><strong>{p.nome}</strong><span className="suave">{faltam === 0 ? 'hoje' : faltam === 1 ? 'amanhã' : `em ${faltam} dias`}</span></div>
              <div className="barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Etapas de ${p.nome}`}><div style={{ width: `${pct}%` }} /></div>
              <span className="suave">{e.feitas.length} de {e.etapas.length} etapas · {dataCurta(deIso(p.prazo))}</span>
            </div>
          </div>
        )
      })}
    </section>
  )
}
