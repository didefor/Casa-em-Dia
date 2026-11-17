import Link from 'next/link';
import { sessao } from '@/lib/supabase';
import { brl, dataBR, mesAtual, hoje, fimDoMes } from '@/lib/fmt';
import MesNav from '@/components/MesNav';
import BotaoApagar from '@/components/BotaoApagar';
import { lancar, apagar } from './acoes';

export const dynamic = 'force-dynamic';

export default async function Lancamentos({ searchParams }) {
  const q = await searchParams;
  const m = q.mes || mesAtual();
  const { s } = await sessao();
  let consulta = s.from('lancamentos').select('*').gte('date', `${m}-01`).lte('date', fimDoMes(m)).order('date', { ascending: false }).order('id', { ascending: false });
  if (q.conta) consulta = consulta.eq('account_id', Number(q.conta));
  if (q.busca) consulta = consulta.or(`description.ilike.%${q.busca.replace(/[%,()]/g, '')}%,category.ilike.%${q.busca.replace(/[%,()]/g, '')}%`);
  const [{ data: lanc }, { data: contas }, { data: cartoes }, { data: caixinhas }, { data: pessoas }, { data: bens }, { data: cats }] = await Promise.all([
    consulta,
    s.from('contas_bancarias').select('id,name').eq('active', true).order('name'),
    s.from('cartoes').select('id,name').order('name'),
    s.from('caixinhas').select('id,name').eq('active', true).order('name'),
    s.from('pessoas').select('id,name').order('id'),
    s.from('bens').select('id,name').eq('active', true).order('name'),
    s.from('lancamentos').select('category').not('category', 'is', null).order('id', { ascending: false }).limit(1000),
  ]);
  const { data: comprasMes } = await s.from('compras_cartao').select('*').gte('date', `${m}-01`).lte('date', fimDoMes(m)).order('date', { ascending: false });
  const categorias = [...new Set((cats || []).map((c) => c.category))].sort();
  const nome = (lista, id) => lista?.find((x) => x.id === id)?.name;
  const ent = (lanc || []).filter((l) => l.type === 'entrada' && l.kind === 'normal').reduce((a, l) => a + Number(l.amount), 0);
  const sai = (lanc || []).filter((l) => l.type === 'saida' && l.kind !== 'transferencia' && l.kind !== 'caixinha').reduce((a, l) => a + Number(l.amount), 0);

  return (
    <>
      <h1>Lançamentos</h1>
      {q.ok && <div className="msg">{q.ok}</div>}
      {q.erro && <div className="msg erro">{q.erro}</div>}
      <div className="card">
        <form action={lancar} className="campos">
          <label>Tipo<select name="tipo" defaultValue="gasto">
            <option value="gasto">Gasto</option><option value="entrada">Entrada</option>
            <option value="cartao">Compra no cartão</option><option value="transferencia">Transferência entre contas</option>
            <option value="guardar">Guardar na caixinha</option><option value="retirar">Retirar da caixinha</option>
          </select></label>
          <label>Valor (R$)<input name="valor" inputMode="decimal" required placeholder="0,00" /></label>
          <label>Descrição<input name="descricao" /></label>
          <label>Categoria<input name="categoria" list="cats" /></label>
          <datalist id="cats">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          <label>Data<input name="data" type="date" defaultValue={hoje()} /></label>
          <label>Onde<select name="onde" defaultValue={contas?.[0] ? `conta:${contas[0].id}` : 'dinheiro'}>
            <option value="dinheiro">Dinheiro</option>
            <optgroup label="Contas">{contas?.map((c) => <option key={c.id} value={`conta:${c.id}`}>{c.name}</option>)}</optgroup>
            <optgroup label="Cartões">{cartoes?.map((c) => <option key={c.id} value={`cartao:${c.id}`}>{c.name}</option>)}</optgroup>
            <optgroup label="Caixinhas">{caixinhas?.map((c) => <option key={c.id} value={`caixinha:${c.id}`}>{c.name}</option>)}</optgroup>
          </select></label>
          <details className="largo"><summary>Mais opções (parcelas, transferência, pessoa, bem)</summary>
            <div className="campos" style={{ marginTop: 10 }}>
              <label>Parcelas (cartão)<input name="parcelas" type="number" min="1" defaultValue="1" /></label>
              <label>Para (transferência)<select name="para" defaultValue=""><option value="">—</option>
                {contas?.map((c) => <option key={c.id} value={`conta:${c.id}`}>{c.name}</option>)}</select></label>
              <label>Pessoa<select name="pessoa" defaultValue=""><option value="">Eu</option>
                {pessoas?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label>Bem ligado<select name="bem" defaultValue=""><option value="">—</option>
                {bens?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            </div>
          </details>
          <div className="largo"><button className="pri">Lançar</button></div>
        </form>
      </div>

      <MesNav m={m} base="/lancamentos" />
      <form className="linha" style={{ marginBottom: 12 }}>
        <input type="hidden" name="mes" value={m} />
        <input name="busca" placeholder="Buscar descrição ou categoria" defaultValue={q.busca || ''} style={{ flex: 1, minWidth: 180 }} />
        <select name="conta" defaultValue={q.conta || ''} style={{ width: 'auto' }}><option value="">Todas as contas</option>
          {contas?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button>Filtrar</button>
      </form>
      <div className="grade" style={{ marginBottom: 12 }}>
        <div className="card kpi"><div className="r">Entradas</div><div className="v pos">{brl(ent)}</div></div>
        <div className="card kpi"><div className="r">Saídas</div><div className="v neg">{brl(sai)}</div></div>
      </div>
      <div className="card tabela"><table>
        <thead><tr><th>Data</th><th>Descrição</th><th className="esconde-cel">Categoria</th><th className="esconde-cel">Conta</th><th className="n">Valor</th><th></th></tr></thead>
        <tbody>
          {(lanc || []).map((l) => (
            <tr key={l.id}>
              <td>{dataBR(l.date).slice(0, 5)}</td>
              <td><Link href={`/c/lancamentos/${l.id}`} style={{ color: 'inherit' }}>{l.description || '—'}</Link>
                {l.kind !== 'normal' && <> <span className="etq">{l.kind.replace('_', ' ')}</span></>}</td>
              <td className="esconde-cel mut">{l.category}</td>
              <td className="esconde-cel mut">{nome(contas, l.account_id) || (l.account_id ? '' : 'Dinheiro')}</td>
              <td className={`n ${l.type === 'entrada' ? 'pos' : ''}`}>{l.type === 'entrada' ? '+' : '−'}{brl(l.amount)}</td>
              <td className="n"><BotaoApagar acao={apagar} campos={{ id: l.id, mes: m, tabela: 'lancamentos' }} /></td>
            </tr>
          ))}
          {!lanc?.length && <tr><td colSpan={6} className="mut">Nada lançado neste mês.</td></tr>}
        </tbody>
      </table></div>
      {comprasMes?.length > 0 && (<>
        <h2>Compras no cartão feitas neste mês</h2>
        <div className="card tabela"><table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Cartão</th><th className="n">Total</th><th className="n">Parc.</th><th></th></tr></thead>
          <tbody>{comprasMes.map((c) => (
            <tr key={c.id}><td>{dataBR(c.date).slice(0, 5)}</td>
              <td><Link href={`/c/compras_cartao/${c.id}`} style={{ color: 'inherit' }}>{c.description || '—'}</Link></td>
              <td className="mut">{nome(cartoes, c.card_id)}</td><td className="n">{brl(c.total)}</td><td className="n">{c.installments}x</td>
              <td className="n"><BotaoApagar acao={apagar} campos={{ id: c.id, mes: m, tabela: 'compras_cartao' }} /></td></tr>
          ))}</tbody>
        </table></div>
      </>)}
    </>
  );
}
