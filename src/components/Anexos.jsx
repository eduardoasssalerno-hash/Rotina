import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { supabase } from '../lib/supabase.js'
import { Icone, useToast } from './ui.jsx'

// Abre um PDF protegido: o site só entrega o arquivo para quem está logado
async function abrir(anexo, toast) {
  // a janela precisa ser aberta na hora do toque (senão o navegador bloqueia)
  const janela = window.open('', '_blank')
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (!token) throw new Error('Entre de novo no app para abrir o arquivo.')
    const r = await fetch(anexo.caminho, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) throw new Error(r.status === 404 ? 'Arquivo não encontrado.' : 'Não deu para abrir o arquivo agora.')
    const url = URL.createObjectURL(await r.blob())
    if (janela) {
      janela.location.href = url
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = anexo.caminho.split('/').pop()
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    setTimeout(() => URL.revokeObjectURL(url), 120000)
  } catch (e) {
    janela?.close()
    toast(e.message || 'Não deu para abrir o arquivo.', 'erro')
  }
}

export function anexosDa(d, tarefaId) {
  return d.anexos.filter((a) => a.tarefa_id === tarefaId).sort((a, b) => a.ordem - b.ordem)
}

// Botões dos arquivos de uma tarefa (ex.: "Lista 6 com aula (PDF)")
export default function Anexos({ tarefaId }) {
  const { d } = useDados()
  const toast = useToast()
  const [abrindo, setAbrindo] = useState(null)
  const lista = anexosDa(d, tarefaId)
  if (!lista.length) return null
  return (
    <span className="anexos">
      {lista.map((a) => (
        <button key={a.id} type="button" className="anexo" aria-busy={abrindo === a.id || undefined}
          onClick={async () => { setAbrindo(a.id); await abrir(a, toast); setAbrindo(null) }}>
          <Icone nome="arquivo" tamanho={16} />{a.nome}
        </button>
      ))}
    </span>
  )
}
