// Servidor MCP do Casa em Dia (Conectar IA): as mesmas ferramentas do conector do ZimaOS.
// Respostas curtas em texto, para gastar pouco do plano da IA.
import { createClient } from '@supabase/supabase-js';
import { rotear, Erro } from './api.js';
import { RECURSOS } from './recursos.js';
import { mesDaFatura } from './calc.js';
import { hoje, mesAtual } from './fmt.js';

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ---------- sessão da chave (guardada na memória da função para não entrar a cada chamada) ----------
const SESSOES = new Map();
export async function clienteDaChave(chave) {
  if (!/^ced_[A-Za-z0-9_-]{20,}$/.test(chave || '')) throw new Erro('Chave inválida', 401);
  const s = createClient(URL_SB, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const c = SESSOES.get(chave);
  if (c && c.expira > Date.now() / 1000 + 60) {
    const { error } = await s.auth.setSession({ access_token: c.access_token, refresh_token: c.refresh_token });
    if (!error) return s;
  }
  const email = `ia-${chave.slice(0, 10)}@casa-em-dia.local`.toLowerCase();
  const { data, error } = await s.auth.signInWithPassword({ email, password: chave });
  if (error || !data.session) throw new Erro('Chave inválida ou revogada', 401);
  SESSOES.set(chave, { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expira: data.session.expires_at });
  s.rpc('chave_usada').then(() => {}, () => {});
  return s;
}

// ---------- utilidades ----------
const f = (v) => { const n = Number(v) || 0; return n.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2, maximumFractionDigits: 2 }); };
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = (m) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(0, 4)}`;
const dm = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '');
const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function achar(lista, nome, campo = (x) => x.name, oque = 'item') {
  if (!nome) throw new Erro(`Informe o ${oque}`);
  const n = norm(nome);
  const r = lista.filter((x) => norm(campo(x)) === n);
  const r2 = r.length ? r : lista.filter((x) => norm(campo(x)).startsWith(n));
  const r3 = r2.length ? r2 : lista.filter((x) => norm(campo(x)).includes(n) || n.includes(norm(campo(x))));
  if (!r3.length) throw new Erro(`Não achei ${oque} "${nome}". Opções: ${lista.map(campo).slice(0, 20).join(', ')}`);
  if (r3.length > 1 && !r.length) throw new Erro(`"${nome}" bate com mais de um: ${r3.map(campo).join(', ')}. Seja mais específico.`);
  return r3[0];
}

function ferramentas(s, origem) {
  const api = (caminho, metodo = 'GET', body) => {
    const u = new URL(`${origem}/api/${caminho}`);
    return rotear(metodo, u.pathname.slice(5).split('/').filter(Boolean).map(decodeURIComponent), u, body, s);
  };
  const resumo = (m, quem) => api(`summary?month=${m}${quem ? `&person=${quem}` : ''}`);
  const pessoaId = async (nome) => (nome ? (norm(nome) === 'casal' ? 'casal' : achar((await resumo(mesAtual())).people, nome, (p) => p.name, 'a pessoa').id) : null);
  const contaId = async (nome) => (nome ? achar(await api('accounts'), nome, (a) => a.name, 'a conta').id : null);

  return {
    async ver({ o_que, filtro, mes }) {
      const m = mes || mesAtual();
      if (o_que === 'link') return `${origem}/#${filtro && filtro !== '?' ? filtro : 'visao'}`;
      if (o_que === 'resumo' || o_que === 'relatorio') {
        const d = await resumo(m); const b = d.balance;
        const recebida = b.extra_income + (d.to_receive?.received || 0);
        const h = d.house;
        const acerto = h.settlement > 0.009 ? `${d.other.name} te devolve ${f(h.settlement)}` : h.settlement < -0.009 ? `você devolve ${f(-h.settlement)}` : 'em dia';
        const linhas = [
          `${nomeMes(m)} (${d.me.name}) renda recebida ${f(recebida)} / prevista ${f(b.income)} | casa ${f(b.my_house_share)} | pessoais ${f(b.personal)} | guardar ${f(b.saving)} | dia a dia ${f(b.daily)} | sobra ${f(b.leftover)} (${Math.round(b.leftover_pct)}%)`,
          `a pagar ${f(d.to_pay.total)} (${d.to_pay.paid_count}/${d.to_pay.count} pagos) | contas ${f(d.accounts.my_balance)}→fim ${f(d.accounts.my_projected)} | crédito livre ${f(d.credit.free)}/${f(d.credit.limit)} | dívida ${f(d.credit.debt.total)} | poupança ${f(d.reserve.balance)} | acerto: ${acerto}${h.settled ? ' (feito)' : ''}`,
          ...d.accounts.alerts.map((a) => `ALERTA ${a.name} fica ${f(a.amount)} em ${dm(a.date)}`),
        ];
        if (o_que === 'relatorio') {
          const tx = await api(`transactions?month=${m}`);
          const cats = {};
          for (const t of tx.filter((x) => x.type === 'saida')) cats[t.category || 'Outros'] = (cats[t.category || 'Outros'] || 0) + Number(t.amount);
          linhas.push(`categorias: ${Object.entries(cats).sort((a, b2) => b2[1] - a[1]).map(([c, v]) => `${c} ${f(v)}`).join(', ') || '—'}`);
          linhas.push('mês|renda|saídas|sobra', ...(await api(`cashflow?month=${m}&n=6`)).map((x) => `${x.month}|${f(x.income)}|${f(x.expenses)}|${f(x.leftover)}`));
        }
        return linhas.join('\n');
      }
      if (o_que === 'a_pagar') {
        const quem = await pessoaId(filtro);
        const d = await resumo(m, quem);
        return `${d.me.name}:\n${d.to_pay.items.map((i) => `${i.paid ? '✓' : '○'} ${String(i.due_day).padStart(2, '0')} ${i.name}${i.date ? ` (${dm(i.date)})` : ''} ${f(i.amount)}`).join('\n') || 'nada a pagar'}`;
      }
      if (o_que === 'a_receber' || o_que === 'receitas') {
        const quem = await pessoaId(filtro);
        const o = await api(`incomes-overview?month=${m}${quem && quem !== 'casal' ? `&person=${quem}` : ''}`);
        const lista = o.list.filter((i) => (o_que === 'receitas' ? true : i.month.expected > 0 || i.month.received > 0));
        return `previsto ${f(o.expected)} | recebido ${f(o.received)} | falta ${f(o.remaining)}\n${lista.map((i) => `${i.name}: ${i.month.status} ${f(i.month.received)}/${f(i.month.expected)}${i.month.due ? ` dia ${dm(i.month.due)}` : ''}${i.active ? '' : ' (encerrada)'}`).join('\n') || 'nada previsto'}`;
      }
      if (o_que === 'cartoes') {
        const d = await resumo(m, 'casal');
        return `${d.cards.map((c) => `${[c.bank, c.name].filter(Boolean).join(' ')}: fatura ${f(c.invoice)} vence ${c.due_day}${c.paid ? ' (paga)' : ''}, livre ${f(c.free_limit)}/${f(c.limit_total)}`).join('\n')}\ntotal livre ${f(d.credit.free)}/${f(d.credit.limit)}`;
      }
      if (o_que === 'contas') {
        if (filtro) {
          const c = achar(await api('accounts'), filtro, (a) => a.name, 'a conta');
          const x = await api(`account-detail/${c.id}?month=${m}`);
          return `${x.name}: hoje ${f(x.balance)}, fim ${f(x.projected)}\n${x.statement.map((e) => `${dm(e.date)} ${e.note || e.kind} ${e.amount >= 0 ? '+' : ''}${f(e.amount)} = ${f(e.balance)}${e.source === 'tx' ? ` #${e.id}` : ''}`).join('\n') || 'sem movimento no mês'}${x.upcoming.length ? `\nprevisto: ${x.upcoming.map((u) => `${dm(u.date)} ${u.note} ${f(u.amount)}`).join('; ')}` : ''}`;
        }
        const d = await resumo(m, 'casal');
        return d.accounts.list.map((a) => `${a.name}: hoje ${f(a.balance)}, fim ${f(a.projected)}`).join('\n') || 'nenhuma conta';
      }
      if (o_que === 'emprestimos') {
        const d = await resumo(m, 'casal');
        return d.loans.map((l) => `${l.name}${l.lender ? ` (${l.lender})` : ''}: deve ${f(l.balance)}, ${l.done}/${l.installments} pagas de ${f(l.installment)}, termina ${l.end_month}`).join('\n') || 'nenhum empréstimo';
      }
      if (o_que === 'poupanca') {
        const d = await resumo(m, 'casal');
        return `total ${f(d.reserve.balance)}\n${d.savings.map((x) => `${x.name}: ${f(x.balance)}${x.goal ? ` de ${f(x.goal)}` : ''}${x.suggested ? ` · ${f(x.suggested)}/mês${x.deposited ? ' (guardado)' : ''}` : ''}`).join('\n')}`;
      }
      if (o_que === 'lancamentos') {
        let tx = await api(`transactions?month=${m}`);
        if (filtro) tx = tx.filter((t) => norm(`${t.description} ${t.category}`).includes(norm(filtro)));
        return tx.slice(0, 60).map((t) => `#${t.id} ${dm(t.date)} ${t.description || '—'} ${t.type === 'entrada' ? '+' : '-'}${f(t.amount)} ${t.category || ''}`).join('\n') || 'nenhum lançamento';
      }
      if (o_que === 'bens') {
        const d = await resumo(m, 'casal');
        return `patrimônio ${f(d.networth.total)} (bens ${f(d.networth.assets)} + contas ${f(d.networth.accounts)} + poupança ${f(d.networth.savings)} − dívidas ${f(d.networth.debts)})\n${d.assets.list.map((a) => `${a.name}: vale ${f(a.market_value)}, falta pagar ${f(a.to_pay)}, líquido ${f(a.net)}`).join('\n')}`;
      }
      if (o_que === 'assinaturas') {
        const o = await api(`subscriptions-overview?month=${m}`);
        return `${f(o.per_month)}/mês · ${f(o.per_year)}/ano\n${o.list.filter((x) => x.live).map((x) => `${x.name}: ${f(x.amount)} ${x.cycle_txt} · ${x.paid_with} · dia ${x.day || 1}`).join('\n')}`;
      }
      if (o_que === 'despensa' || o_que === 'compras') {
        const o = await api('despensa');
        if (o_que === 'compras') return o.list.map((i) => `${i.name}: comprar ${i.suggest} ${i.unit}${i.est_cost ? ` (~${f(i.est_cost)})` : ''}`).join('\n') || 'nada em falta';
        let it = o.items; if (filtro) it = it.filter((i) => norm(i.name).includes(norm(filtro)));
        return it.map((i) => `${i.name}: ${f(i.qty)} ${i.unit}${i.out ? ' (acabou)' : i.low ? ' (acabando)' : ''}${i.last_price ? ` · último ${f(i.last_price)}` : ''}`).join('\n') || 'despensa vazia';
      }
      throw new Erro('o_que inválido');
    },

    async lancar({ tipo, valor, descricao, categoria, data, onde, para, parcelas, bem, id }) {
      const dt = data || hoje();
      if (tipo === 'apagar') { await api(`transactions/${Number(id)}`, 'DELETE'); return `apagado #${id}`; }
      if (!(Number(valor) > 0)) throw new Erro('Informe o valor');
      const me = await api('me');
      const bemId = bem ? achar(await api('assets'), bem, (a) => a.name, 'o bem').id : null;
      if (tipo === 'gasto' || tipo === 'entrada') {
        const conta = await contaId(onde);
        const t = await api('transactions', 'POST', { type: tipo === 'gasto' ? 'saida' : 'entrada', kind: 'normal', amount: valor, description: descricao || categoria || tipo, category: categoria || null, date: dt, account_id: conta, person_id: me.user.person_id, asset_id: bemId });
        return `${tipo} ${f(valor)} lançado #${t.id}${conta ? '' : ' (dinheiro)'}`;
      }
      if (tipo === 'cartao') {
        const c = achar(await api('cards'), onde, (x) => `${x.bank || ''} ${x.name}`.trim(), 'o cartão');
        const fat = mesDaFatura(c, dt);
        const p = await api('purchases', 'POST', { card_id: c.id, description: descricao || categoria || 'Compra', total: valor, installments: Math.max(1, Number(parcelas) || 1), first_month: fat, date: dt, category: categoria || null, asset_id: bemId });
        return `compra ${f(valor)} em ${Math.max(1, Number(parcelas) || 1)}x no ${c.name}, 1ª fatura ${fat} #${p.id}`;
      }
      if (tipo === 'guardar' || tipo === 'retirar') {
        const cx = achar(await api('savings'), onde, (x) => x.name, 'a caixinha');
        await api('reserve', 'POST', { savings_id: cx.id, amount: tipo === 'guardar' ? valor : -valor, date: dt, note: descricao || null });
        return `${tipo === 'guardar' ? 'guardado' : 'retirado'} ${f(valor)} ${tipo === 'guardar' ? 'na' : 'da'} ${cx.name}`;
      }
      if (tipo === 'transferencia') {
        await api('transfer', 'POST', { from_account_id: await contaId(onde), to_account_id: await contaId(para), amount: valor, date: dt, note: descricao || null });
        return `transferido ${f(valor)} de ${onde} para ${para}`;
      }
      throw new Erro('tipo inválido');
    },

    async pagar({ item, mes, onde, pessoa, valor, desfazer }) {
      const m = mes || mesAtual();
      const quem = (await pessoaId(pessoa)) || 'casal';
      const d = await resumo(m, quem);
      const it = achar(d.to_pay.items.filter((i) => (desfazer ? i.paid : !i.paid) || norm(i.name) === norm(item)), item, (i) => i.name, 'o item a pagar');
      if (onde && it.type === 'bill') await api(`bills/${it.id}`, 'PUT', { account_id: await contaId(onde) });
      await api('pay', 'POST', { type: it.type, id: it.id, paid: !desfazer, month: m, date: it.date || undefined, amount: valor ?? undefined });
      return `${it.name}: ${desfazer ? 'pagamento desfeito' : `pago ${f(valor ?? it.amount)}`}`;
    },

    async receber({ item, valor, data, onde, mes, nota, desfazer }) {
      const m = mes || mesAtual();
      const o = await api(`incomes-overview?month=${m}`);
      const r = achar(o.list, item, (x) => x.name, 'a receita');
      if (desfazer) {
        const rec = r.all_receipts.find((x) => x.ref_month === m) || r.all_receipts[0];
        if (!rec) throw new Erro('Nada recebido para desfazer');
        await api('receive/undo', 'POST', { id: rec.id });
        return `${r.name}: recebimento de ${f(rec.amount)} desfeito`;
      }
      const v = valor ?? (r.month.remaining || r.amount);
      await api('receive', 'POST', { income_id: r.id, amount: v, date: data || hoje(), account_id: onde ? await contaId(onde) : r.account_id, ref_month: m, note: nota || null });
      return `${r.name}: recebido ${f(v)}`;
    },

    async cadastrar(a) {
      const dono = a.dono ? await pessoaId(a.dono) : (await api('me')).user.person_id;
      const t = a.tipo;
      if (t === 'pessoa') { const p = await api('people', 'POST', { name: a.nome, salary: a.valor || 0, color: '#f43f5e' }); return `pessoa ${p.name} #${p.id}`; }
      if (t === 'conta_bancaria') { const c = await api('accounts', 'POST', { name: a.nome, bank: a.banco || null, opening_balance: a.valor || 0, opening_date: hoje(), salary_day: a.dia || null, owner_id: dono, active: true }); return `conta ${c.name} #${c.id}`; }
      if (t === 'cartao') { const c = await api('cards', 'POST', { name: a.nome, bank: a.banco || null, limit_total: a.valor || 0, due_day: a.dia || 10, closing_day: a.fecha || 3, owner_id: dono, account_id: a.onde ? await contaId(a.onde) : null, auto_debit: !!a.onde, kind: 'credito', network: 'mastercard' }); return `cartão ${c.name} #${c.id}`; }
      if (t === 'conta_fixa') { const b = await api('bills', 'POST', { name: a.nome, amount: a.valor, due_day: a.dia || 10, kind: a.casa === false ? 'pessoal' : 'casa', owner_id: dono, account_id: a.onde ? await contaId(a.onde) : null, start_month: (a.data || mesAtual()).slice(0, 7), end_month: a.fim || null, notes: a.obs || null, active: true }); return `conta fixa ${b.name} #${b.id}`; }
      if (t === 'emprestimo') { const e = await api('loans', 'POST', { name: a.nome, installment: a.valor, installments: a.parcelas, first_date: a.data || hoje(), principal: a.total || null, owner_id: dono, account_id: a.onde ? await contaId(a.onde) : null, notes: a.obs || null, active: true }); return `empréstimo ${e.name} #${e.id}`; }
      if (t === 'antecipacao') { const e = achar(await api('loans'), a.nome, (x) => x.name, 'o empréstimo'); await api('loanpay', 'POST', { loan_id: e.id, kind: 'extra', date: a.data || hoje(), amount: a.valor, covers: a.quitadas || 1, note: a.obs || 'antecipação' }); return `antecipação em ${e.name}: ${f(a.valor)}, ${a.quitadas || 1} parcela(s)`; }
      if (t === 'assinatura') {
        const forma = a.forma || 'cartao';
        const card = forma === 'cartao' && a.onde ? achar(await api('cards'), a.onde, (x) => `${x.bank || ''} ${x.name}`.trim(), 'o cartão').id : null;
        const conta = forma !== 'cartao' && a.onde ? await contaId(a.onde) : null;
        const x = await api('subscriptions', 'POST', { name: a.nome, platform: a.plataforma || null, plan: a.plano || null, amount: a.valor, cycle: a.ciclo || 'mensal', method: forma, card_id: card, account_id: conta, day: a.dia || 1, start_month: (a.data || mesAtual()).slice(0, 7), owner_id: dono, notes: a.obs || null, active: true, currency: 'BRL', category: 'outros' });
        return `assinatura ${x.name} #${x.id}`;
      }
      if (t === 'receita') {
        const r = await api('incomes', 'POST', {
          name: a.nome, payer: a.pagador || null, kind: a.plano || 'contrato', cycle: a.avulso ? 'avulso' : 'mensal', amount: a.valor || 0, amount_type: a.variavel ? 'variavel' : 'fixo',
          day: a.dia || null, installments_per_cycle: a.vezes || 1, owner_id: dono, account_id: a.onde ? await contaId(a.onde) : null,
          start_month: (a.data || mesAtual()).slice(0, 7), total_months: a.meses || null, end_month: a.fim || null, notes: a.obs || null, active: true, renewal: 'nao_renova',
        });
        return `receita ${r.name} #${r.id}`;
      }
      throw new Erro('tipo inválido');
    },

    async despensa({ acao, item, qtd, preco, valor, mercado, lancar, onde, itens, unidade, data }) {
      const lista = async () => [...(await api('despensa')).items, ...(await api('despensa')).inactive];
      const produto = async (nome, criar) => {
        const todos = await api('pantry');
        try { return achar(todos, nome, (x) => x.name, 'o produto'); } catch (e) {
          if (!criar) throw e;
          return api('pantry', 'POST', { name: nome, unit: unidade || 'un', qty: 0, min_qty: 1, category: 'outros', active: true });
        }
      };
      const conta = onde ? await contaId(onde) : null;
      if (acao === 'comprei') {
        const p = await produto(item, true); const q = Number(qtd) || 1;
        const total = valor ?? (preco ? preco * q : null);
        await api('despensa/buy', 'POST', { item_id: p.id, qty: q, total, store: mercado || null, date: data || hoje(), launch: !!lancar, account_id: conta });
        return `${p.name}: +${f(q)}${total ? ` por ${f(total)}` : ''}`;
      }
      if (acao === 'compra') {
        const out = [];
        for (const x of itens || []) {
          const p = await produto(x.name || x.item, true); const q = Number(x.qty) || 1;
          const total = x.total ?? (x.unit_price ? x.unit_price * q : null);
          await api('despensa/buy', 'POST', { item_id: p.id, qty: q, total, store: mercado || null, date: data || hoje(), launch: false });
          out.push(`${p.name} +${f(q)}`);
        }
        if (lancar && valor) await api('transactions', 'POST', { type: 'saida', kind: 'normal', amount: valor, category: 'Mercado', description: mercado ? `Compra ${mercado}` : 'Compra do mercado', date: data || hoje(), account_id: conta, person_id: (await api('me')).user.person_id });
        return `compra registrada: ${out.join(', ')}${lancar && valor ? ` · gasto ${f(valor)}` : ''}`;
      }
      const p = await produto(item, false);
      if (acao === 'usei') { const r = await api('despensa/use', 'POST', { item_id: p.id, qty: Number(qtd) || 1 }); return `${p.name}: sobrou ${f(r.item.qty)}${r.status.low ? ' (entrou na lista)' : ''}`; }
      if (acao === 'acabou') { await api('despensa/count', 'POST', { item_id: p.id, qty: 0 }); return `${p.name}: acabou (na lista de compras)`; }
      if (acao === 'contei') { await api('despensa/count', 'POST', { item_id: p.id, qty: Number(qtd) || 0 }); return `${p.name}: agora ${f(qtd)}`; }
      if (acao === 'preco') { const r = await api(`despensa/price?item=${p.id}&price=${Number(preco) || 0}`); return r.text; }
      void lista;
      throw new Erro('acao inválida');
    },

    async editar({ acao, tipo, id, dados, filtro }) {
      const MAPA = { pessoas: 'people', contas_bancarias: 'accounts', cartoes: 'cards', contas_fixas: 'bills', compras_cartao: 'purchases', lancamentos: 'transactions', caixinhas: 'savings', movimentos_caixinha: 'reserve', emprestimos: 'loans', pagamentos_emprestimo: 'loanpay', movimentos_conta: 'moves', recorrentes: 'reminders', assinaturas: 'subscriptions', receitas: 'incomes', produtos_despensa: 'pantry', bens: 'assets', bancos: 'banks', projetos: 'projects' };
      if (tipo === 'ajustes') {
        if (acao === 'alterar') { await api('settings', 'PUT', dados || {}); return 'ajustes salvos'; }
        const d = await resumo(mesAtual()); return Object.entries(d.settings).filter(([k]) => !['casa_id'].includes(k)).map(([k, v]) => `${k}=${v}`).join('\n');
      }
      const res = MAPA[tipo];
      if (!res) throw new Erro('tipo inválido');
      if (acao === 'campos') return Object.entries(RECURSOS[res].cols).map(([k, v]) => `${k}:${{ bool: 'bool', num: 'number', int: 'int', date: 'date', text: k.endsWith('_month') ? 'month' : 'text' }[v]}`).join(', ');
      if (acao === 'listar') {
        let l = await api(res);
        if (filtro) l = l.filter((x) => norm(JSON.stringify(x)).includes(norm(filtro)));
        const cols = Object.keys(RECURSOS[res].cols);
        return l.slice(0, 50).map((x) => `#${x.id} ${cols.filter((k) => x[k] !== null && x[k] !== undefined && x[k] !== '' && k !== 'image').map((k) => `${k}=${String(x[k]).slice(0, 60)}`).join(' ')}`).join('\n') + (l.length > 50 ? `\n… (${l.length - 50} a mais: use filtro)` : '') || 'nada';
      }
      if (acao === 'criar') { const r = await api(res, 'POST', dados || {}); return `criado #${r.id}`; }
      if (acao === 'alterar') { await api(`${res}/${Number(id)}`, 'PUT', dados || {}); return `alterado #${id}`; }
      if (acao === 'apagar') { await api(`${res}/${Number(id)}`, 'DELETE'); return `apagado #${id}`; }
      throw new Erro('acao inválida');
    },
  };
}

