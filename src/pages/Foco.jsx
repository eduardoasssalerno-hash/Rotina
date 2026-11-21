import { useEffect, useRef, useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { duracao, fmtHora, hoje, isoDia, pad } from '../lib/util.js'
import { Botao, Icone, Segmentos, Vazio, useToast } from '../components/ui.jsx'
import { Cabecalho } from './Shell.jsx'
import { marcadorDe } from '../lib/foco.js'

const CHAVE = '3s-rotina-foco'
const DURACOES = [25, 50, 90]
const CHAVE_LOFI = '3s-rotina-lofi'
// Rádio lofi 24 horas (Lofi Girl) no YouTube; dá para trocar por outro link
const LOFI_PADRAO = 'https://www.youtube.com/watch?v=jfKfPfyJRdk'

function lerLofi() {
  try { return { ligado: true, link: LOFI_PADRAO, ...JSON.parse(localStorage.getItem(CHAVE_LOFI) || '{}') } } catch { return { ligado: true, link: LOFI_PADRAO } }
}
function gravarLofi(l) {
  try { localStorage.setItem(CHAVE_LOFI, JSON.stringify(l)) } catch { /* sem armazenamento */ }
}
// Transforma um link do YouTube (vídeo, live ou playlist) no endereço do player
export function enderecoPlayer(link) {
  try {
    const u = new URL(String(link).trim())
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname)) return null
    const lista = u.searchParams.get('list')
    let id = u.searchParams.get('v')
    if (!id && u.hostname.endsWith('youtu.be')) id = u.pathname.slice(1)
    if (!id) id = (u.pathname.match(/\/(?:live|embed|shorts)\/([\w-]{6,})/) || [])[1]
    const base = 'https://www.youtube-nocookie.com/embed/'
    const extras = 'autoplay=1&enablejsapi=1&playsinline=1&rel=0'
    if (id && /^[\w-]{6,20}$/.test(id)) return `${base}${id}?${extras}${lista ? `&list=${encodeURIComponent(lista)}` : ''}`
    if (lista) return `${base}videoseries?list=${encodeURIComponent(lista)}&${extras}`
  } catch { /* link inválido */ }
  return null
}

// O cronômetro fica guardado neste aparelho: sair da tela não perde a contagem
function lerFoco() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || null } catch { return null }
}
function gravarFoco(f) {
  try { f ? localStorage.setItem(CHAVE, JSON.stringify(f)) : localStorage.removeItem(CHAVE) } catch { /* sem armazenamento */ }
}
// segundos já focados
function decorrido(f, agora = Date.now()) {
  if (!f) return 0
  const fim = f.pausadoEm || agora
  return Math.max(0, Math.floor((fim - f.inicio - f.pausas) / 1000))
}

function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.2, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.3)
    })
    navigator.vibrate?.([200, 120, 200])
  } catch { /* sem som */ }
}

