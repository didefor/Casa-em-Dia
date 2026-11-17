// Cadastros que a interface edita com o formulário padrão: recurso da API → tabela e colunas aceitas.
const B = 'bool'; const N = 'num'; const I = 'int'; const T = 'text'; const D = 'date';

export const RECURSOS = {
  transactions: { tabela: 'lancamentos', perm: 'launch', cols: { date: D, description: T, amount: N, type: T, category: T, person_id: I, account_id: I, asset_id: I, kind: T } },
  bills: { tabela: 'contas_fixas', cols: { name: T, amount: N, due_day: I, kind: T, owner_id: I, is_housing: B, is_reserve: B, start_month: T, end_month: T, active: B, notes: T, account_id: I, asset_id: I } },
  purchases: { tabela: 'compras_cartao', perm: 'launch', cols: { card_id: I, description: T, total: N, installments: I, first_month: T, asset_id: I, date: D, category: T } },
  cards: { tabela: 'cartoes', cols: { preset: T, image: T, bank: T, name: T, limit_total: N, network: T, color: T, closing_day: I, due_day: I, owner_id: I, kind: T, account_id: I, auto_debit: B } },
  savings: { tabela: 'caixinhas', cols: { name: T, icon: T, account: T, goal: N, target_month: T, monthly: N, day: I, owner_id: I, from_account_id: I, active: B, color: T } },
  loans: { tabela: 'emprestimos', cols: { name: T, lender: T, principal: N, installment: N, installments: I, first_date: D, owner_id: I, account_id: I, asset_id: I, bank_balance: N, bank_balance_date: D, notes: T, active: B } },
  loanpay: { tabela: 'pagamentos_emprestimo', perm: 'launch', cols: { loan_id: I, kind: T, date: D, amount: N, covers: I, installment_no: I, note: T } },
  reminders: { tabela: 'recorrentes', cols: { name: T, amount: N, frequency: T, time: T, weekday: I, day: I, start_date: D, end_date: D, account_id: I, category: T, owner_id: I, asset_id: I, notes: T, active: B } },
  pantry: { tabela: 'produtos_despensa', perm: 'launch', cols: { name: T, category: T, unit: T, qty: N, min_qty: N, notes: T, active: B } },
  incomes: { tabela: 'receitas', cols: { name: T, payer: T, kind: T, cycle: T, amount: N, amount_type: T, day: I, installments_per_cycle: I, owner_id: I, account_id: I, start_month: T, total_months: I, end_month: T, renewal: T, category: T, notes: T, active: B } },
  subscriptions: { tabela: 'assinaturas', cols: { name: T, platform: T, plan: T, category: T, amount: N, cycle: T, currency: T, amount_original: N, method: T, day: I, card_id: I, account_id: I, start_month: T, end_month: T, owner_id: I, url: T, notes: T, active: B } },
  assets: { tabela: 'bens', cols: { kind: T, name: T, brand: T, model: T, year: T, plate: T, address: T, area: N, purchase_date: D, purchase_price: N, market_value: N, value_date: D, paid_before: N, fipe_type: T, fipe_code: T, fipe_year: T, owner_id: I, notes: T, active: B } },
  accounts: { tabela: 'contas_bancarias', cols: { bank: T, name: T, preset: T, opening_balance: N, opening_date: D, owner_id: I, salary_day: I, notes: T, active: B, color: T } },
  moves: { tabela: 'movimentos_conta', perm: 'launch', cols: { account_id: I, amount: N, date: D, kind: T, note: T } },
  banks: { tabela: 'bancos', perm: 'settings', cols: { bank: T, label: T, color: T, color2: T, fg: T, tier: T, aliases: T, source: T, slug: T } },
  people: { tabela: 'pessoas', perm: 'settings', cols: { name: T, salary: N, color: T } },
  reserve: { tabela: 'movimentos_caixinha', perm: 'launch', cols: { savings_id: I, amount: N, date: D, note: T } },
  projects: { tabela: 'projetos', cols: { name: T, description: T, monthly_amount: N, budget_total: N, status: T, start_month: T, end_month: T, asset_id: I } },
};

// converte o corpo do formulário para as colunas da tabela
export function limpar(cfg, body, editando) {
  const o = {};
  for (const [k, tipo] of Object.entries(cfg.cols)) {
    if (!(k in body)) continue;
    let v = body[k];
    if (tipo === B) { o[k] = v === true || v === 1 || v === '1' || v === 'on' || v === 'true'; continue; }
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) { o[k] = null; continue; }
    if (tipo === N) { v = Number(String(v).replace(',', '.')); o[k] = Number.isFinite(v) ? v : null; continue; }
    if (tipo === I) { v = parseInt(v, 10); o[k] = Number.isFinite(v) ? v : null; continue; }
    o[k] = String(v).trim();
  }
  if (!editando) for (const [k, v] of Object.entries(o)) if (v === null) delete o[k];
  return o;
}
