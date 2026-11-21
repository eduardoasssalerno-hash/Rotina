import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { Link } from '../lib/router.jsx'
import { infoArea } from '../lib/agenda.js'
import { estadoPlaneta, FASES, LIMITES } from '../lib/planetas.js'
import { coresDasMaterias, COR_OUTROS, diasPassados, marcadorDe, periodo, semente, sessoesDo } from '../lib/foco.js'
import { dataCurta, deIso, difDias, DIAS, DIAS_CURTOS, duracao, hoje, isoDia, MESES } from '../lib/util.js'
import { Botao, Field, Icone, Modal, Segmentos, Vazio } from '../components/ui.jsx'
import Planeta from '../components/Planeta.jsx'
import LinhaTarefa from '../components/LinhaTarefa.jsx'
import EditorTarefa from '../components/EditorTarefa.jsx'
import { Cabecalho } from './Shell.jsx'

const VISOES = [{ v: 'dia', label: 'Dia' }, { v: 'semana', label: 'Semana' }, { v: 'mes', label: 'Mês' }, { v: 'ano', label: 'Ano' }, { v: 'tudo', label: 'Tudo' }]
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0]
const hora = (h) => `${String(h).padStart(2, '0')}:00`

export default function Planetas() {
  const { d } = useDados()
  const [visao, setVisao] = useState('semana')
  const [desloca, setDesloca] = useState(0)
  const [etapasDe, setEtapasDe] = useState(null)
  const [editando, setEditando] = useState(null) // projeto, ou {} para novo
  const ativos = d.projetos.filter((p) => !p.arquivado).sort((a, b) => a.ordem - b.ordem)

  const per = periodo(visao, desloca, d)
  const sessoes = sessoesDo(d, per)
  const corDe = coresDasMaterias(d)
  const total = sessoes.reduce((s, x) => s + x.minutos, 0)
  // minutos por matéria no período
  // minutos, sessões, primeira e última vez de cada matéria no período
  const porMateria = new Map()
  for (const s of sessoes) {
    const m = marcadorDe(d, s)
    const x = porMateria.get(m) || { nome: m, min: 0, n: 0, primeira: s._dt, ultima: s._dt }
    x.min += s.minutos
    x.n++
    if (s._dt < x.primeira) x.primeira = s._dt
    if (s._dt > x.ultima) x.ultima = s._dt
    porMateria.set(m, x)
  }
  const materias = [...porMateria.values()].map((x) => ({ ...x, cor: corDe(x.nome) })).sort((a, b) => b.min - a.min)
  const trocarVisao = (v) => { setVisao(v); setDesloca(0) }

  return (
    <div className="tela">
      <Cabecalho titulo="Planetas" sub="No centro, Cristo: o brilho cresce com o devocional e a igreja. Cada sessão de foco vira uma estrela; cada matéria, um planeta">
        <button type="button" className="btn btn-primario" onClick={() => setEditando({})}><Icone nome="mais" tamanho={20} />Planeta</button>
      </Cabecalho>

      <section className="cartao universo-cartao">
        <Segmentos label="Período" value={visao} onChange={trocarVisao} options={VISOES} />
        {visao === 'tudo' ? <div className="navegar navegar-universo"><strong>{per.titulo}</strong></div> : <div className="navegar navegar-universo">
          <button type="button" className="btn-icone" onClick={() => setDesloca((n) => n - 1)} aria-label="Período anterior"><Icone nome="voltar" /></button>
          <strong>{per.titulo}</strong>
          <button type="button" className="btn-icone" onClick={() => setDesloca((n) => Math.min(0, n + 1))} disabled={desloca === 0} aria-label="Próximo período"><Icone nome="avancar" /></button>
          {desloca !== 0 && <button type="button" className="btn btn-sec btn-peq" onClick={() => setDesloca(0)}>Atual</button>}
        </div>}
        <Universo visao={visao} sessoes={sessoes} materias={materias} total={total} corDe={corDe} d={d} chave={`${visao}${per.a}`} per={per} />
      </section>

      <div className="grade-hoje">
        <div className="coluna">
          <TempoNoPeriodo visao={visao} per={per} sessoes={sessoes} total={total} />
          {visao !== 'dia' && <DiaDaSemana per={per} sessoes={sessoes} />}
        </div>
        <div className="coluna">
          <HorarioDoDia per={per} sessoes={sessoes} visao={visao} />
          <PorMateria materias={materias} total={total} />
        </div>
      </div>

      <section className="cartao">
        <div className="cab-cartao"><h2>Planetas das matérias</h2><span className="suave">etapas, prazos e energia</span></div>
        {ativos.length === 0 && <Vazio>Nenhum planeta ainda. Crie um para cada projeto ou matéria.</Vazio>}
      </section>
      {ativos.length > 0 && (
        <div className="lista-planetas">
          {ativos.map((p) => <Detalhe key={p.id} p={p} compacto aoVerEtapas={() => setEtapasDe(p)} aoEditar={() => setEditando(p)} />)}
        </div>
      )}

      {etapasDe && <Etapas p={etapasDe} aoFechar={() => setEtapasDe(null)} />}
      {editando && <EditorPlaneta projeto={editando.id ? editando : null} aoFechar={() => setEditando(null)} />}
    </div>
  )
}

