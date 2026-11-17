# Instruções para o Claude

- O site já está publicado: Vercel (projeto `casa-em-dia`, push na branch de produção publica) + Supabase (projeto `casa-em-dia`, ref `pbhiofsqpattnnhppaps`, São Paulo). Veja `README.md`.
- A interface é a original do Casa em Dia (ZimaOS) em `public/`. Mexa o mínimo nela; o comportamento novo vai na API (`lib/`).
- O sistema original roda em `https://zimaos-2.tailacf259.ts.net` (Tailscale Funnel) e o conector MCP `Casa_em_Dia` lê os dados dele: use para comparar números.
- Fale com o Diego em português, direto e curto. Commits pequenos em português.
- Nunca peça tokens ou senhas no chat: use `request_credential`. Nunca commite `.env*` nem a pasta `dados/`.
- Antes de mexer no banco em produção, apagar dados ou mudar configurações do Supabase/Vercel, confirme com o Diego.
- Mudanças no banco: crie um arquivo novo em `supabase/migrations/` (próximo número); não edite os já aplicados.
- Toda tabela nova precisa de `casa_id ... default public.casa_atual()` e da política RLS igual às outras.
- Depois de mudar código: `npm run build` precisa passar. Para testar aqui, rode o servidor com `NODE_USE_ENV_PROXY=1`.
