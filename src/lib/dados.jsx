import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { addDias, hoje, isoDia, msgErro } from './util.js'

// Todos os dados da Ione ficam carregados na memória (é um app de uma pessoa só)
const TABELAS = ['areas', 'projetos', 'tarefas', 'blocos_fixos', 'blocos_feitos', 'folgas',
  'habitos', 'habito_marcas', 'exercicios', 'treinos', 'treino_series', 'sessoes_foco', 'anexos', 'metas', 'categorias', 'lancamentos', 'conexoes', 'contas', 'regras_categoria', 'investimentos', 'investimento_historico']
// Tabelas com muitas linhas: só o último ano
const COM_DIA = { blocos_feitos: 'dia', habito_marcas: 'dia', sessoes_foco: 'inicio', lancamentos: 'dia', investimento_historico: 'dia' }
// Tabelas sem coluna id: a linha é identificada por estas colunas
const CHAVES = { blocos_feitos: ['bloco_id', 'dia'], habito_marcas: ['habito_id', 'dia'], investimento_historico: ['investimento_id', 'dia'] }

const Ctx = createContext(null)
const vazio = Object.fromEntries(TABELAS.map((t) => [t, []]))

const mesmaLinha = (t, a, b) => (CHAVES[t] ? CHAVES[t].every((k) => a[k] === b[k]) : a.id === b.id)

export function DadosProvider({ children, aoErro }) {
  const [d, setD] = useState(null)
  const [erro, setErro] = useState('')
  const erroRef = useRef(aoErro)
  erroRef.current = aoErro

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const desde = isoDia(addDias(hoje(), -400))
      const res = await Promise.all(TABELAS.map((t) => {
        let q = supabase.from(t).select('*')
        if (COM_DIA[t]) q = q.gte(COM_DIA[t], desde)
        return q
      }))
      const novo = {}
      res.forEach(({ data, error }, i) => {
        if (error) throw error
        novo[TABELAS[i]] = data || []
      })
      setD(novo)
    } catch (e) {
      setErro(msgErro(e))
    }
  }, [])

  useEffect(() => {
    carregar()
    // ao voltar para o app (tablet que ficou parado), atualiza o que o Claude mudou
    const ver = () => { if (document.visibilityState === 'visible') carregar() }
    document.addEventListener('visibilitychange', ver)
    return () => document.removeEventListener('visibilitychange', ver)
  }, [carregar])

  const falhou = useCallback((e) => {
    erroRef.current?.(msgErro(e))
    carregar()
  }, [carregar])

  const trocar = (t, fn) => setD((x) => (x ? { ...x, [t]: fn(x[t]) } : x))

  // Cria ou altera uma linha (com id = altera)
  const salvar = useCallback(async (t, linha) => {
    const { id, ...campos } = linha
    if (id) trocar(t, (l) => l.map((r) => (r.id === id ? { ...r, ...campos } : r)))
    const q = id
      ? supabase.from(t).update(campos).eq('id', id).select().single()
      : supabase.from(t).insert(campos).select().single()
    const { data, error } = await q
    if (error) { falhou(error); return null }
    trocar(t, (l) => (id ? l.map((r) => (r.id === id ? data : r)) : [...l, data]))
    return data
  }, [falhou])

  const apagar = useCallback(async (t, linha) => {
    trocar(t, (l) => l.filter((r) => !mesmaLinha(t, r, linha)))
    let q = supabase.from(t).delete()
    q = CHAVES[t] ? q.match(Object.fromEntries(CHAVES[t].map((k) => [k, linha[k]]))) : q.eq('id', linha.id)
    const { error } = await q
    if (error) falhou(error)
  }, [falhou])

  // Grava uma linha identificada por colunas (marcação de hábito, feito de compromisso)
  const gravar = useCallback(async (t, linha) => {
    trocar(t, (l) => [...l.filter((r) => !mesmaLinha(t, r, linha)), linha])
    const { data, error } = await supabase.from(t).upsert(linha, { onConflict: CHAVES[t].join(',') }).select().single()
    if (error) { falhou(error); return null }
    trocar(t, (l) => l.map((r) => (mesmaLinha(t, r, data) ? data : r)))
    return data
  }, [falhou])

  const value = useMemo(() => ({ d: d || vazio, pronto: !!d, erro, carregar, salvar, apagar, gravar }), [d, erro, carregar, salvar, apagar, gravar])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useDados = () => useContext(Ctx)
