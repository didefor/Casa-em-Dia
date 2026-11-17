// Cálculos do mês: A pagar, faturas, saldos, resumo e acerto do casal.
import { difMeses, noMes, somaMes, fimDoMes } from './fmt';

const CICLO = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };

// Cobra neste mês? (assinaturas e receitas com ciclo)
export function cobraNoMes(item, m) {
  if (!item.active || !noMes(item.start_month, item.end_month, m)) return false;
  const passo = CICLO[item.cycle || 'mensal'] || 1;
  if (passo === 1) return true;
  if (!item.start_month) return false;
  return difMeses(item.start_month, m) % passo === 0;
}

// Em qual fatura (mês de vencimento) cai uma compra feita em `data` no cartão
export function mesDaFatura(cartao, data) {
  const m = data.slice(0, 7), dia = Number(data.slice(8, 10));
  const fecha = cartao.closing_day || 1, vence = cartao.due_day || fecha;
  let mes = dia >= fecha ? somaMes(m, 1) : m;   // mês em que a fatura fecha
  if (vence <= fecha) mes = somaMes(mes, 1);     // vence no mês seguinte ao fechamento
  return mes;
}

export function parcelaNoMes(compra, m) {
  const k = difMeses(compra.first_month, m);
  if (k < 0 || k >= (compra.installments || 1)) return 0;
  return Number(compra.total) / (compra.installments || 1);
}

export async function carregar(s) {
  // o Supabase devolve no máximo 1000 linhas por vez: busca em páginas
  const t = async (nome, cols = '*') => {
    const out = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await s.from(nome).select(cols).order(nome === 'ajustes' ? 'casa_id' : 'id').range(de, de + 999);
      if (error || !data) break;
      out.push(...data);
      if (data.length < 1000) break;
    }
    return out;
  };
  const [pessoas, contas, cartoes, fixas, compras, caixinhas, movCx, emprestimos, pagEmp, movConta,
    assinaturas, receitas, recebimentos, pagamentos, ajustesArr] = await Promise.all([
    t('pessoas'), t('contas_bancarias'), t('cartoes'), t('contas_fixas'), t('compras_cartao'),
    t('caixinhas'), t('movimentos_caixinha'), t('emprestimos'), t('pagamentos_emprestimo'),
    t('movimentos_conta'), t('assinaturas'), t('receitas'), t('recebimentos'), t('pagamentos'), t('ajustes'),
  ]);
  const lancamentos = await t('lancamentos', 'id,date,amount,type,kind,account_id,category,person_id');
  return { pessoas, contas, cartoes, fixas, compras, caixinhas, movCx, emprestimos, pagEmp, movConta,
    assinaturas, receitas, recebimentos, pagamentos, lancamentos, ajustes: ajustesArr[0] || {} };
}

export function faturaDoMes(d, cartao, m) {
  let v = 0;
  for (const c of d.compras) if (c.card_id === cartao.id) v += parcelaNoMes(c, m);
  for (const a of d.assinaturas) if (a.card_id === cartao.id && (a.method || 'cartao') === 'cartao' && cobraNoMes(a, m)) v += Number(a.amount);
  return Math.round(v * 100) / 100;
}

// Lista de A pagar do mês, com status de pago
export function aPagar(d, m) {
  const pago = (tipo, id) => d.pagamentos.find((p) => p.item_type === tipo && p.item_id === id && p.ref_month === m);
  const itens = [];
  for (const f of d.fixas) if (f.active && noMes(f.start_month, f.end_month, m))
    itens.push({ tipo: 'conta_fixa', id: f.id, nome: f.name, valor: Number(f.amount), dia: f.due_day, dono: f.owner_id, conta: f.account_id, casa: f.kind === 'casa', pg: pago('conta_fixa', f.id) });
  for (const c of d.cartoes) {
    const v = faturaDoMes(d, c, m);
    if (v > 0) itens.push({ tipo: 'fatura', id: c.id, nome: `Fatura ${c.name}`, valor: v, dia: c.due_day, dono: c.owner_id, conta: c.account_id, pg: pago('fatura', c.id) });
  }
  for (const e of d.emprestimos) {
    if (!e.active || !e.first_date) continue;
    const k = difMeses(e.first_date.slice(0, 7), m);
    if (k >= 0 && k < (e.installments || 0))
      itens.push({ tipo: 'emprestimo', id: e.id, nome: `${e.name} (${k + 1}/${e.installments})`, valor: Number(e.installment), dia: Number(e.first_date.slice(8, 10)), dono: e.owner_id, conta: e.account_id, pg: pago('emprestimo', e.id) });
  }
  for (const a of d.assinaturas) if ((a.method || 'cartao') !== 'cartao' && cobraNoMes(a, m))
    itens.push({ tipo: 'assinatura', id: a.id, nome: a.name, valor: Number(a.amount), dia: a.day, dono: a.owner_id, conta: a.account_id, pg: pago('assinatura', a.id) });
  for (const c of d.caixinhas) if (c.active && Number(c.monthly) > 0)
    itens.push({ tipo: 'caixinha', id: c.id, nome: `Guardar: ${c.name}`, valor: Number(c.monthly), dia: c.day, dono: c.owner_id, conta: c.from_account_id, guardar: true, pg: pago('caixinha', c.id) });
  return itens.sort((a, b) => (a.dia || 99) - (b.dia || 99));
}

