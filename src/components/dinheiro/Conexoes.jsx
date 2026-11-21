import { useState } from 'react'
import { useDados } from '../../lib/dados.jsx'
import { reais } from '../../lib/util.js'
import { Botao, Field, Icone, Vazio } from '../ui.jsx'

const quando = (ts) => (ts ? new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca')

export default function Conexoes() {
  const { d, salvar, apagar } = useDados()
  const [banco, setBanco] = useState('Nubank')
  const [item, setItem] = useState('')
  const [erro, setErro] = useState('')
  const [texto, setTexto] = useState('')
  const [cat, setCat] = useState('')
  const valido = /^[0-9a-fA-F-]{36}$/.test(item.trim())

  async function adicionar(e) {
    e.preventDefault()
    if (!valido) return setErro('O itemId tem 36 caracteres, assim: 1a2b3c4d-1234-5678-9abc-1234567890ab.')
    const ok = await salvar('conexoes', { banco: banco.trim() || 'Banco', item_id: item.trim().toLowerCase() })
    if (ok) { setItem(''); setErro('') }
  }

  async function novaRegra(e) {
    e.preventDefault()
    if (texto.trim().length < 2 || !cat) return
    const transferencia = cat === 'transferencia'
    const mae = cat === 'mae'
    const ok = await salvar('regras_categoria', { texto: texto.trim().toUpperCase().slice(0, 60), categoria_id: transferencia || mae ? null : cat, transferencia, grupo: mae ? 'mae' : null, ordem: 0 })
    if (ok) { setTexto(''); setCat('') }
  }

  const regras = [...d.regras_categoria].sort((a, b) => a.texto.localeCompare(b.texto))
  return (
    <div className="grade-hoje">
      <div className="coluna">
        <section className="cartao">
          <div className="cab-cartao"><h2>Conexões do Open Finance</h2><span className="suave">Meu Pluggy</span></div>
          {d.conexoes.length === 0 && <Vazio>Nenhum banco ligado ainda.</Vazio>}
          {d.conexoes.map((c) => (
            <div key={c.id} className="conexao">
              <div className="conexao-textos">
                <strong>{c.banco}</strong>
                <span className="suave">Atualizado: {quando(c.ultima_sincronia)}{c.consentimento_ate ? ` · autorização vale até ${new Date(c.consentimento_ate).toLocaleDateString('pt-BR')}` : ''}</span>
                {c.erro && <span className="aviso-peq">Problema: {c.erro}</span>}
              </div>
              <button type="button" className="btn-icone" aria-label={`Remover ${c.banco}`} onClick={() => { if (window.confirm(`Remover a conexão ${c.banco}? Os lançamentos já trazidos continuam.`)) apagar('conexoes', c) }}><Icone nome="lixo" tamanho={18} /></button>
            </div>
          ))}
          <form className="form nova-conexao" onSubmit={adicionar}>
            <div className="grade-2">
              <Field label="Banco"><input type="text" value={banco} maxLength={40} onChange={(e) => setBanco(e.target.value)} /></Field>
              <Field label="itemId (copiado do painel da Pluggy)"><input type="text" value={item} spellCheck={false} autoCapitalize="none" placeholder="1a2b3c4d-…" onChange={(e) => { setItem(e.target.value); setErro('') }} /></Field>
            </div>
            {erro && <p className="erro">{erro}</p>}
            <Botao type="submit" disabled={!item.trim()}><Icone nome="mais" tamanho={18} />Ligar banco</Botao>
          </form>
        </section>
        <section className="cartao">
          <div className="cab-cartao"><h2>Contas</h2></div>
          {d.contas.length === 0 && <Vazio>As contas aparecem depois da primeira atualização.</Vazio>}
          {d.contas.map((c) => (
            <div key={c.id} className="conexao">
              <div className="conexao-textos"><strong>{c.nome}</strong><span className="suave">{c.banco} · {c.tipo === 'cartao' ? 'cartão de crédito' : c.tipo === 'corrente' ? 'conta' : 'outra'}</span></div>
              {c.saldo != null && <strong className={c.tipo === 'cartao' ? 'valor-negativo' : ''}>{c.tipo === 'cartao' ? `fatura ${reais(Math.abs(c.saldo))}` : reais(c.saldo)}</strong>}
            </div>
          ))}
        </section>
      </div>
      <section className="cartao">
        <div className="cab-cartao"><h2>Regras de categoria</h2><span className="suave">{regras.length}</span></div>
        <p className="suave">Se o texto do banco tiver a palavra, o lançamento entra na categoria. As regras novas nascem quando você classifica um lançamento.</p>
        <form className="nova-regra" onSubmit={novaRegra}>
          <input type="text" value={texto} maxLength={60} placeholder="Texto (ex.: IFOOD)" aria-label="Texto da regra" onChange={(e) => setTexto(e.target.value)} />
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria da regra">
            <option value="">Categoria…</option>
            {d.categorias.filter((c) => c.ativo).sort((a, b) => a.tipo.localeCompare(b.tipo) || a.ordem - b.ordem).map((c) => <option key={c.id} value={c.id}>{c.tipo === 'entrada' ? 'Entrada: ' : ''}{c.nome}</option>)}
            <option value="mae">AP</option>
            <option value="transferencia">Não conta (transferência)</option>
          </select>
          <Botao type="submit" disabled={texto.trim().length < 2 || !cat}>Pôr</Botao>
        </form>
        <ul className="regras">
          {regras.map((r) => {
            const c = d.categorias.find((x) => x.id === r.categoria_id)
            return (
              <li key={r.id}>
                <code>{r.texto}</code>
                <span>→ {r.grupo === 'mae' ? `AP${Number(r.parte_minha) > 0 ? ` (R$ ${Number(r.parte_minha).toLocaleString('pt-BR')} seus)` : ''}` : r.transferencia ? 'não conta' : c?.nome || '?'}</span>
                <button type="button" className="btn-icone btn-mini" aria-label={`Apagar regra ${r.texto}`} onClick={() => apagar('regras_categoria', r)}><Icone nome="lixo" tamanho={15} /></button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
