import Link from 'next/link';
import { sessao } from '@/lib/supabase';
import { salvarAjustes } from './acoes';

export const dynamic = 'force-dynamic';

export default async function Ajustes({ searchParams }) {
  const q = await searchParams;
  const { s, casa } = await sessao();
  const { data: a } = await s.from('ajustes').select('*').maybeSingle();
  return (
    <>
      <h1>Ajustes</h1>
      {q.ok && <div className="msg">{q.ok}</div>}
      {q.erro && <div className="msg erro">{q.erro}</div>}
      <div className="card">
        <form action={salvarAjustes} className="campos">
          <label>Nome da casa<input name="nome" defaultValue={casa?.nome} /></label>
          <label>Divisão das contas da casa<select name="split_mode" defaultValue={a?.split_mode || 'proporcional'}>
            <option value="proporcional">Proporcional ao salário</option><option value="igual">Meio a meio</option></select></label>
          <label>Referência de moradia (% da renda)<input name="housing_ref" inputMode="decimal" defaultValue={a?.housing_ref ?? 30} /></label>
          <label>Orçamento diário (R$)<input name="daily_budget" inputMode="decimal" defaultValue={a?.daily_budget ?? 0} /></label>
          <label>Meta de reserva (R$)<input name="reserve_goal" inputMode="decimal" defaultValue={a?.reserve_goal ?? 0} /></label>
          <div className="largo"><button className="pri">Salvar</button></div>
        </form>
      </div>
      <h2>Dados</h2>
      <div className="card acoes">
        <a className="btn" href="/exportar">⬇ Baixar cópia de todos os dados (JSON)</a>
        <Link className="btn" href="/c/bancos">Bancos (cores e nomes)</Link>
      </div>
    </>
  );
}
