// Importa os dados do Casa em Dia antigo para a casa de um usuário no Supabase novo.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/importar.mjs dados/export.json email-do-dono@x.com
//
// export.json = { "pessoas": [ {id, name, salary, is_me, ...} ], "contas_bancarias": [...], ... }
// (mesmos nomes de tabela e colunas do Casa em Dia original; colunas desconhecidas são ignoradas)
// O dono precisa já ter criado a conta no site (aí a casa dele existe). Os ids originais são mantidos.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const [arquivo, email] = process.argv.slice(2);
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!arquivo || !email || !URL || !KEY) {
  console.error('Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/importar.mjs arquivo.json email-do-dono');
  process.exit(1);
}
const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const dados = JSON.parse(readFileSync(arquivo, 'utf8'));

// ordem respeita as ligações entre tabelas
const ORDEM = ['pessoas', 'bancos', 'bens', 'contas_bancarias', 'cartoes', 'contas_fixas', 'compras_cartao',
  'caixinhas', 'movimentos_caixinha', 'emprestimos', 'pagamentos_emprestimo', 'movimentos_conta', 'recorrentes',
  'assinaturas', 'receitas', 'lancamentos', 'recebimentos', 'produtos_despensa', 'compras_despensa', 'projetos', 'pagamentos'];
const BOOL = ['active', 'is_housing', 'is_reserve', 'auto_debit'];
const IGNORAR = ['casa_id', 'user_id', 'email', 'is_me'];

// 1) acha a casa do dono
const { data: lista, error: e1 } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (e1) throw e1;
const dono = lista.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!dono) { console.error(`Usuário ${email} não existe. Crie a conta no site primeiro.`); process.exit(1); }
const { data: membro } = await sb.from('membros').select('casa_id').eq('user_id', dono.id).single();
const casa = membro.casa_id;
console.log(`Casa de ${email}: ${casa}`);

const { count } = await sb.from('lancamentos').select('id', { count: 'exact', head: true }).eq('casa_id', casa);
if (count > 0 && !process.argv.includes('--forcar')) {
  console.error(`Essa casa já tem ${count} lançamentos. Para importar mesmo assim, rode de novo com --forcar.`);
  process.exit(1);
}

// 2) tira a pessoa criada automaticamente no cadastro (vai ser religada à pessoa original "is_me")
const { data: auto } = await sb.from('pessoas').select('id').eq('casa_id', casa).eq('user_id', dono.id).maybeSingle();
const pessoasOrig = dados.pessoas || [];
const eu = pessoasOrig.find((p) => p.is_me === true || p.is_me === 1) || pessoasOrig[0];
if (auto && eu) await sb.from('pessoas').delete().eq('id', auto.id);

// 3) importa tabela por tabela
const limpa = (r) => {
  const o = { ...r, casa_id: casa };
  for (const k of IGNORAR) if (k !== 'casa_id') delete o[k];
  for (const k of BOOL) if (k in o && o[k] !== null) o[k] = o[k] === true || o[k] === 1 || o[k] === '1' || o[k] === 't';
  for (const k of Object.keys(o)) if (o[k] === '') o[k] = null;
  return o;
};
async function inserir(tabela, linhas) {
  let rows = linhas.map(limpa);
  for (let tentativa = 0; tentativa < 15; tentativa++) {
    const { error } = await sb.from(tabela).upsert(rows, { onConflict: 'id' });
    if (!error) return rows.length;
    const col = error.message.match(/Could not find the '([^']+)' column/)?.[1];
    if (!col) throw new Error(`${tabela}: ${error.message}`);
    console.log(`  ${tabela}: coluna "${col}" não existe no banco novo — ignorada`);
    rows = rows.map(({ [col]: _, ...resto }) => resto);
  }
}
for (const t of ORDEM) {
  const linhas = dados[t];
  if (!linhas?.length) continue;
  for (let i = 0; i < linhas.length; i += 500) await inserir(t, linhas.slice(i, i + 500));
  console.log(`✓ ${t}: ${linhas.length}`);
}

// 4) liga o login do dono à pessoa original dele e acerta os contadores de id
if (eu) await sb.from('pessoas').update({ user_id: dono.id, email: dono.email }).eq('id', eu.id);
const { error: e3 } = await sb.rpc('ajustar_sequencias');
if (e3) console.error('ajustar_sequencias:', e3.message);
console.log(`Pronto! ${eu ? `Login ${email} ligado à pessoa "${eu.name}".` : ''}`);
