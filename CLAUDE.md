# Instruções para o Claude

- Se o site ainda não está publicado (sem projeto Supabase/Vercel configurado), siga `COMECE-AQUI.md` passo a passo.
- Fale com o Diego em português, direto e curto. Commits pequenos em português.
- Nunca peça tokens ou senhas no chat: use `request_credential`. Nunca commite `.env*` nem a pasta `dados/`.
- Antes de mexer no banco em produção, apagar dados ou mudar configurações do Supabase/Vercel, confirme com o Diego.
- Mudanças no banco: crie um arquivo novo em `supabase/migrations/` (`0003_...sql`); não edite os já aplicados.
- Toda tabela nova precisa de `casa_id ... default public.casa_atual()` e da política RLS igual às outras.
- Depois de mudar código: `npm run build` precisa passar.
