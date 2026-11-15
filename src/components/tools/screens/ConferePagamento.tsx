import { useState } from 'react';
import { SuiteCover, Faq } from './SovereignKit';
import { SupportFuel } from '@/components/SupportFuel';
import { analisarBoleto, analisarPix } from '../lib/confere-pagamento';

const botao = { minHeight: 48, flex: '1 1 180px', justifyContent: 'center' } as const;
export default function ConferePagamento() {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<ReturnType<typeof analisarBoleto> | ReturnType<typeof analisarPix> | null>(null);
  const [aba, setAba] = useState<'boleto' | 'pix'>('boleto');
  function apagar() { setTexto(''); setErro(''); setResultado(null); }
  function analisar() {
    setErro(''); setResultado(null);
    try { setResultado(aba === 'boleto' ? analisarBoleto(texto) : analisarPix(texto)); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível analisar. Confira o texto colado.'); }
  }
  return <div className="ss-root">
    <SuiteCover src="/paginas/confere-pagamento.jpg" alt="Confere pagamento" kicker="Prevenção a fraudes" title="Confere" accent="pagamento" lead="Confira a estrutura e os dígitos do código antes de ir ao banco." badges={['Análise local', 'Sem envio do conteúdo', 'Sem abrir links']} />
    <div className="ss-wrap"><section className="ss-plate">
      <h2>Confira antes de agir</h2>
      <p className="ss-sub">O conteúdo é analisado neste navegador, sem upload ou consulta a um servidor. Não cole senhas nem códigos de confirmação. Esta análise não comprova autenticidade.</p>
      <div className="ss-row" role="group" aria-label="Tipo de pagamento">{(['boleto', 'pix'] as const).map(tipo => <button key={tipo} type="button" className={`ss-btn${aba === tipo ? '' : ' ghost'}`} style={botao} aria-pressed={aba === tipo} onClick={() => { setAba(tipo); apagar(); }}>{tipo === 'boleto' ? 'Boleto' : 'Pix copia e cola'}</button>)}</div>
      <form onSubmit={e => { e.preventDefault(); analisar(); }}>
        <label className="ss-label" htmlFor="confere-pagamento-entrada">Código para conferir{aba === 'boleto' ? ': boleto' : ': Pix copia e cola'}</label>
        <textarea id="confere-pagamento-entrada" className="ss-input" value={texto} maxLength={10000} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Cole a linha digitável ou o Pix copia e cola" onChange={e => { setTexto(e.target.value); setErro(''); setResultado(null); }} />
        <div className="ss-row"><button className="ss-btn" style={botao} type="submit" disabled={!texto.trim()}>Analisar</button><button className="ss-btn ghost" style={botao} type="button" onClick={apagar}>Apagar conteúdo</button></div>
      </form>
      <div aria-live="polite" aria-atomic="true">{erro && <p className="ss-warn" role="alert">{erro}</p>}{resultado && <section style={{ marginTop: 24, overflowWrap: 'anywhere' }} aria-label="Resultado da análise"><h3>Estrutura e verificadores conferem</h3><p>{resultado.tipo}</p><p>Valor: {resultado.valor === null ? 'Não informado em reais. Confira no banco.' : resultado.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>{'vencimento' in resultado ? <p>Vencimento: {resultado.vencimento}</p> : <dl style={{ overflowWrap: 'anywhere' }}><dt>Recebedor declarado</dt><dd>{resultado.recebedor}</dd><dt>Cidade declarada</dt><dd>{resultado.cidade}</dd><dt>Identificador da transação</dt><dd>{resultado.txid}</dd></dl>}<p className="ss-warn">{resultado.aviso}</p></section>}</div>
    </section>
    <Faq items={[{ q: 'Posso confiar só neste resultado?', a: 'Não. Golpes podem passar por estas verificações. Confirme a situação pelo aplicativo ou endereço oficial, sem usar contatos enviados na mensagem.' }, { q: 'O que acontece ao apagar?', a: 'O texto e o resultado são removidos desta tela. A ferramenta não grava o conteúdo. Isso não apaga a área de transferência nem dados que você tenha salvo em outros aplicativos.' }]} />
    <SupportFuel /></div>
  </div>;
}
