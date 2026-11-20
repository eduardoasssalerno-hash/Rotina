import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'

// ---------- Ícones (traço simples, herdam a cor do texto) ----------
const ICONES = {
  hoje: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  semana: <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
  planetas: <><circle cx="12" cy="12" r="5" /><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-20 12 12)" /></>,
  tarefas: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5" /></>,
  treino: <path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12" />,
  ajustes: <><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></>,
  mais: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  voltar: <path d="M15 5l-7 7 7 7" />,
  avancar: <path d="m9 5 7 7-7 7" />,
  lixo: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  editar: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  bandeira: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  relogio: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  livro: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /></>,
  sair: <><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></>,
}

export function Icone({ nome, tamanho = 22, ...rest }) {
  return (
    <svg className="icone" width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      {ICONES[nome]}
    </svg>
  )
}

export function Logo({ tamanho = 28 }) {
  const d = 'M78 14 H40 A18 18 0 0 0 40 50 H60 A18 18 0 0 1 60 86 H22'
  return (
    <svg width={tamanho} height={tamanho * 1.15} viewBox="5 -3 90 106" role="img" aria-label="3S">
      <path d={d} fill="none" stroke="var(--acento)" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="var(--superficie)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="var(--acento)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ---------- Avisos rápidos ----------
const ToastCtx = createContext(() => {})
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null)
  const t = useRef(null)
  const mostrar = useCallback((texto, tipo = 'ok') => {
    clearTimeout(t.current)
    setMsg({ texto, tipo, k: Date.now() })
    t.current = setTimeout(() => setMsg(null), tipo === 'erro' ? 5000 : 2600)
  }, [])
  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      <div className="toast-area" role="status" aria-live="polite">
        {msg && <div key={msg.k} className={`toast ${msg.tipo === 'erro' ? 'toast-erro' : ''}`}>{msg.texto}</div>}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

// ---------- Peças de formulário ----------
export function Field({ label, hint, children }) {
  return (
    <label className="campo">
      <span className="campo-rotulo">{label}</span>
      {children}
      {hint && <span className="campo-dica">{hint}</span>}
    </label>
  )
}

export function Erro({ children }) {
  if (!children) return null
  return <div className="erro" role="alert">{children}</div>
}

export function Botao({ carregando, children, className = 'btn btn-primario', disabled, ...rest }) {
  return (
    <button className={className} disabled={disabled || carregando} aria-busy={carregando || undefined} {...rest}>
      {carregando ? <span className="giro" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}

export function Carregando({ tela }) {
  return (
    <div className={tela ? 'carregando tela-cheia' : 'carregando'} role="status">
      <span className="giro" aria-hidden="true" />
      <span>Carregando…</span>
    </div>
  )
}

export function Segmentos({ label, value, onChange, options }) {
  return (
    <div className="segmentos" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v}
          className={value === o.v ? 'ativo' : ''} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---------- Janela por cima da tela ----------
export function Modal({ titulo, subtitulo, aoFechar, children, rodape, larga }) {
  const id = useId()
  const caixa = useRef(null)
  useEffect(() => {
    const anterior = document.activeElement
    caixa.current?.focus()
    const tecla = (e) => { if (e.key === 'Escape') aoFechar() }
    document.addEventListener('keydown', tecla)
    document.body.classList.add('sem-rolagem')
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.classList.remove('sem-rolagem')
      anterior?.focus?.()
    }
  }, [aoFechar])
  return (
    <div className="veu" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar() }}>
      <div className={`modal ${larga ? 'modal-larga' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={caixa}>
        <div className="modal-topo">
          <div>
            <h2 id={id}>{titulo}</h2>
            {subtitulo && <p className="suave">{subtitulo}</p>}
          </div>
          <button type="button" className="btn-icone" onClick={aoFechar} aria-label="Fechar"><Icone nome="fechar" /></button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  )
}

// Faixa de cor da área + bandeira de prioridade
export function Bandeira({ nivel }) {
  if (!nivel) return null
  const nomes = ['', 'baixa', 'média', 'alta']
  return <span className={`bandeira b${nivel}`} title={`Prioridade ${nomes[nivel]}`} aria-label={`Prioridade ${nomes[nivel]}`}><Icone nome="bandeira" tamanho={16} /></span>
}

export function Vazio({ children }) {
  return <p className="vazio">{children}</p>
}
