-- =====================================================================
-- 0007 · Quadro de clientes
--   * clients ganha "segment" (tipo/subtítulo exibido no card e no painel).
--   * v_spaces passa a expor também agregados de ocupação (occupant_count,
--     próxima troca); a lista de ocupantes de um espaço é lida de
--     v_active_installations, que já é "uma linha por instalação" e não
--     precisou mudar. O modelo continua 1 obra ativa por espaço por vez
--     (ver nota abaixo) — não mudei isso.
--   * Regra de não repetição: recommend_artworks e a nova
--     recommend_artworks_for_client marcam "blocked" quando a obra já
--     passou pelo cliente e não há liberação válida (ainda não usada). A
--     obra continua aparecendo (não é escondida), só fica marcada.
--   * A liberação de repetição vale para UMA próxima instalação: ao ser
--     usada ela fica consumida (used_at/installation_id) e não autoriza
--     mais nada depois. A regra é garantida dentro de install_artwork, não
--     só nas funções de recomendação — não dá para contornar chamando a
--     RPC direto.
--   * Decisão registrada: por enquanto um espaço continua representando um
--     único ponto de exposição (1 obra por vez). Se um ambiente tiver mais
--     de uma parede/posição, cada uma vira um client_spaces separado (ex.:
--     "Recepção - Parede A", "Recepção - Parede B"). Não há, portanto,
--     lógica de "quanto da parede já está ocupado" — cada obra candidata
--     ainda é avaliada contra a parede inteira.
-- =====================================================================

-- ---------------------------------------------------------------------
-- a. Tipo/subtítulo do cliente
-- ---------------------------------------------------------------------
alter table clients add column segment text;

