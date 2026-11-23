# Plano: OpenClaw do zero, só para o Casa em Dia (WhatsApp)

> Para a sessão do Claude que roda **dentro do ZimaOS**. Combinado com o Diego em 23/11/2026.
> Comandos conferidos em docs.openclaw.ai (cli/reset, cli/agents, cli/mcp, channels/whatsapp, concepts/session).
> Confirme com o Diego antes de cada passo marcado com ⚠️.

## Objetivo
- Zerar o OpenClaw do servidor (container `openclaw`, imagem `ghcr.io/openclaw/openclaw:2026.9.6`, portas 18789 e 18790).
- Um agente só, a **Rai do Casa em Dia**, que atende os usuários do Casa em Dia pelo WhatsApp (chip dedicado).
- Sem e-mail, sem Google, sem agenda, sem rodar comandos. Só as ferramentas do Casa em Dia (MCP).
- Workspace com backup num **repositório novo** (ex.: `didefor/casa-em-dia-agente`, privado, criado pelo Diego).
- A Rai antiga fica quieta: o workspace dela já está no GitHub (`didefor/RAI`).

## 0. Antes de apagar (backup)
```bash
docker ps --format '{{.Names}}' | grep -i openclaw        # confirma o nome do container
docker exec -it openclaw sh                       # entra no container
openclaw --version
openclaw config file                                        # caminho do openclaw.json
openclaw backup create                                      # snapshot restaurável (ver docs.openclaw.ai/cli/backup)
```
- Copie o `openclaw.json` e o `.env` para fora do container (ex.: `/DATA/AppData/openclaw-backup-2026-11-23/`), sem mostrar segredos no chat.
- No workspace da Rai, faça um último `git push` para `didefor/RAI` (se houver mudança local).

## 1. ⚠️ Reset
```bash
openclaw reset --dry-run                                    # mostra o que vai ser apagado
openclaw reset --scope full --yes --non-interactive         # apaga config, credenciais, sessões e workspaces
```
`full` apaga o diretório de estado e os workspaces. Só rode depois do passo 0.

## 2. Configurar de novo
```bash
openclaw onboard            # escolher o provedor/modelo de IA (pedir ao Diego qual chave usar)
```
- Modelo: preferir um modelo forte em ferramentas (mexe com dinheiro). Modelos pequenos locais erram valor e conta.
- **Não** conectar e-mail, Google (gog), Tavily, navegador nem Telegram, a não ser que o Diego peça.

## 3. Workspace da Rai do Casa em Dia
- Arquivos prontos: repositório `didefor/RAI`, branch `claude/lucid-lamport-hge9p7`, pasta `agentes/casa-em-dia-whatsapp/`
  (`AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `openclaw-casa-em-dia.json5`, `README.md`).
- Copie `AGENTS.md`, `SOUL.md` e `IDENTITY.md` para o workspace padrão (`openclaw config file` / docs de workspace),
  e ligue o workspace ao repositório novo (`git init`, remote `didefor/casa-em-dia-agente`, push).
- `.gitignore` do workspace: `.env`, `*.log`, `node_modules/`, `media/`.

## 4. Configuração (`openclaw.json`)
Com um agente só, não precisa de `bindings`. Use do `openclaw-casa-em-dia.json5`:
- `mcp.servers.casaemdia` → `https://casa-em-dia-woad.vercel.app/mcp/whatsapp`, `streamable-http`,
  header `Authorization: "Bearer ${CASAEMDIA_AGENT_KEY}"`.
- Ferramentas negadas ao agente: `read, write, edit, apply_patch, exec, process, browser, canvas, nodes, cron, gateway, image`
  e as de sessões (`sessions_*`).
- `session.dmScope: "per-channel-peer"` (cada usuário numa conversa separada; obrigatório com vários usuários).
- `channels.whatsapp`: `dmPolicy: "open"`, `allowFrom: ["*"]`, `groupPolicy: "disabled"`, `selfChatMode: false`.
- `.env` do OpenClaw: `CASAEMDIA_AGENT_KEY=...` (o Diego tem a chave; nunca no git nem no chat).

## 5. WhatsApp do chip
```bash
openclaw plugins install @openclaw/whatsapp      # se faltar
openclaw channels login --channel whatsapp       # QR: celular do chip → Aparelhos conectados
openclaw gateway restart
openclaw mcp doctor casaemdia --probe
openclaw channels status
```

## 6. Teste com o Diego
1. Site → Meu perfil → WhatsApp → número → código.
2. Do WhatsApp do Diego, mandar `CASA <código>` para o chip → "WhatsApp ligado à conta de …".
3. "quanto sobra este mês?" e "gastei 10 de café no dinheiro" (confirmar "sim"). Conferir no site.
4. Passar o número do chip para configurar `WHATSAPP_NUMERO` na Vercel (projeto `casa-em-dia`).