export default function Foco() {
  const { d, salvar } = useDados()
  const toast = useToast()
  const [foco, setFoco] = useState(lerFoco)
  const [, setTique] = useState(0)
  const [minutos, setMinutos] = useState(foco?.duracao || 25)
  const [lofi, setLofiEstado] = useState(lerLofi)
  const [trocando, setTrocando] = useState(false)
  const player = useRef(null)
  const setLofi = (l) => { setLofiEstado(l); gravarLofi(l) }
  const [tarefaId, setTarefaId] = useState(() => new URLSearchParams(window.location.search).get('tarefa') || foco?.tarefa_id || '')
  const salvando = useRef(false)
  const trava = useRef(null)
  const iso = isoDia(hoje())

  // tarefas que dá para focar: as de hoje e as etapas ainda abertas dos planetas
  const opcoes = d.tarefas
    .filter((t) => !t.feita && (t.dia === iso || (t.projeto_id && (!t.dia || t.dia >= iso))))
    .sort((a, b) => (a.dia || '9999').localeCompare(b.dia || '9999') || String(a.inicio || '').localeCompare(String(b.inicio || '')))
  const tarefa = d.tarefas.find((t) => t.id === (foco?.tarefa_id ?? tarefaId))
  const projeto = tarefa?.projeto_id ? d.projetos.find((p) => p.id === tarefa.projeto_id) : null

  const total = (foco?.duracao || minutos) * 60
  const seg = decorrido(foco)
  const resta = Math.max(0, total - seg)
  const rodando = foco && !foco.pausadoEm

  async function registrar(f, segundos, aviso) {
    if (salvando.current) return
    salvando.current = true
    const min = Math.min(240, Math.round(segundos / 60))
    gravarFoco(null)
    setFoco(null)
    trava.current?.release?.().catch(() => {})
    if (min >= 1) {
      const t = d.tarefas.find((x) => x.id === f.tarefa_id)
      // guarda o nome da matéria: mesmo que o planeta seja apagado depois, a estatística continua certa
      const m = marcadorDe(d, { tarefa_id: f.tarefa_id, projeto_id: t?.projeto_id })
      const ok = await salvar('sessoes_foco', { tarefa_id: f.tarefa_id || null, projeto_id: t?.projeto_id || null, minutos: min, inicio: new Date(f.inicio).toISOString(), marcador: m === 'Foco livre' ? null : m.slice(0, 60) })
      if (ok) toast(aviso || `${duracao(min)} de foco registrados${t?.projeto_id ? '. O planeta ganhou energia!' : ''}`)
    } else {
      toast('Menos de 1 minuto: não foi registrado.')
    }
    salvando.current = false
  }

  // relógio: atualiza a cada segundo e termina sozinho
  useEffect(() => {
    if (!foco) return
    const t = setInterval(() => {
      setTique((n) => n + 1)
      if (!foco.pausadoEm && decorrido(foco) >= foco.duracao * 60) {
        bip()
        registrar(foco, foco.duracao * 60, `Fim do foco! ${duracao(foco.duracao)} registrados.`)
      }
    }, 1000)
    return () => clearInterval(t)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  // mantém a tela do tablet acesa enquanto o foco roda
  useEffect(() => {
    if (!rodando || !('wakeLock' in navigator)) return
    navigator.wakeLock.request('screen').then((w) => { trava.current = w }).catch(() => {})
    return () => { trava.current?.release?.().catch(() => {}); trava.current = null }
  }, [rodando])

  const minutosEscolhidos = minutos
  function comecar() {
    if (!minutosEscolhidos) return
    const f = { inicio: Date.now(), pausas: 0, pausadoEm: null, duracao: minutosEscolhidos, tarefa_id: tarefaId || null }
    gravarFoco(f)
    setFoco(f)
  }
  function comandoPlayer(func) {
    player.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*')
  }
  function pausar() {
    comandoPlayer(foco.pausadoEm ? 'playVideo' : 'pauseVideo')
    const f = foco.pausadoEm
      ? { ...foco, pausas: foco.pausas + (Date.now() - foco.pausadoEm), pausadoEm: null }
      : { ...foco, pausadoEm: Date.now() }
    gravarFoco(f)
    setFoco(f)
  }
  function cancelar() {
    if (!window.confirm('Cancelar este foco sem registrar o tempo?')) return
    gravarFoco(null)
    setFoco(null)
  }

  const R = 46
  const C = 2 * Math.PI * R
  const sessoesHoje = d.sessoes_foco.filter((s) => isoDia(new Date(s.inicio)) === iso).sort((a, b) => b.inicio.localeCompare(a.inicio))
  const minHoje = sessoesHoje.reduce((s, x) => s + x.minutos, 0)

  return (
    <div className="tela">
      <Cabecalho titulo="Modo foco" sub="Cada 25 minutos de foco numa etapa dá +15 de energia ao planeta" />
      <div className="grade-hoje">
        <section className="cartao foco">
          {foco ? (
            <div className="relogio-foco" role="timer" aria-live="off" aria-label={`Faltam ${Math.floor(resta / 60)} minutos`}>
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r={R} fill="none" stroke="var(--neutro)" strokeWidth="5" />
                <circle cx="50" cy="50" r={R} fill="none" stroke="var(--acento)" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${C * (1 - resta / total)} ${C}`} transform="rotate(-90 50 50)" />
              </svg>
              <div className="relogio-textos">
                <strong>{pad(Math.floor(resta / 60))}:{pad(resta % 60)}</strong>
                <span className="suave">{foco.pausadoEm ? 'pausado' : 'focando'}</span>
              </div>
            </div>
          ) : (
            <Disco minutos={minutos} aoMudar={setMinutos} />
          )}

          {!foco ? (
            <>
              <div className="duracoes">
                <Segmentos label="Duração" value={DURACOES.includes(minutos) ? minutos : null} onChange={setMinutos} options={DURACOES.map((m) => ({ v: m, label: `${m} min` }))} />
              </div>
              <p className="suave dica-disco">Gire o círculo para ajustar o tempo: anda de 10 em 10 minutos, e cada volta são 60 (até 4 horas).</p>
              <label className="campo foco-tarefa">
                <span className="campo-rotulo">No que você vai focar?</span>
                <select value={tarefaId} onChange={(e) => setTarefaId(e.target.value)}>
                  <option value="">Foco livre (sem tarefa)</option>
                  {opcoes.map((t) => {
                    const p = t.projeto_id ? d.projetos.find((x) => x.id === t.projeto_id) : null
                    return <option key={t.id} value={t.id}>{p ? `${p.nome}: ` : ''}{t.titulo}</option>
                  })}
                </select>
              </label>
              <div className="lofi-escolha">
                <label className="check-simples"><input type="checkbox" checked={lofi.ligado} onChange={(e) => setLofi({ ...lofi, ligado: e.target.checked })} />Tocar lofi enquanto foco</label>
                <button type="button" className="btn-texto" onClick={() => setTrocando(!trocando)}>{trocando ? 'Fechar' : 'Trocar música'}</button>
              </div>
              {trocando && (
                <label className="campo foco-tarefa">
                  <span className="campo-rotulo">Link do YouTube (vídeo, live ou playlist)</span>
                  <input type="text" value={lofi.link} onChange={(e) => setLofi({ ...lofi, link: e.target.value })} />
                  <span className="campo-dica">{enderecoPlayer(lofi.link) ? 'Link válido.' : 'Esse link não é do YouTube.'} <button type="button" className="btn-texto" onClick={() => setLofi({ ...lofi, link: LOFI_PADRAO })}>Voltar para a rádio lofi</button></span>
                </label>
              )}
              <Botao className="btn btn-primario btn-grande" onClick={comecar} disabled={!minutosEscolhidos}><Icone nome="relogio" />Começar</Botao>
            </>
          ) : (
            <>
              <p className="foco-sobre">{tarefa ? <><strong>{tarefa.titulo}</strong>{projeto && <span className="suave"> · {projeto.nome}</span>}</> : 'Foco livre'}</p>
              {lofi.ligado && enderecoPlayer(lofi.link) && (
                <div className="player-lofi">
                  <iframe ref={player} src={enderecoPlayer(lofi.link)} title="Música lofi" allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" />
                  <span className="suave">Se a música não começar sozinha, toque no play.</span>
                </div>
              )}
              <div className="acoes">
                <button type="button" className="btn btn-sec" onClick={pausar}>{foco.pausadoEm ? 'Continuar' : 'Pausar'}</button>
                <Botao onClick={() => registrar(foco, decorrido(foco))}><Icone nome="check" tamanho={18} />Terminar e salvar</Botao>
                <button type="button" className="btn-texto" onClick={cancelar}>Cancelar</button>
              </div>
            </>
          )}
        </section>

        <section className="cartao">
          <div className="cab-cartao"><h2>Foco de hoje</h2><span className="suave">{duracao(minHoje)}</span></div>
          {sessoesHoje.length === 0 && <Vazio>Nenhuma sessão hoje ainda.</Vazio>}
          <ul className="historico">
            {sessoesHoje.map((s) => {
              const t = d.tarefas.find((x) => x.id === s.tarefa_id)
              return (
                <li key={s.id}>
                  <strong>{fmtHora(new Date(s.inicio).toTimeString())}</strong>
                  <span>{t ? t.titulo : 'Foco livre'}</span>
                  <span className="suave">{duracao(s.minutos)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

// Disco para escolher o tempo: arrastar em volta do círculo vai somando os minutos.
// Uma volta = 60 minutos, andando de 10 em 10; dá para dar várias voltas (até 240). Setas do teclado também funcionam.
const MIN_DISCO = 10
const MAX_DISCO = 240
const PASSO_DISCO = 10
function Disco({ minutos, aoMudar }) {
  const ref = useRef(null)
  const giro = useRef(null) // { ang, graus }
  const [arrastando, setArrastando] = useState(false)
  const R = 44
  const C = 2 * Math.PI * R
  const limitar = (m) => Math.max(MIN_DISCO, Math.min(MAX_DISCO, Math.round(m / PASSO_DISCO) * PASSO_DISCO))

  function angulo(e) {
    const r = ref.current.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360 // 0° no topo, sentido horário
  }
  function inicio(e) {
    e.preventDefault()
    ref.current.setPointerCapture?.(e.pointerId)
    giro.current = { ang: angulo(e), graus: minutos * 6 }
    setArrastando(true)
  }
  function move(e) {
    if (!giro.current) return
    const a = angulo(e)
    let delta = a - giro.current.ang
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    giro.current.ang = a
    giro.current.graus = Math.max(MIN_DISCO * 6, Math.min(MAX_DISCO * 6, giro.current.graus + delta))
    const m = limitar(giro.current.graus / 6)
    if (m !== minutos) { aoMudar(m); navigator.vibrate?.(4) }
  }
  function fim() { giro.current = null; setArrastando(false) }
  function teclas(e) {
    const passo = PASSO_DISCO
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); aoMudar(limitar(minutos + passo)) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); aoMudar(limitar(minutos - passo)) }
  }

  const voltas = Math.floor((minutos - 1) / 60)
  const frac = (((minutos - 1) % 60) + 1) / 60
  const ang = frac * 2 * Math.PI
  const px = 50 + R * Math.sin(ang)
  const py = 50 - R * Math.cos(ang)
  return (
    <div className={`relogio-foco disco ${arrastando ? 'girando' : ''}`}>
      <svg ref={ref} viewBox="0 0 100 100" role="slider" tabIndex={0} aria-label="Tempo de foco, em minutos"
        aria-valuemin={MIN_DISCO} aria-valuemax={MAX_DISCO} aria-valuenow={minutos} aria-valuetext={duracao(minutos)}
        onPointerDown={inicio} onPointerMove={move} onPointerUp={fim} onPointerCancel={fim} onKeyDown={teclas}>
        <circle cx="50" cy="50" r={R} fill="none" stroke={voltas > 0 ? 'var(--acento)' : 'var(--neutro)'} strokeOpacity={voltas > 0 ? 0.35 : 1} strokeWidth="7" />
        {[...Array(12)].map((_, i) => {
          const a = (i * Math.PI) / 6
          return <line key={i} x1={50 + 36 * Math.sin(a)} y1={50 - 36 * Math.cos(a)} x2={50 + 38.5 * Math.sin(a)} y2={50 - 38.5 * Math.cos(a)} stroke="var(--borda-forte)" strokeWidth="0.8" strokeLinecap="round" />
        })}
        <circle className="disco-arco" cx="50" cy="50" r={R} fill="none" stroke="var(--acento)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${C * frac} ${C}`} transform="rotate(-90 50 50)" />
        <circle cx={px} cy={py} r="5.5" fill="var(--superficie)" stroke="var(--acento)" strokeWidth="2.5" />
      </svg>
      <div className="relogio-textos">
        <strong>{pad(Math.floor(minutos / 60))}:{pad(minutos % 60)}</strong>
        <span className="suave">{duracao(minutos)}{minutos > 60 ? ` · ${Math.ceil(minutos / 60)}ª volta` : ''}</span>
      </div>
    </div>
  )
}