export function saldoConta(d, conta, ate = '9999-12-31') {
  let v = Number(conta.opening_balance) || 0;
  const ini = conta.opening_date || '0000-01-01';
  for (const l of d.lancamentos) if (l.account_id === conta.id && l.date >= ini && l.date <= ate)
    v += l.type === 'entrada' ? Number(l.amount) : -Number(l.amount);
  for (const mv of d.movConta) if (mv.account_id === conta.id && mv.date >= ini && mv.date <= ate) v += Number(mv.amount);
  return Math.round(v * 100) / 100;
}

export function receitasDoMes(d, m) {
  return d.receitas.filter((r) => cobraNoMes(r, m)).map((r) => {
    const rec = d.recebimentos.filter((x) => x.income_id === r.id && x.ref_month === m);
    const recebido = rec.reduce((s, x) => s + Number(x.amount), 0);
    const previsto = Number(r.amount) * (r.installments_per_cycle || 1);
    return { ...r, previsto, recebido, falta: Math.max(0, previsto - recebido), recs: rec };
  });
}

export function resumo(d, m) {
  const lm = d.lancamentos.filter((l) => l.date?.slice(0, 7) === m);
  const recebida = lm.filter((l) => l.type === 'entrada' && l.kind === 'normal').reduce((s, l) => s + Number(l.amount), 0);
  const recs = receitasDoMes(d, m);
  const donosComReceita = new Set(recs.map((r) => r.owner_id));
  const salarios = d.pessoas.filter((p) => !donosComReceita.has(p.id)).reduce((s, p) => s + Number(p.salary || 0), 0);
  const prevista = Math.max(recebida, recs.reduce((s, r) => s + r.previsto, 0) + salarios);

  const itens = aPagar(d, m);
  const ligados = new Set(d.pagamentos.filter((p) => p.ref_month === m).map((p) => p.lancamento_id).filter(Boolean));
  const diaADia = lm.filter((l) => l.type === 'saida' && l.kind === 'normal' && !ligados.has(l.id)).reduce((s, l) => s + Number(l.amount), 0);
  const casa = itens.filter((i) => i.casa).reduce((s, i) => s + i.valor, 0);
  const contas = itens.filter((i) => !i.casa && !i.guardar).reduce((s, i) => s + i.valor, 0);
  const guardar = itens.filter((i) => i.guardar).reduce((s, i) => s + i.valor, 0);
  const totalItens = itens.reduce((s, i) => s + i.valor, 0);
  const pagos = itens.filter((i) => i.pg);
  const falta = itens.filter((i) => !i.pg).reduce((s, i) => s + i.valor, 0);
  const sobra = prevista - casa - contas - guardar - diaADia;

  // crédito livre
  const limite = d.cartoes.reduce((s, c) => s + Number(c.limit_total || 0), 0);
  let usado = 0;
  for (const c of d.compras) {
    const pagoAtual = d.pagamentos.some((p) => p.item_type === 'fatura' && p.item_id === c.card_id && p.ref_month === m);
    for (let k = 0; k < (c.installments || 1); k++) {
      const mes = somaMes(c.first_month, k);
      if (mes > m || (mes === m && !pagoAtual)) usado += Number(c.total) / (c.installments || 1);
    }
  }
  // dívida de empréstimos
  const divida = d.emprestimos.filter((e) => e.active).reduce((s, e) => {
    const pagas = d.pagEmp.filter((p) => p.loan_id === e.id).reduce((n, p) => n + (p.covers || 1), 0);
    return s + Math.max(0, (e.installments || 0) - pagas) * Number(e.installment || 0);
  }, 0);
  const poupanca = d.movCx.reduce((s, x) => s + Number(x.amount), 0);

  // saldos e previsão de fim de mês por conta
  const fim = fimDoMes(m);
  const saldos = d.contas.filter((c) => c.active).map((c) => {
    const agora = saldoConta(d, c, fim);
    const sai = itens.filter((i) => !i.pg && i.conta === c.id).reduce((s, i) => s + i.valor, 0);
    const entra = recs.filter((r) => r.account_id === c.id).reduce((s, r) => s + r.falta, 0);
    return { ...c, saldo: agora, fimMes: Math.round((agora - sai + entra) * 100) / 100 };
  });

  return { m, recebida, prevista, casa, contas, guardar, diaADia, sobra, totalItens, falta,
    pagos: pagos.length, nItens: itens.length, limite, livre: limite - usado, divida, poupanca,
    saldos, acerto: acerto(d, itens) };
}

// Divide as contas da casa (proporcional ao salário ou meio a meio) e diz quem devolve para quem.
export function acerto(d, itens) {
  const casa = itens.filter((i) => i.casa);
  const total = casa.reduce((s, i) => s + i.valor, 0);
  const pessoas = d.pessoas.filter((p) => Number(p.salary) > 0 || casa.some((i) => i.dono === p.id));
  if (total === 0 || pessoas.length < 2) return [];
  const somaSal = pessoas.reduce((s, p) => s + Number(p.salary || 0), 0);
  const igual = d.ajustes.split_mode === 'igual' || somaSal === 0;
  const saldo = pessoas.map((p) => {
    const parte = igual ? total / pessoas.length : (total * Number(p.salary || 0)) / somaSal;
    const banca = casa.filter((i) => i.dono === p.id).reduce((s, i) => s + i.valor, 0);
    return { p, v: banca - parte };
  });
  const devem = saldo.filter((x) => x.v < -0.005).map((x) => ({ ...x, v: -x.v }));
  const recebem = saldo.filter((x) => x.v > 0.005);
  const out = [];
  for (const dv of devem) for (const rc of recebem) {
    const v = Math.min(dv.v, rc.v);
    if (v > 0.005) { out.push({ de: dv.p.name, para: rc.p.name, valor: Math.round(v * 100) / 100 }); dv.v -= v; rc.v -= v; }
  }
  return out;
}
