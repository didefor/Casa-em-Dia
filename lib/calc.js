// Cálculos do Casa em Dia: o que a tela "Visão geral" e as outras telas mostram.
import { hoje, mesAtual, somaMes, difMeses, noPeriodo, diasNoMes, fimDoMes, dataNoMes, somaDias, difDias, diaDaSemana, r2 } from './fmt.js';

const CICLO = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };
const soma = (lista, f = (x) => x) => r2(lista.reduce((s, x) => s + (Number(f(x)) || 0), 0));
const ativo = (x) => x.active !== false;

// ---------- pessoas e salário ----------
export const salarioReceitas = (d, pid) => d.receitas.filter((r) => r.owner_id === pid && r.kind === 'salario');
export function salarioDe(d, p, m) {
  if (!p) return 0;
  const sal = salarioReceitas(d, p.id).filter((r) => receitaNoMes(d, r, m).dentro);
  if (sal.length) return soma(sal, (r) => receitaNoMes(d, r, m).expected);
  return Number(p.salary) || 0;
}

// ---------- assinaturas ----------
export function assinaturaCobra(a, m) {
  if (!ativo(a) || !noPeriodo(a.start_month, a.end_month, m)) return false;
  const passo = CICLO[a.cycle || 'mensal'] || 1;
  if (passo === 1) return true;
  if (!a.start_month) return true;
  return difMeses(a.start_month, m) % passo === 0;
}

// ---------- cartões ----------
// em qual fatura (mês do vencimento) cai algo cobrado na data
export function mesDaFatura(c, data) {
  const m = data.slice(0, 7); const dia = Number(data.slice(8, 10));
  const fecha = Number(c.closing_day) || 1; const vence = Number(c.due_day) || fecha;
  let mes = dia >= fecha ? somaMes(m, 1) : m;   // mês em que a fatura fecha
  if (vence <= fecha) mes = somaMes(mes, 1);     // vence no mês seguinte ao fechamento
  return mes;
}
export function parcelaNoMes(compra, m) {
  const k = difMeses(compra.first_month, m); const n = Number(compra.installments) || 1;
  if (k < 0 || k >= n) return null;
  return { k, valor: r2(Number(compra.total) / n) };
}
// itens da fatura do cartão no mês
export function itensFatura(d, c, m) {
  const itens = [];
  for (const p of d.compras) {
    if (p.card_id !== c.id) continue;
    const x = parcelaNoMes(p, m);
    if (x) itens.push({ id: p.id, description: p.description || 'Compra', installment: x.k + 1, installments: Number(p.installments) || 1, value: x.valor, total: Number(p.total) });
  }
  for (const a of d.assinaturas) {
    if (a.card_id !== c.id || (a.method || 'cartao') !== 'cartao') continue;
    for (const mx of [somaMes(m, -2), somaMes(m, -1), m]) {
      if (assinaturaCobra(a, mx) && mesDaFatura(c, dataNoMes(mx, a.day || 1)) === m) {
        itens.push({ id: `s${a.id}`, subscription_id: a.id, description: a.name, installment: 1, installments: 1, value: Number(a.amount), total: Number(a.amount) });
      }
    }
  }
  return itens;
}
export const faturaDoMes = (d, c, m) => soma(itensFatura(d, c, m), (i) => i.value);
const pago = (d, tipo, id, ref) => d.pagamentos.find((p) => p.item_type === tipo && p.item_id === id && p.ref_month === ref);
// limite usado: parcelas da fatura do mês (se não paga) e das próximas
export function usadoCartao(d, c, m) {
  let usado = 0;
  const pagoAtual = !!pago(d, 'card', c.id, m);
  for (const p of d.compras) {
    if (p.card_id !== c.id) continue;
    const n = Number(p.installments) || 1;
    for (let k = 0; k < n; k++) {
      const mes = somaMes(p.first_month, k);
      if (mes > m || (mes === m && !pagoAtual)) usado += Number(p.total) / n;
    }
  }
  if (!pagoAtual) usado += soma(itensFatura(d, c, m).filter((i) => i.subscription_id), (i) => i.value);
  return r2(usado);
}
export function cartaoInfo(d, c, m) {
  const limite = Number(c.limit_total) || 0;
  const usado = usadoCartao(d, c, m);
  const itens = itensFatura(d, c, m);
  return {
    ...c, invoice: soma(itens, (i) => i.value), items: itens, paid: pago(d, 'card', c.id, m) ? 1 : 0,
    used: usado, free_limit: r2(limite - usado),
    next: Array.from({ length: 6 }, (_, i) => somaMes(m, i)).map((mm) => ({ month: mm, total: faturaDoMes(d, c, mm) })),
  };
}

