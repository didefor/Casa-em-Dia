// Lê os dados da casa de quem está logado (as regras do banco já filtram pela casa).

export async function tudo(s, nome, { cols = '*', ordem = 'id', filtro } = {}) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    let q = s.from(nome).select(cols).order(ordem).range(de, de + 999);
    if (filtro) q = filtro(q);
    const { data, error } = await q;
    if (error) throw new Error(`${nome}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

const n = (v) => (v === null || v === undefined || v === '' ? v : Number(v));
// numeric do Postgres chega como texto em alguns casos: normaliza
const NUM = ['amount', 'salary', 'total', 'opening_balance', 'limit_total', 'goal', 'monthly', 'principal', 'installment',
  'bank_balance', 'market_value', 'purchase_price', 'paid_before', 'area', 'qty', 'min_qty', 'unit_price', 'prev_qty',
  'monthly_amount', 'budget_total', 'amount_original', 'value', 'daily_budget', 'housing_ref', 'reserve_goal'];
const norm = (rows) => rows.map((r) => { for (const k of NUM) if (k in r) r[k] = n(r[k]); return r; });

export async function carregar(s) {
  const t = (nome, o) => tudo(s, nome, o).then(norm);
  const [pessoas, contas, cartoes, fixas, compras, caixinhas, movCx, emprestimos, pagEmp, movConta, recorrentes,
    assinaturas, receitas, recValores, recebimentos, lancamentos, pagamentos, ajustesArr, ocorrencias, acertos,
    bens, valoresBem, projetos, membros] = await Promise.all([
    t('pessoas'), t('contas_bancarias'), t('cartoes'), t('contas_fixas'), t('compras_cartao'), t('caixinhas'),
    t('movimentos_caixinha'), t('emprestimos'), t('pagamentos_emprestimo'), t('movimentos_conta'), t('recorrentes'),
    t('assinaturas'), t('receitas'), t('receitas_valores'), t('recebimentos'),
    t('lancamentos', { cols: 'id,date,description,amount,type,category,person_id,account_id,asset_id,kind' }),
    t('pagamentos'), t('ajustes', { ordem: 'casa_id' }), t('ajustes_ocorrencia'), t('acertos'), t('bens'), t('valores_bem'),
    t('projetos'), t('membros', { cols: 'id,user_id,nome,foto,login,nivel' }),
  ]);
  return {
    pessoas, contas, cartoes, fixas, compras, caixinhas, movCx, emprestimos, pagEmp, movConta, recorrentes, assinaturas,
    receitas, recValores, recebimentos, lancamentos, pagamentos, ocorrencias, acertos, bens, valoresBem, projetos, membros,
    ajustes: ajustesArr[0] || { daily_budget: 0, housing_ref: 30, split_mode: 'proporcional', reserve_goal: 0 },
  };
}
