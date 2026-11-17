'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sessao } from '@/lib/supabase';

export async function salvarAjustes(fd) {
  const { s, casa } = await sessao();
  const n = (k) => Number(String(fd.get(k) || 0).replace(',', '.')) || 0;
  await s.from('casas').update({ nome: fd.get('nome') || 'Minha casa' }).eq('id', casa.id);
  const { error } = await s.from('ajustes').upsert({ casa_id: casa.id, split_mode: fd.get('split_mode'), housing_ref: n('housing_ref'), daily_budget: n('daily_budget'), reserve_goal: n('reserve_goal') });
  revalidatePath('/', 'layout');
  redirect(`/ajustes?${error ? 'erro=' + encodeURIComponent(error.message) : 'ok=Salvo!'}`);
}
