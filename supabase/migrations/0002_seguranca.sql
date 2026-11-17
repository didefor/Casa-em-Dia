-- Casa em Dia (versão nuvem) — segurança
-- Regra única: cada pessoa logada só vê e mexe nos dados da própria casa.

-- ============ Regras de acesso (RLS) ============
do $$
declare t text;
begin
  foreach t in array array[
    'ajustes','pessoas','bancos','bens','contas_bancarias','cartoes','contas_fixas','compras_cartao',
    'caixinhas','movimentos_caixinha','emprestimos','pagamentos_emprestimo','movimentos_conta',
    'recorrentes','assinaturas','receitas','lancamentos','recebimentos','produtos_despensa',
    'compras_despensa','projetos','pagamentos'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "casa_%s" on public.%I for all to authenticated
                    using (casa_id = public.casa_atual()) with check (casa_id = public.casa_atual())', t, t);
  end loop;
end $$;

alter table public.casas enable row level security;
create policy "ver_minha_casa" on public.casas for select to authenticated using (id = public.casa_atual());
create policy "renomear_minha_casa" on public.casas for update to authenticated
  using (id = public.casa_atual()) with check (id = public.casa_atual());

alter table public.membros enable row level security;
create policy "ver_membros" on public.membros for select to authenticated using (casa_id = public.casa_atual());
-- inserir/remover membros: só pelo servidor (chave service_role), nas telas de Pessoas.

-- ============ Cadastro sem aprovação ============
-- Quem se cadastra sozinho ganha uma casa nova, com a própria pessoa já criada.
-- Quem é criado por alguém da casa (tela Pessoas) entra direto naquela casa.
-- A casa de destino vem de app_metadata, que só o servidor consegue gravar (não dá para forjar no cadastro).
create or replace function public.ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_casa uuid;
  v_pessoa bigint;
  v_nome text := coalesce(nullif(new.raw_user_meta_data->>'nome',''), split_part(new.email,'@',1));
begin
  if (new.raw_app_meta_data ? 'casa_id') then
    v_casa := (new.raw_app_meta_data->>'casa_id')::uuid;
    v_pessoa := nullif(new.raw_app_meta_data->>'pessoa_id','')::bigint;
    insert into membros (casa_id, user_id, papel) values (v_casa, new.id, 'membro');
    if v_pessoa is not null then
      update pessoas set user_id = new.id, email = new.email where id = v_pessoa and casa_id = v_casa;
    else
      insert into pessoas (casa_id, name, user_id, email) values (v_casa, v_nome, new.id, new.email);
    end if;
  else
    insert into casas (nome) values (coalesce(nullif(new.raw_user_meta_data->>'casa',''), 'Casa de ' || v_nome))
      returning id into v_casa;
    insert into membros (casa_id, user_id, papel) values (v_casa, new.id, 'dono');
    insert into ajustes (casa_id) values (v_casa);
    insert into pessoas (casa_id, name, user_id, email) values (v_casa, v_nome, new.id, new.email);
  end if;
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.ao_criar_usuario();

-- ============ Utilidades para a migração (só service_role) ============
-- Depois de importar dados com ids fixos, acerta os contadores de id.
create or replace function public.ajustar_sequencias() returns void
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  foreach t in array array[
    'pessoas','bancos','bens','contas_bancarias','cartoes','contas_fixas','compras_cartao',
    'caixinhas','movimentos_caixinha','emprestimos','pagamentos_emprestimo','movimentos_conta',
    'recorrentes','assinaturas','receitas','lancamentos','recebimentos','produtos_despensa',
    'compras_despensa','projetos','pagamentos'
  ] loop
    execute format('select setval(pg_get_serial_sequence(%L,''id''), coalesce((select max(id) from public.%I),0)+1, false)',
                   'public.'||t, t);
  end loop;
end $$;
revoke all on function public.ajustar_sequencias() from public, anon, authenticated;
grant execute on function public.ajustar_sequencias() to service_role;
