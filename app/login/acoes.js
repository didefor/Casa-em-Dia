'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { db } from '@/lib/supabase';

const volta = (aba, msg, erro) => redirect(`/login?aba=${aba}&${erro ? 'erro' : 'msg'}=${encodeURIComponent(msg)}`);

export async function entrar(fd) {
  const s = await db();
  const { error } = await s.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('senha') });
  if (error) volta('entrar', 'E-mail ou senha incorretos.', true);
  redirect('/');
}

export async function criarConta(fd) {
  const s = await db();
  const senha = String(fd.get('senha') || '');
  if (senha.length < 8) volta('criar', 'A senha precisa ter pelo menos 8 caracteres.', true);
  const origem = (await headers()).get('origin');
  const { data, error } = await s.auth.signUp({
    email: fd.get('email'), password: senha,
    options: { data: { nome: fd.get('nome'), casa: fd.get('casa') }, emailRedirectTo: `${origem}/auth/callback` },
  });
  if (error) volta('criar', error.message.includes('registered') ? 'Esse e-mail já tem conta. Entre com ele.' : error.message, true);
  if (!data.session) volta('entrar', 'Conta criada! Confirme pelo link que mandamos no seu e-mail e depois entre.');
  redirect('/');
}

export async function esqueci(fd) {
  const s = await db();
  const origem = (await headers()).get('origin');
  await s.auth.resetPasswordForEmail(fd.get('email'), { redirectTo: `${origem}/auth/callback?next=/conta` });
  volta('entrar', 'Se o e-mail tiver conta, chegou um link para trocar a senha.');
}

export async function sair() {
  const s = await db();
  await s.auth.signOut();
  redirect('/login');
}
