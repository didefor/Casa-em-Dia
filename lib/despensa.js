// Despensa: estoque, consumo, lista de compras e preços.
import { tudo } from './dados.js';
import { hoje, somaDias, mesAtual, r2 } from './fmt.js';

const N = (v) => Number(v) || 0;
const num = (v) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const arred = (v) => Math.round(v * 100) / 100;

function info(item, movs) {
  const t = hoje(); const desde = somaDias(t, -90);
  const compras = movs.filter((m) => m.kind === 'compra').sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const comPreco = compras.filter((m) => N(m.unit_price) > 0);
  const recentes = movs.filter((m) => m.date >= desde && (m.kind === 'compra'));
  const qtd90 = recentes.reduce((s, m) => s + N(m.qty), 0);
  const primeira = recentes.length ? recentes.map((m) => m.date).sort()[0] : null;
  const dias = primeira ? Math.max(30, Math.round((Date.parse(t) - Date.parse(primeira)) / 864e5)) : 0;
  const monthly = dias ? arred((qtd90 / dias) * 30) : 0;
  const qty = N(item.qty);
  const daysLeft = monthly > 0 ? Math.floor(qty / (monthly / 30)) : null;
  const last = comPreco[0];
  const avg = comPreco.length ? arred(comPreco.reduce((s, m) => s + N(m.unit_price), 0) / comPreco.length) : null;
  const prevAvg = comPreco.length > 1 ? comPreco.slice(1).reduce((s, m) => s + N(m.unit_price), 0) / (comPreco.length - 1) : null;
  const out = qty <= 0;
  const min = N(item.min_qty);
  const low = !out && ((min > 0 && qty <= min) || (daysLeft != null && daysLeft < 7));
  const alvo = Math.max(min * 2, monthly, 1);
  const suggest = Math.max(1, Math.ceil(alvo - qty));
  return {
    ...item, qty, min_qty: min, monthly: monthly || null, days_left: daysLeft, out, low,
    last_price: last ? N(last.unit_price) : null, avg_price: avg, min_price: comPreco.length ? Math.min(...comPreco.map((m) => N(m.unit_price))) : null,
    price_trend: last && prevAvg ? ((N(last.unit_price) - prevAvg) / prevAvg) * 100 : null,
    last_store: compras.find((m) => m.store)?.store || null, suggest, est_cost: last ? r2(suggest * N(last.unit_price)) : null,
  };
}

