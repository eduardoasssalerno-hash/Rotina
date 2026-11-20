import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { folgaEm, horasPorArea, itensDoDia, tarefasSemHora } from '../lib/agenda.js'
import { addDias, DIAS_CURTOS, deIso, hhmm, hoje, inicioSemana, isoDia, MESES, pad } from '../lib/util.js'
import { Icone, Segmentos } from '../components/ui.jsx'
import EditorTarefa from '../components/EditorTarefa.jsx'
import { Cabecalho } from './Shell.jsx'

const INI = 5
const FIM = 23
const ALTURA = 30 // pixels por hora na grade da semana

export default function Semana() {
  const [vista, setVista] = useState('semana')
  const [base, setBase] = useState(() => hoje())
  const [editando, setEditando] = useState(null)
  const seg = inicioSemana(base)
  const dias = Array.from({ length: 7 }, (_, i) => addDias(seg, i))
  const titulo = vista === 'semana'
    ? `${pad(dias[0].getDate())}/${pad(dias[0].getMonth() + 1)} a ${pad(dias[6].getDate())}/${pad(dias[6].getMonth() + 1)}`
    : `${MESES[base.getMonth()][0].toUpperCase()}${MESES[base.getMonth()].slice(1)} de ${base.getFullYear()}`

  function mover(n) {
    if (vista === 'semana') setBase(addDias(base, 7 * n))
    else setBase(new Date(base.getFullYear(), base.getMonth() + n, 1))
  }

  return (
    <div className="tela">
      <Cabecalho titulo="Semana e mês" sub="Blocos coloridos por área">
        <Segmentos label="Ver semana ou mês" value={vista} onChange={setVista}
          options={[{ v: 'semana', label: 'Semana' }, { v: 'mes', label: 'Mês' }]} />
      </Cabecalho>
      <div className="navegar">
        <button type="button" className="btn-icone" onClick={() => mover(-1)} aria-label="Anterior"><Icone nome="voltar" /></button>
        <strong>{titulo}</strong>
        <button type="button" className="btn-icone" onClick={() => mover(1)} aria-label="Próximo"><Icone nome="avancar" /></button>
        <button type="button" className="btn btn-sec btn-peq" onClick={() => setBase(hoje())}>Hoje</button>
      </div>
      <Legenda />
      {vista === 'semana'
        ? <GradeSemana dias={dias} aoEditar={setEditando} />
        : <Mes base={base} aoEditar={setEditando} />}
      {editando && <EditorTarefa tarefa={editando} aoFechar={() => setEditando(null)} />}
    </div>
  )
}

function Legenda() {
  const { d } = useDados()
  return (
    <div className="legenda" aria-label="Cores das áreas">
      {[...d.areas].sort((a, b) => a.ordem - b.ordem).map((a) => (
        <span key={a.id}><i style={{ background: a.cor }} />{a.nome}</span>
      ))}
    </div>
  )
}

function estiloBloco(it) {
  return {
    '--cor': it.area.cor,
    background: `color-mix(in srgb, ${it.area.cor} 16%, var(--superficie))`,
  }
}

function GradeSemana({ dias, aoEditar }) {
  const { d } = useDados()
  const isoHoje = isoDia(hoje())
  const horas = Array.from({ length: FIM - INI }, (_, i) => INI + i)
  const porDia = dias.map((dia) => itensDoDia(d, dia, { comHabitos: true }))
  return (
    <>
      {/* Tablet e computador: grade com as horas */}
      <div className="grade-semana so-tablet" style={{ '--altura': `${ALTURA}px` }}>
        <div className="gs-cab" />
        {dias.map((dia) => {
          const iso = isoDia(dia)
          const folga = folgaEm(d, iso)
          return (
            <div key={iso} className={`gs-cab ${iso === isoHoje ? 'hoje' : ''}`}>
              <span>{DIAS_CURTOS[dia.getDay()]}</span><strong>{dia.getDate()}</strong>
              {folga && <em title={folga.nome}>folga</em>}
            </div>
          )
        })}
        <div className="gs-horas">
          {horas.map((h) => <span key={h} style={{ top: (h - INI) * ALTURA }}>{pad(h)}h</span>)}
        </div>
        {dias.map((dia, i) => (
          <div key={isoDia(dia)} className="gs-dia" style={{ height: (FIM - INI) * ALTURA }}>
            {horas.map((h) => <i key={h} className="gs-linha" style={{ top: (h - INI) * ALTURA }} />)}
            {porDia[i].map((it) => {
              const ini = Math.max(INI, it.ini)
              const fim = Math.min(FIM, it.fim)
              if (fim <= ini) return null
              const alto = (fim - ini) * ALTURA
              const Tag = it.tipo === 'tarefa' ? 'button' : 'div'
              return (
                <Tag key={it.chave} type={it.tipo === 'tarefa' ? 'button' : undefined}
                  className={`gs-bloco ${it.feito ? 'feito' : ''} ${alto < 24 ? 'fino' : ''}`}
                  style={{ ...estiloBloco(it), top: (ini - INI) * ALTURA, height: Math.max(10, alto - 2) }}
                  onClick={it.tipo === 'tarefa' ? () => aoEditar(it.tarefa) : undefined}
                  title={`${it.titulo} · ${hhmm(it.ini)}–${hhmm(it.fim)}`}>
                  <span className="gs-titulo">{it.titulo}</span>
                  {alto >= 40 && <span className="gs-hora">{hhmm(it.ini)}–{hhmm(it.fim)}</span>}
                </Tag>
              )
            })}
          </div>
        ))}
      </div>

      {/* Celular: um dia embaixo do outro, com a barra do dia de 5h às 23h */}
      <div className="lista-dias so-celular">
        {dias.map((dia, i) => <DiaCelular key={isoDia(dia)} dia={dia} itens={porDia[i]} aoEditar={aoEditar} />)}
      </div>
    </>
  )
}

