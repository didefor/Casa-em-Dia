# COMECE AQUI — roteiro para o Claude configurar tudo

> Este arquivo é para **o Claude** (na sessão nova). O Diego só precisa mandar o pacote e dizer
> "segue o COMECE-AQUI". O manual para pessoas é o `MANUAL.md`.

## O que é isto
Cópia do **Casa em Dia** (finanças da casa do Diego e da Kyaren, que hoje roda no servidor ZimaOS dele),
refeita para rodar na **Vercel** (site) com **Supabase** na nuvem (banco + login).

Stack: Next.js 16 (App Router, JavaScript, Server Actions) + `@supabase/ssr`. Sem TypeScript, sem Tailwind.
O build já foi testado (`next build` passa) e o SQL foi testado num Postgres 16 com simulação do `auth`
do Supabase (trigger de cadastro, RLS entre casas e remoção de login funcionando).

### Decisões do Diego para esta versão (não mudar sem perguntar)
- **Sem aprovação de cadastro**: quem cria conta entra direto e ganha a própria casa vazia.
- **Gerenciamento de pessoas** (tela *Pessoas*): ao adicionar uma pessoa, dá para **só cadastrar** (para
  dividir contas) **ou também criar o login dela** (e-mail + senha inicial). A pessoa entra direto na mesma casa.
  Também dá para criar o login depois ou remover o acesso.
- **Sem tela de uso do servidor/dados** e sem nada de administração do ZimaOS.
- Segurança: cada casa só enxerga os próprios dados (RLS por `casa_id`); a casa de destino de um login criado
  por outra pessoa vai em `app_metadata` (só o servidor grava, não dá para forjar no cadastro).

## Passo a passo

### 1. Repositório
1. Pergunte ao Diego o nome do repositório novo (sugestão: `didefor/casa-em-dia`) se ele não disse.
2. `add_repo` com `access: "push"`, clone, e copie o **conteúdo da pasta `casa-em-dia-nuvem/`** do zip para a **raiz** do repositório (sem a pasta
   `node_modules` e sem `.next`), commit em português (ex.: `inicial: Casa em Dia versão nuvem`) e push
   no branch que a sessão permitir.

### 2. Credenciais (nunca pedir no chat)
Use `request_credential` (formulário seguro; você nunca vê o valor):
- **Supabase** — host `api.supabase.com`, Bearer. Token em supabase.com → Account → Access Tokens.
- **Vercel** — host `api.vercel.com`, Bearer. Token em vercel.com → Account Settings → Tokens.

Se um CLI exigir token localmente, passe um valor falso (ex.: `--token dummy`): o proxy troca pelo real.

### 3. Supabase
Base: `https://api.supabase.com/v1`.
1. `GET /organizations` → pegue o `id`. Pergunte ao Diego se usa um projeto existente; se não, crie:
   `POST /projects` `{ "name": "casa-em-dia", "organization_id": "...", "region": "sa-east-1", "db_pass": "<aleatória forte>" }`.
   Gere a `db_pass` com `openssl rand -base64 24`, **não mostre no chat e não salve em arquivo**; diga ao
   Diego que, se um dia precisar da senha do banco, ele reseta no painel (Project Settings → Database).
2. Espere `GET /projects/{ref}` ficar `ACTIVE_HEALTHY`.
3. Rode as migrações, na ordem, com `POST /projects/{ref}/database/query` `{ "query": "<conteúdo do arquivo>" }`:
   `supabase/migrations/0001_estrutura.sql` e depois `0002_seguranca.sql`.
   Confira: `select count(*) from information_schema.tables where table_schema='public'` → 24.
4. Auth: `PATCH /projects/{ref}/config/auth` com
   `{ "mailer_autoconfirm": true, "disable_signup": false, "site_url": "<url da vercel>", "uri_allow_list": "<url da vercel>/**" }`
   (o `site_url` você atualiza depois do passo 4). `mailer_autoconfirm: true` porque o e-mail padrão do
   Supabase só manda para membros da equipe; sem isso ninguém consegue confirmar o cadastro.
5. Chaves: `GET /projects/{ref}/api-keys?reveal=true` → use a **anon/publishable** como
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` e a **service_role/secret** como `SUPABASE_SERVICE_ROLE_KEY`.
   URL: `https://{ref}.supabase.co`. Não escreva as chaves no chat nem em arquivos do repositório.

### 4. Vercel
Base: `https://api.vercel.com`.
1. Preferido (deploy automático a cada push): `POST /v11/projects`
   `{ "name": "casa-em-dia", "framework": "nextjs", "gitRepository": { "type": "github", "repo": "didefor/casa-em-dia" } }`.
   Se der erro de integração com o GitHub, peça ao Diego para, uma vez só, entrar em vercel.com → Add New →
   Project → Import Git Repository e autorizar o GitHub; ou faça deploy pela CLI
   (`npx vercel@latest deploy --prod --yes --token dummy`).
