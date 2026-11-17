'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sessao } from '@/lib/supabase';
import { mesDaFatura } from '@/lib/calculo';
import { hoje } from '@/lib/fmt';

const num = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const valorBR = (v) => { const t = String(v ?? '').trim(); return t.includes(',') ? num(t) : Number(t) || 0; };

async function minhaPessoa(s, user) {
  const { data } = await s.from('pessoas').select('id').eq('user_id', user.id).maybeSingle();
  return data?.id ?? null;
}

export async function lancar(fd) {
  const { s, user } = await sessao();
  const tipo = fd.get('tipo');
  const valor = valorBR(fd.get('valor'));
  const data = fd.get('data') || hoje();
  const desc = fd.get('descricao') || null;
  const cat = fd.get('categoria') || null;
  const [ondeTipo, ondeId] = String(fd.get('onde') || 'dinheiro').split(':');
  const pessoa = Number(fd.get('pessoa')) || (await minhaPessoa(s, user));
  const bem = Number(fd.get('bem')) || null;
  const volta = (msg, erro) => redirect(`/lancamentos?mes=${data.slice(0, 7)}&${erro ? 'erro' : 'ok'}=${encodeURIComponent(msg)}`);
  if (!(valor > 0)) volta('Informe um valor maior que zero.', true);
  const conta = ondeTipo === 'conta' ? Number(ondeId) : null;
  let erro;

  if (tipo === 'gasto' || tipo === 'entrada') {
    if (ondeTipo === 'cartao' || ondeTipo === 'caixinha') volta('Para gasto/entrada escolha uma conta ou dinheiro.', true);
    ({ error: erro } = await s.from('lancamentos').insert({ date: data, description: desc, amount: valor, type: tipo === 'gasto' ? 'saida' : 'entrada', category: cat, person_id: pessoa, account_id: conta, asset_id: bem }));
  } else if (tipo === 'cartao') {
    if (ondeTipo !== 'cartao') volta('Escolha o cartão em "Onde".', true);
    const { data: c } = await s.from('cartoes').select('*').eq('id', Number(ondeId)).single();
    ({ error: erro } = await s.from('compras_cartao').insert({ card_id: c.id, description: desc, total: valor, installments: Math.max(1, Number(fd.get('parcelas')) || 1), first_month: mesDaFatura(c, data), asset_id: bem, date: data, category: cat }));
  } else if (tipo === 'transferencia') {
    const para = Number(String(fd.get('para') || '').split(':')[1]) || null;
    if (ondeTipo !== 'conta' && ondeTipo !== 'dinheiro') volta('Transferência: escolha a conta de saída.', true);
    if (!para && ondeTipo !== 'conta') volta('Transferência: escolha a conta de destino.', true);
    const base = { date: data, amount: valor, kind: 'transferencia', person_id: pessoa, category: 'Transferência entre contas' };
    ({ error: erro } = await s.from('lancamentos').insert([
      { ...base, type: 'saida', account_id: conta, description: desc || 'Transferência enviada' },
      { ...base, type: 'entrada', account_id: para, description: desc || 'Transferência recebida' },
    ]));
  } else if (tipo === 'guardar' || tipo === 'retirar') {
    if (ondeTipo !== 'caixinha') volta('Escolha a caixinha em "Onde".', true);
    const { data: cx } = await s.from('caixinhas').select('*').eq('id', Number(ondeId)).single();
    const sinal = tipo === 'guardar' ? 1 : -1;
    ({ error: erro } = await s.from('movimentos_caixinha').insert({ savings_id: cx.id, date: data, amount: sinal * valor, note: desc }));
    if (!erro && cx.from_account_id)
      ({ error: erro } = await s.from('lancamentos').insert({ date: data, amount: valor, type: sinal > 0 ? 'saida' : 'entrada', kind: 'caixinha', account_id: cx.from_account_id, person_id: pessoa, description: `${tipo === 'guardar' ? 'Guardado em' : 'Retirado de'} ${cx.name}`, category: 'Caixinha' }));
  } else volta('Tipo inválido.', true);

  if (erro) volta(erro.message, true);
  revalidatePath('/');
  volta('Lançado!');
}

export async function apagar(fd) {
  const { s } = await sessao();
  const tabela = fd.get('tabela') === 'compras_cartao' ? 'compras_cartao' : 'lancamentos';
  await s.from(tabela).delete().eq('id', Number(fd.get('id')));
  revalidatePath('/lancamentos');
  redirect(`/lancamentos?mes=${fd.get('mes')}&ok=${encodeURIComponent('Apagado.')}`);
}