// ---------- A galáxia do período ----------
// No centro de tudo, a maior estrela: Cristo. Ela cresce no ritmo normal (com as horas de foco do período),
// mas o BRILHO cresce mais rápido com a vida na igreja: devocional e cultos (blocos da Igreja, que valem o dobro).
// Em volta: um planeta por matéria (veja Universo). No fundo: uma estrela por sessão de foco, maior quanto mais longa.
function brilhoDeCristo(d, per) {
  const igreja = d.areas.find((a) => /igreja/i.test(a.nome))
  const dentro = (k) => k >= per.a && k <= per.b
  const devocional = d.habitos.filter((h) => h.plano === 'biblia').map((h) => h.id)
  const blocosIgreja = new Set(d.blocos_fixos.filter((b) => igreja && b.area_id === igreja.id).map((b) => b.id))
  const leituras = d.habito_marcas.filter((m) => devocional.includes(m.habito_id) && dentro(m.dia)).length
  const cultos = d.blocos_feitos.filter((b) => blocosIgreja.has(b.bloco_id) && dentro(b.dia)).length
  const pontos = leituras + 2 * cultos
  const dias = per.a === per.b ? 1 : diasPassados(per)
  return { valor: Math.min(1, 0.2 + (0.8 * pontos) / (dias * 1.2)), leituras, cultos }
}

// Cada matéria tem um planeta próprio, sempre igual: o tipo (gasoso, rochoso, gelado, oceânico, de lava ou de
// nuvens), o desenho da superfície, a inclinação dos anéis e das luas saem do nome da matéria.
// Distância até Cristo = há quanto tempo você estudou a matéria pela última vez (mais recente, mais perto).
// Tamanho = horas de foco no período; anel a partir de 10 h (duplo a partir de 30 h); uma lua a cada 5 h (até 4).
const TIPOS = ['gasoso', 'rochoso', 'gelado', 'oceano', 'lava', 'nuvens']
const DIA_MS = 86400000
// marcas de tempo desenhadas como órbitas-guia, por visão
const MARCOS = {
  dia: [[6 * 3600000, '6 h'], [12 * 3600000, '12 h']],
  semana: [[DIA_MS, '1 dia'], [3 * DIA_MS, '3 dias'], [6 * DIA_MS, '6 dias']],
  mes: [[7 * DIA_MS, '1 sem.'], [14 * DIA_MS, '2 sem.'], [28 * DIA_MS, '4 sem.']],
  ano: [[30 * DIA_MS, '1 mês'], [90 * DIA_MS, '3 meses'], [180 * DIA_MS, '6 meses'], [330 * DIA_MS, '11 meses']],
  tudo: [[30 * DIA_MS, '1 mês'], [180 * DIA_MS, '6 meses'], [365 * DIA_MS, '1 ano'], [730 * DIA_MS, '2 anos'], [1095 * DIA_MS, '3 anos']],
}
const curto = (nome) => (nome.length > 18 ? `${nome.slice(0, 17)}…` : nome)
const meiaLargura = (nome) => curto(nome).length * 2.7 // rótulo não sai da tela
const ha = (ms) => {
  const dias = Math.floor(ms / DIA_MS)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 31) return `há ${dias} dias`
  const meses = Math.round(dias / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(dias / 365)
  const resto = Math.round((dias - anos * 365) / 30)
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}${resto ? ` e ${resto} ${resto === 1 ? 'mês' : 'meses'}` : ''}`
}

function Superficie({ p, i }) {
  // textura dentro do planeta (recortada pelo círculo)
  const r = semente(`textura${p.nome}`)
  const { x, y, r: R } = p
  const el = []
  if (p.tipo === 'gasoso') {
    for (let k = 0; k < 5; k++) {
      const yy = y - R + (k + 0.5) * (2 * R / 5) + (r() - 0.5) * R * 0.15
      el.push(<ellipse key={k} cx={x} cy={yy} rx={R * 1.2} ry={R * (0.07 + r() * 0.08)} fill={k % 2 ? '#fff' : '#000'} opacity={0.12 + r() * 0.12} />)
    }
    if (R > 7) el.push(<ellipse key="m" cx={x + R * (r() - 0.5)} cy={y + R * 0.25} rx={R * 0.22} ry={R * 0.12} fill="#fff" opacity="0.35" />)
  } else if (p.tipo === 'rochoso') {
    for (let k = 0; k < 6; k++) {
      const a = r() * 2 * Math.PI
      const dd = Math.sqrt(r()) * R * 0.75
      const cr = R * (0.1 + r() * 0.16)
      el.push(<g key={k}><circle cx={x + Math.cos(a) * dd} cy={y + Math.sin(a) * dd} r={cr} fill="#000" opacity="0.22" /><circle cx={x + Math.cos(a) * dd - cr * 0.25} cy={y + Math.sin(a) * dd - cr * 0.25} r={cr * 0.7} fill="#fff" opacity="0.08" /></g>)
    }
  } else if (p.tipo === 'gelado') {
    el.push(<ellipse key="n" cx={x} cy={y - R * 0.95} rx={R * 0.8} ry={R * 0.35} fill="#fff" opacity="0.85" />)
    el.push(<ellipse key="s" cx={x} cy={y + R * 0.98} rx={R * 0.6} ry={R * 0.25} fill="#fff" opacity="0.7" />)
    el.push(<path key="f" d={`M${x - R} ${y - R * 0.1}Q${x} ${y + R * 0.2} ${x + R} ${y - R * 0.05}`} stroke="#fff" strokeOpacity="0.35" strokeWidth={R * 0.08} fill="none" />)
  } else if (p.tipo === 'oceano') {
    for (let k = 0; k < 3; k++) {
      const a = r() * 2 * Math.PI
      const dd = r() * R * 0.6
      el.push(<ellipse key={k} cx={x + Math.cos(a) * dd} cy={y + Math.sin(a) * dd} rx={R * (0.25 + r() * 0.25)} ry={R * (0.15 + r() * 0.15)} fill="#2E6B4A" opacity="0.75" transform={`rotate(${Math.round(r() * 180)} ${x} ${y})`} />)
    }
    el.push(<ellipse key="n" cx={x} cy={y - R * 0.98} rx={R * 0.5} ry={R * 0.18} fill="#fff" opacity="0.7" />)
  } else if (p.tipo === 'lava') {
    el.push(<circle key="b" cx={x} cy={y} r={R} fill="#1A0E0A" opacity="0.45" />)
    for (let k = 0; k < 4; k++) {
      const a = r() * 2 * Math.PI
      const x1 = x + Math.cos(a) * R * 0.9
      const y1 = y + Math.sin(a) * R * 0.9
      const x2 = x + Math.cos(a + 2.4) * R * 0.5
      const y2 = y + Math.sin(a + 2.4) * R * 0.5
      el.push(<path key={k} d={`M${x1} ${y1}L${(x1 + x2) / 2 + (r() - 0.5) * R * 0.4} ${(y1 + y2) / 2 + (r() - 0.5) * R * 0.4}L${x2} ${y2}`} stroke="#FFB347" strokeWidth={Math.max(0.5, R * 0.08)} fill="none" opacity="0.9" strokeLinecap="round" />)
    }
  } else {
    for (let k = 0; k < 4; k++) {
      const yy = y - R * 0.6 + k * R * 0.4
      el.push(<path key={k} d={`M${x - R} ${yy}q${R * 0.5} ${-R * 0.25} ${R} 0t${R} 0`} stroke="#fff" strokeOpacity={0.25 + r() * 0.2} strokeWidth={R * 0.14} fill="none" strokeLinecap="round" />)
    }
  }
  return <g clipPath={`url(#corte-${i})`}>{el}</g>
}

