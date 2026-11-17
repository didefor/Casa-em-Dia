'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sessao, admin } from '@/lib/supabase';

const volta = (msg, erro) => redirect(`/pessoas?${erro ? 'erro' : 'ok'}=${encodeURIComponent(msg)}`);
const num = (v) => Number(String(v ?? '').replace(',', '.')) || 0;

// Cria o login de uma pessoa da casa (sem aprovação, sem e-mail de confirmação)
async function criarLogin(casaId, pessoa, email, senha) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return 'O servidor está sem a chave SUPABASE_SERVICE_ROLE_KEY.';
  if (!email || String(senha || '').length < 8) return 'Informe e-mail e uma senha de pelo menos 8 caracteres.';
  const { error } = await admin().auth.admin.createUser({
    email: String(email).trim().toLowerCase(), password: String(senha), email_confirm: true,
    app_metadata: { casa_id: casaId, pessoa_id: String(pessoa.id) },
    user_metadata: { nome: pessoa.name },
  });
  if (error) return /already|registered|exists/i.test(error.message) ? 'Esse e-mail já tem conta no Casa em Dia (talvez em outra casa).' : error.message;
  return null;
}

export async function adicionar(fd) {
  const { s, casa } = await sessao();
  const { data: p, error } = await s.from('pessoas').insert({ name: fd.get('nome'), salary: num(fd.get('salario')), color: fd.get('cor') || null }).select('*').single();
  if (error) volta(error.message, true);
  if (fd.get('acesso') === 'on') {
    const erro = await criarLogin(casa.id, p, fd.get('email'), fd.get('senha'));
    revalidatePath('/pessoas');
    if (erro) volta(`${p.name} foi adicionada, mas o acesso não foi criado: ${erro}`, true);
    volta(`${p.name} adicionada, com acesso pelo e-mail ${fd.get('email')}.`);
  }
  revalidatePath('/pessoas');
  volta(`${p.name} adicionada (só cadastro, sem login).`);
}

export async function darAcesso(fd) {
  const { s, casa } = await sessao();
  const { data: p } = await s.from('pessoas').select('*').eq('id', Number(fd.get('id'))).single();
  if (!p) volta('Pessoa não encontrada.', true);
  if (p.user_id) volta(`${p.name} já tem acesso.`, true);
  const erro = await criarLogin(casa.id, p, fd.get('email'), fd.get('senha'));
  if (erro) volta(erro, true);
  revalidatePath('/pessoas');
  volta(`Acesso criado para ${p.name}. Passe o e-mail e a senha para ela entrar.`);
}

export async function removerAcesso(fd) {
  const { s, user, papel } = await sessao();
  const { data: p } = await s.from('pessoas').select('*').eq('id', Number(fd.get('id'))).single();
  if (!p?.user_id) volta('Essa pessoa não tem acesso.', true);
  if (p.user_id === user.id) volta('Você não pode remover o seu próprio acesso por aqui.', true);
  const { data: m } = await s.from('membros').select('papel').eq('user_id', p.user_id).maybeSingle();
  if (!m) volta('Essa pessoa não é desta casa.', true);
  if (m.papel === 'dono' && papel !== 'dono') volta('Só o dono pode remover o acesso de outro dono.', true);
  const { error } = await admin().auth.admin.deleteUser(p.user_id);
  if (error) volta(error.message, true);
  await s.from('pessoas').update({ email: null }).eq('id', p.id);
  revalidatePath('/pessoas');
  volta(`Acesso de ${p.name} removido. O cadastro e os lançamentos dela continuam.`);
}

export async function salvarPessoa(fd) {
  const { s } = await sessao();
  const { error } = await s.from('pessoas').update({ name: fd.get('nome'), salary: num(fd.get('salario')), color: fd.get('cor') || null }).eq('id', Number(fd.get('id')));
  if (error) volta(error.message, true);
  revalidatePath('/', 'layout');
  volta('Salvo!');
}

export async function apagarPessoa(fd) {
  const { s } = await sessao();
  const { data: p } = await s.from('pessoas').select('*').eq('id', Number(fd.get('id'))).single();
  if (p?.user_id) volta('Remova o acesso dessa pessoa antes de apagar.', true);
  const { error } = await s.from('pessoas').delete().eq('id', Number(fd.get('id')));
  if (error) volta(error.message, true);
  revalidatePath('/', 'layout');
  volta('Pessoa apagada.');
}
