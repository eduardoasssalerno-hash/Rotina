import { useEffect, useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { supabase } from '../lib/supabase.js'
import { Botao, Icone, Modal, useToast } from './ui.jsx'

// Os arquivos ficam protegidos: o site só entrega para quem está logado
async function buscar(caminho) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Entre de novo no app para abrir o arquivo.')
  const r = await fetch(caminho, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error(r.status === 404 ? 'Arquivo não encontrado.' : 'Não deu para abrir o arquivo agora.')
  return r.blob()
}

const pastaPaginas = (caminho) => caminho.replace('/arquivos/', '/arquivos/paginas/').replace(/\.pdf$/, '')
const nomeArquivo = (a) => a.arquivo_nome || `${a.nome}.pdf`

// Baixa o PDF com o nome bonito (para abrir no app de notas e resolver)
export async function baixar(anexo) {
  const url = URL.createObjectURL(await buscar(anexo.caminho))
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo(anexo)
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export function anexosDa(d, tarefaId) {
  return d.anexos.filter((a) => a.tarefa_id === tarefaId).sort((a, b) => a.ordem - b.ordem)
}

// Botões dos arquivos de uma tarefa
export default function Anexos({ tarefaId }) {
  const { d } = useDados()
  const [vendo, setVendo] = useState(null)
  const lista = anexosDa(d, tarefaId)
  if (!lista.length) return null
  return (
    <span className="anexos">
      {lista.map((a) => (
        <button key={a.id} type="button" className="anexo" onClick={() => setVendo(a)}>
          <Icone nome="arquivo" tamanho={16} />{a.nome}
        </button>
      ))}
      {vendo && <Previa anexo={vendo} aoFechar={() => setVendo(null)} />}
    </span>
  )
}

// Prévia do PDF dentro do app (página por página) + botão de baixar
function Previa({ anexo, aoFechar }) {
  const toast = useToast()
  const [paginas, setPaginas] = useState([])
  const [erro, setErro] = useState('')
  const [baixando, setBaixando] = useState(false)
  const total = anexo.paginas || 0

  useEffect(() => {
    let ativo = true
    const urls = []
    async function carregar() {
      for (let i = 1; i <= total && ativo; i++) {
        try {
          const url = URL.createObjectURL(await buscar(`${pastaPaginas(anexo.caminho)}/${i}.jpg`))
          urls.push(url)
          if (ativo) setPaginas((p) => [...p, url])
        } catch (e) {
          if (ativo) setErro(e.message)
          break
        }
      }
    }
    carregar()
    return () => { ativo = false; urls.forEach((u) => URL.revokeObjectURL(u)) }
  }, [anexo.caminho, total])

  async function aoBaixar() {
    setBaixando(true)
    try {
      await baixar(anexo)
      toast('PDF baixado. Abra pelo app de notas para resolver.')
    } catch (e) {
      toast(e.message, 'erro')
    }
    setBaixando(false)
  }

  return (
    <Modal larga titulo={anexo.nome} subtitulo={total ? `${total} ${total === 1 ? 'página' : 'páginas'} · ${nomeArquivo(anexo)}` : nomeArquivo(anexo)} aoFechar={aoFechar}
      rodape={<><div className="espaco" /><button type="button" className="btn btn-sec" onClick={aoFechar}>Fechar</button>
        <Botao carregando={baixando} onClick={aoBaixar}><Icone nome="baixar" tamanho={18} />Baixar PDF</Botao></>}>
      {erro && <p className="erro">{erro}</p>}
      {!total && <p className="suave">Este arquivo não tem prévia. Use “Baixar PDF”.</p>}
      <div className="previa">
        {paginas.map((url, i) => <img key={url} src={url} alt={`Página ${i + 1} de ${total}`} loading="lazy" />)}
        {total > 0 && paginas.length < total && !erro && <div className="carregando"><span className="giro" aria-hidden="true" />Carregando página {paginas.length + 1} de {total}…</div>}
      </div>
    </Modal>
  )
}
