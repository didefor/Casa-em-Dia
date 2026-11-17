import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

const TABELAS = ['casas', 'ajustes', 'pessoas', 'bancos', 'bens', 'contas_bancarias', 'cartoes', 'contas_fixas',
  'compras_cartao', 'caixinhas', 'movimentos_caixinha', 'emprestimos', 'pagamentos_emprestimo', 'movimentos_conta',
  'recorrentes', 'assinaturas', 'receitas', 'lancamentos', 'recebimentos', 'produtos_despensa', 'compras_despensa',
  'projetos', 'pagamentos'];

// Cópia de segurança: baixa todos os dados da casa em JSON
export async function GET() {
  const s = await db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ erro: 'não logado' }, { status: 401 });
  const out = { exportado_em: new Date().toISOString() };
  for (const t of TABELAS) {
    out[t] = [];
    for (let de = 0; ; de += 1000) {
      const { data } = await s.from(t).select('*').order(t === 'ajustes' ? 'casa_id' : 'id').range(de, de + 999);
      if (!data?.length) break;
      out[t].push(...data);
      if (data.length < 1000) break;
    }
  }
  return new NextResponse(JSON.stringify(out, null, 1), {
    headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="casa-em-dia-${out.exportado_em.slice(0, 10)}.json"` },
  });
}
