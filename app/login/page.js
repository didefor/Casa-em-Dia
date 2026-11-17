import { entrar, criarConta, esqueci } from './acoes';

export const metadata = { title: 'Entrar — Casa em Dia' };

export default async function Login({ searchParams }) {
  const q = await searchParams;
  const aba = q.aba || 'entrar';
  return (
    <div className="centro"><div className="caixa">
      <h1 style={{ textAlign: 'center' }}>🏠 Casa em Dia</h1>
      <div className="abas">
        <a href="/login?aba=entrar" className={aba === 'entrar' ? 'on' : ''}>Entrar</a>
        <a href="/login?aba=criar" className={aba === 'criar' ? 'on' : ''}>Criar conta</a>
      </div>
      {q.msg && <div className="msg">{q.msg}</div>}
      {q.erro && <div className="msg erro">{q.erro}</div>}
      <div className="card">
        {aba === 'criar' ? (
          <form action={criarConta} style={{ display: 'grid', gap: 10 }}>
            <label>Seu nome<input name="nome" required autoComplete="given-name" /></label>
            <label>Nome da casa<input name="casa" placeholder="Ex.: Casa Diego e Kyaren" /></label>
            <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
            <label>Senha (mín. 8)<input name="senha" type="password" minLength={8} required autoComplete="new-password" /></label>
            <button className="pri">Criar conta</button>
            <p className="mut" style={{ margin: 0, fontSize: 13 }}>Quem já tem uma casa cadastrada pode te dar acesso pela tela Pessoas. Aí você não precisa criar conta aqui.</p>
          </form>
        ) : (
          <form action={entrar} style={{ display: 'grid', gap: 10 }}>
            <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
            <label>Senha<input name="senha" type="password" required autoComplete="current-password" /></label>
            <button className="pri">Entrar</button>
          </form>
        )}
      </div>
      {aba === 'entrar' && (
        <details><summary>Esqueci a senha</summary>
          <form action={esqueci} className="linha" style={{ marginTop: 8 }}>
            <input name="email" type="email" placeholder="seu e-mail" required style={{ flex: 1 }} />
            <button>Enviar link</button>
          </form>
        </details>
      )}
    </div></div>
  );
}