function Universo({ visao, sessoes, materias, total, corDe, d, chave, per }) {
  const [nomeCristo, setNomeCristo] = useState(false) // o nome aparece só ao tocar na estrela
  const [selNome, setSelNome] = useState(null)
  // no celular a cena fica mais alta, para as órbitas terem espaço
  const estreito = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 600px)').matches
  const W = 400
  const H = estreito ? 440 : 320
  const achata = estreito ? 0.7 : 0.44
  const cx = W / 2
  const cy = H / 2 + 4
  const horas = total / 60
  // tamanho: ritmo padrão (horas de foco); brilho: igreja
  const rCristo = 10 + Math.min(12, Math.sqrt(horas) * 1.3)
  const luz = brilhoDeCristo(d, per)
  const b = luz.valor
  const nEstrelas = sessoes.length
  const escala = nEstrelas > 300 ? 0.75 : nEstrelas > 60 ? 1 : nEstrelas > 15 ? 1.4 : 2

  const estrelas = sessoes.map((s) => {
    const r = semente(String(s.id))
    const tam = s.minutos >= 90 ? 2.6 : s.minutos >= 50 ? 1.9 : s.minutos >= 25 ? 1.35 : 0.85
    return { id: s.id, x: 6 + r() * (W - 12), y: 6 + r() * (H - 12), tam: tam * escala, cor: corDe.planeta(marcadorDe(d, s)), brilho: r() }
  })

  // distância = tempo desde a última vez, em escala logarítmica: o recente ganha mais espaço,
  // e anos de distância ainda cabem na tela
  const agoraMs = Math.min(Date.now(), per.fim.getTime() + DIA_MS)
  const vida = visao === 'dia' ? DIA_MS : Math.max(DIA_MS, agoraMs - per.ini.getTime())
  const rxMin = rCristo + 22
  const rxMax = W / 2 - 14
  const unidade = vida / 80
  const raio = (ms) => rxMin + (rxMax - rxMin) * Math.min(1, Math.log1p(Math.max(0, ms) / unidade) / Math.log1p(vida / unidade))
  const orbita = (rx) => ({ rx, ry: Math.max(rx * achata, rCristo + 12) })
  const maxMin = materias[0]?.min || 1
  const porRecencia = [...materias].sort((a, b2) => b2.ultima - a.ultima)
  const rotulados = new Set(materias.slice(0, visao === 'tudo' ? 8 : 10).map((m) => m.nome))
  const planetas = porRecencia.map((m0, i) => {
    const m = { ...m0, cor: corDe.planeta(m0.nome) }
    const h = semente(m.nome)
    const idade = agoraMs - m.ultima.getTime()
    const { rx, ry } = orbita(raio(idade))
    const ang = 0.55 + i * 2.39996 // ângulo de ouro: espalha sem empilhar
    const r = 3.5 + 11 * Math.sqrt(m.min / maxMin)
    const x = cx + rx * Math.cos(ang)
    const y = cy + ry * Math.sin(ang)
    return {
      ...m, i, idade, rx, ry, x, y, r, atras: Math.sin(ang) < 0, acima: Math.sin(ang) < 0,
      tipo: m.nome === 'Indefinido' || m.nome === 'Foco livre' ? 'rochoso' : TIPOS[Math.floor(h() * TIPOS.length)],
      inclina: -28 + h() * 36, anel: m.min >= 600, anelDuplo: m.min >= 1800, luas: Math.min(4, Math.floor(m.min / 300)), faseLua: h() * 6.28,
    }
  })
  const sel = planetas.find((p) => p.nome === selNome) || null
  const marcos = (MARCOS[visao] || []).filter(([ms]) => ms < vida * 0.98)
  const rFundo = semente('fundo')
  const fundo = Array.from({ length: 70 }, () => ({ x: rFundo() * W, y: rFundo() * H, o: 0.12 + rFundo() * 0.2 }))

  const desenhaPlaneta = (p) => {
    const tocado = sel?.nome === p.nome
    const anel = (esc, op) => (
      <ellipse cx={p.x} cy={p.y} rx={p.r * esc} ry={p.r * esc * 0.3} fill="none" stroke={p.cor} strokeOpacity={op} strokeWidth={Math.max(1, p.r * 0.22)} transform={`rotate(${p.inclina} ${p.x} ${p.y})`} />
    )
    return (
      <g key={p.nome} className={`universo-planeta ${tocado ? 'sel' : ''}`} role="button" tabIndex={0} aria-pressed={tocado}
        aria-label={`${p.nome}: ${duracao(p.min)}, última vez ${ha(p.idade)}`}
        onClick={(e) => { e.stopPropagation(); setSelNome(tocado ? null : p.nome) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelNome(tocado ? null : p.nome) } }}>
        <title>{`${p.nome}: ${duracao(p.min)} · última vez ${ha(p.idade)}`}</title>
        <circle cx={p.x} cy={p.y} r={p.r + 6} fill="transparent" />
        {tocado && <circle cx={p.x} cy={p.y} r={p.r + 4} fill="none" stroke="#FFE7A3" strokeWidth="1.2" strokeDasharray="2 2" />}
        {p.r > 6 && <circle cx={p.x} cy={p.y} r={p.r * 1.35} fill={p.cor} opacity="0.12" />}
        {p.anel && <g className="anel-tras" clipPath={`url(#metade-${p.i})`}>{anel(2, 0.55)}{p.anelDuplo && anel(2.45, 0.3)}</g>}
        <circle cx={p.x} cy={p.y} r={p.r} fill={p.cor} />
        <Superficie p={p} i={p.i} />
        <circle cx={p.x} cy={p.y} r={p.r} fill="url(#sombra-planeta)" />
        <circle cx={p.x - p.r * 0.35} cy={p.y - p.r * 0.38} r={p.r * 0.32} fill="#fff" opacity="0.16" />
        {p.anel && <g clipPath={`url(#frente-${p.i})`}>{anel(2, 0.75)}{p.anelDuplo && anel(2.45, 0.4)}</g>}
        {Array.from({ length: p.luas }, (_, k) => {
          const a = p.faseLua + k * 1.6
          const dist = p.r + 4 + k * 2.2
          return <circle key={k} cx={p.x + Math.cos(a) * dist} cy={p.y + Math.sin(a) * dist * 0.7} r={1.1 + (k % 2) * 0.5} fill="#D9E2EC" />
        })}
        {(rotulados.has(p.nome) || tocado) && (
          <text x={Math.min(Math.max(p.x, meiaLargura(p.nome) + 3), W - meiaLargura(p.nome) - 3)} y={p.acima ? p.y - p.r - (p.anel ? 7 : 4) : p.y + p.r + (p.anel ? 11 : 9)} textAnchor="middle" className="universo-rotulo">{curto(p.nome)}</text>
        )}
      </g>
    )
  }
  const raioV = rCristo * (2.2 + 4.5 * b)
  const raioH = rCristo * (1.6 + 3 * b)

  return (
    <>
      <div className="universo" onClick={() => setSelNome(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`No centro, Cristo, com brilho de ${Math.round(b * 100)}%. ${materias.length} matérias, ${nEstrelas} sessões de foco, ${duracao(total)} no período`}>
          <defs>
            <radialGradient id="ceu" cx="50%" cy="55%" r="70%"><stop offset="0" stopColor="#13284A" /><stop offset="1" stopColor="#050B17" /></radialGradient>
            <radialGradient id="sombra-planeta" cx="32%" cy="28%" r="80%"><stop offset="0.45" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.55" /></radialGradient>
            <radialGradient id="nucleo"><stop offset="0" stopColor="#FFFFFF" /><stop offset="0.45" stopColor="#FFF4D6" /><stop offset="1" stopColor="#F5C451" /></radialGradient>
            <radialGradient id="halo"><stop offset="0" stopColor="#FFE7A3" stopOpacity="0.9" /><stop offset="0.35" stopColor="#F5C451" stopOpacity="0.35" /><stop offset="1" stopColor="#F5C451" stopOpacity="0" /></radialGradient>
            <linearGradient id="raio-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF4D6" stopOpacity="0" /><stop offset="0.5" stopColor="#FFF4D6" stopOpacity="1" /><stop offset="1" stopColor="#FFF4D6" stopOpacity="0" /></linearGradient>
            <linearGradient id="raio-h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFF4D6" stopOpacity="0" /><stop offset="0.5" stopColor="#FFF4D6" stopOpacity="1" /><stop offset="1" stopColor="#FFF4D6" stopOpacity="0" /></linearGradient>
            {planetas.map((p) => (
              <g key={p.i}>
                <clipPath id={`corte-${p.i}`}><circle cx={p.x} cy={p.y} r={p.r} /></clipPath>
                {/* anel: metade de trás fica atrás do planeta, metade da frente passa na frente */}
                <clipPath id={`metade-${p.i}`}><rect x={p.x - p.r * 3} y={p.y - p.r * 3} width={p.r * 6} height={p.r * 3} transform={`rotate(${p.inclina} ${p.x} ${p.y})`} /></clipPath>
                <clipPath id={`frente-${p.i}`}><rect x={p.x - p.r * 3} y={p.y} width={p.r * 6} height={p.r * 3} transform={`rotate(${p.inclina} ${p.x} ${p.y})`} /></clipPath>
              </g>
            ))}
          </defs>
          <rect width={W} height={H} fill="url(#ceu)" />
          {fundo.map((f, k) => <circle key={`f${k}`} cx={f.x} cy={f.y} r="0.5" fill="#fff" opacity={f.o} />)}
          {estrelas.map((e) => (
            <g key={e.id} className={e.brilho > 0.82 ? 'pisca' : ''} style={{ animationDelay: `${(e.brilho * 4).toFixed(2)}s` }}>
              {e.tam >= 2.5 && <circle cx={e.x} cy={e.y} r={e.tam * 2.6} fill={e.cor} opacity="0.18" />}
              <circle cx={e.x} cy={e.y} r={e.tam} fill={e.cor} opacity={0.75 + e.brilho * 0.25} />
              {e.tam >= 2.5 && <path d={`M${e.x - e.tam * 3} ${e.y}H${e.x + e.tam * 3}M${e.x} ${e.y - e.tam * 3}V${e.y + e.tam * 3}`} stroke="#fff" strokeOpacity="0.5" strokeWidth="0.5" />}
            </g>
          ))}
          {/* órbitas-guia do tempo: quanto mais longe, mais tempo sem estudar */}
          {marcos.map(([ms, txt], k) => {
            const o = orbita(raio(ms))
            const t = 0.25 + k * 0.42 // rótulos em escada, para não se encostarem
            return (
              <g key={txt}>
                <ellipse cx={cx} cy={cy} rx={o.rx} ry={o.ry} fill="none" stroke="#C5D9E7" strokeOpacity="0.2" strokeDasharray="2 3" />
                <text x={cx + o.rx * Math.cos(t)} y={cy + o.ry * Math.sin(t) + 3} textAnchor="middle" className="universo-marco">{txt}</text>
              </g>
            )
          })}
          {planetas.filter((p) => p.atras).map(desenhaPlaneta)}

          <g className="cristo" role="button" tabIndex={0} aria-pressed={nomeCristo} aria-label="Cristo: tocar para mostrar o nome"
            onClick={(e) => { e.stopPropagation(); setNomeCristo((v) => !v) }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNomeCristo((v) => !v) } }}>
            <title>{`Cristo, no centro de tudo. Brilho ${Math.round(b * 100)}%: ${luz.leituras} ${luz.leituras === 1 ? 'devocional' : 'devocionais'} e ${luz.cultos} na igreja`}</title>
            <circle className="cristo-halo" cx={cx} cy={cy} r={rCristo * (2 + 3.5 * b)} fill="url(#halo)" opacity={0.35 + 0.65 * b} />
            <rect x={cx - 1.1} y={cy - raioV} width="2.2" height={raioV * 2} fill="url(#raio-v)" opacity={0.45 + 0.55 * b} />
            <rect x={cx - raioH} y={cy - rCristo * 0.55 - 1} width={raioH * 2} height="2" fill="url(#raio-h)" opacity={0.4 + 0.6 * b} />
            {[30, 60, 120, 150].map((g) => (
              <rect key={g} x={cx - 0.5} y={cy - rCristo * (1.4 + 1.6 * b)} width="1" height={rCristo * (2.8 + 3.2 * b)} fill="url(#raio-v)" opacity={0.15 + 0.35 * b} transform={`rotate(${g} ${cx} ${cy})`} />
            ))}
            <circle cx={cx} cy={cy} r={rCristo} fill="url(#nucleo)" />
            {nomeCristo && <text x={cx} y={cy - rCristo - 6} textAnchor="middle" className="universo-rotulo cristo-nome">Cristo</text>}
          </g>

          {planetas.filter((p) => !p.atras).map(desenhaPlaneta)}
          {!total && <text x={cx} y={H - 30} textAnchor="middle" className="universo-rotulo">Nenhum foco neste período</text>}
        </svg>
        <div className="universo-contas">
          <span title="Brilho de Cristo: cresce com o devocional e a igreja">✝ {Math.round(b * 100)}%</span>
          <span title="Matérias (planetas)">◍ {materias.length}</span>
          <span title="Sessões de foco (estrelas)">✦ {nEstrelas}</span>
          <span title="Tempo de foco">{duracao(total)}</span>
        </div>
      </div>
      {sel ? (
        <div className="planeta-info">
          <i style={{ background: sel.cor }} />
          <div>
            <strong>{sel.nome}</strong>
            <span className="suave">{duracao(sel.min)} em {sel.n} {sel.n === 1 ? 'sessão' : 'sessões'} · planeta {sel.tipo === 'oceano' ? 'oceânico' : sel.tipo === 'lava' ? 'de lava' : sel.tipo === 'nuvens' ? 'de nuvens' : sel.tipo}</span>
            <span className="suave">Última vez {ha(sel.idade)} ({sel.ultima.toLocaleDateString('pt-BR')}) · desde {sel.primeira.toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      ) : (
        materias.length > 0 && <p className="suave dica-universo">Toque num planeta para ver a matéria. Mais perto de Cristo = estudada há menos tempo.</p>
      )}
    </>
  )
}

