// Descrição das telas de cadastro (uma tela genérica serve todas).
// tipo: text | number | int | bool | date | month | textarea | ref:<tabela> | sel:<op1,op2>
// lista: true = aparece como coluna na listagem

const dono = { c: 'owner_id', l: 'Dono', t: 'ref:pessoas', lista: true };
const conta = (l = 'Conta') => ({ c: 'account_id', l, t: 'ref:contas_bancarias' });
const bem = { c: 'asset_id', l: 'Bem ligado', t: 'ref:bens' };
const ativo = { c: 'active', l: 'Ativo', t: 'bool', padrao: true };
const obs = { c: 'notes', l: 'Observações', t: 'textarea' };

export const TABELAS = {
  lancamentos: {
    titulo: 'Lançamentos', item: 'lançamento', grupo: 'Dinheiro', oculto: true,
    campos: [
      { c: 'date', l: 'Data', t: 'date', obrig: true, lista: true },
      { c: 'description', l: 'Descrição', t: 'text', lista: true },
      { c: 'amount', l: 'Valor', t: 'number', obrig: true, lista: true },
      { c: 'type', l: 'Tipo', t: 'sel:saida,entrada', obrig: true, lista: true },
      { c: 'category', l: 'Categoria', t: 'text', lista: true },
      { c: 'account_id', l: 'Conta (vazio = dinheiro)', t: 'ref:contas_bancarias' },
      { c: 'person_id', l: 'Pessoa', t: 'ref:pessoas' },
      { c: 'kind', l: 'Natureza', t: 'sel:normal,transferencia,caixinha,pagamento,pagamento_fatura', padrao: 'normal', ajuda: 'transferência e caixinha não contam como renda nem gasto' },
      bem,
    ],
  },
  contas_bancarias: {
    titulo: 'Contas bancárias', item: 'conta', grupo: 'Dinheiro',
    campos: [
      { c: 'name', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'bank', l: 'Banco', t: 'text', lista: true },
      dono,
      { c: 'opening_balance', l: 'Saldo inicial', t: 'number', lista: true },
      { c: 'opening_date', l: 'Data do saldo inicial', t: 'date' },
      { c: 'salary_day', l: 'Dia do salário', t: 'int' },
      { c: 'color', l: 'Cor', t: 'color' }, ativo, obs,
    ],
  },
  cartoes: {
    titulo: 'Cartões', item: 'cartão', grupo: 'Dinheiro',
    campos: [
      { c: 'name', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'bank', l: 'Banco', t: 'text' },
      dono,
      { c: 'limit_total', l: 'Limite', t: 'number', lista: true },
      { c: 'closing_day', l: 'Dia do fechamento', t: 'int', lista: true },
      { c: 'due_day', l: 'Dia do vencimento', t: 'int', lista: true },
      { c: 'network', l: 'Bandeira', t: 'text' },
      { c: 'kind', l: 'Tipo', t: 'sel:credito,debito,beneficio' },
      conta('Conta do débito automático'),
      { c: 'auto_debit', l: 'Débito automático', t: 'bool' },
      { c: 'color', l: 'Cor', t: 'color' },
    ],
  },
  compras_cartao: {
    titulo: 'Compras no cartão', item: 'compra', grupo: 'Dinheiro',
    campos: [
      { c: 'card_id', l: 'Cartão', t: 'ref:cartoes', obrig: true, lista: true },
      { c: 'description', l: 'Descrição', t: 'text', lista: true },
      { c: 'total', l: 'Valor total', t: 'number', obrig: true, lista: true },
      { c: 'installments', l: 'Parcelas', t: 'int', padrao: 1, lista: true },
      { c: 'first_month', l: 'Primeira fatura', t: 'month', obrig: true, lista: true },
      { c: 'category', l: 'Categoria', t: 'text' },
      bem,
    ],
  },
  contas_fixas: {
    titulo: 'Contas fixas', item: 'conta fixa', grupo: 'Contas',
    campos: [
      { c: 'name', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'amount', l: 'Valor', t: 'number', obrig: true, lista: true },
      { c: 'due_day', l: 'Dia do vencimento', t: 'int', lista: true },
      { c: 'kind', l: 'Tipo', t: 'sel:casa,pessoal', padrao: 'casa', lista: true, ajuda: 'casa = dividida entre o casal' },
      dono,
      conta('Conta que paga'),
      { c: 'is_housing', l: 'É moradia', t: 'bool' },
      { c: 'is_reserve', l: 'É reserva', t: 'bool' },
      { c: 'start_month', l: 'Início', t: 'month' },
      { c: 'end_month', l: 'Fim', t: 'month' },
      bem, ativo, obs,
    ],
  },
  assinaturas: {
    titulo: 'Assinaturas', item: 'assinatura', grupo: 'Contas',
    campos: [
      { c: 'name', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'platform', l: 'Plataforma', t: 'text' },
      { c: 'plan', l: 'Plano', t: 'text' },
      { c: 'amount', l: 'Valor (R$)', t: 'number', obrig: true, lista: true },
      { c: 'cycle', l: 'Ciclo', t: 'sel:mensal,trimestral,semestral,anual', padrao: 'mensal', lista: true },
      { c: 'day', l: 'Dia da cobrança', t: 'int', lista: true },
      { c: 'method', l: 'Forma', t: 'sel:cartao,pix,debito,boleto,dinheiro', padrao: 'cartao' },
      { c: 'card_id', l: 'Cartão', t: 'ref:cartoes' },
      conta(), dono,
      { c: 'category', l: 'Categoria', t: 'text' },
      { c: 'currency', l: 'Moeda', t: 'text', padrao: 'BRL' },
      { c: 'amount_original', l: 'Valor na moeda original', t: 'number' },
      { c: 'start_month', l: 'Início', t: 'month' },
      { c: 'end_month', l: 'Fim', t: 'month' },
      { c: 'url', l: 'Link', t: 'text' }, ativo, obs,
    ],
  },
  emprestimos: {
    titulo: 'Empréstimos', item: 'empréstimo', grupo: 'Contas',
    campos: [
      { c: 'name', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'lender', l: 'Credor', t: 'text', lista: true },
      { c: 'principal', l: 'Valor pego', t: 'number' },
      { c: 'installment', l: 'Parcela', t: 'number', obrig: true, lista: true },
      { c: 'installments', l: 'Nº de parcelas', t: 'int', obrig: true, lista: true },
      { c: 'first_date', l: '1ª parcela', t: 'date', obrig: true },
      dono, conta('Conta que paga'), bem,
      { c: 'bank_balance', l: 'Saldo devedor no banco', t: 'number' },
      { c: 'bank_balance_date', l: 'Data do saldo devedor', t: 'date' },
      ativo, obs,
    ],
  },
  pagamentos_emprestimo: {
    titulo: 'Pagamentos de empréstimo', item: 'pagamento', grupo: 'Contas', oculto: true,
    campos: [
      { c: 'loan_id', l: 'Empréstimo', t: 'ref:emprestimos', obrig: true, lista: true },
      { c: 'date', l: 'Data', t: 'date', obrig: true, lista: true },
      { c: 'amount', l: 'Valor', t: 'number', obrig: true, lista: true },
      { c: 'installment_no', l: 'Parcela nº', t: 'int', lista: true },
      { c: 'kind', l: 'Tipo', t: 'sel:parcela,antecipacao', padrao: 'parcela' },
      { c: 'covers', l: 'Quantas parcelas quita', t: 'int', padrao: 1 },
      { c: 'note', l: 'Nota', t: 'text' },
    ],
  },
  receitas: {
    titulo: 'Receitas', item: 'receita', grupo: 'Renda',
    campos: [
      { c: 'name', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'payer', l: 'Quem paga', t: 'text', lista: true },
      { c: 'kind', l: 'Tipo', t: 'sel:salario,contrato,beneficio,freela,outro', lista: true },
      { c: 'amount', l: 'Valor do mês', t: 'number', obrig: true, lista: true },
      { c: 'amount_type', l: 'Valor', t: 'sel:fixo,variavel', padrao: 'fixo' },
      { c: 'cycle', l: 'Ciclo', t: 'sel:mensal,trimestral,semestral,anual,avulso', padrao: 'mensal' },
      { c: 'day', l: 'Dia que cai', t: 'int' },
      { c: 'installments_per_cycle', l: 'Vezes por ciclo', t: 'int', padrao: 1 },
      dono, conta('Conta que recebe'),
      { c: 'start_month', l: 'Início', t: 'month' },
      { c: 'end_month', l: 'Fim', t: 'month' },
      { c: 'total_months', l: 'Duração (meses)', t: 'int' },
      { c: 'renewal', l: 'Renovação', t: 'text' },
      { c: 'category', l: 'Categoria', t: 'text' }, ativo, obs,
    ],
  },
  recebimentos: {
    titulo: 'Recebimentos', item: 'recebimento', grupo: 'Renda', oculto: true,
    campos: [
      { c: 'income_id', l: 'Receita', t: 'ref:receitas', obrig: true, lista: true },
      { c: 'ref_month', l: 'Mês de referência', t: 'month', obrig: true, lista: true },
      { c: 'date', l: 'Data', t: 'date', obrig: true, lista: true },
      { c: 'amount', l: 'Valor', t: 'number', obrig: true, lista: true },
      conta(), { c: 'note', l: 'Nota', t: 'text' },
    ],
  },
  caixinhas: {
    titulo: 'Caixinhas (poupança)', item: 'caixinha', grupo: 'Guardar',
    campos: [
      { c: 'name', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'account', l: 'Onde fica guardado', t: 'text' },
      { c: 'goal', l: 'Meta', t: 'number', lista: true },
      { c: 'target_month', l: 'Mês da meta', t: 'month' },
      { c: 'monthly', l: 'Guardar por mês', t: 'number', lista: true },
      { c: 'day', l: 'Dia de guardar', t: 'int' },
      { c: 'from_account_id', l: 'Sai da conta', t: 'ref:contas_bancarias' },
      dono, { c: 'icon', l: 'Ícone (emoji)', t: 'text' }, { c: 'color', l: 'Cor', t: 'color' }, ativo,
    ],
  },
  movimentos_caixinha: {
    titulo: 'Movimentos das caixinhas', item: 'movimento', grupo: 'Guardar', oculto: true,
    campos: [
      { c: 'savings_id', l: 'Caixinha', t: 'ref:caixinhas', obrig: true, lista: true },
      { c: 'date', l: 'Data', t: 'date', obrig: true, lista: true },
      { c: 'amount', l: 'Valor (negativo = retirada)', t: 'number', obrig: true, lista: true },
      { c: 'note', l: 'Nota', t: 'text', lista: true },
    ],
  },
  movimentos_conta: {
    titulo: 'Ajustes de saldo', item: 'ajuste', grupo: 'Dinheiro', oculto: true,
    campos: [
      { c: 'account_id', l: 'Conta', t: 'ref:contas_bancarias', obrig: true, lista: true },
      { c: 'date', l: 'Data', t: 'date', obrig: true, lista: true },
      { c: 'amount', l: 'Valor (negativo = sai)', t: 'number', obrig: true, lista: true },
      { c: 'kind', l: 'Tipo', t: 'text' }, { c: 'note', l: 'Nota', t: 'text', lista: true },
    ],
  },
  recorrentes: {
    titulo: 'Gastos recorrentes', item: 'recorrente', grupo: 'Contas',
    campos: [
      { c: 'name', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'amount', l: 'Valor', t: 'number', lista: true },
      { c: 'frequency', l: 'Frequência', t: 'sel:diario,semanal,mensal', lista: true },
      { c: 'weekday', l: 'Dia da semana (0=dom)', t: 'int' },
      { c: 'day', l: 'Dia do mês', t: 'int' },
      { c: 'time', l: 'Horário', t: 'text' },
      { c: 'start_date', l: 'Início', t: 'date' }, { c: 'end_date', l: 'Fim', t: 'date' },
      conta(), dono, { c: 'category', l: 'Categoria', t: 'text' }, bem, ativo, obs,
    ],
  },
  bens: {
    titulo: 'Bens (patrimônio)', item: 'bem', grupo: 'Patrimônio',
    campos: [
      { c: 'name', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'kind', l: 'Tipo', t: 'sel:carro,moto,casa,terreno,outro', lista: true },
      { c: 'brand', l: 'Marca', t: 'text' }, { c: 'model', l: 'Modelo', t: 'text' },
      { c: 'year', l: 'Ano', t: 'text' }, { c: 'plate', l: 'Placa', t: 'text' },
      { c: 'address', l: 'Endereço', t: 'text' }, { c: 'area', l: 'Área (m²)', t: 'number' },
      { c: 'purchase_date', l: 'Data da compra', t: 'date' },
      { c: 'purchase_price', l: 'Valor de compra', t: 'number', lista: true },
      { c: 'paid_before', l: 'Já pago antes do sistema', t: 'number' },
      { c: 'market_value', l: 'Valor de mercado', t: 'number', lista: true },
      { c: 'value_date', l: 'Data do valor', t: 'date' },
      { c: 'fipe_type', l: 'FIPE tipo', t: 'text' }, { c: 'fipe_code', l: 'FIPE código', t: 'text' },
      { c: 'fipe_year', l: 'FIPE ano', t: 'text' },
      dono, ativo, obs,
    ],
  },
  projetos: {
    titulo: 'Projetos', item: 'projeto', grupo: 'Patrimônio',
    campos: [
      { c: 'name', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'description', l: 'Descrição', t: 'textarea' },
      { c: 'status', l: 'Situação', t: 'sel:ativo,pausado,concluido', padrao: 'ativo', lista: true },
      { c: 'monthly_amount', l: 'Valor por mês', t: 'number', lista: true },
      { c: 'budget_total', l: 'Orçamento total', t: 'number', lista: true },
      { c: 'start_month', l: 'Início', t: 'month' }, { c: 'end_month', l: 'Fim', t: 'month' }, bem,
    ],
  },
  produtos_despensa: {
    titulo: 'Produtos da despensa', item: 'produto', grupo: 'Casa', oculto: true,
    campos: [
      { c: 'name', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'category', l: 'Categoria', t: 'text', lista: true },
      { c: 'unit', l: 'Unidade', t: 'text', padrao: 'un' },
      { c: 'qty', l: 'Quantidade em casa', t: 'number', padrao: 0, lista: true },
      { c: 'min_qty', l: 'Mínimo', t: 'number', padrao: 0, lista: true },
      ativo, obs,
    ],
  },
  bancos: {
    titulo: 'Bancos (cores e nomes)', item: 'banco', grupo: 'Ajustes', oculto: true,
    campos: [
      { c: 'label', l: 'Nome', t: 'text', obrig: true, lista: true },
      { c: 'slug', l: 'Código', t: 'text', lista: true },
      { c: 'bank', l: 'Banco', t: 'text' },
      { c: 'color', l: 'Cor', t: 'color', lista: true }, { c: 'color2', l: 'Cor 2', t: 'color' },
      { c: 'fg', l: 'Cor do texto', t: 'color' }, { c: 'tier', l: 'Nível', t: 'text' },
      { c: 'aliases', l: 'Apelidos', t: 'text' },
    ],
  },
};

// texto usado para mostrar um registro em listas de seleção
export const rotulo = (tabela, r) =>
  r?.name ?? r?.label ?? r?.description ?? `#${r?.id}`;