// ---------- descrição das ferramentas (igual ao conector do ZimaOS) ----------
const S = (t, extra = {}) => ({ type: t, ...extra });
const TOOLS = [
  { name: 'ver', description: 'Consulta as finanças. o_que: resumo, a_pagar, cartoes, contas (filtro=conta p/ extrato), a_receber (filtro=pessoa), receitas, emprestimos, poupanca, lancamentos (filtro=busca), relatorio, bens (patrimônio), assinaturas, despensa (filtro=produto), compras (lista de compras), link (filtro=tela). a_pagar aceita filtro=pessoa.', inputSchema: { type: 'object', properties: { o_que: S('string', { enum: ['resumo', 'a_pagar', 'a_receber', 'receitas', 'cartoes', 'contas', 'emprestimos', 'poupanca', 'lancamentos', 'relatorio', 'bens', 'assinaturas', 'despensa', 'compras', 'link'] }), filtro: S('string'), mes: S('string', { description: 'AAAA-MM' }) }, required: ['o_que'] } },
  { name: 'lancar', description: 'tipo: gasto|entrada (onde=conta bancária, vazio=dinheiro), cartao (onde=cartão, parcelas), guardar|retirar (onde=caixinha), transferencia (onde=conta de saída, para=conta de entrada; não conta como renda nem gasto), apagar (id). bem=carro/casa ligado ao gasto. Entrada de contrato/salário cadastrado: use receber.', inputSchema: { type: 'object', properties: { tipo: S('string', { enum: ['gasto', 'entrada', 'cartao', 'guardar', 'retirar', 'transferencia', 'apagar'] }), valor: S('number'), descricao: S('string'), categoria: S('string'), data: S('string', { description: 'AAAA-MM-DD' }), onde: S('string'), para: S('string'), parcelas: S('integer'), bem: S('string'), id: S('integer') }, required: ['tipo'] } },
  { name: 'pagar', description: 'Marca como pago (ou desfaz) um item de a_pagar pelo nome: conta, fatura, parcela ou depósito da poupança. onde=conta que pagou (se não for a de sempre). pessoa=de quem é o item.', inputSchema: { type: 'object', properties: { item: S('string'), mes: S('string'), onde: S('string'), pessoa: S('string'), valor: S('number'), desfazer: S('boolean') }, required: ['item'] } },
  { name: 'receber', description: 'Registra que uma receita caiu (cria o recebimento e o lançamento de entrada juntos), ou desfaz. item=nome da receita; valor (padrão: o que falta no mês); data; onde=conta; mes=mês a que pertence; nota.', inputSchema: { type: 'object', properties: { item: S('string'), valor: S('number'), data: S('string'), onde: S('string'), mes: S('string'), nota: S('string'), desfazer: S('boolean') }, required: ['item'] } },
  { name: 'cadastrar', description: 'tipo: receita (contrato/salário/benefício/freela que entra todo mês: valor=valor do mês, dia, onde=conta que recebe, dono, data=início AAAA-MM, meses=duração ou fim=AAAA-MM, vezes=parcelas no mês, variavel, avulso, pagador, plano=contrato|salario|beneficio|freela|outro, obs), assinatura (valor=cobrado em R$, dia, ciclo=mensal|trimestral|semestral|anual, forma=cartao|pix|debito|boleto|dinheiro, onde=cartão ou conta, plano, plataforma), pessoa (valor=salário), conta_bancaria (banco, valor=saldo atual, dia=dia do salário, dono=pessoa), cartao (banco, valor=limite, dia=vencimento, fecha=dia do fechamento, dono, onde=conta p/ débito automático), conta_fixa (valor, dia, casa=dividida, onde=conta bancária), emprestimo (valor=parcela, parcelas, data=1a parcela, total=valor pego), antecipacao (nome=empréstimo, valor pago, quitadas). Nomes repetidos entre pessoas: inclua o dono no nome (ex.: "Nubank Kyaren").', inputSchema: { type: 'object', properties: { tipo: S('string', { enum: ['receita', 'assinatura', 'pessoa', 'conta_bancaria', 'cartao', 'conta_fixa', 'emprestimo', 'antecipacao'] }), nome: S('string'), valor: S('number'), dia: S('integer'), fecha: S('integer'), dono: S('string'), onde: S('string'), banco: S('string'), casa: S('boolean'), data: S('string'), fim: S('string'), meses: S('integer'), vezes: S('integer'), parcelas: S('integer'), quitadas: S('integer'), total: S('number'), ciclo: S('string'), forma: S('string'), plano: S('string'), plataforma: S('string'), pagador: S('string'), variavel: S('boolean'), avulso: S('boolean'), obs: S('string') }, required: ['tipo', 'nome'] } },
  { name: 'despensa', description: 'Estoque de casa. acao: comprei (item, qtd, preco=por unidade ou valor=total, mercado; lancar=true cria o gasto, onde=conta), compra (itens=[{name,qty,unit_price|total}], mercado, lancar, onde, valor=total da nota: uma compra inteira, um lançamento só), usei (item, qtd), acabou (item), contei (item, qtd=quanto tem), preco (item, preco: diz se está caro ou barato). Produto novo é criado sozinho em comprei.', inputSchema: { type: 'object', properties: { acao: S('string', { enum: ['comprei', 'compra', 'usei', 'acabou', 'contei', 'preco'] }), item: S('string'), qtd: S('number'), preco: S('number'), valor: S('number'), mercado: S('string'), lancar: S('boolean'), onde: S('string'), unidade: S('string'), data: S('string'), itens: { type: 'array', items: { type: 'object' } } }, required: ['acao'] } },
  { name: 'editar', description: 'Acesso total aos dados. acao: campos (mostra os campos do tipo), listar (filtro=busca), criar (dados), alterar (id + só os campos que mudam), apagar (id). tipo: pessoas, contas_bancarias, cartoes, contas_fixas, compras_cartao, lancamentos, caixinhas, movimentos_caixinha, emprestimos, pagamentos_emprestimo, movimentos_conta, recorrentes, assinaturas, receitas, produtos_despensa, bens, bancos, projetos, ajustes (listar/alterar, sem id). Ids de pessoa/conta/cartão: use listar. Confirme com o usuário antes de apagar.', inputSchema: { type: 'object', properties: { acao: S('string', { enum: ['campos', 'listar', 'criar', 'alterar', 'apagar'] }), tipo: S('string', { enum: ['pessoas', 'contas_bancarias', 'cartoes', 'contas_fixas', 'compras_cartao', 'lancamentos', 'caixinhas', 'movimentos_caixinha', 'emprestimos', 'pagamentos_emprestimo', 'movimentos_conta', 'recorrentes', 'assinaturas', 'receitas', 'produtos_despensa', 'bens', 'bancos', 'projetos', 'ajustes'] }), id: S('integer'), dados: S('object'), filtro: S('string') }, required: ['acao', 'tipo'] } },
];
const INSTRUCOES = 'Finanças do casal. Valores em R$. Nomes servem como referência (ex.: onde="sicredi"). Para qualquer cadastro ou alteração que as outras ferramentas não cobrem, use editar (acao=campos mostra os campos). Confirme antes de apagar.';

