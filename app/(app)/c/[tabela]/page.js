import Link from 'next/link';
import { sessao } from '@/lib/supabase';
import { config, opcoesRef } from '@/lib/crud';
import { brl, dataBR } from '@/lib/fmt';
import BotaoApagar from '@/components/BotaoApagar';
import { apagar } from './acoes';

export const dynamic = 'force-dynamic';

export default async function Lista({ params, searchParams }) {
  const { tabela } = await params;
  const q = await searchParams;
  const cfg = config(tabela);
  const { s } = await sessao();
  const ordem = cfg.campos.some((f) => f.c === 'date') ? 'date' : 'id';
  const [{ data }, refs] = await Promise.all([
    s.from(tabela).select('*').order(ordem, { ascending: ordem !== 'date' }).limit(500),
    opcoesRef(s, cfg),
  ]);
  const cols = cfg.campos.filter((f) => f.lista);
  const mostra = (f, v) => {
    if (v === null || v === undefined || v === '') return '';
    if (f.t === 'number') return brl(v);
    if (f.t === 'date') return dataBR(v);
    if (f.t === 'bool') return v ? 'sim' : 'não';
    if (f.t === 'color') return <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: v }} />;
    if (f.t.startsWith('ref:')) return refs[f.t.slice(4)]?.find((o) => o.id === v)?.r;
    return String(v);
  };
  return (
    <>
      <p><Link href="/cadastros">‹ Cadastros</Link></p>
      <div className="acoes" style={{ justifyContent: 'space-between' }}>
        <h1>{cfg.titulo}</h1>
        <Link className="btn pri" href={`/c/${tabela}/novo`}>+ Novo {cfg.item}</Link>
      </div>
      {q.ok && <div className="msg">{q.ok}</div>}
      {q.erro && <div className="msg erro">{q.erro}</div>}
      <div className="card tabela"><table>
        <thead><tr>{cols.map((f) => <th key={f.c} className={f.t === 'number' || f.t === 'int' ? 'n' : ''}>{f.l}</th>)}<th></th></tr></thead>
        <tbody>
          {(data || []).map((r) => (
            <tr key={r.id} style={r.active === false ? { opacity: 0.55 } : undefined}>
              {cols.map((f, i) => (
                <td key={f.c} className={f.t === 'number' || f.t === 'int' ? 'n' : ''}>
                  {i === 0 ? <Link href={`/c/${tabela}/${r.id}`}>{mostra(f, r[f.c]) || '—'}</Link> : mostra(f, r[f.c])}
                </td>))}
              <td className="n"><BotaoApagar acao={apagar} campos={{ id: r.id, tabela }} /></td>
            </tr>
          ))}
          {!data?.length && <tr><td colSpan={cols.length + 1} className="mut">Nada cadastrado ainda.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
