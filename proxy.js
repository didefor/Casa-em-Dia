import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Renova a sessão a cada acesso e manda para /login quem não estiver logado
export async function proxy(request) {
  let res = NextResponse.next({ request });
  const s = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        res = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await s.auth.getUser();
  const livre = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth');
  if (!user && !livre) return NextResponse.redirect(new URL('/login', request.url));
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'] };
