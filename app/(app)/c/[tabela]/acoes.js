'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sessao } from '@/lib/supabase';
import { config, lerForm } from '@/lib/crud';

export async function salvar(fd) {
  const tabela = fd.get('__tabela'), id = fd.get('__id');
  const cfg = config(tabela);
  const { s } = await sessao();
  const dados = lerForm(cfg, fd);
  const { error } = id ? await s.from(tabela).update(dados).eq('id', Number(id)) : await s.from(tabela).insert(dados);
  const destino = fd.get('__volta') || `/c/${tabela}`;
  if (error) redirect(`${id ? `/c/${tabela}/${id}` : `/c/${tabela}/novo`}?erro=${encodeURIComponent(error.message)}`);
  revalidatePath('/', 'layout');
  redirect(`${destino}${destino.includes('?') ? '&' : '?'}ok=${encodeURIComponent('Salvo!')}`);
}

export async function apagar(fd) {
  const tabela = fd.get('tabela');
  config(tabela);
  const { s } = await sessao();
  const { error } = await s.from(tabela).delete().eq('id', Number(fd.get('id')));
  if (error) redirect(`/c/${tabela}?erro=${encodeURIComponent('Não deu para apagar: ' + (error.message.includes('foreign key') ? 'há outros registros ligados a este.' : error.message))}`);
  revalidatePath('/', 'layout');
  redirect(`/c/${tabela}?ok=${encodeURIComponent('Apagado.')}`);
}
