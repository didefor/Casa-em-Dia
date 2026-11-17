import Link from 'next/link';
import { TABELAS } from '@/lib/tabelas';

export default function Cadastros() {
  const grupos = {};
  for (const [k, v] of Object.entries(TABELAS)) (grupos[v.grupo] ||= []).push([k, v]);
  return (
    <>
      <h1>Cadastros</h1>
      <div className="lista-grupos">
        {Object.entries(grupos).map(([g, itens]) => (
          <div key={g} className="card"><strong>{g}</strong>
            {itens.map(([k, v]) => <Link key={k} href={`/c/${k}`}>{v.titulo}{v.oculto ? <span className="mut"> · detalhe</span> : ''}</Link>)}
          </div>
        ))}
      </div>
    </>
  );
}
