import { sessao } from '@/lib/supabase';
import { carregar, aPagar } from '@/lib/calculo';
import { brl, mesAtual, hoje, dataBR } from '@/lib/fmt';
import MesNav from '@/components/MesNav';
import { pagar, desfazer } from './acoes';

export const dynamic = 'force-dynamic';

export default async function APagar({ searchParams }) {
  const q = await searchParams;
  const m = q.mes || mesAtual();
  const { s } = await sessao();
  const d = await carregar(s);
  const itens = aPagar(d, m);
  const pessoa = (id) => d.pessoas.find((p) => p.id === id)?.name;
  const contas = d.contas.filter((c) => c.active);
  const falta = itens.filter((i) => !i.pg).reduce((a, i) => a + i.valor, 0);
  const pago = itens.filter((i) => i.pg).reduce((a, i) => a + Number(i.pg.amount), 0);
  const filtroPessoa = Number(q.pessoa) || null;
  const lista = filtroPessoa ? itens.filter((i) => i.dono === filtroPessoa) : itens;

  return (
    <>
      <h1>A pagar</h1>
      {q.ok && <div className="msg">{q.ok}</div>}
      {q.erro && <div className="msg erro">{q.erro}</div>}
      <MesNav m={m} base="/a-pagar" />
      <div className="grade" style={{ marginBottom: 12 }}>
        <div className="card kpi"><div className="r">Falta pagar</div><div className="v aviso">{brl(falta)}</div></div>
        <div className="card kpi"><div className="r">Já pago</div><div className="v pos">{brl(pago)}</div></div>
      </div>
      <form className="linha" style={{ marginBottom: 12 }}>
        <input type="hidden" name="mes" value={m} />
        <select name="pessoa" defaultValue={q.pessoa || ''} style={{ width: 'auto' }}><option value="">Todos</option>
          {d.pessoas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <button>Filtrar</button>
      </form>
      {lista.map((i) => (
        <div key={`${i.tipo}${i.id}`} className="card">
          <div className="acoes" style={{ justifyContent: 'space-between' }}>
            <div>
              <strong>{i.nome}</strong> {i.casa && <span className="etq">casa</span>}
              <div className="mut" style={{ fontSize: 13 }}>{i.dia ? `dia ${i.dia}` : 'sem dia'}{pessoa(i.dono) ? ` · ${pessoa(i.dono)}` : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 650 }}>{brl(i.valor)}</div>
              {i.pg ? <span className="etq ok">pago {dataBR(i.pg.date).slice(0, 5)}</span> : <span className="etq nao">a pagar</span>}
            </div>
          </div>
          {i.pg ? (
            <form action={desfazer} style={{ marginTop: 8 }}>
              <input type="hidden" name="pid" value={i.pg.id} /><input type="hidden" name="mes" value={m} />
              <button className="mini">Desfazer pagamento</button>
            </form>
          ) : (
            <details style={{ marginTop: 6 }}><summary>Marcar como pago</summary>
              <form action={pagar} className="linha" style={{ marginTop: 8 }}>
                {[['tipo', i.tipo], ['id', i.id], ['mes', m], ['nome', i.nome]].map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                <label style={{ flex: '1 1 110px' }}>Valor<input name="valor" defaultValue={i.valor.toFixed(2)} inputMode="decimal" /></label>
                <label style={{ flex: '1 1 140px' }}>Data<input name="data" type="date" defaultValue={hoje()} /></label>
                <label style={{ flex: '2 1 160px' }}>Pago com<select name="conta" defaultValue={i.conta || ''}>
                  <option value="">Dinheiro / não registrar saída</option>
                  {contas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <button className="pri">Pago</button>
              </form>
            </details>
          )}
        </div>
      ))}
      {!lista.length && <div className="card mut">Nada a pagar neste mês.</div>}
    </>
  );
}