// ---------- empréstimos ----------
export function emprestimoInfo(d, e, m = mesAtual()) {
  const n = Number(e.installments) || 0;
  const pags = d.pagEmp.filter((p) => p.loan_id === e.id);
  const covered = pags.filter((p) => p.kind === 'extra').reduce((s, p) => s + (Number(p.covers) || 0), 0);
  const ultima = Math.max(0, n - covered); // parcelas que ainda vão vencer
  const pagasNo = new Set(pags.filter((p) => p.kind !== 'extra').map((p) => Number(p.installment_no)).filter(Boolean));
  const ini = (e.first_date || `${mesAtual()}-01`).slice(0, 7);
  const t = mesAtual();
  const grid = [];
  for (let no = 1; no <= n; no++) {
    const month = somaMes(ini, no - 1);
    const status = no > ultima ? 'antecipada' : pagasNo.has(no) ? 'paga' : month < t ? 'atrasada' : 'aberta';
    grid.push({ no, month, status });
  }
  const done = Math.min(n, pagasNo.size + covered);
  const k = difMeses(ini, m);
  const thisMonth = k >= 0 && k < ultima ? { no: k + 1, paid: pagasNo.has(k + 1) || !!pago(d, 'loan', e.id, m) } : null;
  const prox = grid.find((g) => g.status === 'aberta' || g.status === 'atrasada');
  const total = r2(n * (Number(e.installment) || 0));
  const paidTotal = soma(pags, (p) => p.amount);
  const extraPago = soma(pags.filter((p) => p.kind === 'extra'), (p) => p.amount);
  return {
    ...e, done, covered, pct: n ? (done / n) * 100 : 0,
    balance: r2(Math.max(0, n - done) * (Number(e.installment) || 0)),
    next: prox ? { no: prox.no, month: prox.month } : null,
    end_month: somaMes(ini, Math.max(ultima, 1) - 1), due_day: Number((e.first_date || '').slice(8, 10)) || 1,
    total, interest: r2(total - (Number(e.principal) || 0)), paid_total: paidTotal,
    saved_by_prepay: r2(covered * (Number(e.installment) || 0) - extraPago),
    this_month: e.active !== false ? thisMonth : null, grid,
    payments: [...pags].sort((a, b) => String(b.date).localeCompare(String(a.date))),
  };
}

// ---------- caixinhas ----------
export function caixinhaInfo(d, c, m) {
  const fim = fimDoMes(m);
  const movs = d.movCx.filter((x) => (x.savings_id || 1) === c.id);
  const balance = soma(movs.filter((x) => x.date <= fim), (x) => x.amount);
  const goal = Number(c.goal) || 0;
  let suggested = Number(c.monthly) || 0;
  if (!suggested && goal > balance && c.target_month) {
    const meses = Math.max(1, difMeses(m, c.target_month) + 1);
    suggested = Math.ceil(((goal - balance) / meses) * 100) / 100;
  }
  if (c.active === false) suggested = 0;
  const deposited = !!pago(d, 'saving', c.id, m) || movs.some((x) => x.ref_month === m);
  return {
    ...c, balance, goal: goal || null, pct: goal ? Math.min(100, (balance / goal) * 100) : 0, suggested,
    deposited, day: c.day || 5,
    months_to_goal: suggested > 0 && goal > balance ? Math.ceil((goal - balance) / suggested) : null,
    month_moves: soma(movs.filter((x) => x.date?.slice(0, 7) === m), (x) => x.amount),
  };
}

