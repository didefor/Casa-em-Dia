-- Casa em Dia — fecha funções internas para chamadas externas (avisos do Supabase Advisor)
-- ao_criar_usuario só roda como gatilho do cadastro; ninguém precisa chamá-la pela API.
revoke execute on function public.ao_criar_usuario() from public, anon, authenticated;
-- casa_atual é usada pelas regras de acesso de quem está logado; visitante não precisa.
revoke execute on function public.casa_atual() from public, anon;
grant execute on function public.casa_atual() to authenticated;
