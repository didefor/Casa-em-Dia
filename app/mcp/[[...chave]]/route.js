import { NextResponse } from 'next/server';
import { atenderMcp, atenderWhatsapp, clienteDaChave } from '@/lib/mcp';
import { agenteOk } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// MCP via HTTP: /mcp/<chave> ou /mcp com "Authorization: Bearer <chave>"
export async function POST(req, ctx) {
  const { chave: partes = [] } = await ctx.params;
  const chave = partes[0] || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  let corpo;
  try { corpo = await req.json(); } catch { return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }, { status: 400 }); }
  const origem0 = new URL(req.url).origin;
  if (partes[0] === 'whatsapp') {
    const segredo = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!agenteOk(segredo)) return NextResponse.json({ jsonrpc: '2.0', id: corpo?.id ?? null, error: { code: -32001, message: 'Agente não autorizado' } }, { status: 401 });
    const lista = Array.isArray(corpo) ? corpo : [corpo];
    const resps = (await Promise.all(lista.map((m) => atenderWhatsapp(m, segredo, origem0)))).filter(Boolean);
    if (!resps.length) return new NextResponse(null, { status: 202 });
    return NextResponse.json(Array.isArray(corpo) ? resps : resps[0], { headers: { 'cache-control': 'no-store' } });
  }
  let s;
  try { s = await clienteDaChave(chave); } catch (e) {
    return NextResponse.json({ jsonrpc: '2.0', id: corpo?.id ?? null, error: { code: -32001, message: e.message } }, { status: 401 });
  }
  const origem = new URL(req.url).origin;
  const lista = Array.isArray(corpo) ? corpo : [corpo];
  const resps = (await Promise.all(lista.map((m) => atenderMcp(m, s, origem)))).filter(Boolean);
  if (!resps.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(corpo) ? resps : resps[0], { headers: { 'cache-control': 'no-store' } });
}

export async function GET() {
  return new NextResponse('Casa em Dia MCP: use POST (Streamable HTTP).', { status: 405, headers: { allow: 'POST' } });
}
export async function DELETE() { return new NextResponse(null, { status: 204 }); }
