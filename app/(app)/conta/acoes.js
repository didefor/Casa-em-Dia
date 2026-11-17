'use server';
import { redirect } from 'next/navigation';
import { sessao } from '@/lib/supabase';

export async function trocarSenha(fd) {
  const { s } = await sessao();
  const senha = String(fd.get('senha') || '');
  if (senha.length < 8) redirect('/conta?erro=' + encodeURIComponent('A senha precisa ter pelo menos 8 caracteres.'));
  if (senha !== fd.get('senha2')) redirect('/conta?erro=' + encodeURIComponent('As senhas não conferem.'));
  const { error } = await s.auth.updateUser({ password: senha });
  redirect(`/conta?${error ? 'erro=' + encodeURIComponent(error.message) : 'ok=Senha trocada!'}`);
}
