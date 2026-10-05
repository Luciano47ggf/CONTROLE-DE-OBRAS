-- =====================================================================
-- 0008 · Ambientes do cliente
--   Cliente → Ambiente (client_environments) → Ponto de exposição
--   (client_spaces, inalterado como entidade) → Obra (installations).
--
--   * client_spaces continua sendo o ponto físico onde a obra é instalada:
--     dimensões, tipo, foto, prazo, 1 obra ativa por vez — nada disso muda.
--   * installations.space_id continua apontando para client_spaces.
--   * Histórico (installations, artwork_movements) não é tocado.
--   * Regra de não repetição da 0007 (bloqueio + liberação de uso único em
--     install_artwork/release_artwork_repeat) não muda — só reforço de
--     índice no item (g) abaixo.
--   * Recomendação continua calculada pelas dimensões de client_spaces; só
--     passa a informar também o ambiente do ponto escolhido, para exibição.
-- =====================================================================

-- ---------------------------------------------------------------------
-- a. client_environments: agrupamento acima do ponto de exposição
-- ---------------------------------------------------------------------
create table client_environments (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete restrict,
  name        text not null check (length(trim(name)) > 0),
  description text,
  photo_path  text,
  position    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (client_id, name)
);
create index client_environments_client_idx on client_environments (client_id);
create trigger client_environments_updated before update on client_environments
  for each row execute function set_updated_at();

alter table client_environments enable row level security;
create policy client_environments_read   on client_environments for select to authenticated using (true);
create policy client_environments_insert on client_environments for insert to authenticated with check (can_write());
create policy client_environments_update on client_environments for update to authenticated using (can_write()) with check (can_write());
create policy client_environments_delete on client_environments for delete to authenticated using (can_write());
revoke all on client_environments from anon;

-- ---------------------------------------------------------------------
-- b. client_spaces ganha environment_id (nullable por ora: preenchido no
--    passo c antes de virar NOT NULL)
-- ---------------------------------------------------------------------
alter table client_spaces add column environment_id uuid references client_environments(id) on delete restrict;
create index client_spaces_environment_idx on client_spaces (environment_id);

-- ---------------------------------------------------------------------
-- c. Migração segura dos dados existentes: um ambiente padrão por cliente
--    que já tem pontos de exposição, todos eles associados a ele.
-- ---------------------------------------------------------------------
with new_envs as (
  insert into client_environments (client_id, name)
  select distinct client_id, 'Ambiente principal'
    from client_spaces
  returning id, client_id
)
update client_spaces s
   set environment_id = e.id
  from new_envs e
 where e.client_id = s.client_id;

alter table client_spaces alter column environment_id set not null;

-- ---------------------------------------------------------------------
-- d. v_spaces: mesma view de hoje, só acrescentando o ambiente do ponto
--    (environment_id vem de s.*; environment_name é novo)
-- ---------------------------------------------------------------------
drop view v_spaces;

create view v_spaces with (security_invoker = true) as
select s.*,
       c.name   as client_name,
       t.name   as space_type_name,
       env.name as environment_name,
       coalesce(occ.occupant_count, 0) as occupant_count,
       occ.next_expected_swap_at,
       occ.next_days_remaining,
       case
         when occ.next_days_remaining is null then null
         when occ.next_days_remaining < 0 then 'vermelho'
         when occ.next_days_remaining <= st.swap_warning_days then 'amarelo'
         else 'verde'
       end as next_swap_status,
       (select count(*)
          from artworks x
         where x.status = 'disponivel'
           and fits_space(x.width_cm, x.height_cm, s.width_cm, s.height_cm, st.edge_margin_cm)
       )::int as compatible_available
  from client_spaces s
  join clients c                   on c.id = s.client_id
  cross join app_settings st
  left join space_types t          on t.id = s.space_type_id
  left join client_environments env on env.id = s.environment_id
  left join (
    select ai.space_id,
           count(*)::int            as occupant_count,
           min(ai.expected_swap_at) as next_expected_swap_at,
           min(ai.days_remaining)   as next_days_remaining
      from v_active_installations ai
     group by ai.space_id
  ) occ on occ.space_id = s.id;

-- ---------------------------------------------------------------------
-- e. recommend_artworks_for_client: mesma pontuação de hoje (por
--    client_spaces, não pelo ambiente), só devolvendo também o ambiente
--    do espaço de melhor encaixe, para exibição.
-- ---------------------------------------------------------------------
drop function recommend_artworks_for_client(uuid, integer);

