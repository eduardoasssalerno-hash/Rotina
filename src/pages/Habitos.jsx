import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { addDias, DIAS_CURTOS, fmtHora, hoje, isoDia } from '../lib/util.js'
import { Botao, Field, Icone, Modal, Vazio } from '../components/ui.jsx'
import HabitosHoje from '../components/Habitos.jsx'
import { Cabecalho } from './Shell.jsx'

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0]

export default function Habitos() {
  const { d } = useDados()
  const [editando, setEditando] = useState(null)
  const lista = [...d.habitos].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.ordem - b.ordem)
  const dias = Array.from({ length: 28 }, (_, i) => addDias(hoje(), i - 27))

  return (
    <div className="tela">
      <Cabecalho titulo="Hábitos" sub="Toque para marcar hoje. As últimas 4 semanas aparecem embaixo de cada hábito.">
        <button type="button" className="btn btn-primario" onClick={() => setEditando({})}><Icone nome="mais" tamanho={20} />Hábito</button>
      </Cabecalho>
      <HabitosHoje />
      <section className="cartao">
        <div className="cab-cartao"><h2>Todos os hábitos</h2></div>
        {lista.length === 0 && <Vazio>Nenhum hábito ainda.</Vazio>}
        {lista.map((h) => {
          const feitos = new Set(d.habito_marcas.filter((m) => m.habito_id === h.id && m.valor >= h.meta).map((m) => m.dia))
          const previstos = dias.filter((x) => h.dias.includes(x.getDay()))
          const taxa = previstos.length ? Math.round((100 * previstos.filter((x) => feitos.has(isoDia(x))).length) / previstos.length) : 0
          return (
            <div key={h.id} className={`habito-linha ${h.ativo ? '' : 'inativo'}`}>
              <div className="habito-linha-topo">
                <div>
                  <strong>{h.nome}</strong>
                  <span className="suave">
                    {' · '}{h.dias.length === 7 ? 'todo dia' : ORDEM_DIAS.filter((n) => h.dias.includes(n)).map((n) => DIAS_CURTOS[n]).join(', ')}
                    {h.horario ? ` · ${fmtHora(h.horario)}` : ''}{h.meta > 1 ? ` · ${h.meta} ${h.unidade || 'vezes'}` : ''}
                    {h.ativo ? ` · ${taxa}% nas últimas 4 semanas` : ' · pausado'}
                  </span>
                </div>
                <button type="button" className="btn-icone" onClick={() => setEditando(h)} aria-label={`Editar ${h.nome}`}><Icone nome="editar" tamanho={18} /></button>
              </div>
              <div className="mini-calor" aria-label={`${h.nome}: feito em ${feitos.size} dias`}>
                {dias.map((x) => {
                  const k = isoDia(x)
                  const previsto = h.dias.includes(x.getDay())
                  return <i key={k} className={feitos.has(k) ? 'n4' : previsto ? 'n0' : 'fora'} title={`${DIAS_CURTOS[x.getDay()]} ${x.getDate()}: ${feitos.has(k) ? 'feito' : previsto ? 'não feito' : 'não previsto'}`} />
                })}
              </div>
            </div>
          )
        })}
      </section>
      {editando && <EditorHabito habito={editando.id ? editando : null} aoFechar={() => setEditando(null)} />}
    </div>
  )
}

function EditorHabito({ habito, aoFechar }) {
  const { d, salvar, apagar } = useDados()
  const [h, setH] = useState(habito ? { ...habito, horario: fmtHora(habito.horario) } : { nome: '', meta: 1, unidade: '', horario: '', minutos: '', dias: [0, 1, 2, 3, 4, 5, 6], area_id: null, ativo: true })
  const [salvando, setSalvando] = useState(false)
  const muda = (c) => setH((x) => ({ ...x, ...c }))
  const alternarDia = (n) => muda({ dias: h.dias.includes(n) ? h.dias.filter((x) => x !== n) : [...h.dias, n].sort() })

  async function enviar(e) {
    e.preventDefault()
    if (!h.nome.trim() || !h.dias.length) return
    setSalvando(true)
    const ok = await salvar('habitos', {
      ...(habito ? { id: habito.id } : { ordem: d.habitos.length }),
      nome: h.nome.trim(), meta: Math.max(1, Math.min(50, Number(h.meta) || 1)), unidade: h.unidade?.trim() || null,
      horario: h.horario || null, minutos: Number(h.minutos) > 0 ? Math.round(Number(h.minutos)) : null,
      dias: h.dias, area_id: h.area_id || null, ativo: h.ativo,
    })
    setSalvando(false)
    if (ok) aoFechar()
  }

  async function excluir() {
    if (!window.confirm(`Apagar o hábito ${habito.nome} e todo o histórico dele? Se quiser só parar por um tempo, use "Pausar".`)) return
    await apagar('habitos', habito)
    aoFechar()
  }

  return (
    <Modal titulo={habito ? 'Editar hábito' : 'Novo hábito'} aoFechar={aoFechar}
      rodape={<>
        {habito && <button type="button" className="btn btn-perigo" onClick={excluir}><Icone nome="lixo" tamanho={18} />Apagar</button>}
        <div className="espaco" />
        <button type="button" className="btn btn-sec" onClick={aoFechar}>Cancelar</button>
        <Botao type="submit" form="form-habito" carregando={salvando}>Salvar</Botao>
      </>}>
      <form id="form-habito" className="form" onSubmit={enviar}>
        <Field label="Nome"><input type="text" value={h.nome} maxLength={40} required autoFocus onChange={(e) => muda({ nome: e.target.value })} /></Field>
        <div className="campo">
          <span className="campo-rotulo">Dias</span>
          <div className="chips">
            {ORDEM_DIAS.map((n) => <button key={n} type="button" className={`chip ${h.dias.includes(n) ? 'ativo' : ''}`} aria-pressed={h.dias.includes(n)} onClick={() => alternarDia(n)}>{DIAS_CURTOS[n]}</button>)}
          </div>
        </div>
        <div className="grade-3">
          <Field label="Horário (opcional)"><input type="time" value={h.horario || ''} onChange={(e) => muda({ horario: e.target.value })} /></Field>
          <Field label="Vezes por dia" hint="Ex.: 8 copos de água"><input type="number" inputMode="numeric" min={1} max={50} value={h.meta} onChange={(e) => muda({ meta: e.target.value })} /></Field>
          <Field label="Unidade (opcional)"><input type="text" maxLength={20} value={h.unidade || ''} placeholder="copos, páginas…" onChange={(e) => muda({ unidade: e.target.value })} /></Field>
        </div>
        <Field label="Área (opcional)">
          <select value={h.area_id || ''} onChange={(e) => muda({ area_id: e.target.value || null })}>
            <option value="">Sem área</option>
            {d.areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </Field>
        {habito && (
          <label className="check-simples"><input type="checkbox" checked={!h.ativo} onChange={(e) => muda({ ativo: !e.target.checked })} />Pausar este hábito (some de Hoje, mas guarda o histórico)</label>
        )}
      </form>
    </Modal>
  )
}
