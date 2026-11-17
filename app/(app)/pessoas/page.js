import { sessao } from '@/lib/supabase';
import { brl } from '@/lib/fmt';
import BotaoApagar from '@/components/BotaoApagar';
import { adicionar, darAcesso, removerAcesso, salvarPessoa, apagarPessoa } from './acoes';

export const dynamic = 'force-dynamic';

export default async function Pessoas({ searchParams }) {
  const q = await searchParams;
  const { s, user } = await sessao();
  const [{ data: pessoas }, { data: membros }] = await Promise.all([
    s.from('pessoas').select('*').order('id'), s.from('membros').select('user_id, papel'),
  ]);
  const papel = (uid) => membros?.find((m) => m.user_id === uid)?.papel;
  const total = (pessoas || []).reduce((a, p) => a + Number(p.salary || 0), 0);

  return (
    <>
      <h1>Pessoas e nossa renda</h1>
      {q.ok && <div className="msg">{q.ok}</div>}
      {q.erro && <div className="msg erro">{q.erro}</div>}
      <p className="mut">Salário de cada pessoa (usado para dividir as contas da casa). Renda somada: <strong>{brl(total)}</strong>.</p>

      {(pessoas || []).map((p) => (
        <div key={p.id} className="card">
          <form action={salvarPessoa} className="linha">
            <input type="hidden" name="id" value={p.id} />
            <label style={{ flex: '2 1 160px' }}>Nome<input name="nome" defaultValue={p.name} required /></label>
            <label style={{ flex: '1 1 120px' }}>Salário<input name="salario" defaultValue={p.salary ?? 0} inputMode="decimal" /></label>
            <label style={{ flex: '0 0 auto' }}>Cor<input type="color" name="cor" defaultValue={p.color || '#1f7a5a'} /></label>
            <button>Salvar</button>
          </form>
          <div className="acoes" style={{ marginTop: 10, justifyContent: 'space-between' }}>
            <div>
              {p.user_id
                ? <><span className="etq ok">tem acesso</span> <span className="mut" style={{ fontSize: 13 }}>{p.email}{p.user_id === user.id ? ' (você)' : ''}{papel(p.user_id) === 'dono' ? ' · dono' : ''}</span></>
                : <span className="etq">só cadastro, sem login</span>}
            </div>
            <div className="acoes">
              {p.user_id && p.user_id !== user.id && (
                <form action={removerAcesso}><input type="hidden" name="id" value={p.id} /><button className="mini perigo">Remover acesso</button></form>
              )}
              {!p.user_id && <BotaoApagar acao={apagarPessoa} campos={{ id: p.id }} />}
            </div>
          </div>
          {!p.user_id && (
            <details style={{ marginTop: 6 }}><summary>Criar acesso para {p.name}</summary>
              <form action={darAcesso} className="linha" style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={p.id} />
                <label style={{ flex: '2 1 200px' }}>E-mail<input name="email" type="email" required /></label>
                <label style={{ flex: '1 1 160px' }}>Senha inicial (mín. 8)<input name="senha" type="text" minLength={8} required autoComplete="off" /></label>
                <button className="pri">Criar acesso</button>
              </form>
              <p className="mut" style={{ fontSize: 13 }}>A pessoa entra com esse e-mail e senha, e vê os dados desta casa. Ela pode trocar a senha em 👤 Minha conta.</p>
            </details>
          )}
        </div>
      ))}

      <h2>Adicionar pessoa</h2>
      <div className="card">
        <form action={adicionar} className="campos">
          <label>Nome<input name="nome" required /></label>
          <label>Salário<input name="salario" inputMode="decimal" placeholder="0,00" /></label>
          <label>Cor<input type="color" name="cor" defaultValue="#b05ca8" /></label>
          <label className="largo" style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--tx)' }}>
            <input type="checkbox" name="acesso" /> Criar login para esta pessoa também (opcional)</label>
          <label>E-mail do login<input name="email" type="email" /></label>
          <label>Senha inicial (mín. 8)<input name="senha" type="text" autoComplete="off" /></label>
          <div className="largo"><button className="pri">Adicionar</button></div>
        </form>
      </div>
    </>
  );
}
