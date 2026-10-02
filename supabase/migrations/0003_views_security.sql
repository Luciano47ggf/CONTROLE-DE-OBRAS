-- =====================================================================
-- 0003 · Views de leitura (histórico derivado) + RLS + privilégios
-- Todas as views usam security_invoker para respeitar o RLS de quem consulta.
-- =====================================================================

-- Histórico completo de passagens (serve para obra E para cliente)
create view v_installation_history with (security_invoker = true) as
select i.id               as installation_id,
       i.artwork_id,
       a.code             as artwork_code,
       a.title            as artwork_title,
       a.photo_path       as artwork_photo,
       ar.name            as artist_name,
       i.space_id,
       s.name             as space_name,
       s.client_id,
       c.name             as client_name,
       i.installed_at,
       i.expected_swap_at,
       i.removed_at,
       i.responsible,
       i.notes,
       (i.removed_at is null) as is_active,
       (coalesce(i.removed_at, current_date) - i.installed_at) as days_on_site
  from installations i
  join artworks a       on a.id = i.artwork_id
  join artists ar       on ar.id = a.artist_id
  join client_spaces s  on s.id = i.space_id
  join clients c        on c.id = s.client_id;

-- Instalações ativas com semáforo de troca
create view v_active_installations with (security_invoker = true) as
select h.*,
       (h.expected_swap_at - current_date) as days_remaining,
       case
         when h.expected_swap_at < current_date                         then 'vermelho'
         when h.expected_swap_at - current_date <= st.swap_warning_days then 'amarelo'
         else 'verde'
       end as swap_status
  from v_installation_history h
  cross join app_settings st
 where h.is_active;

-- Obras com localização atual derivada
create view v_artworks with (security_invoker = true) as
select a.*,
       ar.name   as artist_name,
       cat.name  as category_name,
       (current_date - a.status_changed_at::date) as days_in_status,
       ai.installation_id as current_installation_id,
       ai.client_id       as current_client_id,
       ai.client_name     as current_client_name,
       ai.space_id        as current_space_id,
       ai.space_name      as current_space_name,
       ai.installed_at    as current_installed_at,
       ai.expected_swap_at as current_expected_swap_at,
       rs.name            as reserved_space_name,
       rc.id              as reserved_client_id,
       rc.name            as reserved_client_name
  from artworks a
  join artists ar            on ar.id = a.artist_id
  left join categories cat   on cat.id = a.category_id
  left join v_installation_history ai on ai.artwork_id = a.id and ai.is_active
  left join client_spaces rs on rs.id = a.reserved_space_id
  left join clients rc       on rc.id = rs.client_id;

-- Espaços com obra atual, semáforo e quantidade de obras compatíveis
create view v_spaces with (security_invoker = true) as
select s.*,
       c.name  as client_name,
       t.name  as space_type_name,
       ai.installation_id,
       ai.artwork_id,
       ai.artwork_code,
       ai.artwork_title,
       ai.artwork_photo,
       ai.artist_name,
       ai.installed_at,
       ai.expected_swap_at,
       ai.days_on_site,
       ai.days_remaining,
       ai.swap_status,
       aw.width_cm  as artwork_width_cm,
       aw.height_cm as artwork_height_cm,
       (select count(*)
          from artworks x
         where x.status = 'disponivel'
           and fits_space(x.width_cm, x.height_cm, s.width_cm, s.height_cm, st.edge_margin_cm)
       )::int as compatible_available
  from client_spaces s
  join clients c            on c.id = s.client_id
  cross join app_settings st
  left join space_types t   on t.id = s.space_type_id
  left join v_active_installations ai on ai.space_id = s.id
  left join artworks aw     on aw.id = ai.artwork_id;

-- Movimentações legíveis
create view v_movements with (security_invoker = true) as
select m.*,
       a.code  as artwork_code,
       a.title as artwork_title,
       s.name  as space_name,
       c.id    as client_id,
       c.name  as client_name,
       p.full_name as user_name
  from artwork_movements m
  join artworks a           on a.id = m.artwork_id
  left join client_spaces s on s.id = m.space_id
  left join clients c       on c.id = s.client_id
  left join profiles p      on p.id = m.user_id;

-- Indicadores do dashboard (uma linha)
create view v_dashboard with (security_invoker = true) as
select
  (select count(*) from artworks)                                   as total_artworks,
  (select count(*) from artworks where status = 'disponivel')       as available,
  (select count(*) from artworks where status = 'instalada')        as installed,
  (select count(*) from artworks where status in ('em_manutencao', 'em_restauracao')) as maintenance,
  (select count(*) from artworks where status = 'reservada')        as reserved,
  (select count(*) from artworks where status = 'em_transporte')    as in_transit,
  (select count(*) from clients where active)                       as active_clients,
  (select count(*) from client_spaces where active)                 as spaces,
  (select count(*) from v_active_installations where swap_status = 'amarelo')  as swaps_due_soon,
  (select count(*) from v_active_installations where swap_status = 'vermelho') as swaps_overdue;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table profiles              enable row level security;
