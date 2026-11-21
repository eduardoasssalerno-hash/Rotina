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

const VISOES = [{ v: 'dia', label: 'Dia' }, { v: 'semana', label: 'Semana' }, { v: 'mes', label: 'Mês' }, { v: 'ano', label: 'Ano' }]
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0]
const hora = (h) => `${String(h).padStart(2, '0')}:00`

export default function Planetas() {
  const { d } = useDados()
  const [visao, setVisao] = useState('semana')
  const [desloca, setDesloca] = useState(0)
  const [etapasDe, setEtapasDe] = useState(null)
  const [editando, setEditando] = useState(null) // projeto, ou {} para novo
  const ativos = d.projetos.filter((p) => !p.arquivado).sort((a, b) => a.ordem - b.ordem)

  const per = periodo(visao, desloca)
  const sessoes = sessoesDo(d, per)
  const corDe = coresDasMaterias(d)
  const total = sessoes.reduce((s, x) => s + x.minutos, 0)
  // minutos por matéria no período
  const porMateria = new Map()
  for (const s of sessoes) {
    const m = marcadorDe(d, s)
    porMateria.set(m, (porMateria.get(m) || 0) + s.minutos)
  }
  const materias = [...porMateria.entries()].map(([nome, min]) => ({ nome, min, cor: corDe(nome) })).sort((a, b) => b.min - a.min)
  const trocarVisao = (v) => { setVisao(v); setDesloca(0) }

  return (
    <div className="tela">
      <Cabecalho titulo="Planetas" sub="Cada sessão de foco vira uma estrela; cada matéria, um planeta em órbita do seu">
        <button type="button" className="btn btn-primario" onClick={() => setEditando({})}><Icone nome="mais" tamanho={20} />Planeta</button>
      </Cabecalho>

      <section className="cartao universo-cartao">
        <Segmentos label="Período" value={visao} onChange={trocarVisao} options={VISOES} />
        <div className="navegar navegar-universo">
          <button type="button" className="btn-icone" onClick={() => setDesloca((n) => n - 1)} aria-label="Período anterior"><Icone nome="voltar" /></button>
          <strong>{per.titulo}</strong>
          <button type="button" className="btn-icone" onClick={() => setDesloca((n) => Math.min(0, n + 1))} disabled={desloca === 0} aria-label="Próximo período"><Icone nome="avancar" /></button>
          {desloca !== 0 && <button type="button" className="btn btn-sec btn-peq" onClick={() => setDesloca(0)}>Atual</button>}
        </div>
        <Universo sessoes={sessoes} materias={materias} total={total} corDe={corDe} d={d} chave={`${visao}${per.a}`} />
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
// Fundo: uma estrela por sessão (maior quanto mais longa). Centro: o seu planeta, que cresce com as
// horas do período e acende uma luz (cidade) por dia com foco. Em volta: uma órbita por matéria,
// com o planeta da matéria maior quanto mais horas, anel a partir de 10 h e uma lua a cada 5 h.
function Universo({ sessoes, materias, total, corDe, d, chave }) {
  const W = 400
  const H = 320
  const cx = W / 2
  const cy = H / 2 + 4
  const horas = total / 60
  const rCasa = 16 + Math.min(22, Math.sqrt(horas) * 2.4)
  const diasComFoco = new Set(sessoes.map((s) => s._dia)).size
  const nEstrelas = sessoes.length
  // poucas sessões (um dia) = estrelas maiores; muitas (um ano) = menores
  const escala = nEstrelas > 300 ? 0.75 : nEstrelas > 60 ? 1 : nEstrelas > 15 ? 1.4 : 2

  // estrelas: posição fixa por sessão
  const estrelas = sessoes.map((s) => {
    const r = semente(String(s.id))
    const tam = s.minutos >= 90 ? 2.6 : s.minutos >= 50 ? 1.9 : s.minutos >= 25 ? 1.35 : 0.85
    return { id: s.id, x: 6 + r() * (W - 12), y: 6 + r() * (H - 12), tam: tam * escala, cor: corDe(marcadorDe(d, s)), brilho: r(), min: s.minutos }
  })
  // luzes das cidades no planeta central
  const rLuz = semente(`luzes${chave}`)
  const luzes = Array.from({ length: Math.min(90, diasComFoco) }, () => {
    const a = rLuz() * 2 * Math.PI
    const dist = Math.sqrt(rLuz()) * rCasa * 0.82
    return { x: cx + Math.cos(a) * dist, y: cy + Math.sin(a) * dist * 0.96 }
  })
  // planetas das matérias (até 6 órbitas)
  const top = materias.slice(0, 6)
  const maxMin = top[0]?.min || 1
  // órbitas espalhadas do planeta central até a borda
  const rx0 = rCasa + 32
  const rxMax = W / 2 - 22
  const passo = top.length > 1 ? (rxMax - rx0) / (top.length - 1) : 0
  const planetas = top.map((m, i) => {
    const rx = top.length > 1 ? rx0 + i * passo : rx0 + 30
    const ry = rx * 0.4
    const ang = semente(m.nome)() * 2 * Math.PI
    const r = 6 + 11 * Math.sqrt(m.min / maxMin)
    return { ...m, rx, ry, x: cx + rx * Math.cos(ang), y: cy + ry * Math.sin(ang), r, anel: m.min >= 600, luas: Math.min(3, Math.floor(m.min / 300)), atras: Math.sin(ang) < 0, acima: i % 2 === 1 }
  })
  // céu de fundo fixo e bem fraco (as estrelas de verdade são as sessões)
  const rFundo = semente('fundo')
  const fundo = Array.from({ length: 70 }, () => ({ x: rFundo() * W, y: rFundo() * H, o: 0.12 + rFundo() * 0.2 }))
  const desenhaPlaneta = (p) => (
    <g key={p.nome} className="universo-planeta">
      <title>{`${p.nome}: ${duracao(p.min)}`}</title>
      {p.anel && <ellipse cx={p.x} cy={p.y} rx={p.r * 1.9} ry={p.r * 0.55} fill="none" stroke={p.cor} strokeOpacity="0.55" strokeWidth="1.6" transform={`rotate(-14 ${p.x} ${p.y})`} />}
      <circle cx={p.x} cy={p.y} r={p.r} fill={p.cor} />
      <circle cx={p.x - p.r * 0.3} cy={p.y - p.r * 0.35} r={p.r * 0.45} fill="#fff" opacity="0.18" />
      <circle cx={p.x} cy={p.y} r={p.r} fill="url(#sombra-planeta)" />
      {Array.from({ length: p.luas }, (_, k) => {
        const a = -0.6 + k * 1.1
        return <circle key={k} cx={p.x + Math.cos(a) * (p.r + 5)} cy={p.y - Math.sin(a) * (p.r + 4)} r="1.5" fill="#D9E2EC" />
      })}
      <text x={p.x} y={p.acima ? p.y - p.r - (p.anel ? 6 : 5) : p.y + p.r + (p.anel ? 10 : 9)} textAnchor="middle" className="universo-rotulo">{p.nome.length > 18 ? `${p.nome.slice(0, 17)}…` : p.nome}</text>
    </g>
  )

  return (
    <div className="universo">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${nEstrelas} sessões de foco, ${duracao(total)} no período${top.length ? `; matérias: ${top.map((m) => `${m.nome} ${duracao(m.min)}`).join(', ')}` : ''}`}>
        <defs>
          <radialGradient id="ceu" cx="50%" cy="55%" r="70%"><stop offset="0" stopColor="#13284A" /><stop offset="1" stopColor="#050B17" /></radialGradient>
          <radialGradient id="casa" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#5F8FC4" /><stop offset="0.55" stopColor="#24497A" /><stop offset="1" stopColor="#0C1E38" /></radialGradient>
          <radialGradient id="atmosfera" r="50%"><stop offset="0.78" stopColor="#7FB2E6" stopOpacity="0" /><stop offset="0.9" stopColor="#7FB2E6" stopOpacity="0.35" /><stop offset="1" stopColor="#7FB2E6" stopOpacity="0" /></radialGradient>
          <radialGradient id="sombra-planeta" cx="30%" cy="28%" r="85%"><stop offset="0.5" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.45" /></radialGradient>
          <clipPath id="recorte-casa"><circle cx={cx} cy={cy} r={rCasa} /></clipPath>
        </defs>
        <rect width={W} height={H} fill="url(#ceu)" />
        {fundo.map((f, i) => <circle key={`f${i}`} cx={f.x} cy={f.y} r="0.5" fill="#fff" opacity={f.o} />)}
        {estrelas.map((e) => (
          <g key={e.id} className={e.brilho > 0.82 ? 'pisca' : ''} style={{ animationDelay: `${(e.brilho * 4).toFixed(2)}s` }}>
            {e.tam >= 2.5 && <circle cx={e.x} cy={e.y} r={e.tam * 2.6} fill={e.cor} opacity="0.18" />}
            <circle cx={e.x} cy={e.y} r={e.tam} fill={e.cor} opacity={0.75 + e.brilho * 0.25} />
            {e.tam >= 2.5 && <path d={`M${e.x - e.tam * 3} ${e.y}H${e.x + e.tam * 3}M${e.x} ${e.y - e.tam * 3}V${e.y + e.tam * 3}`} stroke="#fff" strokeOpacity="0.5" strokeWidth="0.5" />}
          </g>
        ))}
        {planetas.map((p) => <ellipse key={`o${p.nome}`} cx={cx} cy={cy} rx={p.rx} ry={p.ry} fill="none" stroke="#C5D9E7" strokeOpacity="0.22" strokeDasharray="2 3" />)}
        {planetas.filter((p) => p.atras).map(desenhaPlaneta)}
        <circle cx={cx} cy={cy} r={rCasa * 1.25} fill="url(#atmosfera)" />
        <circle cx={cx} cy={cy} r={rCasa} fill="url(#casa)" opacity={total ? 1 : 0.45} />
        <g clipPath="url(#recorte-casa)">
          <ellipse cx={cx - rCasa * 0.25} cy={cy - rCasa * 0.1} rx={rCasa * 0.55} ry={rCasa * 0.3} fill="#3E7A5C" opacity="0.55" />
          <ellipse cx={cx + rCasa * 0.4} cy={cy + rCasa * 0.35} rx={rCasa * 0.35} ry={rCasa * 0.22} fill="#3E7A5C" opacity="0.5" />
          {luzes.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r="0.95" fill="#FFD98A" opacity="0.95" />)}
          <circle cx={cx} cy={cy} r={rCasa} fill="url(#sombra-planeta)" />
        </g>
        {planetas.filter((p) => !p.atras).map(desenhaPlaneta)}
        {!total && <text x={cx} y={cy + rCasa + 20} textAnchor="middle" className="universo-rotulo">Nenhum foco neste período</text>}
      </svg>
      <div className="universo-contas">
        <span title="Sessões de foco (estrelas)">✦ {nEstrelas}</span>
        <span title="Tempo de foco">{duracao(total)}</span>
        <span title="Dias com foco (luzes no seu planeta)">◉ {diasComFoco} {diasComFoco === 1 ? 'dia' : 'dias'}</span>
      </div>
    </div>
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
