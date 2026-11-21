import { useState } from 'react'
import { useDados } from '../../lib/dados.jsx'
import { dataCurta, deIso, reais } from '../../lib/util.js'
import { Botao, Field, Modal, useToast } from '../ui.jsx'

const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()

// Sugere o "pedaço" do texto do banco que identifica a loja (ex.: "IFOOD *RESTAURANTE X" -> "IFOOD")
function sugestao(texto) {
  const limpo = normal(texto).replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  const palavras = limpo.split(' ').filter((p) => p.length > 2 && !/^\d+$/.test(p) && !['PIX', 'COMPRA', 'PAGAMENTO', 'TRANSF', 'TRANSFERENCIA', 'ENVIADA', 'RECEBIDA', 'DEBITO', 'CREDITO', 'NO', 'EM'].includes(p))
  return palavras.slice(0, 2).join(' ') || limpo.slice(0, 20)
}

export const textoDe = (l) => l.texto_banco || l.descricao || ''

// Classifica, um por um, os lançamentos do banco que ficaram sem categoria
export default function Classificar({ lista, aoFechar }) {
  const { d, salvar } = useDados()
  const toast = useToast()
  const [i, setI] = useState(0)
  const l = lista[i]
  const [cat, setCat] = useState(null)
  const [transf, setTransf] = useState(false)
  const [mae, setMae] = useState(false)
  const [regra, setRegra] = useState(true)
  const [texto, setTexto] = useState(() => (l ? sugestao(textoDe(l)) : ''))
  const [salvando, setSalvando] = useState(false)
  if (!l) return null
  const categorias = d.categorias.filter((c) => c.tipo === l.tipo && c.ativo).sort((a, b) => a.ordem - b.ordem)

  function proximo() {
    const n = i + 1
    if (n >= lista.length) return aoFechar()
    setI(n)
    setCat(null)
    setTransf(false)
    setMae(false)
    setTexto(sugestao(textoDe(lista[n])))
  }

  async function confirmar() {
    if (!cat && !transf && !mae) return
    setSalvando(true)
    const mudanca = mae ? { grupo: 'mae', categoria_id: null } : transf ? { tipo: 'transferencia', categoria_id: null } : { categoria_id: cat }
    await salvar('lancamentos', { id: l.id, ...mudanca })
    let aplicados = 0
    if (regra && texto.trim().length >= 2) {
      const ok = await salvar('regras_categoria', { texto: texto.trim().toUpperCase().slice(0, 60), categoria_id: transf || mae ? null : cat, transferencia: transf, grupo: mae ? 'mae' : null, ordem: 0 })
      if (ok) {
        // aplica a regra nos outros lançamentos parecidos que ainda estão sem categoria
        const alvo = normal(texto.trim())
        const outros = d.lancamentos.filter((x) => x.id !== l.id && !x.categoria_id && !x.grupo && x.tipo === l.tipo && normal(textoDe(x)).includes(alvo))
        for (const x of outros) { await salvar('lancamentos', { id: x.id, ...mudanca }); aplicados++ }
      }
    }
    setSalvando(false)
    if (aplicados) toast(`Regra criada e aplicada em mais ${aplicados} ${aplicados === 1 ? 'lançamento' : 'lançamentos'}`)
    proximo()
  }

  return (
    <Modal titulo="Classificar lançamentos" subtitulo={`${i + 1} de ${lista.length} sem categoria`} aoFechar={aoFechar}
      rodape={<>
        <button type="button" className="btn btn-sec" onClick={proximo}>Pular</button>
        <div className="espaco" />
        <Botao carregando={salvando} disabled={!cat && !transf && !mae} onClick={confirmar}>Salvar e próximo</Botao>
      </>}>
      <div className="lanc-detalhe">
        <strong>{textoDe(l)}</strong>
        <span className="suave">{dataCurta(deIso(l.dia))} · {l.tipo === 'gasto' ? 'saída' : 'entrada'} de {reais(l.valor)}{l.categoria_banco ? ` · banco: ${l.categoria_banco}` : ''}</span>
      </div>
      <div className="campo">
        <span className="campo-rotulo">Categoria</span>
        <div className="chips">
          {categorias.map((c) => (
            <button key={c.id} type="button" className={`chip chip-cat ${cat === c.id ? 'ativo' : ''}`} aria-pressed={cat === c.id} onClick={() => { setCat(c.id); setTransf(false); setMae(false) }}>
              <i style={{ background: c.cor }} aria-hidden="true" />{c.nome}
            </button>
          ))}
          <button type="button" className={`chip ${mae ? 'ativo' : ''}`} aria-pressed={mae} onClick={() => { setMae(true); setTransf(false); setCat(null) }}>
            AP
          </button>
          <button type="button" className={`chip ${transf ? 'ativo' : ''}`} aria-pressed={transf} onClick={() => { setTransf(true); setMae(false); setCat(null) }}>
            Não conta (transferência, fatura, aplicação)
          </button>
        </div>
      </div>
      <label className="check-simples"><input type="checkbox" checked={regra} onChange={(e) => setRegra(e.target.checked)} />Usar sempre que o texto do banco tiver:</label>
      {regra && (
        <Field label="Texto que identifica (pode encurtar)" hint="Ex.: IFOOD, POSTO, NETFLIX. Vale para os próximos lançamentos e para os parecidos que estão sem categoria.">
          <input type="text" value={texto} maxLength={60} onChange={(e) => setTexto(e.target.value)} />
        </Field>
      )}
    </Modal>
  )
}
