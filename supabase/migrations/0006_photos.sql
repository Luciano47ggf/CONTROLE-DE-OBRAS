-- =====================================================================
-- 0006 · Várias fotos por obra, com capa, ordem e miniaturas
--   * artwork_photos substitui artworks.photo_path (migração dos dados existentes).
--   * Cada foto guarda três arquivos: original, exibição (≤ 2000 px) e miniatura (≤ 480 px).
--   * Sempre existe exatamente uma capa quando a obra tem fotos (gatilhos).
--   * Views e recomendação continuam expondo photo_path (exibição da capa) e
--     ganham photo_thumb_path (miniatura), para as listas carregarem leve.
-- =====================================================================

create table artwork_photos (
  id            uuid primary key default gen_random_uuid(),
  artwork_id    uuid not null references artworks(id) on delete cascade,
  original_path text not null unique,
  display_path  text not null unique,
  thumb_path    text not null unique,
  width         integer check (width > 0),
  height        integer check (height > 0),
  caption       text,
  position      integer not null default 0,
  is_cover      boolean not null default false,
  created_by    uuid references auth.users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);
create unique index artwork_photos_one_cover_uq on artwork_photos (artwork_id) where is_cover;
create index artwork_photos_artwork_idx on artwork_photos (artwork_id, position, created_at);

-- Fotos antigas (fase 1) viram a capa, com os três caminhos apontando para o mesmo arquivo
-- (se duas obras apontarem para o mesmo arquivo, só a primeira o recebe e as demais são listadas)
do $$
declare r record;
begin
  for r in select id, code, photo_path from artworks where photo_path is not null order by created_at, code loop
    if exists (select 1 from artwork_photos where original_path = r.photo_path) then
      raise notice 'Obra % compartilhava o arquivo % com outra obra; reenvie a foto dela.', r.code, r.photo_path;
    else
      insert into artwork_photos (artwork_id, original_path, display_path, thumb_path, is_cover, created_by)
      values (r.id, r.photo_path, r.photo_path, r.photo_path, true, null);
    end if;
  end loop;
end $$;

-- Primeira foto vira capa; posição padrão é a última
create or replace function artwork_photos_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from artworks where id = new.artwork_id for update; -- serializa uploads simultâneos
  if new.position = 0 then
    select coalesce(max(position), 0) + 1 into new.position from artwork_photos where artwork_id = new.artwork_id;
  end if;
  if not exists (select 1 from artwork_photos where artwork_id = new.artwork_id and is_cover) then
    new.is_cover := true;
  elsif new.is_cover then
    raise exception 'A obra já tem capa. Use set_cover_photo para trocar.';
  end if;
  return new;
end $$;
create trigger artwork_photos_before_insert_trg before insert on artwork_photos
  for each row execute function artwork_photos_before_insert();

-- Ao apagar a capa, a próxima foto (pela ordem) assume
create or replace function artwork_photos_after_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.is_cover then
    update artwork_photos set is_cover = true
     where id = (select id from artwork_photos where artwork_id = old.artwork_id
                  order by position, created_at limit 1);
  end if;
  return old;
end $$;
create trigger artwork_photos_after_delete_trg after delete on artwork_photos
  for each row execute function artwork_photos_after_delete();

