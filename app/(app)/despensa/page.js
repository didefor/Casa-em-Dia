import Link from 'next/link';
import { sessao } from '@/lib/supabase';
import { brl, dataBR } from '@/lib/fmt';
import { mexer, novoProduto } from './acoes';

export const dynamic = 'force-dynamic';

export default async function Despensa({ searchParams }) {
  const q = await searchParams;
  const { s } = await sessao();
  const [{ data: prods }, { data: compras }, { data: contas }] = await Promise.all([
    s.from('produtos_despensa').select('*').eq('active', true).order('category').order('name'),
    s.from('compras_despensa').select('*').order('date', { ascending: false }).limit(2000),
    s.from('contas_bancarias').select('id,name').eq('active', true).order('name'),
  ]);
  const precos = (id) => (compras || []).filter((c) => c.produto_id === id && c.unit_price);
  const lista = (prods || []).filter((p) => Number(p.qty) <= Number(p.min_qty));

  return (
    <>
      <div className="acoes" style={{ justifyContent: 'space-between' }}>
        <h1>Despensa</h1><Link href="/c/produtos_despensa" className="btn">Editar produtos</Link>
      </div>
      {q.ok && <div className="msg">{q.ok}</div>}
      {q.erro && <div className="msg erro">{q.erro}</div>}

      <h2>🛒 Lista de compras ({lista.length})</h2>
      <div className="card">
        {lista.length ? lista.map((p) => (
          <div key={p.id}>{p.name} <span className="mut">— tem {Number(p.qty)} {p.unit}, mínimo {Number(p.min_qty)}</span></div>
        )) : <span className="mut">Nada faltando.</span>}
      </div>

      <h2>Estoque</h2>
      {(prods || []).map((p) => {
        const hist = precos(p.id);
        const ult = hist[0], media = hist.length ? hist.reduce((a, c) => a + Number(c.unit_price), 0) / hist.length : null;
        const baixo = Number(p.qty) <= Number(p.min_qty);
        return (
          <div key={p.id} className="card">
            <div className="acoes" style={{ justifyContent: 'space-between' }}>
              <div><strong>{p.name}</strong> {p.category && <span className="etq">{p.category}</span>}
                {ult && <div className="mut" style={{ fontSize: 13 }}>último {brl(ult.unit_price)}{ult.store ? ` (${ult.store}, ${dataBR(ult.date)})` : ''} · média {brl(media)}</div>}</div>
              <div className={baixo ? 'aviso' : ''} style={{ fontWeight: 650 }}>{Number(p.qty)} {p.unit}</div>
            </div>
            <details style={{ marginTop: 6 }}><summary>Atualizar</summary>
              <form action={mexer} className="linha" style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={p.id} />
                <label style={{ flex: '1 1 120px' }}>Ação<select name="acao" defaultValue="comprei">
                  <option value="comprei">Comprei</option><option value="usei">Usei</option>
                  <option value="contei">Contei (tenho)</option><option value="acabou">Acabou</option></select></label>
                <label style={{ flex: '1 1 80px' }}>Qtd<input name="qtd" inputMode="decimal" defaultValue="1" /></label>
                <label style={{ flex: '1 1 100px' }}>Preço un.<input name="preco" inputMode="decimal" placeholder="opcional" /></label>
                <label style={{ flex: '1 1 120px' }}>Mercado<input name="mercado" /></label>
                <label style={{ flex: '1 1 140px' }}>Conta<select name="onde" defaultValue={contas?.[0]?.id || ''}><option value="">Dinheiro</option>
                  {contas?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label style={{ flexDirection: 'row', display: 'flex', gap: 6, alignItems: 'center', color: 'var(--tx)' }}><input type="checkbox" name="lancar" /> lançar gasto</label>
                <button className="pri">OK</button>
              </form>
            </details>
          </div>
        );
      })}

      <h2>Novo produto</h2>
      <div className="card">
        <form action={novoProduto} className="campos">
          <label>Nome<input name="nome" required /></label>
          <label>Categoria<input name="categoria" placeholder="Limpeza, Mercearia..." /></label>
          <label>Unidade<input name="unidade" defaultValue="un" /></label>
          <label>Tenho agora<input name="qtd" inputMode="decimal" defaultValue="0" /></label>
          <label>Mínimo<input name="min" inputMode="decimal" defaultValue="1" /></label>
          <div className="largo"><button className="pri">Adicionar</button></div>
        </form>
      </div>
    </>
  );
}
