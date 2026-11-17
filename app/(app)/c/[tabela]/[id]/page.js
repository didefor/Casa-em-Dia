import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sessao } from '@/lib/supabase';
import { config, opcoesRef } from '@/lib/crud';
import Campo from '@/components/Campo';
import { salvar } from '../acoes';

export const dynamic = 'force-dynamic';

export default async function Editar({ params, searchParams }) {
  const { tabela, id } = await params;
  const q = await searchParams;
  const cfg = config(tabela);
  const { s } = await sessao();
  const novo = id === 'novo';
  let reg = {};
  if (!novo) {
    const { data } = await s.from(tabela).select('*').eq('id', Number(id)).maybeSingle();
    if (!data) notFound();
    reg = data;
  }
  const refs = await opcoesRef(s, cfg);
  return (
    <>
      <p><Link href={`/c/${tabela}`}>‹ {cfg.titulo}</Link></p>
      <h1>{novo ? `Novo ${cfg.item}` : `Editar ${cfg.item}`}</h1>
      {q.erro && <div className="msg erro">{q.erro}</div>}
      <div className="card">
        <form action={salvar} className="campos">
          <input type="hidden" name="__tabela" value={tabela} />
          {!novo && <input type="hidden" name="__id" value={id} />}
          {q.volta && <input type="hidden" name="__volta" value={q.volta} />}
          {cfg.campos.map((f) => <Campo key={f.c} f={f} valor={novo ? undefined : reg[f.c]} opcoes={f.t.startsWith('ref:') ? refs[f.t.slice(4)] : null} />)}
          <div className="largo acoes"><button className="pri">Salvar</button><Link className="btn" href={`/c/${tabela}`}>Cancelar</Link></div>
        </form>
      </div>
    </>
  );
}