-- Trocar capa (duas etapas para respeitar o índice único)
create or replace function set_cover_photo(p_photo_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare v_artwork uuid;
begin
  select artwork_id into v_artwork from artwork_photos where id = p_photo_id;
  if v_artwork is null then raise exception 'Foto não encontrada.'; end if;
  update artwork_photos set is_cover = false where artwork_id = v_artwork and is_cover and id <> p_photo_id;
  update artwork_photos set is_cover = true where id = p_photo_id;
  if not found then raise exception 'Sem permissão para alterar fotos.' using errcode = '42501'; end if;
end $$;

-- Reordenar: recebe todos os ids da obra na nova ordem
create or replace function reorder_artwork_photos(p_artwork_id uuid, p_ids uuid[]) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if (select array_agg(id order by id) from artwork_photos where artwork_id = p_artwork_id)
     is distinct from (select array_agg(x order by x) from unnest(p_ids) x) then
    raise exception 'A lista precisa conter exatamente as fotos desta obra.';
  end if;
  update artwork_photos p set position = o.ord
    from unnest(p_ids) with ordinality o(id, ord)
   where p.id = o.id;
end $$;

-- ---------------------------------------------------------------------
-- Segurança
-- ---------------------------------------------------------------------
alter table artwork_photos enable row level security;
create policy artwork_photos_read   on artwork_photos for select to authenticated using (true);
create policy artwork_photos_insert on artwork_photos for insert to authenticated with check (can_write());
create policy artwork_photos_update on artwork_photos for update to authenticated using (can_write()) with check (can_write());
create policy artwork_photos_delete on artwork_photos for delete to authenticated using (can_write());

revoke all on artwork_photos from anon;
revoke update on artwork_photos from authenticated;
grant  update (caption, position, is_cover) on artwork_photos to authenticated;

revoke execute on function set_cover_photo(uuid) from public, anon;
revoke execute on function reorder_artwork_photos(uuid, uuid[]) from public, anon;
grant  execute on function set_cover_photo(uuid) to authenticated;
grant  execute on function reorder_artwork_photos(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- Views passam a ler a capa de artwork_photos (recriadas em ordem de dependência)
-- ---------------------------------------------------------------------
drop view v_dashboard;
drop view v_spaces;
drop view v_artworks;
drop view v_active_installations;
drop view v_installation_history;
drop function recommend_artworks(uuid, integer);

alter table artworks drop column photo_path;

create view v_artwork_covers with (security_invoker = true) as
select artwork_id, display_path, thumb_path from artwork_photos where is_cover;

create view v_installation_history with (security_invoker = true) as
select i.id               as installation_id,
       i.artwork_id,
       a.code             as artwork_code,
       a.title            as artwork_title,
       cv.display_path    as artwork_photo,
       cv.thumb_path      as artwork_thumb,
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
  join clients c        on c.id = s.client_id
  left join v_artwork_covers cv on cv.artwork_id = a.id;

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

create view v_artworks with (security_invoker = true) as
select a.*,
       cv.display_path   as photo_path,
       cv.thumb_path     as photo_thumb_path,
       (select count(*) from artwork_photos p where p.artwork_id = a.id)::int as photo_count,
       ar.name   as artist_name,
       cat.name  as category_name,
       (current_date - a.status_changed_at::date) as days_in_status,
       ai.installation_id  as current_installation_id,
       ai.client_id        as current_client_id,
       ai.client_name      as current_client_name,
       ai.space_id         as current_space_id,
       ai.space_name       as current_space_name,
       ai.installed_at     as current_installed_at,
       ai.expected_swap_at as current_expected_swap_at,
       rs.name             as reserved_space_name,
       rc.id               as reserved_client_id,
       rc.name             as reserved_client_name
  from artworks a
  join artists ar            on ar.id = a.artist_id
  left join categories cat   on cat.id = a.category_id
  left join v_artwork_covers cv on cv.artwork_id = a.id
  left join v_installation_history ai on ai.artwork_id = a.id and ai.is_active
  left join client_spaces rs on rs.id = a.reserved_space_id
  left join clients rc       on rc.id = rs.client_id;

create view v_spaces with (security_invoker = true) as
select s.*,
       c.name  as client_name,
       t.name  as space_type_name,
       ai.installation_id,
       ai.artwork_id,
       ai.artwork_code,
       ai.artwork_title,
       ai.artwork_photo,
       ai.artwork_thumb,
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

-- Recomendação: mesma nota; a foto vem da capa
create or replace function recommend_artworks(p_space_id uuid, p_limit integer default 60)
returns table (
  artwork_id uuid, code text, title text, artist_name text, category_name text,
  width_cm numeric, height_cm numeric, photo_path text, photo_thumb_path text,
  idle_days integer, times_at_client integer, last_at_client date,
  score_size numeric, score_history numeric, score_idle numeric, score_category numeric, score_total numeric
)
language sql stable security invoker set search_path = public as $$
  with sp as (
    select s.id, s.client_id, s.space_type_id,
           greatest(s.width_cm  - 2 * st.edge_margin_cm, 0) as uw,
           greatest(s.height_cm - 2 * st.edge_margin_cm, 0) as uh,
           st.history_window_days as hw,
           st.idle_max_days       as im,
           (select count(*) from space_type_categories x where x.space_type_id = s.space_type_id) as n_pref
      from client_spaces s cross join app_settings st
     where s.id = p_space_id
  ),
  hist as (
    select i.artwork_id, count(*)::int as times, max(coalesce(i.removed_at, current_date)) as last_date
      from installations i
      join client_spaces cs on cs.id = i.space_id
      join sp on sp.client_id = cs.client_id
     group by i.artwork_id
  ),
  scored as (
    select a.id, a.code, a.title, ar.name as artist_name, cat.name as category_name,
           a.width_cm, a.height_cm, cv.display_path, cv.thumb_path,
           (current_date - a.status_changed_at::date)::int as idle_days,
           coalesce(h.times, 0) as times,
           h.last_date,
           round(40 * sqrt((a.width_cm * a.height_cm) / (sp.uw * sp.uh)), 1) as s_size,
           round(case
             when h.times is null then 30
             else greatest(0, 24 * least((current_date - h.last_date)::numeric / sp.hw, 1) - 3 * (h.times - 1))
           end, 1) as s_hist,
           round(20 * least((current_date - a.status_changed_at::date)::numeric / sp.im, 1), 1) as s_idle,
           case
             when sp.n_pref = 0 then 5
             when exists (select 1 from space_type_categories x
                           where x.space_type_id = sp.space_type_id and x.category_id = a.category_id) then 10
             else 0
           end::numeric as s_cat
      from artworks a
      cross join sp
      join artists ar on ar.id = a.artist_id
      left join categories cat on cat.id = a.category_id
      left join v_artwork_covers cv on cv.artwork_id = a.id
      left join hist h on h.artwork_id = a.id
     where a.status = 'disponivel'
       and a.width_cm  <= sp.uw
       and a.height_cm <= sp.uh
  )
  select id, code, title, artist_name, category_name, width_cm, height_cm, display_path, thumb_path,
         idle_days, times, last_date, s_size, s_hist, s_idle, s_cat,
         s_size + s_hist + s_idle + s_cat as total
    from scored
   order by total desc, idle_days desc, code
   limit greatest(p_limit, 1)
$$;
revoke execute on function recommend_artworks(uuid, integer) from public, anon;
grant  execute on function recommend_artworks(uuid, integer) to authenticated;

-- Storage: escrita só nas pastas conhecidas
drop policy if exists "acervo_insert" on storage.objects;
create policy "acervo_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'acervo' and public.can_write()
              and (storage.foldername(name))[1] in ('obras', 'espacos'));

-- Originais de câmera podem passar de 10 MB
update storage.buckets set file_size_limit = 31457280 where id = 'acervo';
