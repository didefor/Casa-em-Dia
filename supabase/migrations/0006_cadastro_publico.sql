-- Casa em Dia — cadastro aberto pela página inicial.
-- Quem cria conta ganha uma casa nova, vazia, e vira administrador dela (depois convida quem divide a casa em Acessos).

create or replace function public.criar_conta(p_nome text, p_login text, p_senha text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_login text := lower(trim(coalesce(p_login, '')));
begin
  if length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'Informe seu nome'; end if;
  if v_login !~ '^[a-z0-9._@+-]{3,60}$' then raise exception 'O login precisa ter de 3 a 60 letras, números, ponto ou traço, sem espaço'; end if;
  if v_login like 'ia-%' then raise exception 'Escolha outro login'; end if;
  -- freio simples contra robôs: no máximo 30 contas novas por hora no sistema todo
  if (select count(*) from auth.users where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Muitos cadastros agora. Tente de novo daqui a pouco.';
  end if;
  perform public._criar_usuario(v_login, p_senha, trim(p_nome), '{}'::jsonb);
end $$;
grant execute on function public.criar_conta(text, text, text) to anon, authenticated;
