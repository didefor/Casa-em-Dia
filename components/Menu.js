'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITENS = [
  ['/', 'Visão'], ['/lancamentos', 'Lançamentos'], ['/a-pagar', 'A pagar'], ['/renda', 'Renda'],
  ['/despensa', 'Despensa'], ['/pessoas', 'Pessoas'], ['/cadastros', 'Cadastros'], ['/ajustes', 'Ajustes'],
];

export default function Menu() {
  const p = usePathname();
  const on = (h) => (h === '/' ? p === '/' : p.startsWith(h) || (h === '/cadastros' && p.startsWith('/c/')));
  return (
    <nav className="menu">
      {ITENS.map(([h, t]) => <Link key={h} href={h} className={on(h) ? 'on' : ''}>{t}</Link>)}
    </nav>
  );
}
