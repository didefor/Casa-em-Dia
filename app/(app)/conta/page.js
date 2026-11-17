import { sessao } from '@/lib/supabase';
import { sair } from '@/app/login/acoes';
import { trocarSenha } from './acoes';

export const dynamic = 'force-dynamic';

export default async function Conta({ searchParams }) {
  const q = await searchParams;
  const { user, casa, papel } = await sessao();
  return (
    <>
      <h1>Minha conta</h1>
      {q.ok && <div className="msg">{q.ok}</div>}
      {q.erro && <div className="msg erro">{q.erro}</div>}
      <div className="card"><div>{user.email}</div><div className="mut">{casa?.nome} · {papel}</div></div>
      <div className="card">
        <form action={trocarSenha} className="campos">
          <label>Nova senha<input name="senha" type="password" minLength={8} required autoComplete="new-password" /></label>
          <label>Repita a senha<input name="senha2" type="password" minLength={8} required autoComplete="new-password" /></label>
          <div className="largo"><button className="pri">Trocar senha</button></div>
        </form>
      </div>
      <form action={sair}><button>Sair</button></form>
    </>
  );
}
