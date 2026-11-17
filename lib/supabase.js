import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cliente com a sessão de quem está logado (as regras do banco limitam tudo à casa dessa pessoa).
export async function db() {
  const store = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* leitura */ } },
    },
  });
}

// O Supabase entra por e-mail: login sem "@" vira um e-mail interno (igual à função email_do_login do banco).
export const emailDoLogin = (login) => {
  const l = String(login || '').trim().toLowerCase();
  return l.includes('@') ? l : `${l}@casa-em-dia.local`;
};
