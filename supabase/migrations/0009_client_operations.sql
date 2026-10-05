-- =====================================================================
-- 0009 · Operação direta: logo do cliente, troca planejada, histórico de
-- liberação consumida. Não altera 0007/0008; install_artwork continua
-- sendo o único jeito de instalar e a regra de não repetição não muda.
-- =====================================================================

-- ---------------------------------------------------------------------
-- a. Logo do cliente
-- ---------------------------------------------------------------------
alter table clients add column logo_path text;

drop policy if exists "acervo_insert" on storage.objects;
create policy "acervo_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'acervo' and public.can_write()
              and (storage.foldername(name))[1] in ('obras', 'espacos', 'ambientes', 'clientes'));

-- ---------------------------------------------------------------------
-- b. Troca planejada: data prevista de uma reserva. Não é tabela nova —
--    a reserva já existe (status 'reservada' + reserved_space_id); só
--    passa a guardar também quando ela deve virar instalação.
-- ---------------------------------------------------------------------
alter table artworks add column reserved_planned_at date;
alter table artworks add constraint artworks_reserved_planned_at_chk
  check (reserved_planned_at is null or reserved_space_id is not null);

drop function reserve_artwork(uuid, uuid, text);

create function reserve_artwork(
  p_artwork_id   uuid,
  p_space_id     uuid,
  p_notes        text default null,
  p_planned_at   date default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v artworks;
begin
  perform _assert_can_write();
  v := _lock_artwork(p_artwork_id);
  if v.status <> 'disponivel' then
    raise exception 'Só é possível reservar uma obra disponível (status atual: %).', v.status;
  end if;
  perform _check_space_fit(v, p_space_id);
  perform _transition(p_artwork_id, 'reservada', p_space_id, null, p_space_id, p_notes);
  update artworks set reserved_planned_at = p_planned_at where id = p_artwork_id;
end $$;

revoke execute on function reserve_artwork(uuid, uuid, text, date) from public, anon;
grant  execute on function reserve_artwork(uuid, uuid, text, date) to authenticated;

-- Cancelar reserva/envio: limpa também a data prevista, junto com o destino
create or replace function cancel_reservation(p_artwork_id uuid, p_notes text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v artworks;
begin
  perform _assert_can_write();
  v := _lock_artwork(p_artwork_id);
  if v.reserved_space_id is null then
    raise exception 'Esta obra não tem reserva ativa.';
  end if;
  perform _transition(p_artwork_id, 'disponivel', v.reserved_space_id, null, null, coalesce(p_notes, 'Reserva cancelada'));
  update artworks set reserved_planned_at = null where id = p_artwork_id;
end $$;

-- Instalar: igual à versão da 0008, só com uma linha a mais: se a obra chegou via
-- reserva planejada, a instalação efetiva encerra o planejamento (reserved_planned_at).
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

  -- Regra de não repetição (0007), inalterada: se a obra já passou por qualquer
  -- espaço deste cliente, só instala de novo com uma liberação válida e ainda não
  -- usada — essa liberação é consumida por esta instalação, na mesma transação.
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

  -- Novo nesta migration: instalação efetiva encerra uma eventual troca planejada.
  update artworks set reserved_planned_at = null where id = p_artwork_id;

  perform _transition(p_artwork_id, 'instalada', p_space_id, v_id, null, p_notes);
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- c. v_artworks: expõe a data prevista da reserva (nada mais depende
--    desta view, então o drop é isolado)
-- ---------------------------------------------------------------------
drop view v_artworks;

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
  left join v_installation_history ai on ai.artwork_id = a.id and ai.is_active
  left join client_spaces rs on rs.id = a.reserved_space_id
  left join clients rc       on rc.id = rs.client_id
  left join v_artwork_covers cv on cv.artwork_id = a.id;

-- ---------------------------------------------------------------------
-- d. Histórico: liberação consumida vira seu próprio evento
-- ---------------------------------------------------------------------
create or replace view v_client_events with (security_invoker = true) as
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
  left join profiles p  on p.id = r.released_by
union all
select 'repeat_consumed'::text    as kind,
       r.id::text || '-used'      as event_id,
       r.client_id,
       r.used_at                  as occurred_at,
       r.artwork_id,
       a.code                     as artwork_code,
       a.title                    as artwork_title,
       s.name                     as space_name,
       null::artwork_status       as from_status,
       null::artwork_status       as to_status,
       null::text                 as notes,
       null::text                 as user_name
  from artwork_repeat_releases r
  join artworks a             on a.id = r.artwork_id
  left join installations i   on i.id = r.installation_id
  left join client_spaces s   on s.id = i.space_id
 where r.used_at is not null;
