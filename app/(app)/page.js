import Link from 'next/link';
import { sessao } from '@/lib/supabase';
import { carregar, resumo } from '@/lib/calculo';
import { brl, mesAtual, nomeMes } from '@/lib/fmt';
import MesNav from '@/components/MesNav';

export const dynamic = 'force-dynamic';

export default async function Visao({ searchParams }) {
  const m = (await searchParams).mes || mesAtual();
  const { s, casa } = await sessao();
  const d = await carregar(s);
  const r = resumo(d, m);
  const negativas = r.saldos.filter((c) => c.fimMes < 0);
  const vazio = !d.contas.length && !d.cartoes.length && !d.fixas.length && !d.lancamentos.length;

  return (
    <>
      <h1>{casa?.nome}</h1>
      <MesNav m={m} base="/" />
      {vazio && (
        <div className="card"><strong>Bem-vindo!</strong> Comece cadastrando suas{' '}
          <Link href="/c/contas_bancarias">contas bancárias</Link>, <Link href="/c/cartoes">cartões</Link> e{' '}
          <Link href="/c/contas_fixas">contas fixas</Link>. Depois é só ir lançando os gastos.</div>
      )}
      {negativas.map((c) => (
        <div key={c.id} className="card alerta"><strong className="neg">Atenção:</strong> {c.name} pode fechar {nomeMes(m)} em <strong className="neg">{brl(c.fimMes)}</strong>.</div>
      ))}
      <div className="grade">
        <Kpi r="Renda recebida" v={brl(r.recebida)} sub={`prevista ${brl(r.prevista)}`} />
        <Kpi r="Sobra prevista" v={brl(r.sobra)} cls={r.sobra < 0 ? 'neg' : 'pos'} sub={r.prevista ? `${Math.round((r.sobra / r.prevista) * 100)}% da renda` : ''} />
        <Kpi r="Falta pagar" v={brl(r.falta)} sub={`${r.pagos}/${r.nItens} pagos`} href="/a-pagar" />
        <Kpi r="Dia a dia" v={brl(r.diaADia)} sub="gastos lançados no mês" href="/lancamentos" />
      </div>
      <div className="grade">
        <Kpi r="Contas da casa" v={brl(r.casa)} />
        <Kpi r="Contas pessoais" v={brl(r.contas)} />
        <Kpi r="Guardar" v={brl(r.guardar)} />
        <Kpi r="Crédito livre" v={brl(r.livre)} sub={`de ${brl(r.limite)}`} />
        <Kpi r="Dívida (empréstimos)" v={brl(r.divida)} />
        <Kpi r="Poupança" v={brl(r.poupanca)} />
      </div>
      {r.acerto.length > 0 && (
        <div className="card"><strong>Acerto da casa</strong>
          {r.acerto.map((a, i) => <div key={i}>{a.de} devolve <strong>{brl(a.valor)}</strong> para {a.para}</div>)}
        </div>
      )}
      <h2>Contas</h2>
      <div className="card tabela"><table>
        <thead><tr><th>Conta</th><th className="n">Saldo</th><th className="n">Fim do mês</th></tr></thead>
        <tbody>
          {r.saldos.map((c) => (
            <tr key={c.id}><td><Link href={`/lancamentos?conta=${c.id}&mes=${m}`}>{c.name}</Link></td>
              <td className={`n ${c.saldo < 0 ? 'neg' : ''}`}>{brl(c.saldo)}</td>
              <td className={`n ${c.fimMes < 0 ? 'neg' : 'mut'}`}>{brl(c.fimMes)}</td></tr>
          ))}
          {!r.saldos.length && <tr><td colSpan={3} className="mut">Nenhuma conta. <Link href="/c/contas_bancarias">Cadastrar</Link></td></tr>}
        </tbody>
      </table></div>
    </>
  );
}

function Kpi({ r, v, sub, cls = '', href }) {
  const c = (<div className="card kpi"><div className="r">{r}</div><div className={`v ${cls}`}>{v}</div>{sub && <div className="mut" style={{ fontSize: 13 }}>{sub}</div>}</div>);
  return href ? <Link href={href} style={{ color: 'inherit' }}>{c}</Link> : c;
}