-- ---------------------------------------------------------------------
-- b. install_artwork: mantém a regra de 1 obra ativa por espaço por vez
--    (installations_active_space_uq não muda) e passa a também impor a
--    regra de não repetição por cliente, consumindo a liberação usada.
-- ---------------------------------------------------------------------
create or replace function install_artwork(
  p_artwork_id      uuid,
  p_space_id        uuid,
  p_installed_at    date    default current_date,
  p_swap_days       integer default null,
  p_responsible     text    default null,
  p_notes           text    default null,
  p_replace_current boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v            artworks;
  v_space      client_spaces;
  v_days       integer;
  v_cur        installations;
  v_id         uuid;
  v_release_id uuid;
begin
  perform _assert_can_write();
  v := _lock_artwork(p_artwork_id);

  if not (v.status = 'disponivel'
          or (v.status in ('reservada', 'em_transporte') and v.reserved_space_id = p_space_id)) then
    raise exception 'A obra "%" não pode ser instalada aqui (status atual: %).', v.title, v.status;
  end if;
  if p_installed_at > current_date then
    raise exception 'A data de instalação não pode estar no futuro.';
  end if;

  v_space := _check_space_fit(v, p_space_id);

  -- Regra de não repetição, garantida aqui (não só na recomendação): se a obra já
  -- passou por qualquer espaço deste cliente, só instala de novo com uma liberação
  -- válida e ainda não usada — e essa liberação é consumida por esta instalação,
  -- logo abaixo, na mesma transação. Sem liberação, a instalação é recusada.
  if exists (
    select 1 from installations i
      join client_spaces cs on cs.id = i.space_id
     where i.artwork_id = p_artwork_id and cs.client_id = v_space.client_id
  ) then
    select id into v_release_id from artwork_repeat_releases
     where artwork_id = p_artwork_id and client_id = v_space.client_id and used_at is null
     order by released_at
     limit 1
     for update;
    if v_release_id is null then
      raise exception 'A obra "%" já passou por este cliente. Libere a repetição antes de instalar de novo.', v.title;
    end if;
  end if;

  select * into v_cur from installations where space_id = p_space_id and removed_at is null for update;
  if found then
    if not p_replace_current then
      raise exception 'O espaço "%" já tem uma obra instalada. Retire-a ou confirme a substituição.', v_space.name;
    end if;
    perform return_artwork(v_cur.id, p_installed_at, 'disponivel', 'Substituída por ' || v.code || ' · ' || v.title);
  end if;

  select coalesce(p_swap_days, v_space.swap_days, c.default_swap_days, s.default_swap_days)
    into v_days
    from clients c cross join app_settings s
   where c.id = v_space.client_id;

  if v_days is null or v_days <= 0 then
    raise exception 'O prazo de troca precisa ser maior que zero.';
  end if;

  insert into installations (artwork_id, space_id, installed_at, expected_swap_at, responsible, notes, installed_by)
  values (p_artwork_id, p_space_id, p_installed_at, p_installed_at + v_days,
          nullif(trim(p_responsible), ''), nullif(trim(p_notes), ''), auth.uid())
  returning id into v_id;

  -- Consome a liberação usada, se houver: ela não vale para uma repetição seguinte.
  if v_release_id is not null then
    update artwork_repeat_releases set used_at = now(), installation_id = v_id where id = v_release_id;
  end if;

  perform _transition(p_artwork_id, 'instalada', p_space_id, v_id, null, p_notes);
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- c. v_spaces: em vez de colunas do ocupante único, expõe agregados
--    (occupant_count — 0 ou 1, já que o modelo continua 1 por espaço — e a
--    próxima troca). Quem ocupa um espaço é lido de v_active_installations
--    (uma linha por instalação, já existia e não precisou mudar); é essa
--    view que alimenta a lista de ocupantes nos cards do quadro de clientes.
-- ---------------------------------------------------------------------
drop view v_spaces;

create view v_spaces with (security_invoker = true) as
select s.*,
       c.name  as client_name,
       t.name  as space_type_name,
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
  join clients c            on c.id = s.client_id
  cross join app_settings st
  left join space_types t   on t.id = s.space_type_id
  left join (
    select ai.space_id,
           count(*)::int            as occupant_count,
           min(ai.expected_swap_at) as next_expected_swap_at,
           min(ai.days_remaining)   as next_days_remaining
      from v_active_installations ai
     group by ai.space_id
  ) occ on occ.space_id = s.id;

-- ---------------------------------------------------------------------
-- f. Auditoria de liberação de repetição (tabela + RLS antes das funções
--    que a consultam/gravam)
-- ---------------------------------------------------------------------
create table artwork_repeat_releases (
  id              uuid primary key default gen_random_uuid(),
  artwork_id      uuid not null references artworks(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete cascade,
  reason          text,
  released_by     uuid references auth.users(id) on delete set null,
  released_at     timestamptz not null default now(),
  -- Liberação vale para UMA próxima instalação: ao ser usada, used_at/installation_id
  -- ficam gravados e a liberação para de contar como válida (install_artwork exige
  -- used_at is null). O registro nunca é apagado nem reaberto — fica auditável.
  used_at         timestamptz,
  installation_id uuid references installations(id) on delete set null,
  check (used_at is null or installation_id is not null)
);
-- Busca rápida da liberação ainda não consumida de uma obra para um cliente
create index artwork_repeat_releases_pending_idx on artwork_repeat_releases (artwork_id, client_id) where used_at is null;

alter table artwork_repeat_releases enable row level security;
create policy artwork_repeat_releases_read on artwork_repeat_releases for select to authenticated using (true);

revoke all on artwork_repeat_releases from anon;
revoke insert, update, delete on artwork_repeat_releases from authenticated;

-- ---------------------------------------------------------------------
-- g. Liberar repetição: só por função, registra quem e quando
-- ---------------------------------------------------------------------
create or replace function release_artwork_repeat(p_artwork_id uuid, p_client_id uuid, p_reason text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform _assert_can_write();
  if not exists (select 1 from artworks where id = p_artwork_id) then
    raise exception 'Obra não encontrada.';
  end if;
  if not exists (select 1 from clients where id = p_client_id) then
    raise exception 'Cliente não encontrado.';
  end if;
  -- Só uma liberação pendente por vez: evita autorizar mais de uma repetição de uma vez
  if exists (
    select 1 from artwork_repeat_releases
     where artwork_id = p_artwork_id and client_id = p_client_id and used_at is null
  ) then
    raise exception 'Já existe uma liberação pendente (ainda não usada) para esta obra neste cliente.';
  end if;
  insert into artwork_repeat_releases (artwork_id, client_id, reason, released_by)
  values (p_artwork_id, p_client_id, nullif(trim(p_reason), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function release_artwork_repeat(uuid, uuid, text) from public, anon;
grant  execute on function release_artwork_repeat(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- d. recommend_artworks: adiciona "blocked". Continua restrita a um espaço,
--    usada em /espacos/[id]; não exclui obras já exibidas, só marca.
-- ---------------------------------------------------------------------
drop function recommend_artworks(uuid, integer);

create function recommend_artworks(p_space_id uuid, p_limit integer default 60)
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
  score_size       numeric,
  score_history    numeric,
  score_idle       numeric,
  score_category   numeric,
  score_total      numeric
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
           (coalesce(h.times, 0) > 0
             and not exists (
               select 1 from artwork_repeat_releases r
                where r.artwork_id = a.id and r.client_id = sp.client_id and r.used_at is null
             )) as blocked,
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
         idle_days, times, last_date, blocked, s_size, s_hist, s_idle, s_cat,
         s_size + s_hist + s_idle + s_cat as total
    from scored
   order by blocked, total desc, idle_days desc, code
   limit greatest(p_limit, 1)
$$;

revoke execute on function recommend_artworks(uuid, integer) from public, anon;
grant  execute on function recommend_artworks(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------
-- e. recommend_artworks_for_client: mesma pontuação, cruzando todos os
--    espaços ativos do cliente; cada obra aparece uma vez, no espaço de
--    melhor encaixe. Alimenta a aba "Sugestões" do painel do cliente.
-- ---------------------------------------------------------------------
create or replace function recommend_artworks_for_client(p_client_id uuid, p_limit integer default 30)
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
  score_size       numeric,
  score_history    numeric,
  score_idle       numeric,
  score_category   numeric,
  score_total      numeric
)
language sql stable security invoker set search_path = public as $$
  with spaces as (
    select s.id, s.name, s.width_cm, s.height_cm, s.space_type_id,
           greatest(s.width_cm  - 2 * st.edge_margin_cm, 0) as uw,
           greatest(s.height_cm - 2 * st.edge_margin_cm, 0) as uh,
           st.history_window_days as hw,
           st.idle_max_days       as im,
           (select count(*) from space_type_categories x where x.space_type_id = s.space_type_id) as n_pref
      from client_spaces s cross join app_settings st
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
         s_size, s_hist, s_idle, s_cat, total
    from ranked
   where space_rank = 1
   order by blocked, total desc, idle_days desc, code
   limit greatest(p_limit, 1)
$$;

revoke execute on function recommend_artworks_for_client(uuid, integer) from public, anon;
grant  execute on function recommend_artworks_for_client(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------
-- h. Histórico unificado do cliente: movimentações + liberações de
--    repetição, numa linha do tempo só.
-- ---------------------------------------------------------------------
create view v_client_events with (security_invoker = true) as
select 'movement'::text       as kind,
       m.id::text             as event_id,
       m.client_id,
       m.occurred_at,
       m.artwork_id,
       m.artwork_code,
       m.artwork_title,
       m.space_name,
       m.from_status,
       m.to_status,
       m.notes,
       m.user_name
  from v_movements m
 where m.client_id is not null
union all
select 'release'::text            as kind,
       r.id::text                 as event_id,
       r.client_id,
       r.released_at              as occurred_at,
       r.artwork_id,
       a.code                     as artwork_code,
       a.title                    as artwork_title,
       null::text                 as space_name,
       null::artwork_status       as from_status,
       null::artwork_status       as to_status,
       r.reason                   as notes,
       p.full_name                as user_name
  from artwork_repeat_releases r
  join artworks a       on a.id = r.artwork_id
  left join profiles p  on p.id = r.released_by;