function BarraDia({ itens }) {
  return (
    <div className="barra-dia" aria-hidden="true">
      {itens.map((it) => {
        const ini = Math.max(INI, it.ini)
        const fim = Math.min(FIM, it.fim)
        if (fim <= ini) return null
        return <i key={it.chave} style={{ left: `${((ini - INI) / (FIM - INI)) * 100}%`, width: `${((fim - ini) / (FIM - INI)) * 100}%`, background: it.area.cor }} />
      })}
    </div>
  )
}

function DiaCelular({ dia, itens, aoEditar }) {
  const { d } = useDados()
  const iso = isoDia(dia)
  const folga = folgaEm(d, iso)
  const soltas = tarefasSemHora(d, dia)
  return (
    <section className={`cartao dia-celular ${iso === isoDia(hoje()) ? 'hoje' : ''}`}>
      <div className="cab-cartao">
        <h2>{DIAS_CURTOS[dia.getDay()]} {dia.getDate()}</h2>
        {folga && <span className="tag">{folga.nome}</span>}
      </div>
      <BarraDia itens={itens} />
      <div className="escala" aria-hidden="true"><span>5h</span><span>11h</span><span>17h</span><span>23h</span></div>
      <ListaItens itens={itens} soltas={soltas} aoEditar={aoEditar} />
    </section>
  )
}

function ListaItens({ itens, soltas = [], aoEditar }) {
  if (!itens.length && !soltas.length) return <p className="vazio">Dia livre.</p>
  return (
    <ul className="itens-compactos">
      {itens.map((it) => (
        <li key={it.chave} className={it.feito ? 'feito' : ''}>
          <i style={{ background: it.area.cor }} aria-hidden="true" />
          <span className="hora">{hhmm(it.ini)}</span>
          {it.tipo === 'tarefa'
            ? <button type="button" className="link-titulo" onClick={() => aoEditar(it.tarefa)}>{it.titulo}</button>
            : <span>{it.titulo}</span>}
        </li>
      ))}
      {soltas.map((t) => (
        <li key={t.id} className={t.feita ? 'feito' : ''}>
          <i className="sem-hora" aria-hidden="true" />
          <span className="hora">—</span>
          <button type="button" className="link-titulo" onClick={() => aoEditar(t)}>{t.titulo}</button>
        </li>
      ))}
    </ul>
  )
}

function Mes({ base, aoEditar }) {
  const { d } = useDados()
  const [escolhido, setEscolhido] = useState(null)
  const primeiro = new Date(base.getFullYear(), base.getMonth(), 1)
  const ini = inicioSemana(primeiro)
  const semanas = Math.ceil((((primeiro.getDay() + 6) % 7) + new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()) / 7)
  const dias = Array.from({ length: semanas * 7 }, (_, i) => addDias(ini, i))
  const isoHoje = isoDia(hoje())
  const prazos = d.projetos.filter((p) => p.prazo && !p.arquivado)
  const diaSel = escolhido ? deIso(escolhido) : null

  return (
    <div className="mes-area">
      <div className="mes">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((n) => <div key={n} className="mes-cab">{n}</div>)}
        {dias.map((dia) => {
          const iso = isoDia(dia)
          const fora = dia.getMonth() !== base.getMonth()
          const areas = horasPorArea(d, dia)
          const prazo = prazos.filter((p) => p.prazo === iso)
          const folga = folgaEm(d, iso)
          return (
            <button key={iso} type="button" className={`mes-dia ${fora ? 'fora' : ''} ${iso === isoHoje ? 'hoje' : ''} ${escolhido === iso ? 'sel' : ''}`}
              onClick={() => setEscolhido(escolhido === iso ? null : iso)} aria-pressed={escolhido === iso}
              aria-label={`${dia.getDate()} de ${MESES[dia.getMonth()]}${prazo.length ? ', prazo: ' + prazo.map((p) => p.nome).join(', ') : ''}`}>
              <span className="mes-num">{dia.getDate()}</span>
              {prazo.map((p) => <span key={p.id} className="mes-prazo">{p.nome}</span>)}
              {folga && <span className="mes-folga">{folga.nome}</span>}
              <span className="mes-blocos">
                {areas.sort((a, b) => b.h - a.h).slice(0, 4).map((a) => (
                  <i key={a.nome} style={{ background: a.cor, width: `${Math.min(100, (a.h / 8) * 100)}%` }} title={`${a.nome}: ${a.h.toFixed(1)}h`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
      {diaSel && (
        <section className="cartao">
          <div className="cab-cartao"><h2>{DIAS_CURTOS[diaSel.getDay()]} {diaSel.getDate()} de {MESES[diaSel.getMonth()]}</h2></div>
          <ListaItens itens={itensDoDia(d, diaSel)} soltas={tarefasSemHora(d, diaSel)} aoEditar={aoEditar} />
        </section>
      )}
    </div>
  )
}
