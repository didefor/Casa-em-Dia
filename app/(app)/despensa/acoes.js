'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sessao } from '@/lib/supabase';
import { hoje } from '@/lib/fmt';

const volta = (msg, erro) => redirect(`/despensa?${erro ? 'erro' : 'ok'}=${encodeURIComponent(msg)}`);
const num = (v) => { const t = String(v ?? '').trim(); return t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) || 0 : Number(t) || 0; };

export async function mexer(fd) {
  const { s, user } = await sessao();
  const acao = fd.get('acao'), id = Number(fd.get('id'));
  const { data: p } = await s.from('produtos_despensa').select('*').eq('id', id).single();
  if (!p) volta('Produto não encontrado.', true);
  const qtd = num(fd.get('qtd'));
  let nova = Number(p.qty);
  if (acao === 'comprei') {
    if (!(qtd > 0)) volta('Informe a quantidade comprada.', true);
    nova += qtd;
    const preco = num(fd.get('preco')) || null;
    await s.from('compras_despensa').insert({ produto_id: id, qty: qtd, unit_price: preco, store: fd.get('mercado') || null, date: hoje() });
    const conta = fd.get('onde');
    if (fd.get('lancar') === 'on' && preco) {
      const { data: eu } = await s.from('pessoas').select('id').eq('user_id', user.id).maybeSingle();
      await s.from('lancamentos').insert({ date: hoje(), amount: Math.round(preco * qtd * 100) / 100, type: 'saida', category: 'Mercado', description: `${p.name}${fd.get('mercado') ? ' - ' + fd.get('mercado') : ''}`, account_id: Number(conta) || null, person_id: eu?.id ?? null });
    }
  } else if (acao === 'usei') nova = Math.max(0, nova - (qtd || 1));
  else if (acao === 'acabou') nova = 0;
  else if (acao === 'contei') nova = qtd;
  await s.from('produtos_despensa').update({ qty: nova }).eq('id', id);
  revalidatePath('/despensa');
  volta(`${p.name}: agora ${nova} ${p.unit || ''}`);
}

export async function novoProduto(fd) {
  const { s } = await sessao();
  const { error } = await s.from('produtos_despensa').insert({ name: fd.get('nome'), category: fd.get('categoria') || null, unit: fd.get('unidade') || 'un', qty: num(fd.get('qtd')), min_qty: num(fd.get('min')) });
  if (error) volta(error.message, true);
  revalidatePath('/despensa');
  volta('Produto adicionado.');
}