export async function rota(s, u, metodo, partes, q, body, exige) {
  const [a, b] = partes;
  const rota = `${metodo} ${partes.join('/')}`;
  const carregarItem = async (id) => {
    const { data } = await s.from('produtos_despensa').select('*').eq('id', Number(id)).maybeSingle();
    if (!data) throw Object.assign(new Error('Produto não encontrado'), { status: 404 });
    return data;
  };
  const mexer = async (item, kind, qtdNova, extra = {}) => {
    const { data: mv, error } = await s.from('movimentos_despensa').insert({ item_id: item.id, kind, qty: r2(qtdNova - N(item.qty)), prev_qty: N(item.qty), date: extra.date || hoje(), ...extra }).select('*').single();
    if (error) throw new Error(error.message);
    await s.from('produtos_despensa').update({ qty: r2(Math.max(0, qtdNova)) }).eq('id', item.id);
    return mv;
  };

  if (rota === 'GET ') {
    const [itens, movs] = await Promise.all([tudo(s, 'produtos_despensa', { ordem: 'name' }), tudo(s, 'movimentos_despensa')]);
    const lista = itens.filter((i) => i.active !== false).map((i) => info(i, movs.filter((m) => m.item_id === i.id)));
    const falta = lista.filter((i) => i.out || i.low);
    const m = mesAtual();
    return {
      items: lista, list: falta, inactive: itens.filter((i) => i.active === false),
      totals: {
        count: lista.length, out: lista.filter((i) => i.out).length, low: lista.filter((i) => i.low).length,
        month_spent: r2(movs.filter((x) => x.kind === 'compra' && x.date.slice(0, 7) === m).reduce((s2, x) => s2 + N(x.total), 0)),
        stock_value: r2(lista.reduce((s2, i) => s2 + (i.last_price ? i.qty * i.last_price : 0), 0)),
        list_cost: r2(falta.reduce((s2, i) => s2 + (i.est_cost || 0), 0)),
      },
    };
  }
  if (rota === `GET history/${b}` && a === 'history') {
    const item = await carregarItem(b);
    const movs = await tudo(s, 'movimentos_despensa', { filtro: (x) => x.eq('item_id', item.id) });
    return { item: info(item, movs), moves: movs.sort((x, y) => y.date.localeCompare(x.date) || y.id - x.id).map((x) => ({ ...x, qty: N(x.kind === 'compra' ? x.qty : x.qty), unit_price: x.unit_price != null ? N(x.unit_price) : null })) };
  }
  if (rota === 'GET price') {
    const item = await carregarItem(q.item);
    const movs = await tudo(s, 'movimentos_despensa', { filtro: (x) => x.eq('item_id', item.id) });
    const i = info(item, movs); const p = num(q.price);
    if (!i.avg_price) return { verdict: 'sem_historico', text: 'Ainda não há compras com preço para comparar.' };
    const dif = ((p - i.avg_price) / i.avg_price) * 100;
    const verdict = dif <= -8 ? 'barato' : dif >= 8 ? 'caro' : 'normal';
    const txt = { barato: `Barato: ${Math.abs(Math.round(dif))}% abaixo do que você costuma pagar`, caro: `Caro: ${Math.round(dif)}% acima do que você costuma pagar`, normal: 'Preço normal, perto do que você costuma pagar' }[verdict];
    return { verdict, text: `${txt} (média R$ ${i.avg_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`, best: i.min_price != null && p < i.min_price, last_store: i.last_store };
  }

  exige(u, 'launch');
  if (rota === 'POST buy') {
    const item = await carregarItem(body.item_id);
    const qtd = num(body.qty); if (!(qtd > 0)) throw new Error('Informe a quantidade');
    const total = num(body.total) || null;
    let transaction_id = null;
    if (body.launch && total) {
      const { data: l } = await s.from('lancamentos').insert({ date: body.date || hoje(), amount: total, type: 'saida', kind: 'normal', category: 'Mercado', description: `${item.name}${body.store ? ` - ${body.store}` : ''}`, account_id: Number(body.account_id) || null, person_id: u.pessoa?.id || null }).select('id').single();
      transaction_id = l?.id || null;
    }
    await mexer(item, 'compra', N(item.qty) + qtd, { date: body.date || hoje(), unit_price: total ? r2(total / qtd) : null, total, store: body.store || null, transaction_id });
    return { ok: true };
  }
  if (rota === 'POST use') {
    const item = await carregarItem(body.item_id);
    const nova = Math.max(0, N(item.qty) - (num(body.qty) || 1));
    await mexer(item, 'uso', nova);
    const movs = await tudo(s, 'movimentos_despensa', { filtro: (x) => x.eq('item_id', item.id) });
    const i = info({ ...item, qty: nova }, movs);
    return { item: { name: item.name, qty: nova, unit: item.unit }, status: { low: i.low || i.out } };
  }
  if (rota === 'POST count') {
    const item = await carregarItem(body.item_id);
    await mexer(item, 'ajuste', Math.max(0, num(body.qty)));
    return { ok: true };
  }
  if (rota === 'POST undo') {
    const { data: mv } = await s.from('movimentos_despensa').select('*').eq('id', Number(body.id)).maybeSingle();
    if (!mv) throw new Error('Movimento não encontrado');
    const item = await carregarItem(mv.item_id);
    await s.from('produtos_despensa').update({ qty: r2(Math.max(0, N(item.qty) - N(mv.qty))) }).eq('id', item.id);
    await s.from('movimentos_despensa').delete().eq('id', mv.id);
    if (mv.transaction_id) await s.from('lancamentos').delete().eq('id', mv.transaction_id);
    return { ok: true };
  }
  throw Object.assign(new Error(`Rota desconhecida: despensa/${partes.join('/')}`), { status: 404 });
}