// ---------- recorrentes (lembretes) ----------
export function ocorrencias(r, m) {
  if (!ativo(r)) return [];
  const ini = r.start_date || `${m}-01`; const fim = r.end_date || '9999-12-31';
  const dentro = (dt) => dt >= ini && dt <= fim && dt.slice(0, 7) === m;
  const datas = [];
  const dias = diasNoMes(m);
  if (r.frequency === 'unica') { if (dentro(ini)) datas.push(ini); return datas; }
  if (r.frequency === 'mensal') { const dt = dataNoMes(m, r.day || Number(ini.slice(8, 10))); if (dentro(dt)) datas.push(dt); return datas; }
  if (r.frequency === 'diaria') { for (let i = 1; i <= dias; i++) { const dt = dataNoMes(m, i); if (dentro(dt)) datas.push(dt); } return datas; }
  const wd = Number(r.weekday ?? diaDaSemana(ini));
  if (r.frequency === 'quinzenal') {
    let dt = ini; while (diaDaSemana(dt) !== wd) dt = somaDias(dt, 1);
    if (dt < `${m}-01`) dt = somaDias(dt, Math.ceil(difDias(dt, `${m}-01`) / 14) * 14);
    for (; dt.slice(0, 7) === m; dt = somaDias(dt, 14)) if (dentro(dt)) datas.push(dt);
    return datas;
  }
  for (let i = 1; i <= dias; i++) { const dt = dataNoMes(m, i); if (diaDaSemana(dt) === wd && dentro(dt)) datas.push(dt); } // semanal
  return datas;
}

// ---------- receitas ----------
const fimReceita = (r) => r.end_month || (r.total_months ? somaMes(r.start_month || mesAtual(), Number(r.total_months) - 1) : null);
export function valorReceita(d, r, m) {
  const hist = d.recValores.filter((v) => v.income_id === r.id).sort((a, b) => a.from_month.localeCompare(b.from_month));
  let v = Number(r.amount) || 0;
  if (hist.length) { const h = hist.filter((x) => x.from_month <= m).pop(); v = h ? Number(h.amount) : Number(hist[0].amount); }
  if (r.amount_type === 'variavel') {
    const ult = [1, 2, 3].map((i) => somaMes(m, -i)).map((mm) => soma(d.recebimentos.filter((x) => x.income_id === r.id && x.ref_month === mm), (x) => x.amount)).filter((x) => x > 0);
    if (ult.length) v = r2(ult.reduce((s, x) => s + x, 0) / ult.length);
  }
  return v;
}
export function receitaNoMes(d, r, m) {
  const fim = fimReceita(r);
  const ciclo = r.cycle || 'mensal';
  const dentro = ciclo === 'unica' ? (r.start_month || m) === m : noPeriodo(r.start_month, fim, m);
  const recs = d.recebimentos.filter((x) => x.income_id === r.id && x.ref_month === m);
  const received = soma(recs, (x) => x.amount);
  const parts = ciclo === 'quinzenal' ? 2 : ciclo === 'semanal' ? 4 : ciclo === 'mensal' ? Math.max(1, Number(r.installments_per_cycle) || 1) : 1;
  const valor = valorReceita(d, r, m);
  const expected = !dentro || ciclo === 'avulso' ? 0 : r2(valor * parts);
  const partValue = parts ? r2(expected / parts) : expected;
  const due = ciclo === 'avulso' || !dentro ? null : dataNoMes(m, r.day || diasNoMes(m));
  const t = hoje();
  let status;
  if (!dentro) status = received > 0 ? 'recebido' : 'fora';
  else if (ciclo === 'avulso') status = received > 0 ? 'recebido' : 'avulso';
  else if (received >= expected - 0.005 && expected > 0) status = 'recebido';
  else if (due && due < t) status = 'atrasado';
  else if (received > 0) status = 'parcial';
  else status = 'previsto';
  const cicloTxt = { mensal: parts > 1 ? `${parts}× por mês` : 'por mês', quinzenal: 'quinzenal', semanal: 'semanal', avulso: 'avulso', unica: 'uma vez' }[ciclo] || ciclo;
  const total = fim && r.start_month ? difMeses(r.start_month, fim) + 1 : null;
  return {
    dentro, expected, received, remaining: r2(Math.max(0, expected - received)), parts, part_value: partValue,
    parts_received: partValue > 0 ? Math.min(parts, Math.floor((received + 0.005) / partValue)) : recs.length,
    due, status, late_days: status === 'atrasado' && due ? difDias(due, t) : 0, cycle_txt: cicloTxt,
    month_no: total && dentro && ciclo !== 'unica' ? difMeses(r.start_month, m) + 1 : null, months_total: total, end_month: fim, recs,
  };
}

