'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sessao } from '@/lib/supabase';
import { hoje } from '@/lib/fmt';

const volta = (m, msg, erro) => redirect(`/a-pagar?mes=${m}&${erro ? 'erro' : 'ok'}=${encodeURIComponent(msg)}`);
const valorBR = (v) => { const t = String(v ?? '').trim(); return t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) || 0 : Number(t) || 0; };

export async function pagar(fd) {
  const { s, user } = await sessao();
  const tipo = fd.get('tipo'), id = Number(fd.get('id')), m = fd.get('mes');
  const valor = valorBR(fd.get('valor')), data = fd.get('data') || hoje();
  const conta = Number(fd.get('conta')) || null, nome = fd.get('nome');
  const { data: eu } = await s.from('pessoas').select('id').eq('user_id', user.id).maybeSingle();

  let extra_tabela = null, extra_id = null, lancamento_id = null;
  if (tipo === 'caixinha') {
    const { data: mv, error } = await s.from('movimentos_caixinha').insert({ savings_id: id, date: data, amount: valor, note: `Depósito ${m}` }).select('id').single();
    if (error) volta(m, error.message, true);
    extra_tabela = 'movimentos_caixinha'; extra_id = mv.id;
  }
  if (tipo === 'emprestimo') {
    const { data: e } = await s.from('emprestimos').select('first_date').eq('id', id).single();
    const [a1, b1] = e.first_date.slice(0, 7).split('-').map(Number), [a2, b2] = m.split('-').map(Number);
    const { data: pg, error } = await s.from('pagamentos_emprestimo').insert({ loan_id: id, date: data, amount: valor, installment_no: (a2 * 12 + b2) - (a1 * 12 + b1) + 1, kind: 'parcela', covers: 1 }).select('id').single();
    if (error) volta(m, error.message, true);
    extra_tabela = 'pagamentos_emprestimo'; extra_id = pg.id;
  }
  if (conta || tipo !== 'caixinha') {
    const { data: l, error } = await s.from('lancamentos').insert({
      date: data, amount: valor, type: 'saida', account_id: conta, person_id: eu?.id ?? null, description: nome,
      kind: tipo === 'fatura' ? 'pagamento_fatura' : tipo === 'caixinha' ? 'caixinha' : 'pagamento',
      category: tipo === 'fatura' ? 'Fatura' : tipo === 'caixinha' ? 'Caixinha' : tipo === 'emprestimo' ? 'Empréstimo' : 'Contas',
    }).select('id').single();
    if (error) volta(m, error.message, true);
    lancamento_id = l.id;
  }
  const { error } = await s.from('pagamentos').insert({ item_type: tipo, item_id: id, ref_month: m, amount: valor, date: data, account_id: conta, lancamento_id, extra_tabela, extra_id });
  if (error) volta(m, error.message.includes('duplicate') ? 'Esse item já está pago.' : error.message, true);
  revalidatePath('/');
  volta(m, `${nome} marcado como pago.`);
}

export async function desfazer(fd) {
  const { s } = await sessao();
  const m = fd.get('mes');
  const { data: p } = await s.from('pagamentos').select('*').eq('id', Number(fd.get('pid'))).single();
  if (p) {
    await s.from('pagamentos').delete().eq('id', p.id);
    if (p.lancamento_id) await s.from('lancamentos').delete().eq('id', p.lancamento_id);
    if (p.extra_tabela === 'movimentos_caixinha' || p.extra_tabela === 'pagamentos_emprestimo')
      await s.from(p.extra_tabela).delete().eq('id', p.extra_id);
  }
  revalidatePath('/');
  volta(m, 'Pagamento desfeito.');
}