alter table app_settings          enable row level security;
alter table categories            enable row level security;
alter table space_types           enable row level security;
alter table space_type_categories enable row level security;
alter table artists               enable row level security;
alter table clients               enable row level security;
alter table client_spaces         enable row level security;
alter table artworks              enable row level security;
alter table installations         enable row level security;
alter table artwork_movements     enable row level security;

-- Leitura: qualquer usuário autenticado
do $$
declare t text;
begin
  foreach t in array array['profiles','app_settings','categories','space_types','space_type_categories',
                           'artists','clients','client_spaces','artworks','installations','artwork_movements']
  loop
    execute format('create policy %I on %I for select to authenticated using (true)', t || '_read', t);
  end loop;
end $$;

-- Escrita de cadastros: admin e operador
do $$
declare t text;
begin
  foreach t in array array['categories','space_types','space_type_categories','artists','clients','client_spaces','artworks']
  loop
    execute format('create policy %I on %I for insert to authenticated with check (can_write())', t || '_insert', t);
    execute format('create policy %I on %I for update to authenticated using (can_write()) with check (can_write())', t || '_update', t);
    execute format('create policy %I on %I for delete to authenticated using (can_write())', t || '_delete', t);
  end loop;
end $$;

-- Ajustes de instalação (responsável, observação, adiar troca)
create policy installations_update on installations for update to authenticated
  using (can_write()) with check (can_write());

-- Configurações e perfis: só admin altera
create policy app_settings_update on app_settings for update to authenticated
  using (is_admin()) with check (is_admin());
create policy profiles_update on profiles for update to authenticated
  using (is_admin() or id = auth.uid()) with check (is_admin() or id = auth.uid());

-- ---------------------------------------------------------------------
-- Privilégios por coluna: status e histórico são intocáveis pelo cliente
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke update on artworks from authenticated;
grant  update (code, title, artist_id, category_id, description, technique, year,
               width_cm, height_cm, depth_cm, weight_kg, value, photo_path, notes)
  on artworks to authenticated;

revoke insert, update, delete on installations from authenticated;
grant  update (responsible, notes, expected_swap_at) on installations to authenticated;

revoke insert, update, delete on artwork_movements from authenticated;

revoke update on profiles from authenticated;
grant  update (full_name) on profiles to authenticated;
grant  update (role) on profiles to authenticated;  -- RLS limita a admin/próprio; trigger abaixo protege role

create or replace function profiles_guard_role() returns trigger
language plpgsql as $$
begin
  -- auth.uid() nulo = SQL Editor / service role (administração direta)
  if new.role is distinct from old.role and auth.uid() is not null and not is_admin() then
    raise exception 'Somente administradores alteram papéis.';
  end if;
  return new;
end $$;
create trigger profiles_guard_role_trg before update on profiles
  for each row execute function profiles_guard_role();

-- Mudança de expected_swap_at não pode ficar antes da instalação (o CHECK já garante)

-- Funções internas não devem ser chamadas pela API
revoke execute on function _transition(uuid, artwork_status, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function _lock_artwork(uuid)                                          from public, anon, authenticated;
revoke execute on function _check_space_fit(artworks, uuid)                             from public, anon, authenticated;
revoke execute on function _assert_can_write()                                          from public, anon, authenticated;

revoke execute on function reserve_artwork(uuid, uuid, text)                                 from public, anon;
revoke execute on function dispatch_artwork(uuid, text)                                      from public, anon;
revoke execute on function cancel_reservation(uuid, text)                                    from public, anon;
revoke execute on function install_artwork(uuid, uuid, date, integer, text, text, boolean)   from public, anon;
revoke execute on function return_artwork(uuid, date, artwork_status, text)                  from public, anon;
revoke execute on function set_artwork_status(uuid, artwork_status, text)                    from public, anon;
revoke execute on function recommend_artworks(uuid, integer)                                 from public, anon;
grant  execute on function reserve_artwork(uuid, uuid, text)                                 to authenticated;
grant  execute on function dispatch_artwork(uuid, text)                                      to authenticated;
grant  execute on function cancel_reservation(uuid, text)                                    to authenticated;
grant  execute on function install_artwork(uuid, uuid, date, integer, text, text, boolean)   to authenticated;
grant  execute on function return_artwork(uuid, date, artwork_status, text)                  to authenticated;
grant  execute on function set_artwork_status(uuid, artwork_status, text)                    to authenticated;
grant  execute on function recommend_artworks(uuid, integer)                                 to authenticated;