// ---------- itens de "Contas a pagar" ----------
const ajusteDe = (d, tipo, id, ref) => d.ocorrencias.find((o) => o.item_type === tipo && o.item_id === id && o.ref === ref);
export function itensAPagar(d, m) {
  const itens = [];
  for (const b of d.fixas) {
    if (!ativo(b) || !noPeriodo(b.start_month, b.end_month, m)) continue;
    const aj = ajusteDe(d, 'bill', b.id, m);
    if (aj?.skip) continue;
    const base = Number(b.amount) || 0;
    const pg = pago(d, 'bill', b.id, m);
    itens.push({ type: 'bill', id: b.id, name: b.name, due_day: Number(b.due_day) || 1, amount: pg ? Number(pg.amount) : aj?.amount != null ? Number(aj.amount) : base, base, adjusted: aj?.amount != null, note: aj?.note || '', paid: !!pg, owner_id: b.owner_id, account_id: b.account_id, house: b.kind === 'casa', housing: !!b.is_housing, asset_id: b.asset_id });
  }
  for (const c of d.cartoes) {
    const v = faturaDoMes(d, c, m);
    const pg = pago(d, 'card', c.id, m);
    if (v > 0 || pg) itens.push({ type: 'card', id: c.id, name: `Fatura ${[c.bank, c.name].filter(Boolean).join(' ')}`, due_day: Number(c.due_day) || 1, amount: pg ? Number(pg.amount) : v, base: v, paid: !!pg, owner_id: c.owner_id, account_id: c.account_id, auto: !!c.auto_debit });
  }
  for (const e of d.emprestimos) {
    if (!ativo(e)) continue;
    const info = emprestimoInfo(d, e, m);
    if (!info.this_month) continue;
    itens.push({ type: 'loan', id: e.id, name: `${e.name} (${info.this_month.no}/${e.installments})`, due_day: info.due_day, amount: Number(e.installment) || 0, base: Number(e.installment) || 0, paid: info.this_month.paid, owner_id: e.owner_id, account_id: e.account_id });
  }
  for (const a of d.assinaturas) {
    if ((a.method || 'cartao') === 'cartao' || !assinaturaCobra(a, m)) continue;
    const pg = pago(d, 'subscription', a.id, m);
    const dt = dataNoMes(m, a.day || 1);
    itens.push({ type: 'subscription', id: a.id, name: a.name, due_day: Number(dt.slice(8)), date: null, amount: pg ? Number(pg.amount) : Number(a.amount), base: Number(a.amount), paid: !!pg, owner_id: a.owner_id, account_id: a.account_id });
  }
  for (const r of d.recorrentes) {
    for (const dt of ocorrencias(r, m)) {
      const aj = ajusteDe(d, 'reminder', r.id, dt);
      if (aj?.skip) continue;
      const pg = pago(d, 'reminder', r.id, dt);
      const base = Number(r.amount) || 0;
      itens.push({ type: 'reminder', id: r.id, name: r.name, date: dt, due_day: Number(dt.slice(8)), amount: pg ? Number(pg.amount) : aj?.amount != null ? Number(aj.amount) : base, base, adjusted: aj?.amount != null, note: aj?.note || '', paid: !!pg, owner_id: r.owner_id, account_id: r.account_id });
    }
  }
  for (const c of d.caixinhas) {
    const info = caixinhaInfo(d, c, m);
    if (!info.suggested) continue;
    itens.push({ type: 'saving', id: c.id, name: `Guardar: ${c.name}`, due_day: Number(c.day) || 5, amount: info.suggested, base: info.suggested, paid: info.deposited, owner_id: c.owner_id, account_id: c.from_account_id, saving: true });
  }
  return itens.sort((a, b) => a.due_day - b.due_day || String(a.date || '').localeCompare(String(b.date || '')) || a.name.localeCompare(b.name));
}
const dataItem = (i, m) => i.date || dataNoMes(m, i.due_day);

