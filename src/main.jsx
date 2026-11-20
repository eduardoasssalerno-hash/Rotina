import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { registrarErro, vigiarErros } from './lib/erros.js'
import { quandoErroServidor } from './lib/util.js'
import { vigiarVersao } from './lib/versao.js'
import { aplicarTema } from './lib/tema.js'

aplicarTema()
vigiarErros()
vigiarVersao()
quandoErroServidor(registrarErro)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Permite "Adicionar à tela inicial" como aplicativo
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
