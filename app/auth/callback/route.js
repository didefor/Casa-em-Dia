import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// Links de e-mail (confirmação de conta e troca de senha) chegam aqui
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';
  if (code) { const s = await db(); await s.auth.exchangeCodeForSession(code); }
  return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/', url.origin));
}
