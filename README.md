# Casa em Dia — versão nuvem

Finanças da casa (Next.js 16 + Supabase), pronto para a Vercel.

- **Para configurar** (Supabase, Vercel, migração de dados): veja [`COMECE-AQUI.md`](COMECE-AQUI.md).
- **Para usar:** veja [`MANUAL.md`](MANUAL.md).

## Rodar no computador
```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev
```
Antes, rode `supabase/migrations/0001_estrutura.sql` e `0002_seguranca.sql` no SQL Editor do Supabase.

## Variáveis de ambiente
| Nome | Onde | O que é |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + local | chave pública (anon/publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | só servidor | chave secreta; usada só para criar/remover logins na tela Pessoas |
