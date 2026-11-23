-- Casa em Dia — entrar com a conta Google.
-- Quem entra pelo Google pela primeira vez ganha a própria casa (igual ao "Criar conta"),
-- com o e-mail como login e o nome e a foto que o Google envia.

create or replace function public.ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_casa uuid;
  v_pessoa bigint;
  v_google boolean := coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'email';
  v_nome text := coalesce(nullif(new.raw_user_meta_data->>'nome',''), nullif(new.raw_user_meta_data->>'full_name',''),
                          nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1));
  v_login text := case when v_google then lower(new.email)
                       else coalesce(nullif(new.raw_app_meta_data->>'login',''), split_part(new.email,'@',1)) end;
  v_foto text := case when v_google then nullif(coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'), '') end;
  v_nivel text := coalesce(nullif(new.raw_app_meta_data->>'nivel',''), 'admin');
begin
  if (new.raw_app_meta_data ? 'token') then
    insert into membros (casa_id, user_id, papel, login, nome, nivel, criado_por, token, token_prefixo, onboarded)
      values ((new.raw_app_meta_data->>'casa_id')::uuid, new.id, 'membro', v_login, v_nome, v_nivel,
              (new.raw_app_meta_data->>'criado_por')::uuid, true, new.raw_app_meta_data->>'prefixo', true);
    return new;
  end if;
  -- login repetido (ex.: alguém já usa esse e-mail como login): acrescenta um número
  if exists (select 1 from membros where lower(login) = lower(v_login)) then
    v_login := v_login || '-' || substr(new.id::text, 1, 4);
  end if;
  if (new.raw_app_meta_data ? 'casa_id') then
    v_casa := (new.raw_app_meta_data->>'casa_id')::uuid;
    v_pessoa := nullif(new.raw_app_meta_data->>'pessoa_id','')::bigint;
    insert into membros (casa_id, user_id, papel, login, nome, nivel, criado_por, foto)
      values (v_casa, new.id, 'membro', v_login, v_nome, v_nivel, nullif(new.raw_app_meta_data->>'criado_por','')::uuid, v_foto);
    if v_pessoa is not null then
      update pessoas set user_id = new.id, email = new.email where id = v_pessoa and casa_id = v_casa;
    else
      insert into pessoas (casa_id, name, user_id, email, color) values (v_casa, v_nome, new.id, new.email, '#f43f5e');
    end if;
  else
    insert into casas (nome) values (coalesce(nullif(new.raw_user_meta_data->>'casa',''), 'Casa de ' || split_part(v_nome, ' ', 1)))
      returning id into v_casa;
    insert into membros (casa_id, user_id, papel, login, nome, nivel, foto)
      values (v_casa, new.id, 'dono', v_login, v_nome, 'admin', v_foto);
    insert into ajustes (casa_id) values (v_casa);
    insert into pessoas (casa_id, name, user_id, email, color) values (v_casa, v_nome, new.id, new.email, '#2563eb');
    insert into bancos (casa_id, slug, bank, label, color, color2, fg, tier, aliases, source)
      select v_casa, slug, bank, label, color, color2, fg, tier, aliases, source from bancos_modelo;
  end if;
  return new;
end $$;
revoke execute on function public.ao_criar_usuario() from public, anon, authenticated;
