import { useEffect, useState } from 'react'

// Navegação simples entre telas, sem bibliotecas extras
export function navigate(to, { replace = false } = {}) {
  if (to === window.location.pathname) return
  if (replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  window.dispatchEvent(new Event('rota'))
  window.scrollTo(0, 0)
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const atualizar = () => setPath(window.location.pathname)
    window.addEventListener('popstate', atualizar)
    window.addEventListener('rota', atualizar)
    return () => {
      window.removeEventListener('popstate', atualizar)
      window.removeEventListener('rota', atualizar)
    }
  }, [])
  return path
}

export function Link({ to, children, ...rest }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
