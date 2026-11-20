import { useEffect, useRef, useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { horasPorArea, infoArea, itensDoDia, tarefasSemHora } from '../lib/agenda.js'
import { addDias, DIAS, DIAS_CURTOS, dataCurta, duracao, hoje, inicioSemana, isoDia, MESES } from '../lib/util.js'
import { Segmentos, Vazio } from '../components/ui.jsx'
import { Cabecalho } from './Shell.jsx'
import Feedback from '../components/Feedback.jsx'
import Anexos from '../components/Anexos.jsx'

// Data local (AAAA-MM-DD) de um horário salvo no banco
const diaLocal = (ts) => (ts ? isoDia(new Date(ts)) : null)

// Tudo o que foi concluído, com o dia e a área (tarefas, compromissos, hábitos e treinos)
function concluidos(d) {
  const lista = []
  for (const t of d.tarefas) {
    if (!t.feita || !t.feita_em) continue
    const p = t.projeto_id ? d.projetos.find((x) => x.id === t.projeto_id) : null
    lista.push({ dia: diaLocal(t.feita_em), area: infoArea(d, t.area_id || p?.area_id), tipo: 'tarefa' })
  }
  for (const f of d.blocos_feitos) {
    const b = d.blocos_fixos.find((x) => x.id === f.bloco_id)
    lista.push({ dia: f.dia, area: infoArea(d, b?.area_id), tipo: 'compromisso' })
  }
  for (const m of d.habito_marcas) {
    const h = d.habitos.find((x) => x.id === m.habito_id)
    if (h && m.valor >= h.meta) lista.push({ dia: m.dia, area: infoArea(d, h.area_id), tipo: 'habito' })
  }
  for (const t of d.treinos) {
    if (!t.concluido) continue
    const p = d.projetos.find((x) => x.tipo === 'treino')
    lista.push({ dia: t.dia, area: infoArea(d, p?.area_id), tipo: 'treino' })
  }
  return lista
}

export default function Relatorios() {
  const { d } = useDados()
  const feitos = concluidos(d)
  const porDia = new Map()
  for (const f of feitos) porDia.set(f.dia, (porDia.get(f.dia) || 0) + 1)
  return (
    <div className="tela">
      <Cabecalho titulo="Relatórios" sub="Tudo o que você concluiu: tarefas, compromissos, hábitos e treinos" />
      <MapaDeCalor porDia={porDia} />
      <div className="grade-hoje">
        <div className="coluna">
          <UltimosDias porDia={porDia} />
          <ProximosDias />
        </div>
        <div className="coluna">
          <Notas />
          <PorArea feitos={feitos} />
          <TempoReal />
        </div>
      </div>
    </div>
  )
}

// ---------- Mapa de calor do ano ----------
function MapaDeCalor({ porDia }) {
  const fim = hoje()
  const ini = addDias(inicioSemana(fim), -52 * 7)
  const semanas = []
  for (let s = 0; s < 53; s++) semanas.push(Array.from({ length: 7 }, (_, i) => addDias(ini, s * 7 + i)))
  const max = Math.max(4, ...porDia.values())
  const nivel = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))
  const rolagem = useRef(null)
  // começa mostrando as semanas mais recentes (à direita)
  useEffect(() => { if (rolagem.current) rolagem.current.scrollLeft = rolagem.current.scrollWidth }, [])
  const total = [...porDia.entries()].filter(([k]) => k >= isoDia(ini)).reduce((s, [, v]) => s + v, 0)
  const ativos = [...porDia.keys()].filter((k) => k >= isoDia(ini)).length
  // sequência de dias seguidos com algo concluído
  let seq = 0
  for (let x = porDia.has(isoDia(fim)) ? fim : addDias(fim, -1); porDia.has(isoDia(x)); x = addDias(x, -1)) seq++
  return (
    <section className="cartao">
      <div className="cab-cartao">
        <h2>Mapa de calor do ano</h2>
        <span className="suave">{total} concluídos · {ativos} dias ativos · {seq} {seq === 1 ? 'dia seguido' : 'dias seguidos'}</span>
      </div>
      <div className="calor-rolagem" ref={rolagem}>
        <div className="calor" role="img" aria-label={`Mapa de calor: ${total} itens concluídos em ${ativos} dias no último ano`}>
          <div className="calor-meses" aria-hidden="true">
            {semanas.map((s, i) => {
              const primeiro = s.find((x) => x.getDate() === 1)
              return <span key={i}>{primeiro ? MESES[primeiro.getMonth()].slice(0, 3) : ''}</span>
            })}
          </div>
          <div className="calor-dias" aria-hidden="true">
            {['Seg', '', 'Qua', '', 'Sex', '', 'Dom'].map((n, i) => <span key={i}>{n}</span>)}
          </div>
          <div className="calor-grade">
            {semanas.map((s, i) => (
              <div key={i} className="calor-semana">
                {s.map((x) => {
                  const iso = isoDia(x)
                  const n = porDia.get(iso) || 0
                  const futuro = x > fim
                  return <i key={iso} className={futuro ? 'futuro' : `n${nivel(n)}`} title={futuro ? '' : `${dataCurta(x)}: ${n} ${n === 1 ? 'concluído' : 'concluídos'}`} />
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="calor-legenda" aria-hidden="true">
        <span>Menos</span>{[0, 1, 2, 3, 4].map((n) => <i key={n} className={`n${n}`} />)}<span>Mais</span>
      </div>
    </section>
  )
}

// ---------- Concluídas por dia, taxa de conclusão e dia mais produtivo ----------
function UltimosDias({ porDia }) {
  const { d } = useDados()
  const [janela, setJanela] = useState(14)
  const dias = Array.from({ length: janela }, (_, i) => addDias(hoje(), i - janela + 1))
  const valores = dias.map((x) => porDia.get(isoDia(x)) || 0)
  const max = Math.max(1, ...valores)
  // planejado = compromissos fixos + tarefas do dia + hábitos do dia
  let planejado = 0
  let feito = 0
  // só conta a partir do dia em que o app começou a ser usado
  const inicioUso = d.areas.map((a) => diaLocal(a.criado_em)).sort()[0] || isoDia(hoje())
  for (const x of dias) {
    if (isoDia(x) < inicioUso) continue
    const iso = isoDia(x)
    const itens = itensDoDia(d, x)
    const soltas = tarefasSemHora(d, x)
    const habitos = d.habitos.filter((h) => h.ativo && h.dias.includes(x.getDay()))
    planejado += itens.length + soltas.length + habitos.length
    feito += itens.filter((i) => i.feito).length + soltas.filter((t) => t.feita).length +
      habitos.filter((h) => d.habito_marcas.some((m) => m.habito_id === h.id && m.dia === iso && m.valor >= h.meta)).length
  }
  const taxa = planejado ? Math.round((100 * feito) / planejado) : 0
  // dia da semana com mais concluídos nas últimas 8 semanas
  const somaSemana = [0, 0, 0, 0, 0, 0, 0]
  for (let i = 0; i < 56; i++) { const x = addDias(hoje(), -i); somaSemana[x.getDay()] += porDia.get(isoDia(x)) || 0 }
  const melhor = somaSemana.indexOf(Math.max(...somaSemana))
  return (
    <section className="cartao">
      <div className="cab-cartao">
        <h2>Concluídos por dia</h2>
        <Segmentos label="Período" value={janela} onChange={setJanela} options={[{ v: 7, label: '7 dias' }, { v: 14, label: '14 dias' }, { v: 30, label: '30 dias' }]} />
      </div>
      <div className="numeros-grandes">
        <div><strong>{taxa}%</strong><span className="suave">taxa de conclusão no período ({feito} de {planejado} planejados)</span></div>
        <div><strong>{somaSemana[melhor] ? DIAS[melhor].replace('-feira', '') : '—'}</strong><span className="suave">dia mais produtivo (últimas 8 semanas)</span></div>
      </div>
      <div className="barras" style={{ '--n': janela }}>
        {dias.map((x, i) => (
          <div key={i} className="barra-col" title={`${dataCurta(x)}: ${valores[i]} concluídos`}>
            <span className="barra-valor">{valores[i] || ''}</span>
            <i style={{ height: `${(valores[i] / max) * 100}%` }} className={isoDia(x) === isoDia(hoje()) ? 'hoje' : ''} />
            <span className="barra-rotulo">{janela <= 14 || i % 3 === 0 ? (janela <= 7 ? DIAS_CURTOS[x.getDay()] : x.getDate()) : ''}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- Pizza: concluídos por área ----------
function PorArea({ feitos }) {
  const limite = isoDia(addDias(hoje(), -29))
  const soma = new Map()
  for (const f of feitos) {
    if (f.dia < limite) continue
    const a = soma.get(f.area.nome) || { cor: f.area.cor, n: 0 }
    a.n++
    soma.set(f.area.nome, a)
  }
  const fatias = [...soma.entries()].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.n - a.n)
  const total = fatias.reduce((s, f) => s + f.n, 0)
  let acum = 0
  const R = 42
  const C = 2 * Math.PI * R
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Por área</h2><span className="suave">últimos 30 dias</span></div>
      {total === 0 ? <Vazio>Ainda não há nada concluído. Marque os blocos e as tarefas como feitos.</Vazio> : (
        <div className="pizza">
          <svg viewBox="0 0 120 120" width="150" height="150" role="img" aria-label={`Concluídos por área: ${fatias.map((f) => `${f.nome} ${f.n}`).join(', ')}`}>
            {fatias.map((f) => {
              const parte = (f.n / total) * C
              const el = (
                <circle key={f.nome} cx="60" cy="60" r={R} fill="none" stroke={f.cor} strokeWidth="22"
                  strokeDasharray={`${Math.max(0, parte - (fatias.length > 1 ? 1.5 : 0))} ${C}`} strokeDashoffset={-acum} transform="rotate(-90 60 60)">
                  <title>{`${f.nome}: ${f.n} (${Math.round((100 * f.n) / total)}%)`}</title>
                </circle>
              )
              acum += parte
              return el
            })}
            <text x="60" y="58" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--tinta)">{total}</text>
            <text x="60" y="74" textAnchor="middle" fontSize="9" fill="var(--suave)">concluídos</text>
          </svg>
          <ul className="pizza-legenda">
            {fatias.map((f) => (
              <li key={f.nome}><i style={{ background: f.cor }} /><span>{f.nome}</span><strong>{f.n}</strong><span className="suave">{Math.round((100 * f.n) / total)}%</span></li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// ---------- Próximos 7 dias ----------
function ProximosDias() {
  const { d } = useDados()
  const dias = Array.from({ length: 7 }, (_, i) => addDias(hoje(), i))
  const max = 16
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Próximos 7 dias</h2><span className="suave">horas planejadas por área</span></div>
      <ul className="proximos">
        {dias.map((x) => {
          const areas = horasPorArea(d, x).sort((a, b) => b.h - a.h)
          const total = areas.reduce((s, a) => s + a.h, 0)
          const tarefas = d.tarefas.filter((t) => t.dia === isoDia(x) && !t.feita).length
          return (
            <li key={isoDia(x)}>
              <span className="proximos-dia">{DIAS_CURTOS[x.getDay()]} {x.getDate()}</span>
              <span className="proximos-barra" title={areas.map((a) => `${a.nome}: ${duracao(a.h * 60)}`).join(' · ')}>
                {areas.map((a) => <i key={a.nome} style={{ width: `${(a.h / max) * 100}%`, background: a.cor }} />)}
              </span>
              <span className="suave">{duracao(total * 60)}{tarefas ? ` · ${tarefas} ${tarefas === 1 ? 'tarefa' : 'tarefas'}` : ''}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---------- Tempo previsto × tempo real ----------
function TempoReal() {
  const { d } = useDados()
  const lista = d.tarefas.filter((t) => t.minutos && t.minutos_real).sort((a, b) => String(b.feita_em || b.dia).localeCompare(String(a.feita_em || a.dia))).slice(0, 10)
  const prev = lista.reduce((s, t) => s + t.minutos, 0)
  const real = lista.reduce((s, t) => s + t.minutos_real, 0)
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Previsto × real</h2>{lista.length > 0 && <span className="suave">{real > prev ? `levou ${duracao(real - prev)} a mais` : real < prev ? `sobrou ${duracao(prev - real)}` : 'no tempo certo'}</span>}</div>
      {lista.length === 0 ? <Vazio>Quando você anotar quanto tempo cada lista levou de verdade, a comparação aparece aqui.</Vazio> : (
        <ul className="tempo-real">
          {lista.map((t) => {
            const dif = t.minutos_real - t.minutos
            return (
              <li key={t.id}>
                <span className="tempo-titulo">{t.titulo}</span>
                <span className="suave">previsto {duracao(t.minutos)} · levou {duracao(t.minutos_real)}</span>
                <span className={`tag ${dif > 0 ? 'tag-laranja' : 'tag-verde'}`}>{dif === 0 ? 'no tempo' : `${dif > 0 ? '+' : '−'}${duracao(Math.abs(dif))}`}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}


// ---------- Notas e feedback do Claude ----------
function Notas() {
  const { d } = useDados()
  const lista = d.tarefas.filter((t) => t.feedback_nota != null).sort((a, b) => String(b.feedback_em).localeCompare(String(a.feedback_em)))
  const media = lista.length ? lista.reduce((s, t) => s + Number(t.feedback_nota), 0) / lista.length : 0
  const comPt = lista.filter((t) => t.feedback_nota_pt != null)
  const mediaPt = comPt.length ? comPt.reduce((s, t) => s + Number(t.feedback_nota_pt), 0) / comPt.length : null
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Notas das listas</h2>{lista.length > 0 && <span className="suave">média {media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{mediaPt != null ? ` · português ${mediaPt.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}` : ''}</span>}</div>
      {lista.length === 0 ? <Vazio>Quando você terminar uma lista e me mandar as respostas, a nota e o feedback aparecem aqui e na própria tarefa.</Vazio> : (
        <ul className="tempo-real">
          {lista.map((t) => (
            <li key={t.id}>
              <span className="tempo-titulo">{t.titulo}</span>
              <span className="suave">{t.feedback_em ? dataCurta(new Date(t.feedback_em)) : ''}</span>
              <span className="tag-nota"><Feedback tarefa={t} /></span>
              <span className="nota-pdf"><Anexos tarefaId={t.id} tipo="correcao" /></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