// ---------- Gráficos ----------
function Barras({ valores, rotulos, destaque, dica }) {
  const max = Math.max(1, ...valores)
  return (
    <div className="barras barras-foco" style={{ '--n': valores.length }}>
      {valores.map((v, i) => (
        <div key={i} className="barra-col" title={dica(i, v)}>
          <span className="barra-valor">{valores.length <= 12 && v ? (v >= 60 ? `${Math.round(v / 60)}h` : v) : ''}</span>
          <i style={{ height: `${(v / max) * 100}%` }} className={i === destaque ? 'hoje' : ''} />
          <span className="barra-rotulo">{rotulos[i]}</span>
        </div>
      ))}
    </div>
  )
}

function TempoNoPeriodo({ visao, per, sessoes, total }) {
  let valores, rotulos, dica
  let destaque = -1
  const hj = hoje()
  if (visao === 'dia') {
    valores = porHora(sessoes)
    rotulos = valores.map((_, h) => (h % 6 === 0 ? hora(h).slice(0, 2) : ''))
    dica = (i, v) => `${hora(i)}: ${duracao(v)}`
    if (isoDia(per.ini) === isoDia(hj)) destaque = new Date().getHours()
  } else if (visao === 'semana' || visao === 'mes') {
    const n = visao === 'semana' ? 7 : per.fim.getDate()
    valores = Array(n).fill(0)
    for (const s of sessoes) valores[Math.round((deIso(s._dia) - per.ini) / 86400000)] += s.minutos
    const dias = valores.map((_, i) => new Date(per.ini.getFullYear(), per.ini.getMonth(), per.ini.getDate() + i))
    rotulos = dias.map((x, i) => (visao === 'semana' ? DIAS_CURTOS[x.getDay()] : i === 0 || (i + 1) % 5 === 0 ? x.getDate() : ''))
    dica = (i, v) => `${DIAS_CURTOS[dias[i].getDay()]} ${dataCurta(dias[i])}: ${duracao(v)}`
    destaque = dias.findIndex((x) => isoDia(x) === isoDia(hj))
  } else if (visao === 'tudo') {
    const a0 = per.ini.getFullYear()
    const anos = Array.from({ length: hj.getFullYear() - a0 + 1 }, (_, i) => a0 + i)
    valores = anos.map(() => 0)
    for (const s of sessoes) valores[s._dt.getFullYear() - a0] += s.minutos
    rotulos = anos.map(String)
    dica = (i, v) => `${anos[i]}: ${duracao(v)}`
    destaque = anos.length - 1
  } else {
    valores = Array(12).fill(0)
    for (const s of sessoes) valores[s._dt.getMonth()] += s.minutos
    rotulos = valores.map((_, i) => MESES[i].slice(0, 1).toUpperCase())
    dica = (i, v) => `${MESES[i]}: ${duracao(v)}`
    destaque = per.ini.getFullYear() === hj.getFullYear() ? hj.getMonth() : -1
  }
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Tempo de foco</h2><span className="suave">{sessoes.length} {sessoes.length === 1 ? 'sessão' : 'sessões'}</span></div>
      <p className="total-foco">Total: <strong>{duracao(total)}</strong></p>
      <Barras valores={valores} rotulos={rotulos} destaque={destaque} dica={dica} />
    </section>
  )
}

