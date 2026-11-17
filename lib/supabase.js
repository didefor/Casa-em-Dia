import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cliente com a sessão do usuário (respeita as regras de acesso do banco)
export async function db() {
  const store = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
      },
    },
  });
}

// Cliente administrador — SÓ no servidor, para criar/remover logins de pessoas da casa
export function admin() {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Usuário logado + casa + papel. Redireciona para /login se não houver sessão.
export async function sessao() {
  const s = await db();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect('/login');
  const { data: m } = await s.from('membros').select('casa_id, papel').eq('user_id', user.id).maybeSingle();
  const { data: casa } = m ? await s.from('casas').select('id, nome').eq('id', m.casa_id).single() : { data: null };
  return { s, user, casa, papel: m?.papel ?? null };
}
