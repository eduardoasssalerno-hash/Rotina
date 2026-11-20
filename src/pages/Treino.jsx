import { useRef, useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { addDias, dataCurta, dataLonga, deIso, hoje, isoDia, DIAS_CURTOS } from '../lib/util.js'
import { Botao, Field, Icone, Vazio, useToast } from '../components/ui.jsx'
import Exercicio from '../components/Exercicio.jsx'
import { Cabecalho } from './Shell.jsx'

const DIFICULDADES = [{ v: 'facil', label: 'Fácil' }, { v: 'na_medida', label: 'Na medida' }, { v: 'pesado', label: 'Pesado' }]
const fmtSeries = (v, medida) => (v?.length ? v.map((n) => (medida === 'segundos' ? `${n} s` : n)).join(' · ') : '—')

export default function Treino() {
  const { d } = useDados()
  const [dia, setDia] = useState(() => hoje())
  const iso = isoDia(dia)
  const blocos = d.blocos_fixos.filter((b) => b.ativo && /treino/i.test(b.titulo))
  const diasTreino = [...new Set(blocos.flatMap((b) => b.dias))].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  const diaDeTreino = blocos.length ? diasTreino.includes(dia.getDay()) : true
  const pendente = d.treinos.filter((t) => t.concluido && !t.dor && t.dia < isoDia(hoje())).sort((a, b) => b.dia.localeCompare(a.dia))[0]

  return (
    <div className="tela">
      <Cabecalho titulo="Treino" sub={blocos.length ? `Calistenia · ${diasTreino.map((n) => DIAS_CURTOS[n]).join(', ')} · às ${blocos[0].inicio.slice(0, 5)}` : 'Calistenia'} />
      {pendente && <Feedback treino={pendente} />}
      <div className="navegar">
        <button type="button" className="btn-icone" onClick={() => setDia(addDias(dia, -1))} aria-label="Dia anterior"><Icone nome="voltar" /></button>
        <strong>{dataLonga(dia)}</strong>
        <button type="button" className="btn-icone" onClick={() => setDia(addDias(dia, 1))} aria-label="Próximo dia"><Icone nome="avancar" /></button>
        {iso !== isoDia(hoje()) && <button type="button" className="btn btn-sec btn-peq" onClick={() => setDia(hoje())}>Hoje</button>}
      </div>
      {!diaDeTreino && <div className="info">Hoje não é dia de treino. Se treinou mesmo assim, pode registrar aqui.</div>}
      <TreinoDoDia key={iso} iso={iso} />
      <Historico />
    </div>
  )
}

function TreinoDoDia({ iso }) {
  const { d, salvar } = useDados()
  const toast = useToast()
  const exercicios = d.exercicios.filter((e) => e.ativo).sort((a, b) => a.ordem - b.ordem)
  const treino = d.treinos.find((t) => t.dia === iso)
  const [aberto, setAberto] = useState(exercicios[0]?.id || null)
  const [concluindo, setConcluindo] = useState(false)
  const criando = useRef(null)

  // cria o treino do dia na primeira anotação
  async function garantirTreino() {
    if (treino) return treino
    if (!criando.current) criando.current = salvar('treinos', { dia: iso })
    return criando.current
  }

  async function concluir() {
    setConcluindo(true)
    const t = await garantirTreino()
    if (t) {
      const ok = await salvar('treinos', { id: t.id, concluido: !t.concluido, concluido_em: t.concluido ? null : new Date().toISOString() })
      if (ok?.concluido) toast('Treino concluído! +10 de energia para o planeta Calistenia')
    }
    setConcluindo(false)
  }

  if (!exercicios.length) return <div className="cartao"><Vazio>Nenhum exercício cadastrado.</Vazio></div>

  return (
    <section className="cartao treino">
      <div className="cab-cartao">
        <h2>Treino do dia {treino?.concluido && <span className="tag tag-verde">Concluído</span>}</h2>
        <span className="suave">Anote quanto fez em cada série</span>
      </div>
      {exercicios.map((ex) => (
        <ExercicioDia key={ex.id} ex={ex} iso={iso} treino={treino} garantirTreino={garantirTreino}
          aberto={aberto === ex.id} aoAbrir={() => setAberto(aberto === ex.id ? null : ex.id)} />
      ))}
      <div className="acoes">
        <Botao carregando={concluindo} className={treino?.concluido ? 'btn btn-sec' : 'btn btn-primario btn-grande'} onClick={concluir}>
          {treino?.concluido ? 'Desfazer conclusão' : <><Icone nome="check" />Concluir treino</>}
        </Botao>
      </div>
    </section>
  )
}

function ExercicioDia({ ex, iso, treino, garantirTreino, aberto, aoAbrir }) {
  const { d, salvar } = useDados()
  const serie = treino ? d.treino_series.find((s) => s.treino_id === treino.id && s.exercicio_id === ex.id) : null
  const [vals, setVals] = useState(() => {
    const base = serie?.valores?.length ? serie.valores.map(String) : []
    while (base.length < ex.alvo.length) base.push('')
    return base
  })
  const [nota, setNota] = useState(serie?.nota || '')
  // último registro deste exercício antes do dia
  const anteriores = d.treinos.filter((t) => t.dia < iso).sort((a, b) => b.dia.localeCompare(a.dia))
  let ultimo = null
  for (const t of anteriores) {
    const s = d.treino_series.find((x) => x.treino_id === t.id && x.exercicio_id === ex.id && x.valores.length)
    if (s) { ultimo = { dia: t.dia, valores: s.valores }; break }
  }
  const unidade = ex.medida === 'segundos' ? 's' : 'rep.'
  const feitas = vals.filter((v) => Number(v) > 0).length

  async function gravar(novos = vals, novaNota = nota) {
    const valores = novos.map((v) => Math.max(0, Math.min(999, Math.round(Number(v) || 0)))).filter((v) => v > 0)
    const t = await garantirTreino()
    if (!t) return
    const atual = d.treino_series.find((s) => s.treino_id === t.id && s.exercicio_id === ex.id)
    if (atual && atual.valores.join() === valores.join() && (atual.nota || '') === novaNota.trim()) return
    await salvar('treino_series', atual
      ? { id: atual.id, valores, nota: novaNota.trim() || null }
      : { treino_id: t.id, exercicio_id: ex.id, valores, nota: novaNota.trim() || null })
  }

  function mudar(i, v) {
    setVals((x) => x.map((y, j) => (j === i ? v.replace(/\D/g, '').slice(0, 3) : y)))
  }

  return (
    <div className={`exercicio ${aberto ? 'aberto' : ''}`}>
      <button type="button" className="exercicio-cab" onClick={aoAbrir} aria-expanded={aberto}>
        {!aberto && <Exercicio desenho={ex.desenho} nome={ex.nome} largura={72} />}
        <span className="exercicio-nome">
          <strong>{ex.nome}</strong>
          <span className="suave">{ex.foco ? `${ex.foco} · ` : ''}Meta: {fmtSeries(ex.alvo, ex.medida)}</span>
        </span>
        <span className={`tag ${feitas >= ex.alvo.length ? 'tag-verde' : ''}`}>{feitas}/{ex.alvo.length} séries</span>
      </button>
      {aberto && (
        <div className="exercicio-corpo">
          <div className="exercicio-desenho"><Exercicio desenho={ex.desenho} nome={ex.nome} largura={210} /></div>
          <div className="exercicio-campos">
            <div className="series" role="group" aria-label={`Séries de ${ex.nome}`}>
              {vals.map((v, i) => (
                <label key={i} className="serie">
                  <span>Série {i + 1}</span>
                  <input type="text" inputMode="numeric" value={v} placeholder={String(ex.alvo[i] ?? ex.alvo[ex.alvo.length - 1])}
                    onChange={(e) => mudar(i, e.target.value)} onBlur={() => gravar()} aria-label={`Série ${i + 1}, ${unidade}`} />
                  <span className="suave">{unidade}</span>
                </label>
              ))}
              <div className="series-botoes">
                {vals.length < 10 && <button type="button" className="btn btn-sec btn-peq" onClick={() => setVals([...vals, ''])}>+ série</button>}
                {vals.length > 1 && <button type="button" className="btn btn-sec btn-peq" onClick={() => { const n = vals.slice(0, -1); setVals(n); gravar(n) }}>− série</button>}
              </div>
            </div>
            <div className="caixas-ex">
              <div className="caixa"><strong>Último treino</strong><span>{ultimo ? `${dataCurta(deIso(ultimo.dia))}: ${fmtSeries(ultimo.valores, ex.medida)}` : 'Primeiro registro'}</span></div>
              {ex.como_fazer && <div className="caixa"><strong>Como fazer</strong><span>{ex.como_fazer}</span></div>}
              {ex.dica && <div className="caixa caixa-dica"><strong>Dica para hoje</strong><span>{ex.dica}</span></div>}
            </div>
            <Field label="Como foi (opcional)">
              <textarea rows={2} maxLength={600} value={nota} onChange={(e) => setNota(e.target.value)} onBlur={() => gravar(vals, nota)}
                placeholder="Ex.: tremeu na última série, sentiu mais o tríceps" />
            </Field>
          </div>
        </div>
      )}
    </div>
  )
}

// Feedback do dia seguinte: dor muscular, dificuldade e comentário
function Feedback({ treino }) {
  const { salvar } = useDados()
  const toast = useToast()
  const [dor, setDor] = useState(treino.dor || null)
  const [dif, setDif] = useState(treino.dificuldade || null)
  const [com, setCom] = useState(treino.comentario || '')
  const [salvando, setSalvando] = useState(false)

  async function enviar() {
    setSalvando(true)
    const ok = await salvar('treinos', { id: treino.id, dor, dificuldade: dif, comentario: com.trim() || null })
    setSalvando(false)
    if (ok) toast('Feedback salvo. O Claude usa isso para sugerir o próximo treino.')
  }

  return (
    <section className="cartao cartao-destaque">
      <div className="cab-cartao"><h2>Como você ficou depois do treino de {dataCurta(deIso(treino.dia))}?</h2></div>
      <div className="campo">
        <span className="campo-rotulo">Dor muscular (1 = nenhuma, 5 = muita)</span>
        <div className="chips">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={`chip ${dor === n ? 'ativo' : ''}`} aria-pressed={dor === n} onClick={() => setDor(n)}>{n}</button>)}
        </div>
      </div>
      <div className="campo">
        <span className="campo-rotulo">Dificuldade do treino</span>
        <div className="chips">
          {DIFICULDADES.map((o) => <button key={o.v} type="button" className={`chip ${dif === o.v ? 'ativo' : ''}`} aria-pressed={dif === o.v} onClick={() => setDif(o.v)}>{o.label}</button>)}
        </div>
      </div>
      <Field label="Comentário (opcional)">
        <textarea rows={2} maxLength={1000} value={com} onChange={(e) => setCom(e.target.value)} placeholder="Onde doeu, o que ficou difícil…" />
      </Field>
      <div className="acoes"><Botao carregando={salvando} disabled={!dor || !dif} onClick={enviar}>Salvar feedback</Botao></div>
    </section>
  )
}

function Historico() {
  const { d } = useDados()
  const lista = d.treinos.filter((t) => t.concluido).sort((a, b) => b.dia.localeCompare(a.dia)).slice(0, 8)
  if (!lista.length) return null
  const nomes = { facil: 'fácil', na_medida: 'na medida', pesado: 'pesado' }
  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Treinos anteriores</h2><span className="suave">{d.treinos.filter((t) => t.concluido).length} concluídos</span></div>
      <ul className="historico">
        {lista.map((t) => {
          const series = d.treino_series.filter((s) => s.treino_id === t.id)
          return (
            <li key={t.id}>
              <strong>{dataCurta(deIso(t.dia))}</strong>
              <span className="suave">{series.length} exercícios{t.dor ? ` · dor ${t.dor}` : ''}{t.dificuldade ? ` · ${nomes[t.dificuldade]}` : ''}</span>
              {t.comentario && <span className="suave">“{t.comentario}”</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