function DiaDaSemana({ per, sessoes }) {
  // média por dia da semana (só os dias do período que já passaram)
  const soma = Array(7).fill(0)
  const conta = Array(7).fill(0)
  const hj = isoDia(hoje())
  for (let x = per.ini; isoDia(x) <= per.b && isoDia(x) <= hj; x = new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1)) conta[x.getDay()]++
  for (const s of sessoes) soma[s._dt.getDay()] += s.minutos
  const media = ORDEM_SEMANA.map((n) => (conta[n] ? Math.round(soma[n] / conta[n]) : 0))
  const melhor = media.some((v) => v > 0) ? media.indexOf(Math.max(...media)) : -1
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Dia de maior foco</h2><span className="suave">média por dia</span></div>
      <p className="total-foco">{melhor >= 0 ? <>Maior foco {ORDEM_SEMANA[melhor] === 0 || ORDEM_SEMANA[melhor] === 6 ? 'no' : 'na'} <strong>{DIAS[ORDEM_SEMANA[melhor]].toLowerCase()}</strong></> : 'Sem foco neste período'}</p>
      <Barras valores={media} rotulos={ORDEM_SEMANA.map((n) => DIAS_CURTOS[n])} destaque={melhor}
        dica={(i, v) => `${DIAS[ORDEM_SEMANA[i]]}: ${duracao(v)} em média`} />
    </section>
  )
}

