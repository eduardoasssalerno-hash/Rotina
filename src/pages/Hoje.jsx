import { useEffect, useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { useSessao } from '../lib/sessao.jsx'
import { Link } from '../lib/router.jsx'
import { folgaEm, itensDoDia, tarefasSemHora } from '../lib/agenda.js'
import { estadoPlaneta } from '../lib/planetas.js'
import { addDias, dataCurta, dataLonga, deIso, difDias, hhmm, hoje, isoDia, saudacao } from '../lib/util.js'
import { Icone, Vazio } from '../components/ui.jsx'
import EditorTarefa from '../components/EditorTarefa.jsx'
import LinhaTarefa, { alternarTarefa } from '../components/LinhaTarefa.jsx'
import Habitos from '../components/Habitos.jsx'
import Planeta from '../components/Planeta.jsx'
import Anexos from '../components/Anexos.jsx'
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
  const { d, salvar, gravar, apagar } = useDados()
  const { nome } = useSessao()
  const agora = useAgora()
  const dia = hoje()
  const iso = isoDia(dia)
  const [editando, setEditando] = useState(null) // tarefa, ou {} para nova
  const folga = folgaEm(d, iso)
  const itens = itensDoDia(d, dia)
  const soltas = tarefasSemHora(d, dia)
  const atrasadas = d.tarefas.filter((t) => !t.feita && t.dia && t.dia < iso).sort((a, b) => a.dia.localeCompare(b.dia))
  const feitos = itens.filter((i) => i.feito).length + soltas.filter((t) => t.feita).length
  const total = itens.length + soltas.length
  const h = agora.getHours() + agora.getMinutes() / 60

  function alternar(it) {
    if (it.tipo === 'tarefa') return alternarTarefa(salvar, it.tarefa)
    const linha = { bloco_id: it.bloco.id, dia: iso }
    return it.feito ? apagar('blocos_feitos', linha) : gravar('blocos_feitos', linha)
  }

  return (
    <div className="tela">
      <Cabecalho titulo={`${saudacao(agora)}, ${nome.split(' ')[0]}`} sub={dataLonga(dia)}>
        <button type="button" className="btn btn-primario" onClick={() => setEditando({})}><Icone nome="mais" tamanho={20} />Tarefa</button>
      </Cabecalho>
      {folga && <div className="info">Hoje é {folga.nome}: sem aula e sem estágio.</div>}

      <div className="grade-hoje">
        <div className="coluna">
          <section className="cartao">
            <div className="cab-cartao">
              <h2>Seu dia <span className="suave">· {feitos} de {total} feitos</span></h2>
              <Link to="/semana">Semana</Link>
            </div>
            {itens.length === 0 && <Vazio>Nada com horário hoje.</Vazio>}
            {itens.map((it) => {
              const agoraAqui = h >= it.ini && h < it.fim
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
                      : <strong>{it.titulo}</strong>}
                    <span className="suave">{detalhe.join(' · ')}{agoraAqui ? ' · agora' : ''}</span>
                    {it.tipo === 'tarefa' && <Anexos tarefaId={it.tarefa.id} />}
                  </div>
                  <button type="button" className={`btn-feito ${it.feito ? 'sim' : ''}`} aria-pressed={it.feito} onClick={() => alternar(it)}>
                    {it.feito ? <><Icone nome="check" tamanho={16} />Feito</> : 'Feito'}
                  </button>
                </div>
              )
            })}
          </section>

          <section className="cartao">
            <div className="cab-cartao">
              <h2>Tarefas de hoje <span className="suave">· {soltas.filter((t) => t.feita).length} de {soltas.length}</span></h2>
              <Link to="/tarefas">Todas</Link>
            </div>
            {soltas.length === 0 && <Vazio>Sem tarefas soltas para hoje.</Vazio>}
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
          <ProximoTreino />
          <Prazos />
        </div>
      </div>
      {editando && <EditorTarefa tarefa={editando.id ? editando : null} padrao={{ dia: iso }} aoFechar={() => setEditando(null)} />}
    </div>
  )
}

function ProximoTreino() {
  const { d } = useDados()
  const blocos = d.blocos_fixos.filter((b) => b.ativo && /treino/i.test(b.titulo))
  if (!blocos.length) return null
  const iso = isoDia(hoje())
  const feitoHoje = d.treinos.some((t) => t.dia === iso && t.concluido)
  // próximo dia com treino (hoje conta se ainda não treinou)
  let dia = null
  let bloco = null
  for (let i = feitoHoje ? 1 : 0; i < 9 && !dia; i++) {
    const x = addDias(hoje(), i)
    const b = blocos.find((y) => y.dias.includes(x.getDay()))
    if (b) { dia = x; bloco = b }
  }
  if (!dia) return null
  const quando = difDias(dia, hoje()) === 0 ? 'hoje' : difDias(dia, hoje()) === 1 ? 'amanhã' : dataCurta(dia)
  const pendente = d.treinos.filter((t) => t.concluido && !t.dor && t.dia < iso).sort((a, b) => b.dia.localeCompare(a.dia))[0]
  return (
    <section className="cartao cartao-link">
      <Link to="/treino">
        <div className="cab-cartao"><h2>Treino</h2><span className="link">Abrir</span></div>
        <p>{feitoHoje ? 'Treino de hoje concluído. ' : ''}Próximo: <strong>{quando}</strong>, às {bloco.inicio.slice(0, 5)}.</p>
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
