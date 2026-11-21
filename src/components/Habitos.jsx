import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { LIVROS, lerPosicao, nomePosicao, seguinte, trecho } from '../lib/biblia.js'
import { addDias, fmtHora, hoje, isoDia } from '../lib/util.js'
import { marcarTreino } from '../lib/treinoHabito.js'
import { Botao, Icone, Modal, useToast } from './ui.jsx'

// Dias seguidos com o hábito feito (contando até hoje ou ontem)
function sequencia(d, h) {
  const feitos = new Set(d.habito_marcas.filter((m) => m.habito_id === h.id && m.valor >= h.meta).map((m) => m.dia))
  let dia = hoje()
  if (!feitos.has(isoDia(dia))) dia = addDias(dia, -1)
  let n = 0
  while (feitos.has(isoDia(dia))) { n++; dia = addDias(dia, -1) }
  return n
}

export default function Habitos({ data = hoje() }) {
  const dados = useDados()
  const { d, gravar, apagar, salvar } = dados
  const toast = useToast()
  const [lendo, setLendo] = useState(null)
  const iso = isoDia(data)
  const lista = d.habitos.filter((h) => h.ativo && h.dias.includes(data.getDay())).sort((a, b) => a.ordem - b.ordem)
  if (!lista.length) return null

  async function tocar(h, marca) {
    if (h.plano === 'biblia') {
      if (marca) {
        if (!window.confirm(`Desmarcar o devocional de hoje (${marca.nota || 'leitura'})?`)) return
        await apagar('habito_marcas', marca)
        // volta o plano para o começo do trecho desmarcado
        if (marca.nota) await salvar('habitos', { id: h.id, proximo: marca.nota.split('–')[0] })
        return
      }
      return setLendo(h)
    }
    const valor = (marca?.valor || 0) + 1
    // Calistenia: o bloco Treino do dia acompanha
    if (h.plano === 'treino') marcarTreino(dados, iso, valor === h.meta, { habito: false })
    if (valor > h.meta) return apagar('habito_marcas', { habito_id: h.id, dia: iso })
    await gravar('habito_marcas', { habito_id: h.id, dia: iso, valor })
    if (valor === h.meta) toast(`${h.nome}: feito!`)
  }

  return (
    <section className="cartao">
      <div className="cab-cartao"><h2>Hábitos de hoje</h2></div>
      <div className="habitos">
        {lista.map((h) => {
          const marca = d.habito_marcas.find((m) => m.habito_id === h.id && m.dia === iso)
          const feito = (marca?.valor || 0) >= h.meta
          const seq = sequencia(d, h)
          const pct = Math.min(1, (marca?.valor || 0) / h.meta)
          return (
            <button key={h.id} type="button" className={`habito ${feito ? 'feito' : ''}`} onClick={() => tocar(h, marca)}
              aria-pressed={feito}>
              <svg width="56" height="56" viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="15.9" fill={feito ? 'var(--acento)' : 'none'} stroke={feito ? 'var(--acento)' : 'var(--neutro)'} strokeWidth="3.4" />
                {!feito && pct > 0 && <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--acento)" strokeWidth="3.4" strokeDasharray={`${pct * 100} ${100 - pct * 100}`} strokeDashoffset="25" strokeLinecap="round" pathLength="100" />}
                {feito && <path d="m12 18.5 4 4 8-9" fill="none" stroke="var(--sobre-acento)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
                {!feito && h.meta > 1 && <text x="18" y="21" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="var(--acento)">{marca?.valor || 0}/{h.meta}</text>}
              </svg>
              <span className="habito-texto">
                <strong>{h.nome}</strong>
                <span className="suave">
                  {h.plano === 'biblia'
                    ? (feito ? `Leu ${marca.nota}` : `Hoje: ${h.proximo || 'Gênesis 1'}`)
                    : h.horario ? `às ${fmtHora(h.horario)}` : h.unidade || ''}
                </span>
                {seq > 1 && <span className="sequencia">{seq} dias seguidos</span>}
              </span>
            </button>
          )
        })}
      </div>
      {lendo && <Leitura habito={lendo} dia={iso} aoFechar={() => setLendo(null)} />}
    </section>
  )
}

// Marca o devocional e guarda até onde leu (a Bíblia em ordem)
export function Leitura({ habito, dia, aoFechar }) {
  const { gravar, salvar } = useDados()
  const toast = useToast()
  const ini = lerPosicao(habito.proximo || 'Gênesis 1')
  const max = LIVROS[ini.livro][1]
  const [fim, setFim] = useState(ini.cap)
  const [salvando, setSalvando] = useState(false)
  const opcoes = []
  for (let c = ini.cap; c <= Math.min(max, ini.cap + 9); c++) opcoes.push(c)

  async function confirmar() {
    setSalvando(true)
    const nota = trecho(ini, fim)
    const prox = nomePosicao(seguinte({ livro: ini.livro, cap: fim }))
    const ok = await gravar('habito_marcas', { habito_id: habito.id, dia, valor: habito.meta, nota })
    if (ok) await salvar('habitos', { id: habito.id, proximo: prox })
    setSalvando(false)
    if (ok) { toast(`Devocional feito. Amanhã: ${prox}`); aoFechar() }
  }

  return (
    <Modal titulo="Devocional" subtitulo={`Leitura em ordem · começa em ${nomePosicao(ini)}`} aoFechar={aoFechar}
      rodape={<><div className="espaco" /><button type="button" className="btn btn-sec" onClick={aoFechar}>Cancelar</button><Botao carregando={salvando} onClick={confirmar}><Icone nome="check" tamanho={18} />Marcar feito</Botao></>}>
      <p className="campo-rotulo">Até que capítulo de {LIVROS[ini.livro][0]} você leu?</p>
      <div className="chips">
        {opcoes.map((c) => (
          <button key={c} type="button" className={`chip ${fim === c ? 'ativo' : ''}`} aria-pressed={fim === c} onClick={() => setFim(c)}>{c}</button>
        ))}
      </div>
      <p className="suave">Vai ficar registrado: <strong>{trecho(ini, fim)}</strong>.</p>
    </Modal>
  )
}