// minutos de foco em cada hora do dia (uma sessão que atravessa a hora é dividida)
function porHora(sessoes) {
  const h = Array(24).fill(0)
  for (const s of sessoes) {
    let t = s._dt.getHours() * 60 + s._dt.getMinutes()
    let resta = s.minutos
    while (resta > 0) {
      const ate = Math.min(resta, 60 - (t % 60))
      h[Math.floor(t / 60) % 24] += ate
      resta -= ate
      t += ate
    }
  }
  return h
}

function HorarioDoDia({ per, sessoes, visao }) {
  const dias = visao === 'dia' ? 1 : diasPassados(per)
  const valores = porHora(sessoes).map((v) => v / dias)
  const max = Math.max(...valores)
  const W = 320
  const H = 120
  const x = (i) => 18 + (i / 23) * (W - 30)
  const y = (v) => H - 22 - (max ? (v / max) * (H - 36) : 0)
  const pts = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const top = valores.map((v, i) => [v, i]).filter(([v]) => v > 0).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, i]) => i).sort((a, b) => a - b)
  const pico = max ? valores.indexOf(max) : -1
  const fmt = (v) => (v >= 10 ? `${Math.round(v)} min` : `${v.toFixed(1).replace('.', ',')} min`)
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Horário de maior foco</h2><span className="suave">{visao === 'dia' ? 'minutos em cada hora' : 'média por dia, em cada hora'}</span></div>
      <p className="total-foco">{top.length ? <>Maior foco às <strong>{top.map(hora).join(', ')}</strong></> : 'Sem foco neste período'}</p>
      <svg className="linha-horas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Foco por hora do dia; pico às ${pico >= 0 ? hora(pico) : '—'}`}>
        {[0, 0.5, 1].map((f) => <line key={f} x1="18" x2={W - 12} y1={H - 22 - f * (H - 36)} y2={H - 22 - f * (H - 36)} className="grade-linha" />)}
        {max > 0 && <polyline points={pts} fill="none" className="traco-linha" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {valores.map((v, i) => (
          <rect key={i} x={x(i) - 6} y="0" width="12" height={H - 18} fill="transparent"><title>{`${hora(i)}: ${fmt(v)}`}</title></rect>
        ))}
        {pico >= 0 && <><line x1={x(pico)} x2={x(pico)} y1="12" y2={H - 22} className="grade-linha" strokeDasharray="3 3" /><circle cx={x(pico)} cy={y(max)} r="4" className="ponto-linha" strokeWidth="2" /></>}
        {[0, 6, 12, 18, 23].map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="eixo-texto">{hora(i)}</text>)}
      </svg>
    </section>
  )
}