// ---------- contas bancárias ----------
// salário que "entra sozinho" na conta (dia do salário), para quem não usa Receitas do tipo salário
function salariosVirtuais(d, conta, ate) {
  if (!conta.salary_day) return [];
  const dono = d.pessoas.find((p) => p.id === conta.owner_id);
  if (!dono || !(Number(dono.salary) > 0) || salarioReceitas(d, dono.id).length) return [];
  const out = [];
  const ini = conta.opening_date || ate;
  for (let m = ini.slice(0, 7); m <= ate.slice(0, 7); m = somaMes(m, 1)) {
    const dt = dataNoMes(m, conta.salary_day);
    if (dt > ini && dt <= ate) out.push({ date: dt, amount: Number(dono.salary), kind: 'salario', note: 'Salário', ref: `sal-${dt}`, source: 'auto' });
  }
  return out;
}
// faturas em débito automático já vencidas e não marcadas como pagas
function debitosAutomaticos(d, conta, de, ate) {
  const out = [];
  for (const c of d.cartoes.filter((x) => x.auto_debit && x.account_id === conta.id)) {
    for (let m = de.slice(0, 7); m <= ate.slice(0, 7); m = somaMes(m, 1)) {
      const dt = dataNoMes(m, c.due_day);
      if (dt <= de || dt > ate || pago(d, 'card', c.id, m)) continue;
      const v = faturaDoMes(d, c, m);
      if (v > 0) out.push({ date: dt, amount: -v, kind: 'fatura', note: `Fatura ${c.name} (débito automático)`, ref: `fat-${c.id}-${m}`, source: 'auto' });
    }
  }
  return out;
}
const kindTx = (l) => ({ transferencia: 'transferencia', pagamento_fatura: 'fatura', pagamento: 'conta', caixinha: 'poupanca' }[l.kind] || (l.type === 'entrada' ? 'entrada' : 'gasto'));
export function movimentosConta(d, conta, ate) {
  const ini = conta.opening_date || '0000-01-01';
  const lista = [];
  for (const l of d.lancamentos) if (l.account_id === conta.id && l.date >= ini && l.date <= ate) lista.push({ id: l.id, date: l.date, amount: l.type === 'entrada' ? Number(l.amount) : -Number(l.amount), kind: kindTx(l), note: l.description || '', source: 'tx' });
  for (const mv of d.movConta) if (mv.account_id === conta.id && mv.date >= ini && mv.date <= ate) lista.push({ id: mv.id, date: mv.date, amount: Number(mv.amount), kind: mv.kind || 'ajuste', note: mv.note || '', source: 'move' });
  lista.push(...salariosVirtuais(d, conta, ate), ...debitosAutomaticos(d, conta, ini, ate));
  return lista.sort((a, b) => a.date.localeCompare(b.date) || String(a.id || 0).localeCompare(String(b.id || 0)));
}
export const saldoConta = (d, conta, ate) => r2((Number(conta.opening_balance) || 0) + soma(movimentosConta(d, conta, ate), (x) => x.amount));