create function recommend_artworks_for_client(p_client_id uuid, p_limit integer default 30)
returns table (
  artwork_id       uuid,
  code             text,
  title            text,
  artist_name      text,
  category_name    text,
  width_cm         numeric,
  height_cm        numeric,
  photo_path       text,
  photo_thumb_path text,
  idle_days        integer,
  times_at_client  integer,
  last_at_client   date,
  blocked          boolean,
  space_id         uuid,
  space_name       text,
  space_width_cm   numeric,
  space_height_cm  numeric,
  environment_id    uuid,
  environment_name  text,
  score_size       numeric,
  score_history    numeric,
  score_idle       numeric,
  score_category   numeric,
  score_total      numeric
)
language sql stable security invoker set search_path = public as $$
  with spaces as (
    select s.id, s.name, s.width_cm, s.height_cm, s.space_type_id,
           s.environment_id, env.name as environment_name,
           greatest(s.width_cm  - 2 * st.edge_margin_cm, 0) as uw,
           greatest(s.height_cm - 2 * st.edge_margin_cm, 0) as uh,
           st.history_window_days as hw,
           st.idle_max_days       as im,
           (select count(*) from space_type_categories x where x.space_type_id = s.space_type_id) as n_pref
      from client_spaces s
      cross join app_settings st
      left join client_environments env on env.id = s.environment_id
     where s.client_id = p_client_id and s.active
  ),
  hist as (
    select i.artwork_id, count(*)::int as times, max(coalesce(i.removed_at, current_date)) as last_date
      from installations i
      join client_spaces cs on cs.id = i.space_id
     where cs.client_id = p_client_id
     group by i.artwork_id
  ),
  scored as (
    select a.id, a.code, a.title, ar.name as artist_name, cat.name as category_name,
           a.width_cm, a.height_cm, cv.display_path, cv.thumb_path,
           (current_date - a.status_changed_at::date)::int as idle_days,
           coalesce(h.times, 0) as times,
           h.last_date,
           (coalesce(h.times, 0) > 0
             and not exists (
               select 1 from artwork_repeat_releases r
                where r.artwork_id = a.id and r.client_id = p_client_id and r.used_at is null
             )) as blocked,
           sp.id as space_id, sp.name as space_name, sp.width_cm as space_width_cm, sp.height_cm as space_height_cm,
           sp.environment_id, sp.environment_name,
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
      cross join spaces sp
      join artists ar on ar.id = a.artist_id
      left join categories cat on cat.id = a.category_id
      left join v_artwork_covers cv on cv.artwork_id = a.id
      left join hist h on h.artwork_id = a.id
     where a.status = 'disponivel'
       and a.width_cm  <= sp.uw
       and a.height_cm <= sp.uh
  ),
  ranked as (
    -- uma linha por obra: fica só o espaço de maior nota para ela
    select *,
           s_size + s_hist + s_idle + s_cat as total,
           row_number() over (partition by id order by s_size + s_hist + s_idle + s_cat desc) as space_rank
      from scored
  )
  select id, code, title, artist_name, category_name, width_cm, height_cm, display_path, thumb_path,
         idle_days, times, last_date, blocked, space_id, space_name, space_width_cm, space_height_cm,
         environment_id, environment_name,
         s_size, s_hist, s_idle, s_cat, total
    from ranked
   where space_rank = 1
   order by blocked, total desc, idle_days desc, code
   limit greatest(p_limit, 1)
$$;

revoke execute on function recommend_artworks_for_client(uuid, integer) from public, anon;
grant  execute on function recommend_artworks_for_client(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------
-- f. Storage: foto do ambiente usa a mesma pasta de convenção (bucket
--    acervo), em ambientes/{clientId}/{environmentId}/...
-- ---------------------------------------------------------------------
drop policy if exists "acervo_insert" on storage.objects;
create policy "acervo_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'acervo' and public.can_write()
              and (storage.foldername(name))[1] in ('obras', 'espacos', 'ambientes'));

-- ---------------------------------------------------------------------
-- g. Correção: trava real (índice único parcial) contra duas liberações
--    pendentes para a mesma obra/cliente. A checagem em plpgsql dentro de
--    release_artwork_repeat (0007) continua, só para a mensagem amigável;
--    quem impede a corrida de verdade agora é o índice.
-- ---------------------------------------------------------------------
do $$
declare v_dupes int;
begin
  select count(*) into v_dupes from (
    select artwork_id, client_id
      from artwork_repeat_releases
     where used_at is null
     group by artwork_id, client_id
    having count(*) > 1
  ) d;
  if v_dupes > 0 then
    raise exception
      'Existem % par(es) obra/cliente com mais de uma liberação pendente. Resolva manualmente (consumir ou cancelar as duplicadas) antes de aplicar esta migration.',
      v_dupes;
  end if;
end $$;

drop index artwork_repeat_releases_pending_idx;
create unique index artwork_repeat_releases_pending_uq
  on artwork_repeat_releases (artwork_id, client_id)
  where used_at is null;
