"""Converte um backup SQLite do Casa em Dia/FinanCerto em JSON para o importar.mjs.
Uso: python3 scripts/sqlite_para_json.py backup.db dados/export.json
Mapeia nomes de tabelas em inglês para os nomes novos quando necessário (ajuste MAPA se preciso)."""
import json, sqlite3, sys

MAPA = {  # nome no backup -> nome no banco novo (preencha se os nomes forem diferentes)
    'people': 'pessoas', 'accounts': 'contas_bancarias', 'cards': 'cartoes', 'bills': 'contas_fixas',
    'card_purchases': 'compras_cartao', 'transactions': 'lancamentos', 'savings': 'caixinhas',
    'savings_moves': 'movimentos_caixinha', 'loans': 'emprestimos', 'loan_payments': 'pagamentos_emprestimo',
    'account_moves': 'movimentos_conta', 'recurring': 'recorrentes', 'subscriptions': 'assinaturas',
    'incomes': 'receitas', 'income_receipts': 'recebimentos', 'pantry_products': 'produtos_despensa',
    'assets': 'bens', 'banks': 'bancos', 'projects': 'projetos',
}
db = sqlite3.connect(sys.argv[1]); db.row_factory = sqlite3.Row
out = {}
for (t,) in db.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%'"):
    out[MAPA.get(t, t)] = [dict(r) for r in db.execute(f'select * from "{t}"')]
    print(f'{t} -> {MAPA.get(t, t)}: {len(out[MAPA.get(t, t)])}')
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1, default=str)
