import Link from 'next/link';
import { sessao } from '@/lib/supabase';
import { carregar, receitasDoMes } from '@/lib/calculo';
import { brl, mesAtual, hoje, dataBR } from '@/lib/fmt';
import MesNav from '@/components/MesNav';
import { receber, desfazerRecebimento } from './acoes';

export const dynamic = 'force-dynamic';

export default async function Renda({ searchParams }) {
  const q = await searchParams;
  const m = q.mes || mesAtual();
  const { s } = await sessao();
  const d = await carregar(s);
  const recs = receitasDoMes(d, m);
  const contas = d.contas.filter((c) => c.active);
  const pessoa = (id) => d.pessoas.find((p) => p.id === id)?.name;
  const prev = recs.reduce((a, r) => a + r.previsto, 0), receb = recs.reduce((a, r) => a + r.recebido, 0);

  return (
    <>
      <h1>Renda</h1>
      {q.ok && <div className="msg">{q.ok}</div>}
      {q.erro && <div className="msg erro">{q.erro}</div>}
      <MesNav m={m} base="/renda" />
      <div className="grade" style={{ marginBottom: 12 }}>
        <div className="card kpi"><div className="r">Previsto</div><div className="v">{brl(prev)}</div></div>
        <div className="card kpi"><div className="r">Recebido</div><div className="v pos">{brl(receb)}</div></div>
      </div>
      <p className="acoes"><Link className="btn" href="/c/receitas/novo">+ Nova receita</Link>
        <span className="mut" style={{ fontSize: 13 }}>Salário, contrato, benefício ou freela que entra todo mês.</span></p>
      {recs.map((r) => (
        <div key={r.id} className="card">
          <div className="acoes" style={{ justifyContent: 'space-between' }}>
            <div><Link href={`/c/receitas/${r.id}`} style={{ color: 'inherit' }}><strong>{r.name}</strong></Link>
              <div className="mut" style={{ fontSize: 13 }}>{[r.payer, pessoa(r.owner_id), r.day && `dia ${r.day}`].filter(Boolean).join(' · ')}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 650 }}>{brl(r.recebido)} <span className="mut">/ {brl(r.previsto)}</span></div>
              {r.falta <= 0 ? <span className="etq ok">recebido</span> : <span className="etq nao">falta {brl(r.falta)}</span>}</div>
          </div>
          {r.recs.map((x) => (
            <form key={x.id} action={desfazerRecebimento} className="acoes" style={{ marginTop: 6, fontSize: 13 }}>
              <input type="hidden" name="rid" value={x.id} /><input type="hidden" name="mes" value={m} />
              <span className="mut">{dataBR(x.date)} · {brl(x.amount)}</span><button className="mini">Desfazer</button>
            </form>
          ))}
          {r.falta > 0 && (
            <details style={{ marginTop: 6 }}><summary>Recebi</summary>
              <form action={receber} className="linha" style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={r.id} /><input type="hidden" name="mes" value={m} />
                <label style={{ flex: '1 1 110px' }}>Valor<input name="valor" defaultValue={r.falta.toFixed(2)} inputMode="decimal" /></label>
                <label style={{ flex: '1 1 140px' }}>Data<input name="data" type="date" defaultValue={hoje()} /></label>
                <label style={{ flex: '2 1 160px' }}>Caiu em<select name="conta" defaultValue={r.account_id || ''}>
                  <option value="">Dinheiro</option>{contas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label style={{ flex: '2 1 160px' }}>Nota<input name="nota" /></label>
                <button className="pri">Registrar</button>
              </form>
            </details>
          )}
        </div>
      ))}
      {!recs.length && <div className="card mut">Nenhuma receita para este mês. Entradas avulsas ficam em Lançamentos.</div>}
    </>
  );
}
