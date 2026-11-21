import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { addDias, DIAS_CURTOS, fmtHora, hoje, inicioSemana, isoDia, MESES } from '../lib/util.js'
import { Botao, Field, Icone, Modal, Segmentos, Vazio } from '../components/ui.jsx'
import HabitosHoje, { Leitura } from '../components/Habitos.jsx'
import { marcarTreino } from '../lib/treinoHabito.js'
import { Cabecalho } from './Shell.jsx'

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0]

export default function Habitos() {
  const dados = useDados()
  const { d, gravar, apagar, salvar } = dados
  const [lendo, setLendo] = useState(null) // { habito, dia } do devocional marcado pela grade
  const [editando, setEditando] = useState(null)
  const [visao, setVisao] = useState('semana') // 'semana' | 'mes'
  const [desloca, setDesloca] = useState(0) // 0 = semana/mês atual, -1 = anterior...
  const lista = [...d.habitos].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.ordem - b.ordem)
  const hj = hoje()
  const isoHoje = isoDia(hj)
  // dias do período escolhido
  let ini, fim, titulo
  if (visao === 'semana') {
    ini = addDias(inicioSemana(hj), desloca * 7)
    fim = addDias(ini, 6)
    titulo = desloca === 0 ? 'Esta semana' : desloca === -1 ? 'Semana passada' : `${ini.getDate()}/${ini.getMonth() + 1} a ${fim.getDate()}/${fim.getMonth() + 1}`
  } else {
    ini = new Date(hj.getFullYear(), hj.getMonth() + desloca, 1)
    fim = new Date(ini.getFullYear(), ini.getMonth() + 1, 0)
    titulo = `${MESES[ini.getMonth()][0].toUpperCase()}${MESES[ini.getMonth()].slice(1)}${ini.getFullYear() !== hj.getFullYear() ? ` ${ini.getFullYear()}` : ''}`
  }
  const dias = []
  for (let x = ini; x <= fim; x = addDias(x, 1)) dias.push(x)
  // no mês, alinha o dia 1 na coluna do dia da semana (semana começa na segunda)
  const vazios = visao === 'mes' ? (ini.getDay() + 6) % 7 : 0
  const trocarVisao = (v) => { setVisao(v); setDesloca(0) }
  // tocar num dia (até hoje) marca ou desmarca o hábito naquele dia
  async function alternarDia(h, k, valor) {
    if (k > isoHoje) return
    // Calistenia: o bloco Treino do dia acompanha
    if (h.plano === 'treino') marcarTreino(dados, k, valor < h.meta, { habito: false })
    if (valor >= h.meta) {
      const marca = d.habito_marcas.find((m) => m.habito_id === h.id && m.dia === k)
      if (marca?.nota && !window.confirm(`Desmarcar ${h.nome} em ${k.split('-').reverse().slice(0, 2).join('/')} (${marca.nota})?`)) return
      await apagar('habito_marcas', { habito_id: h.id, dia: k })
      // devocional: se era a leitura mais recente, o plano volta para o começo dela
      if (h.plano === 'biblia' && marca?.nota) {
        const ultima = d.habito_marcas.filter((m) => m.habito_id === h.id && m.nota).sort((a, b) => b.dia.localeCompare(a.dia))[0]
        if (ultima?.dia === k) await salvar('habitos', { id: h.id, proximo: marca.nota.split('–')[0].trim() })
      }
      return
    }
    // devocional: pergunta até onde leu e avança o plano
    if (h.plano === 'biblia') return setLendo({ habito: h, dia: k })
    await gravar('habito_marcas', { habito_id: h.id, dia: k, valor: h.meta })
  }

  return (
    <div className="tela">
      <Cabecalho titulo="Hábitos" sub="Toque para marcar hoje. Embaixo, veja cada hábito na semana ou no mês e toque num dia para marcar ou desmarcar.">
        <button type="button" className="btn btn-primario" onClick={() => setEditando({})}><Icone nome="mais" tamanho={20} />Hábito</button>
      </Cabecalho>
      <HabitosHoje />
      <section className="cartao">
        <div className="cab-cartao"><h2>Todos os hábitos</h2>
          <Segmentos label="Ver por" value={visao} onChange={trocarVisao} options={[{ v: 'semana', label: 'Semana' }, { v: 'mes', label: 'Mês' }]} />
        </div>
        <div className="navegar navegar-habitos">
          <button type="button" className="btn-icone" onClick={() => setDesloca((n) => n - 1)} aria-label={visao === 'semana' ? 'Semana anterior' : 'Mês anterior'}><Icone nome="voltar" /></button>
          <strong>{titulo}</strong>
          <button type="button" className="btn-icone" onClick={() => setDesloca((n) => Math.min(0, n + 1))} disabled={desloca === 0} aria-label={visao === 'semana' ? 'Próxima semana' : 'Próximo mês'}><Icone nome="avancar" /></button>
          {desloca !== 0 && <button type="button" className="btn btn-sec btn-peq" onClick={() => setDesloca(0)}>Atual</button>}
        </div>
        {lista.length === 0 && <Vazio>Nenhum hábito ainda.</Vazio>}
        {lista.map((h) => {
          const marcas = new Map(d.habito_marcas.filter((m) => m.habito_id === h.id).map((m) => [m.dia, m.valor]))
          const feito = (k) => (marcas.get(k) || 0) >= h.meta
          // só conta até hoje (dias futuros ainda não aconteceram)
          const previstos = dias.filter((x) => h.dias.includes(x.getDay()) && isoDia(x) <= isoHoje)
          const nFeitos = previstos.filter((x) => feito(isoDia(x))).length
          const taxa = previstos.length ? Math.round((100 * nFeitos) / previstos.length) : 0
          return (
            <div key={h.id} className={`habito-linha ${h.ativo ? '' : 'inativo'}`}>
              <div className="habito-linha-topo">
                <div>
                  <strong>{h.nome}</strong>
                  <span className="suave">
                    {' · '}{h.dias.length === 7 ? 'todo dia' : ORDEM_DIAS.filter((n) => h.dias.includes(n)).map((n) => DIAS_CURTOS[n]).join(', ')}
                    {h.horario ? ` · ${fmtHora(h.horario)}` : ''}{h.meta > 1 ? ` · ${h.meta} ${h.unidade || 'vezes'}` : ''}
                    {h.ativo ? ` · ${nFeitos} de ${previstos.length} (${taxa}%)` : ' · pausado'}
                  </span>
                </div>
                <button type="button" className="btn-icone" onClick={() => setEditando(h)} aria-label={`Editar ${h.nome}`}><Icone nome="editar" tamanho={18} /></button>
              </div>
              <div className={`grade-habito ${visao}`} aria-label={`${h.nome}: feito em ${nFeitos} de ${previstos.length} dias`}>
                {visao === 'semana' && dias.map((x) => <span key={`c${isoDia(x)}`} className="grade-habito-cab">{DIAS_CURTOS[x.getDay()]}</span>)}
                {visao === 'mes' && ORDEM_DIAS.map((n) => <span key={`c${n}`} className="grade-habito-cab">{DIAS_CURTOS[n][0]}</span>)}
                {Array.from({ length: vazios }, (_, i) => <span key={`v${i}`} />)}
                {dias.map((x) => {
                  const k = isoDia(x)
                  const previsto = h.dias.includes(x.getDay())
                  const futuro = k > isoHoje
                  const valor = marcas.get(k) || 0
                  const estado = feito(k) ? 'n4' : valor > 0 ? 'n2' : futuro ? 'futuro' : previsto ? 'n0' : 'fora'
                  const txt = feito(k) ? 'feito' : valor > 0 ? `${valor} de ${h.meta}` : futuro ? 'ainda não chegou' : previsto ? 'não feito' : 'não previsto'
                  return (
                    <button key={k} type="button" className={`dia-habito ${estado} ${k === isoHoje ? 'hoje' : ''}`} disabled={futuro}
                      aria-pressed={feito(k)} aria-label={`${h.nome}, ${DIAS_CURTOS[x.getDay()]} ${x.getDate()}: ${txt}`} title={`${DIAS_CURTOS[x.getDay()]} ${x.getDate()}: ${txt}`}
                      onClick={() => alternarDia(h, k, valor)}>
                      {visao === 'semana' ? (feito(k) ? <Icone nome="check" tamanho={14} /> : x.getDate()) : x.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>
      {lendo && <Leitura habito={d.habitos.find((x) => x.id === lendo.habito.id) || lendo.habito} dia={lendo.dia} aoFechar={() => setLendo(null)} />}
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
