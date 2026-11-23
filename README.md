# Casa em Dia — versão nuvem

Finanças da casa do Diego e da Kyaren. É a **mesma interface do Casa em Dia do ZimaOS**
(`public/index.html`, `public/app.js`, `public/styles.css`), rodando na **Vercel**, com o
servidor reescrito em Next.js (`/api/...`) gravando no **Supabase**.

## Como está montado
| Caminho | O que tem |
|---|---|
| `public/` | Interface original (JavaScript puro). Só 3 mudanças: tirou "Uso do servidor" e "Bancos conectados" do menu, texto do Backup e carregar as cores dos bancos antes de desenhar. |
| `app/api/[...path]/route.js` | Porta de entrada de todas as chamadas `/api/...` |
| `lib/api.js` | Rotas: login, resumo, pagar, receber, cadastros, acessos, avisos… |
| `lib/calc.js` | Cálculos: contas a pagar, faturas, saldos das contas, divisão da casa, receitas, empréstimos, caixinhas, bens |
| `lib/despensa.js` | Despensa (estoque, consumo, lista de compras, preços) |
| `lib/recursos.js` | Cadastros genéricos: recurso da API → tabela e colunas |
| `supabase/migrations/` | Banco. Cada casa só vê os próprios dados (RLS por `casa_id`). |

## Login
O login é o da tela original (login + senha). Por trás, o Supabase Auth entra por e-mail: login sem `@`
vira `login@casa-em-dia.local`. Acessos são criados pelo administrador em **Acessos**, por funções do banco
(`criar_acesso`, `alterar_acesso`, `excluir_acesso`), sem precisar da chave secreta do Supabase.

## WhatsApp (agente Rai no OpenClaw)
- O usuário liga o número em **Meu perfil → WhatsApp** e manda o código `CASA 123456` para o agente.
- O agente usa o MCP `/mcp/whatsapp` com `Authorization: Bearer <WHATSAPP_AGENT_KEY>` e passa `telefone` em toda chamada.
- O site cria uma chave de IA só para aquele número e guarda cifrada (AES-GCM, `WHATSAPP_CHAVE_MESTRA`, só na Vercel).
- Variáveis na Vercel: `WHATSAPP_AGENT_KEY`, `WHATSAPP_CHAVE_MESTRA` (sensíveis) e `WHATSAPP_NUMERO` (número do chip, opcional).
- O hash da chave do agente também fica na tabela `segredos` (as funções do banco conferem).
- Configuração do agente: repositório `didefor/RAI`, pasta `agentes/casa-em-dia-whatsapp/`.

## Ainda não ligado na nuvem
Bancos conectados (Open Finance), notificações push no celular, Conectar IA (MCP), login em 2 etapas,
importar o `.json` pela tela. Os avisos do sininho funcionam ("Verificar agora" em Notificações).

## Rodar no computador
```bash
npm install
cp .env.example .env.local   # URL e chave pública do Supabase
npm run dev
```

## Variáveis de ambiente
| Nome | O que é |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública (publishable) |