function PorMateria({ materias, total }) {
  const [todas, setTodas] = useState(false)
  if (!total) {
    return <section className="cartao"><div className="cab-cartao"><h2>Por matéria</h2></div><Vazio>Sem foco neste período.</Vazio></section>
  }
  const R = 42
  const C = 2 * Math.PI * R
  // fatias: matérias com cor própria; as sem cor juntam em "Outras"
  const comCor = materias.filter((m) => m.cor !== COR_OUTROS)
  const resto = materias.filter((m) => m.cor === COR_OUTROS).reduce((s, m) => s + m.min, 0)
  const fatias = [...comCor, ...(resto ? [{ nome: 'Outras', min: resto, cor: COR_OUTROS }] : [])]
  let acum = 0
  const lista = todas ? materias : materias.slice(0, 7)
  const pct = (v) => Math.round((100 * v) / total)
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Por matéria</h2><span className="suave">{materias.length} {materias.length === 1 ? 'marcador' : 'marcadores'}</span></div>
      <div className="pizza">
        <svg viewBox="0 0 120 120" width="170" height="170" role="img" aria-label={`Foco por matéria: ${fatias.map((f) => `${f.nome} ${pct(f.min)}%`).join(', ')}`}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--neutro)" strokeWidth="22" />
          {fatias.map((f) => {
            const parte = (f.min / total) * C
            const el = (
              <circle key={f.nome} cx="60" cy="60" r={R} fill="none" stroke={f.cor} strokeWidth="22"
                strokeDasharray={`${Math.max(0, parte - (fatias.length > 1 ? 1.2 : 0))} ${C}`} strokeDashoffset={-acum} transform="rotate(-90 60 60)">
                <title>{`${f.nome}: ${duracao(f.min)} (${pct(f.min)}%)`}</title>
              </circle>
            )
            acum += parte
            return el
          })}
          <text x="60" y="57" textAnchor="middle" fontSize="9" fill="var(--suave)">foco</text>
          <text x="60" y="71" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--tinta)">{duracao(total)}</text>
        </svg>
        <ul className="pizza-legenda legenda-materias">
          {lista.map((m) => (
            <li key={m.nome}><i style={{ background: m.cor }} /><span>{m.nome}</span><strong>{duracao(m.min)}</strong><span className="suave">{pct(m.min)}%</span></li>
          ))}
        </ul>
      </div>
      {materias.length > 7 && <button type="button" className="btn-texto ver-mais" onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : `Ver mais (${materias.length - 7})`}</button>}
    </section>
  )
}

function Detalhe({ p, aoVerEtapas, aoEditar, compacto }) {
  const { d } = useDados()
  const e = estadoPlaneta(d, p)
  const a = infoArea(d, p.area_id)
  const ant = LIMITES[e.fase - 1] ?? 0
  const prox = LIMITES[e.fase]
  const pct = e.fase >= 5 ? 100 : Math.round(((e.energia - ant) / (prox - ant)) * 100)
  const faltam = p.prazo ? difDias(deIso(p.prazo), hoje()) : null
  const treino = p.tipo === 'treino'
  return (
    <section className={`cartao detalhe-planeta ${compacto ? 'compacto' : ''}`}>
      <div className="detalhe-topo">
        <Planeta fase={e.fase} apagado={e.apagado} tamanho={compacto ? 76 : 104} />
        <div className="detalhe-textos">
          <span className="tag" style={{ background: `color-mix(in srgb, ${a.cor} 18%, var(--superficie))`, color: 'var(--tinta)' }}>{a.nome}</span>
          <h2>{p.nome}</h2>
          <span className="suave">Fase {e.fase} de 5 · {FASES[e.fase]}{e.apagado ? ` · sem brilho há ${e.parado} dias` : ''}</span>
        </div>
      </div>
      <div>
        <div className="linha-energia"><span>Energia {e.energia}</span><span className="suave">{e.fase >= 5 ? 'Fase máxima' : `faltam ${e.falta} para ${FASES[e.fase + 1]}`}</span></div>
        <div className="barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Energia até a próxima fase"><div style={{ width: `${pct}%` }} /></div>
      </div>
      <dl className="numeros">
        {treino ? (
          <><div><dt>Treinos concluídos</dt><dd>{e.treinos.length}</dd></div><div><dt>Cada treino</dt><dd>+10 de energia</dd></div></>
        ) : (
          <>
            <div><dt>Etapas</dt><dd>{e.feitas.length} de {e.etapas.length}</dd></div>
            <div><dt>Tempo</dt><dd>{duracao(e.minFeito)} de {duracao(e.minTotal)}</dd></div>
            {e.minFoco > 0 && <div><dt>Foco</dt><dd>{duracao(e.minFoco)}</dd></div>}
            {p.prazo && <div><dt>Prazo</dt><dd>{dataCurta(deIso(p.prazo))}{faltam >= 0 ? ` · ${faltam === 0 ? 'hoje' : faltam === 1 ? 'amanhã' : `em ${faltam} dias`}` : ''}</dd></div>}
          </>
        )}
      </dl>
      {!compacto && p.descricao && <p className="suave">{p.descricao}</p>}
      <div className="acoes">
        {treino
          ? <Link to="/treino" className="btn btn-primario">Abrir o treino</Link>
          : <button type="button" className="btn btn-primario" onClick={aoVerEtapas}>Ver etapas</button>}
        <button type="button" className="btn btn-sec" onClick={aoEditar}><Icone nome="editar" tamanho={18} />Editar</button>
      </div>
    </section>
  )
}

