-- =====================================================================
-- 0005 · Gestão de usuários
--   * profiles ganha e-mail (espelho de auth.users, para listar sem service role)
--     e "active" (desativação lógica; o login é bloqueado via Auth Admin API).
--   * Usuário inativo perde escrita imediatamente (can_write / is_admin).
--   * O sistema nunca fica sem um administrador ativo.
-- =====================================================================

alter table profiles add column email text;
alter table profiles add column active boolean not null default true;
alter table profiles add column updated_at timestamptz not null default now();

update profiles p set email = u.email from auth.users u where u.id = p.id;

create index profiles_role_idx on profiles (role) where active;

create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Novo usuário: grava também o e-mail
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    new.email,
    case when exists (select 1 from public.profiles) then 'operador'::user_role else 'admin'::user_role end
  );
  return new;
end $$;

-- Mantém o e-mail sincronizado quando muda no Auth
create or replace function handle_user_email_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function handle_user_email_change();

-- Permissões passam a exigir usuário ativo
create or replace function can_write() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select active and role in ('admin', 'operador') from profiles where id = auth.uid()), false)
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select active and role = 'admin' from profiles where id = auth.uid()), false)
$$;

-- Guarda de perfil: papel e situação só por admin; nunca zerar administradores
create or replace function profiles_guard_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = SQL Editor / service role (administração direta)
  if auth.uid() is not null and not is_admin()
     and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'Somente administradores alteram papéis e situação de usuários.';
  end if;

  if new.email is distinct from old.email and auth.uid() is not null then
    raise exception 'O e-mail é alterado pela autenticação, não pelo perfil.';
  end if;

  if old.role = 'admin' and old.active
     and (new.role <> 'admin' or not new.active)
     and not exists (select 1 from profiles where role = 'admin' and active and id <> old.id) then
    raise exception 'É preciso manter pelo menos um administrador ativo.';
  end if;
  return new;
end $$;

-- Colunas editáveis pelo cliente (RLS limita a admin ou o próprio usuário)
grant update (active) on profiles to authenticated;

-- Painel de usuários: atividade derivada das movimentações (sem duplicar dados)
create view v_users with (security_invoker = true) as
select p.id, p.full_name, p.email, p.role, p.active, p.created_at,
       (select count(*) from artwork_movements m where m.user_id = p.id)::int as movements,
       (select max(m.occurred_at) from artwork_movements m where m.user_id = p.id) as last_movement_at
  from profiles p;
