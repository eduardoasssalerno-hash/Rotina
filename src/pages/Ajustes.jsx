import { useState } from 'react'
import { useDados } from '../lib/dados.jsx'
import { useSessao } from '../lib/sessao.jsx'
import { temaAtual, trocarTema } from '../lib/tema.js'
import { Icone, Segmentos } from '../components/ui.jsx'
import { Cabecalho } from './Shell.jsx'

export default function Ajustes() {
  const { user, sair } = useSessao()
  const { d, salvar } = useDados()
  const [tema, setTema] = useState(temaAtual())
  const areas = [...d.areas].sort((a, b) => a.ordem - b.ordem)

  return (
    <div className="tela">
      <Cabecalho titulo="Ajustes" />
      <div className="grade-hoje">
        <div className="coluna">
          <section className="cartao">
            <div className="cab-cartao"><h2>Aparência</h2></div>
            <Segmentos label="Tema" value={tema} onChange={(v) => { setTema(v); trocarTema(v) }}
              options={[{ v: 'claro', label: 'Claro' }, { v: 'escuro', label: 'Escuro' }]} />
          </section>
          <section className="cartao">
            <div className="cab-cartao"><h2>Áreas e cores</h2></div>
            <p className="suave">As cores aparecem nas faixas das tarefas e nos blocos da semana.</p>
            {areas.map((a) => (
              <div key={a.id} className="linha-area">
                <input type="color" value={a.cor} aria-label={`Cor de ${a.nome}`} onChange={(e) => salvar('areas', { id: a.id, cor: e.target.value.toUpperCase() })} />
                <span>{a.nome}</span>
              </div>
            ))}
          </section>
        </div>
        <div className="coluna">
          <section className="cartao">
            <div className="cab-cartao"><h2>Conta</h2></div>
            <p>Entrou como <strong>{user?.email}</strong>.</p>
            <p className="suave">O login vale só para esta aba. Os seus dados ficam protegidos no banco: só a sua conta vê e mexe neles.</p>
            <button type="button" className="btn btn-sec" onClick={sair}><Icone nome="sair" tamanho={18} />Sair</button>
          </section>
        </div>
      </div>
    </div>
  )
}
