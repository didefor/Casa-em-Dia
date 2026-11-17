-- Casa em Dia — chaves de acesso para IA (Conectar IA / MCP).
-- Cada chave é um login interno escondido, na mesma casa e com o mesmo nível de quem criou.
-- A própria chave é a senha desse login (guardada só como hash pelo Supabase Auth).

alter table public.membros
  add column token boolean not null default false,
  add column token_prefixo text,
  add column ultimo_uso timestamptz;

create or replace function public.ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_casa uuid;
  v_pessoa bigint;
  v_nome text := coalesce(nullif(new.raw_user_meta_data->>'nome',''), split_part(new.email,'@',1));
  v_login text := coalesce(nullif(new.raw_app_meta_data->>'login',''), split_part(new.email,'@',1));
  v_nivel text := coalesce(nullif(new.raw_app_meta_data->>'nivel',''), 'admin');
begin
  if (new.raw_app_meta_data ? 'token') then
    insert into membros (casa_id, user_id, papel, login, nome, nivel, criado_por, token, token_prefixo, onboarded)
      values ((new.raw_app_meta_data->>'casa_id')::uuid, new.id, 'membro', v_login, v_nome, v_nivel,
              (new.raw_app_meta_data->>'criado_por')::uuid, true, new.raw_app_meta_data->>'prefixo', true);
    return new;
  end if;
  if (new.raw_app_meta_data ? 'casa_id') then
    v_casa := (new.raw_app_meta_data->>'casa_id')::uuid;
    v_pessoa := nullif(new.raw_app_meta_data->>'pessoa_id','')::bigint;
    insert into membros (casa_id, user_id, papel, login, nome, nivel, criado_por)
      values (v_casa, new.id, 'membro', v_login, v_nome, v_nivel, nullif(new.raw_app_meta_data->>'criado_por','')::uuid);
    if v_pessoa is not null then
      update pessoas set user_id = new.id, email = new.email where id = v_pessoa and casa_id = v_casa;
    else
      insert into pessoas (casa_id, name, user_id, email, color) values (v_casa, v_nome, new.id, new.email, '#f43f5e');
    end if;
  else
    insert into casas (nome) values (coalesce(nullif(new.raw_user_meta_data->>'casa',''), 'Casa de ' || v_nome))
      returning id into v_casa;
    insert into membros (casa_id, user_id, papel, login, nome, nivel)
      values (v_casa, new.id, 'dono', v_login, v_nome, 'admin');
    insert into ajustes (casa_id) values (v_casa);
    insert into pessoas (casa_id, name, user_id, email, color) values (v_casa, v_nome, new.id, new.email, '#2563eb');
    insert into bancos (casa_id, slug, bank, label, color, color2, fg, tier, aliases, source)
      select v_casa, slug, bank, label, color, color2, fg, tier, aliases, source from bancos_modelo;
  end if;
  return new;
end $$;
revoke execute on function public.ao_criar_usuario() from public, anon, authenticated;

-- chave de IA não administra acessos
create or replace function public.sou_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where user_id = auth.uid() and nivel = 'admin' and ativo and not token)
$$;

-- cria uma chave para quem está logado (a chave é gerada pelo servidor do site e só aparece uma vez)
create or replace function public.criar_chave_ia(p_nome text, p_chave text) returns bigint
language plpgsql security definer set search_path = public, auth as $$
declare me membros; v_uid uuid; v_id bigint;
begin
  select * into me from membros where user_id = auth.uid() and ativo and not token;
  if me.user_id is null then raise exception 'Só uma pessoa logada cria chaves'; end if;
  if length(coalesce(p_chave, '')) < 24 then raise exception 'Chave inválida'; end if;
  v_uid := public._criar_usuario('ia-' || left(p_chave, 10), p_chave, coalesce(nullif(trim(p_nome), ''), 'Chave de IA'),
    jsonb_build_object('token', true, 'casa_id', me.casa_id, 'nivel', me.nivel, 'criado_por', auth.uid(), 'prefixo', left(p_chave, 10)));
  select id into v_id from membros where user_id = v_uid;
  return v_id;
end $$;
grant execute on function public.criar_chave_ia(text, text) to authenticated;

-- revoga: quem criou ou o administrador
create or replace function public.revogar_chave_ia(p_id bigint) returns void
language plpgsql security definer set search_path = public, auth as $$
declare m membros;
begin
  select * into m from membros where id = p_id and token and casa_id = public.casa_atual();
  if m.user_id is null then raise exception 'Chave não encontrada'; end if;
  if m.criado_por <> auth.uid() and not public.sou_admin() then raise exception 'Só quem criou a chave ou o administrador pode revogar'; end if;
  delete from auth.users where id = m.user_id;
end $$;
grant execute on function public.revogar_chave_ia(bigint) to authenticated;

-- registra o último uso da chave (chamado com a sessão da própria chave)
create or replace function public.chave_usada() returns void
language sql security definer set search_path = public as $$
  update membros set ultimo_uso = now() where user_id = auth.uid() and token
$$;
grant execute on function public.chave_usada() to authenticated;

-- quem criou a chave some → a chave some junto
create or replace function public.ao_apagar_usuario() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id in (select user_id from membros where token and criado_por = old.id);
  return old;
end $$;
revoke execute on function public.ao_apagar_usuario() from public, anon, authenticated;
create trigger ao_apagar_usuario before delete on auth.users for each row execute function public.ao_apagar_usuario();