// o que ainda vai entrar e sair da conta no mês (contas a pagar, receitas, salário)
export function previstosConta(d, conta, m, itens) {
  const t = hoje();
  const desde = m === mesAtual() ? t : m < mesAtual() ? fimDoMes(m) : `${m}-01`;
  const out = [];
  for (const i of itens) {
    if (i.paid || i.account_id !== conta.id) continue;
    const dt = dataItem(i, m);
    if (i.type === 'card' && i.auto && dt <= t) continue; // já entrou como débito automático
    out.push({ date: dt, amount: -i.amount, note: i.name, auto: !!i.auto });
  }
  for (const r of d.receitas) {
    if (r.account_id !== conta.id) continue;
    const x = receitaNoMes(d, r, m);
    if (x.remaining > 0 && x.due) out.push({ date: x.due, amount: x.remaining, note: r.name, auto: false });
  }
  for (const s of salariosVirtuais(d, conta, fimDoMes(m))) if (s.date > desde && s.date.slice(0, 7) === m) out.push({ date: s.date, amount: s.amount, note: 'Salário', auto: true });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
export function contaDetalhe(d, conta, m, itens) {
  const t = hoje();
  const ate = m < mesAtual() ? fimDoMes(m) : t;
  const balance = saldoConta(d, conta, ate);
  const upcoming = previstosConta(d, conta, m, itens);
  let run = balance; let lowest = { amount: balance, date: m === mesAtual() ? t : `${m}-01` };
  for (const u of upcoming) { run = r2(run + u.amount); if (run < lowest.amount) lowest = { amount: run, date: u.date < t ? t : u.date }; }
  const movs = movimentosConta(d, conta, fimDoMes(m) < ate ? fimDoMes(m) : ate);
  let saldo = r2((Number(conta.opening_balance) || 0) + soma(movs.filter((x) => x.date < `${m}-01`), (x) => x.amount));
  const statement = movs.filter((x) => x.date.slice(0, 7) === m).map((x) => { saldo = r2(saldo + x.amount); return { ...x, balance: saldo }; }).reverse();
  return {
    ...conta, balance, projected: r2(balance + soma(upcoming, (u) => u.amount)), lowest, upcoming, statement,
    month_in: soma(statement.filter((x) => x.amount > 0), (x) => x.amount),
    month_out: r2(-soma(statement.filter((x) => x.amount < 0), (x) => x.amount)),
    cards: d.cartoes.filter((c) => c.account_id === conta.id),
  };
}

// ---------- bens ----------
export function bemInfo(d, b) {
  const restantes = [];
  for (const e of d.emprestimos.filter((x) => x.asset_id === b.id && ativo(x))) {
    const i = emprestimoInfo(d, e);
    if (i.balance > 0) restantes.push({ desc: e.name, detail: `${Math.max(0, e.installments - i.done)} parcelas de ${Number(e.installment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, amount: i.balance });
  }
  const t = mesAtual();
  for (const f of d.fixas.filter((x) => x.asset_id === b.id && ativo(x) && x.end_month && x.end_month >= t)) {
    const n = difMeses(t, f.end_month) + (pago(d, 'bill', f.id, t) ? 0 : 1);
    if (n > 0) restantes.push({ desc: f.name, detail: `${n} meses até ${f.end_month.split('-').reverse().join('/')}`, amount: r2(n * Number(f.amount)) });
  }
  for (const p of d.compras.filter((x) => x.asset_id === b.id)) {
    const n = Number(p.installments) || 1; let falta = 0;
    for (let k = 0; k < n; k++) if (somaMes(p.first_month, k) >= t) falta += Number(p.total) / n;
    if (falta > 0) restantes.push({ desc: p.description || 'Compra no cartão', detail: 'parcelas no cartão', amount: r2(falta) });
  }
  const toPay = soma(restantes, (x) => x.amount);
  const mv = Number(b.market_value) || 0; const pp = Number(b.purchase_price) || 0;
  return { ...b, to_pay: toPay, remaining: restantes, net: r2(mv - toPay), change: pp && mv ? r2(mv - pp) : null, change_pct: pp && mv ? ((mv - pp) / pp) * 100 : null };
}

// ---------- resumo do mês (Visão geral) ----------
export function resumo(d, m, quem, eu) {
  const casal = quem === 'casal';
  const pessoas = d.pessoas;
  const pMe = casal ? null : pessoas.find((p) => p.id === quem) || pessoas.find((p) => p.user_id === eu) || pessoas[0];
  const meuId = pMe?.id;
  const de = (x) => casal || x.owner_id === meuId || (x.owner_id == null && pMe === pessoas[0]);
  const foto = (p) => d.membros.find((u) => u.user_id === p.user_id)?.foto || null;
  const peopleOut = pessoas.map((p) => ({ id: p.id, name: p.name, color: p.color || '#94a3b8', salary: salarioDe(d, p, m), is_me: p.user_id === eu, photo: foto(p) }));
  const totalSal = soma(pessoas, (p) => salarioDe(d, p, m));
  const me = casal ? { id: null, name: 'Casal', color: '#2563eb', salary: totalSal } : peopleOut.find((p) => p.id === meuId) || { id: null, name: '—', color: '#94a3b8', salary: 0 };
  const other = casal ? { id: null, name: '—', color: '#94a3b8' } : peopleOut.find((p) => p.id !== meuId) || { id: null, name: 'Outra pessoa', color: '#94a3b8', salary: 0 };
  const t = hoje(); const atual = mesAtual();

  // contas a pagar
  const todos = itensAPagar(d, m);
  const meus = todos.filter(de);

  // casa
  const casaItens = todos.filter((i) => i.house);
  const houseTotal = soma(casaItens, (i) => i.amount);
  const igual = d.ajustes.split_mode === 'igual';
  const comSal = pessoas.filter((p) => salarioDe(d, p, m) > 0);
  const shareMe = casal ? 100 : igual || !totalSal ? 100 / Math.max(1, pessoas.length) : (salarioDe(d, pMe, m) / totalSal) * 100;
  const myShare = r2(houseTotal * (shareMe / 100));
  const paidByMe = soma(casaItens.filter((i) => i.owner_id === meuId), (i) => i.amount);
  const acerto = d.acertos.find((a) => a.month === m);

  // receitas e renda
  const minhasRec = d.receitas.filter((r) => casal || r.owner_id === meuId);
  const recItens = minhasRec.map((r) => ({ r, x: receitaNoMes(d, r, m) })).filter(({ x }) => x.dentro || x.received > 0);
  const toReceive = recItens.filter(({ x }) => x.expected > 0 || x.received > 0).map(({ r, x }) => ({ id: r.id, name: r.name, status: x.status, parts: x.parts, parts_received: x.parts_received, part_value: x.part_value, due: x.due, received: x.received, remaining: x.remaining, expected: x.expected, account_id: r.account_id }));
  const ligados = new Set([...d.recebimentos.map((x) => x.lancamento_id), ...d.pagamentos.map((x) => x.lancamento_id)].filter(Boolean));
  const lm = d.lancamentos.filter((l) => l.date?.slice(0, 7) === m && l.kind === 'normal' && !ligados.has(l.id) && (casal || l.person_id === meuId || (l.person_id == null && pMe === pessoas[0])));
  const extra = soma(lm.filter((l) => l.type === 'entrada'), (l) => l.amount);
  const dailySpent = soma(lm.filter((l) => l.type === 'saida'), (l) => l.amount);
  const semSalReceita = (p) => (salarioReceitas(d, p.id).length ? 0 : Number(p.salary) || 0);
  const salBase = casal ? soma(pessoas, semSalReceita) : pMe ? semSalReceita(pMe) : 0;
  const income = r2(salBase + soma(recItens, ({ x }) => Math.max(x.expected, x.received)) + extra);
  const personal = soma(meus.filter((i) => !i.house && !i.saving), (i) => i.amount);
  const caixinhas = d.caixinhas.filter((c) => ativo(c) && de(c)).map((c) => caixinhaInfo(d, c, m));
  const saving = soma(caixinhas, (c) => c.suggested);
  const budget = Number(d.ajustes.daily_budget) || 0;
  const daily = m < atual ? dailySpent : Math.max(dailySpent, budget);
  const myHouse = casal ? houseTotal : myShare;
  const leftover = r2(income - myHouse - personal - saving - daily);

  // contas bancárias
  const contasAtivas = d.contas.filter(ativo);
  const detalhes = contasAtivas.map((c) => contaDetalhe(d, c, m, todos));
  const minhas = detalhes.filter((c) => casal || c.owner_id === meuId || c.owner_id == null);
  const myBalance = soma(minhas, (c) => c.balance);
  const myProjected = soma(minhas, (c) => c.projected);
  let daily_ = null;
  if (m === atual) {
    const dia = Number(t.slice(8)); const resta = diasNoMes(m) - dia + 1;
    const mov = minhas.flatMap((c) => c.statement);
    daily_ = { allowance: r2(myProjected / resta), in_per_day: r2(soma(mov.filter((x) => x.amount > 0), (x) => x.amount) / dia), out_per_day: r2(-soma(mov.filter((x) => x.amount < 0), (x) => x.amount) / dia) };
  }

  // cartões e crédito
  const cards = d.cartoes.map((c) => cartaoInfo(d, c, m));
  const meusCartoes = cards.filter(de);
  const limit = soma(meusCartoes, (c) => c.limit_total);
  const used = soma(meusCartoes, (c) => c.used);
  const loansAll = d.emprestimos.map((e) => emprestimoInfo(d, e, m));
  const meusLoans = loansAll.filter((e) => ativo(e) && de(e));
  const debtLoans = soma(meusLoans, (e) => e.balance);
  const fimEmp = meusLoans.filter((e) => e.balance > 0).map((e) => e.end_month).sort().pop() || null;

  // moradia
  const moradia = casaItens.filter((i) => i.housing);
  const salMe = casal ? totalSal : salarioDe(d, pMe, m);
  const myHousing = soma(moradia, (i) => i.amount * (shareMe / 100));
  const coupleHousing = soma(moradia, (i) => i.amount);

  // poupança
  const reserveBal = soma(caixinhas, (c) => c.balance);

  // bens e patrimônio (da casa toda)
  const bensInfo = d.bens.filter(ativo).map((b) => bemInfo(d, b));
  const todasContas = soma(detalhes, (c) => c.balance);
  const todaPoupanca = soma(d.caixinhas.map((c) => caixinhaInfo(d, c, m)), (c) => c.balance);
  const todasDividas = r2(soma(loansAll.filter(ativo), (e) => e.balance) + soma(cards, (c) => c.used));
  const ativos = soma(bensInfo, (b) => b.market_value);

  return {
    month: m, view: casal ? 'casal' : 'pessoa', me, other, people: peopleOut, share_me: r2(shareMe),
    settings: { ...d.ajustes, daily_budget: budget },
    balance: {
      income, salary: salMe, extra_income: extra, my_house_share: myHouse, personal, saving, daily, daily_spent: dailySpent,
      leftover, leftover_pct: income ? (leftover / income) * 100 : 0,
    },
    to_pay: { items: meus, total: soma(meus, (i) => i.amount), count: meus.length, paid_count: meus.filter((i) => i.paid).length },
    to_receive: { items: toReceive, expected: soma(toReceive, (i) => i.expected), received: soma(toReceive, (i) => i.received), remaining: soma(toReceive, (i) => i.remaining) },
    house: {
      total: houseTotal, my_share: myShare, other_share: r2(houseTotal - myShare),
      settlement: casal ? 0 : r2(paidByMe - myShare), settled: !!acerto?.done,
      bills: casaItens.filter((i) => i.type === 'bill').map((i) => ({ id: i.id, name: i.name, amount: i.amount, owner_id: i.owner_id })),
    },
    accounts: {
      list: detalhes.map(({ statement, upcoming, cards: _c, ...c }) => c), my_balance: myBalance, my_projected: myProjected,
      alerts: minhas.filter((c) => c.lowest.amount < 0).map((c) => ({ id: c.id, name: c.name, amount: c.lowest.amount, date: c.lowest.date })),
    },
    daily: daily_,
    cards,
    credit: {
      limit, free: r2(limit - used), used_pct: limit ? Math.min(100, (used / limit) * 100) : 0,
      cards: meusCartoes.map((c) => ({ id: c.id, name: c.name, preset: c.preset, color: c.color, limit: Number(c.limit_total) || 0, used: c.used, free: c.free_limit })),
      debt: { loans: debtLoans, cards: used, total: r2(debtLoans + used), monthly: r2(soma(meusLoans.filter((e) => e.this_month), (e) => e.installment) + soma(meusCartoes, (c) => c.invoice)), end_month: fimEmp },
    },
    housing: { items: moradia.map((i) => ({ name: i.name, amount: r2(i.amount * (shareMe / 100)) })), my_total: myHousing, couple_total: coupleHousing, my_pct: salMe ? (myHousing / salMe) * 100 : 0, couple_pct: totalSal ? (coupleHousing / totalSal) * 100 : 0, ref: Number(d.ajustes.housing_ref) || 30 },
    loans: meusLoans.map(({ grid, payments, ...e }) => e),
    savings: caixinhas,
    reserve: { balance: reserveBal, goal: soma(caixinhas, (c) => c.goal) || Number(d.ajustes.reserve_goal) || 0, month: soma(caixinhas, (c) => c.month_moves) },
    assets: { list: bensInfo },
    networth: { assets: ativos, accounts: todasContas, savings: todaPoupanca, debts: todasDividas, total: r2(ativos + todasContas + todaPoupanca - todasDividas) },
    projects: d.projetos.filter((p) => noPeriodo(p.start_month, p.end_month, m)),
  };
}