// ---------- JSON-RPC (MCP Streamable HTTP, sem estado) ----------
export async function atenderMcp(msg, s, origem) {
  const resp = (result) => ({ jsonrpc: '2.0', id: msg.id, result });
  const erro = (code, message) => ({ jsonrpc: '2.0', id: msg.id ?? null, error: { code, message } });
  if (msg.id === undefined || msg.id === null) return null; // notificação
  if (msg.method === 'initialize') {
    return resp({ protocolVersion: msg.params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'Casa em Dia', version: '2026.11' }, instructions: INSTRUCOES });
  }
  if (msg.method === 'ping') return resp({});
  if (msg.method === 'tools/list') return resp({ tools: TOOLS });
  if (msg.method === 'tools/call') {
    const fn = ferramentas(s, origem)[msg.params?.name];
    if (!fn) return erro(-32602, `Ferramenta desconhecida: ${msg.params?.name}`);
    try {
      const texto = await fn(msg.params?.arguments || {});
      return resp({ content: [{ type: 'text', text: String(texto) }] });
    } catch (e) {
      return resp({ content: [{ type: 'text', text: `Erro: ${e.message}` }], isError: true });
    }
  }
  if (msg.method === 'resources/list') return resp({ resources: [] });
  if (msg.method === 'prompts/list') return resp({ prompts: [] });
  return erro(-32601, `Método não suportado: ${msg.method}`);
}
