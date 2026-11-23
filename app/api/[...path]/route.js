import { NextResponse } from 'next/server';
import { rotear } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function handle(req, ctx, metodo) {
  const { path = [] } = await ctx.params;
  const url = new URL(req.url);
  let body = {};
  if (metodo !== 'GET' && metodo !== 'DELETE') {
    const txt = await req.text();
    try { body = txt ? JSON.parse(txt) : {}; } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }
  }
  try {
    const out = await rotear(metodo, path, url, body);
    if (out && out.__redirect) return NextResponse.redirect(new URL(out.__redirect, url.origin), 303);
    if (out && out.__download) {
      return new NextResponse(JSON.stringify(out.conteudo, null, 1), {
        headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${out.__download}"` },
      });
    }
    return NextResponse.json(out ?? { ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    const status = e.status || 400;
    if (status >= 500 || !e.status) console.error(metodo, path.join('/'), e);
    return NextResponse.json({ error: e.message || 'Erro' }, { status });
  }
}

export const GET = (req, ctx) => handle(req, ctx, 'GET');
export const POST = (req, ctx) => handle(req, ctx, 'POST');
export const PUT = (req, ctx) => handle(req, ctx, 'PUT');
export const DELETE = (req, ctx) => handle(req, ctx, 'DELETE');