function Etapas({ p, aoFechar }) {
  const { d, salvar } = useDados()
  const [editando, setEditando] = useState(null)
  const [nova, setNova] = useState('')
  const [min, setMin] = useState('')
  const e = estadoPlaneta(d, p)
  const lista = [...e.etapas].sort((a, b) =>
    Number(a.feita) - Number(b.feita) || (a.dia || '9999').localeCompare(b.dia || '9999') || String(a.inicio || '').localeCompare(String(b.inicio || '')) || a.ordem - b.ordem)

  async function adicionar(ev) {
    ev.preventDefault()
    if (!nova.trim()) return
    const ok = await salvar('tarefas', { titulo: nova.trim(), projeto_id: p.id, minutos: Number(min) > 0 ? Math.round(Number(min)) : null, ordem: e.etapas.length })
    if (ok) { setNova(''); setMin('') }
  }

  return (
    <>
      <Modal larga titulo={`Etapas de ${p.nome}`} aoFechar={aoFechar}
        subtitulo={`${e.feitas.length} de ${e.etapas.length} feitas · ${duracao(e.minFeito)} de ${duracao(e.minTotal)} · cada etapa feita dá +10 de energia`}>
        {lista.length === 0 && <Vazio>Nenhuma etapa ainda.</Vazio>}
        <div className="lista-etapas">
          {lista.map((t) => <LinhaTarefa key={t.id} tarefa={t} aoEditar={setEditando} mostrarDia mostrarProjeto={false} />)}
        </div>
        <form className="nova-etapa" onSubmit={adicionar}>
          <Field label="Nova etapa"><input type="text" value={nova} maxLength={160} onChange={(ev) => setNova(ev.target.value)} /></Field>
          <Field label="Minutos"><input type="number" inputMode="numeric" min={1} max={720} value={min} onChange={(ev) => setMin(ev.target.value)} /></Field>
          <Botao type="submit" disabled={!nova.trim()}><Icone nome="mais" tamanho={18} />Adicionar</Botao>
        </form>
      </Modal>
      {editando && <EditorTarefa tarefa={editando} aoFechar={() => setEditando(null)} />}
    </>
  )
}

function EditorPlaneta({ projeto, aoFechar }) {
  const { d, salvar } = useDados()
  const [p, setP] = useState(projeto || { nome: '', area_id: d.areas[0]?.id || null, prazo: '', descricao: '' })
  const [salvando, setSalvando] = useState(false)
  const muda = (c) => setP((x) => ({ ...x, ...c }))

  async function enviar(ev) {
    ev.preventDefault()
    if (!p.nome.trim()) return
    setSalvando(true)
    const linha = { ...(projeto ? { id: projeto.id } : {
      // planeta novo entra numa posição livre do sistema solar
      pos_x: 15 + ((d.projetos.length * 29) % 70), pos_y: 18 + ((d.projetos.length * 41) % 64), ordem: d.projetos.length,
    }), nome: p.nome.trim(), area_id: p.area_id || null, prazo: p.prazo || null, descricao: p.descricao?.trim() || null }
    const ok = await salvar('projetos', linha)
    setSalvando(false)
    if (ok) aoFechar(ok)
  }

  async function arquivar() {
    if (!window.confirm(`Arquivar o planeta ${projeto.nome}? Ele sai do sistema solar, mas nada é apagado.`)) return
    await salvar('projetos', { id: projeto.id, arquivado: true })
    aoFechar()
  }

  return (
    <Modal titulo={projeto ? 'Editar planeta' : 'Novo planeta'} aoFechar={() => aoFechar()}
      rodape={<>
        {projeto && <button type="button" className="btn btn-sec" onClick={arquivar}>Arquivar</button>}
        <div className="espaco" />
        <button type="button" className="btn btn-sec" onClick={() => aoFechar()}>Cancelar</button>
        <Botao type="submit" form="form-planeta" carregando={salvando}>Salvar</Botao>
      </>}>
      <form id="form-planeta" className="form" onSubmit={enviar}>
        <Field label="Nome do projeto ou matéria"><input type="text" value={p.nome} maxLength={80} required autoFocus onChange={(e) => muda({ nome: e.target.value })} /></Field>
        <div className="grade-2">
          <Field label="Área">
            <select value={p.area_id || ''} onChange={(e) => muda({ area_id: e.target.value || null })}>
              <option value="">Sem área</option>
              {d.areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </Field>
          <Field label="Prazo ou prova (opcional)"><input type="date" value={p.prazo || ''} onChange={(e) => muda({ prazo: e.target.value })} /></Field>
        </div>
        <Field label="Descrição (opcional)"><textarea rows={2} maxLength={500} value={p.descricao || ''} onChange={(e) => muda({ descricao: e.target.value })} /></Field>
      </form>
    </Modal>
  )
}
