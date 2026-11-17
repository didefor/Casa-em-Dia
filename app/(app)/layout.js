import Link from 'next/link';
import Menu from '@/components/Menu';
import { sessao } from '@/lib/supabase';

export default async function AppLayout({ children }) {
  const { casa } = await sessao();
  return (
    <>
      <header className="topo"><div className="topo-in">
        <Link href="/" className="marca" title={casa?.nome}>🏠 <span className="esconde-cel">Casa em Dia</span></Link>
        <Menu />
        <Link href="/conta" className="btn mini" aria-label="Minha conta">👤</Link>
      </div></header>
      <main>{children}</main>
    </>
  );
}