2. Variáveis: `POST /v10/projects/{id}/env?upsert=true` com target `["production","preview","development"]`:
   `NEXT_PUBLIC_SUPABASE_URL` (plain), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (plain),
   `SUPABASE_SERVICE_ROLE_KEY` (type `sensitive`, só production/preview).
3. Dispare o deploy (push no repo ou `POST /v13/deployments`) e espere `READY`.
4. Volte no passo 3.4 e grave `site_url` / `uri_allow_list` com a URL final (`https://casa-em-dia-xxx.vercel.app`).

### 5. Teste de fumaça (Playwright já instalado no ambiente)
Na URL publicada: criar conta de teste → cadastrar uma conta bancária e um cartão → lançar um gasto,
uma compra parcelada no cartão e uma transferência → em A pagar marcar e desfazer um pagamento →
em Pessoas adicionar uma pessoa **com** login, entrar com esse login em outra aba e ver os mesmos dados →
remover o acesso. Depois **apague os usuários de teste** (Management API ou `auth.admin.deleteUser` com a
service key) — a casa de teste some junto (cascata). Tire print no celular (390px) da Visão e do Lançar.

### 6. Migrar os dados do Casa em Dia antigo
Primeiro o Diego cria a conta dele no site novo (ou crie por ele, se pedir). Depois escolha a fonte:
- **Melhor: backup do FinanCerto** (no ZimaOS, `192.168.0.126:8420`, pasta em `/DATA/AppData/`). Peça o
  arquivo de backup. Se for SQLite: `python3 scripts/sqlite_para_json.py backup.db dados/export.json`
  (ajuste o `MAPA` de nomes de tabela se precisar). Se for dump Postgres/JSON, converta para
  `{ "pessoas": [...], "contas_bancarias": [...], ... }` com as colunas originais.
- **Plano B: conector MCP `Casa_em_Dia`** (`editar acao=listar tipo=<tabela>`; em `lancamentos` use
  `filtro=AAAA-MM` mês a mês porque a lista corta em ~50). Atenção: **descrições e observações longas vêm
  cortadas com "…"** — avise o Diego antes de usar este caminho.
Rode: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/importar.mjs dados/export.json email-do-diego`
(o script recusa se a casa já tiver lançamentos; `--forcar` ignora). Confira o resumo do mês no site novo contra
`ver o_que=resumo` do conector antigo e explique ao Diego as diferenças (o cálculo foi refeito; ver "Limites").
**Nunca** commite `dados/` (já está no `.gitignore`) — são dados financeiros.

### 7. Entregar
Mande ao Diego: link do site, o que foi testado, o que ficou pendente. Se o repositório `didefor/bill-c-rebro`
estiver na sessão, registre em `memory/areas/zimaos.md` (ou arquivo novo da área) a URL e o status, seguindo o
`AGENTS.md` de lá (atualizar o `MAPA.md`, commit em português).

## Limites conhecidos (contar ao Diego)
- O código original do Casa em Dia não estava disponível; esta versão foi **refeita** a partir da estrutura de
  dados e das regras do conector. Os números da Visão (renda prevista, sobra, acerto) seguem a mesma ideia, mas
  podem diferir um pouco do original. Ajustar em `lib/calculo.js`.
- "Esqueci a senha" depende de e-mail: com o SMTP padrão do Supabase só funciona para membros da equipe do projeto.
  Para valer para todos, configurar SMTP próprio (ex.: Resend ou Gmail) em Supabase → Auth → SMTP.
  Enquanto isso, quem esquecer pode ter o acesso removido e recriado na tela Pessoas.
- Supabase grátis **pausa o projeto após 7 dias sem uso**; é só reativar no painel (os dados ficam).
- Despensa: sem leitura de nota fiscal; recorrentes são só cadastro (não geram lançamento sozinhos).

## Mapa do código
| Caminho | O que tem |
|---|---|
| `supabase/migrations/` | `0001_estrutura.sql` (tabelas) e `0002_seguranca.sql` (RLS, cadastro sem aprovação, utilidades) |
| `proxy.js` | Renova sessão e manda para `/login` quem não está logado (Next 16 chama middleware de proxy) |
| `lib/supabase.js` | Clientes: `db()` (sessão do usuário, respeita RLS), `admin()` (service role, só servidor), `sessao()` |
| `lib/calculo.js` | A pagar, faturas por fechamento, saldos, resumo do mês, acerto do casal |
| `lib/tabelas.js` | Descrição dos cadastros (campos, tipos, rótulos) → telas genéricas em `app/(app)/c/` |
| `app/(app)/` | Telas: Visão, Lançamentos, A pagar, Renda, Despensa, Pessoas, Cadastros, Ajustes, Minha conta |
| `app/login/` | Entrar / Criar conta / Esqueci a senha |
| `app/exportar/` | Baixa todos os dados da casa em JSON (backup) |
| `scripts/` | `importar.mjs` (migração) e `sqlite_para_json.py` |
