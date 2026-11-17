'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sessao } from '@/lib/supabase';
import { hoje } from '@/lib/fmt';

const volta = (m, msg, erro) => redirect(`/renda?mes=${m}&${erro ? 'erro' : 'ok'}=${encodeURIComponent(msg)}`);
const valorBR = (v) => { const t = String(v ?? '').trim(); return t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) || 0 : Number(t) || 0; };

export async function receber(fd) {
  const { s } = await sessao();
  const m = fd.get('mes'), id = Number(fd.get('id'));
  const valor = valorBR(fd.get('valor')), data = fd.get('data') || hoje(), conta = Number(fd.get('conta')) || null;
  if (!(valor > 0)) volta(m, 'Informe o valor.', true);
  const { data: r } = await s.from('receitas').select('*').eq('id', id).single();
  const { data: l, error } = await s.from('lancamentos').insert({ date: data, amount: valor, type: 'entrada', kind: 'normal', account_id: conta, person_id: r.owner_id, description: r.name, category: r.category || 'Receita' }).select('id').single();
  if (error) volta(m, error.message, true);
  await s.from('recebimentos').insert({ income_id: id, ref_month: m, date: data, amount: valor, account_id: conta, note: fd.get('nota') || null, lancamento_id: l.id });
  revalidatePath('/');
  volta(m, `${r.name}: recebimento registrado.`);
}

export async function desfazerRecebimento(fd) {
  const { s } = await sessao();
  const m = fd.get('mes');
  const { data: r } = await s.from('recebimentos').select('*').eq('id', Number(fd.get('rid'))).single();
  if (r) {
    await s.from('recebimentos').delete().eq('id', r.id);
    if (r.lancamento_id) await s.from('lancamentos').delete().eq('id', r.lancamento_id);
  }
  revalidatePath('/');
  volta(m, 'Recebimento desfeito.');
}
