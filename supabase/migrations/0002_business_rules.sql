-- =====================================================================
-- 0002 · Regras de negócio no banco
-- Toda mudança de status passa por estas funções. Elas validam a transição,
-- atualizam a obra e gravam a movimentação na mesma transação.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------
create or replace function current_app_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function can_write() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin', 'operador') from profiles where id = auth.uid()), false)
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false)
$$;

create or replace function _assert_can_write() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not can_write() then
    raise exception 'Seu usuário não tem permissão para movimentar obras.' using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Compatibilidade de dimensões (margem aplicada nos dois lados)
-- ---------------------------------------------------------------------
create or replace function fits_space(
  art_w numeric, art_h numeric, space_w numeric, space_h numeric, margin numeric
) returns boolean
language sql immutable as $$
  select art_w <= space_w - 2 * margin and art_h <= space_h - 2 * margin
$$;

-- ---------------------------------------------------------------------
-- Núcleo: troca o status e registra a movimentação
-- ---------------------------------------------------------------------
create or replace function _transition(
  p_artwork_id      uuid,
  p_to              artwork_status,
  p_space_id        uuid,
  p_installation_id uuid,
  p_reserved_space  uuid,
  p_notes           text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_from artwork_status;
begin
  select status into v_from from artworks where id = p_artwork_id;
  update artworks
     set status = p_to,
         status_changed_at = now(),
         reserved_space_id = p_reserved_space
   where id = p_artwork_id;
  insert into artwork_movements (artwork_id, from_status, to_status, space_id, installation_id, user_id, notes)
  values (p_artwork_id, v_from, p_to, p_space_id, p_installation_id, auth.uid(), nullif(trim(p_notes), ''));
end $$;

-- ---------------------------------------------------------------------
-- Cadastro de obra: status inicial só pode ser "de estoque" e gera movimentação
-- ---------------------------------------------------------------------
create or replace function artworks_before_insert() returns trigger
language plpgsql as $$
begin
  if new.status not in ('disponivel', 'em_manutencao', 'em_restauracao', 'indisponivel') then
    raise exception 'Uma obra nova entra no acervo como disponível, em manutenção, em restauração ou indisponível.';
  end if;
  new.reserved_space_id := null;
  new.status_changed_at := now();
  return new;
end $$;

create or replace function artworks_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into artwork_movements (artwork_id, from_status, to_status, user_id, notes)
  values (new.id, null, new.status, auth.uid(), 'Cadastro no acervo');
  return new;
end $$;

create trigger artworks_before_insert_trg before insert on artworks
  for each row execute function artworks_before_insert();
create trigger artworks_after_insert_trg after insert on artworks
  for each row execute function artworks_after_insert();

-- ---------------------------------------------------------------------
-- Helpers de carga com trava (evitam corrida entre dois usuários)
-- ---------------------------------------------------------------------
create or replace function _lock_artwork(p_id uuid) returns artworks
language plpgsql security definer set search_path = public as $$
declare v artworks;
begin
  select * into v from artworks where id = p_id for update;
  if not found then raise exception 'Obra não encontrada.'; end if;
  return v;
end $$;

create or replace function _check_space_fit(p_artwork artworks, p_space_id uuid) returns client_spaces
language plpgsql security definer set search_path = public as $$
declare
  v_space client_spaces;
  v_client_active boolean;
  v_margin numeric;
begin
  select * into v_space from client_spaces where id = p_space_id for update;
  if not found then raise exception 'Espaço não encontrado.'; end if;
  if not v_space.active then raise exception 'O espaço "%" está inativo.', v_space.name; end if;
  select active into v_client_active from clients where id = v_space.client_id;
  if not v_client_active then raise exception 'O cliente deste espaço está inativo.'; end if;
  select edge_margin_cm into v_margin from app_settings;
  if not fits_space(p_artwork.width_cm, p_artwork.height_cm, v_space.width_cm, v_space.height_cm, v_margin) then
    raise exception 'A obra (% × % cm) não cabe no espaço "%" (% × % cm) com margem de % cm por lado.',
      p_artwork.width_cm, p_artwork.height_cm, v_space.name, v_space.width_cm, v_space.height_cm, v_margin;
  end if;
  return v_space;
end $$;

-- ---------------------------------------------------------------------
-- RESERVAR: disponível → reservada (para um espaço)
-- ---------------------------------------------------------------------
create or replace function reserve_artwork(p_artwork_id uuid, p_space_id uuid, p_notes text default null)
returns void
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
end $$;

-- ---------------------------------------------------------------------
-- ENVIAR: reservada → em transporte (mantém o destino)
-- ---------------------------------------------------------------------
create or replace function dispatch_artwork(p_artwork_id uuid, p_notes text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v artworks;
begin
  perform _assert_can_write();
  v := _lock_artwork(p_artwork_id);
  if v.status <> 'reservada' then
    raise exception 'Só é possível enviar uma obra reservada (status atual: %).', v.status;
  end if;
  perform _transition(p_artwork_id, 'em_transporte', v.reserved_space_id, null, v.reserved_space_id, p_notes);
end $$;

-- ---------------------------------------------------------------------
-- CANCELAR RESERVA/ENVIO: reservada|em transporte (com destino) → disponível
-- ---------------------------------------------------------------------
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
end $$;

-- ---------------------------------------------------------------------
-- INSTALAR
-- Aceita obra disponível, ou reservada/em transporte para ESTE espaço.
-- p_replace_current = true devolve ao estoque a obra que ocupa o espaço.
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
  v        artworks;
  v_space  client_spaces;
  v_days   integer;
  v_cur    installations;
  v_id     uuid;
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

  perform _transition(p_artwork_id, 'instalada', p_space_id, v_id, null, p_notes);
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- RETIRAR: encerra a instalação e leva a obra para o próximo status
-- ---------------------------------------------------------------------
create or replace function return_artwork(
  p_installation_id uuid,
  p_returned_at     date           default current_date,
  p_new_status      artwork_status default 'disponivel',
  p_notes           text           default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_inst installations;
begin
  perform _assert_can_write();
  if p_new_status not in ('disponivel', 'em_transporte', 'em_manutencao', 'em_restauracao', 'indisponivel') then
    raise exception 'Após a retirada a obra deve ficar disponível, em transporte, em manutenção, em restauração ou indisponível.';
  end if;

  select * into v_inst from installations where id = p_installation_id for update;
  if not found then raise exception 'Instalação não encontrada.'; end if;
  if v_inst.removed_at is not null then raise exception 'Esta instalação já foi encerrada.'; end if;
  if p_returned_at < v_inst.installed_at then
    raise exception 'A data de retirada não pode ser anterior à instalação (%).', v_inst.installed_at;
  end if;

  perform _lock_artwork(v_inst.artwork_id);

  update installations
     set removed_at = p_returned_at, removed_by = auth.uid()
   where id = p_installation_id;

  perform _transition(v_inst.artwork_id, p_new_status, v_inst.space_id, v_inst.id, null,
                      coalesce(p_notes, 'Retirada do espaço'));
end $$;

-- ---------------------------------------------------------------------
-- STATUS DE ESTOQUE: manutenção, restauração, indisponível, disponível
-- (não serve para instalar, reservar ou retirar — essas têm função própria)
-- ---------------------------------------------------------------------
create or replace function set_artwork_status(
  p_artwork_id uuid, p_new_status artwork_status, p_notes text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v artworks;
begin
  perform _assert_can_write();
  v := _lock_artwork(p_artwork_id);
  if p_new_status not in ('disponivel', 'em_manutencao', 'em_restauracao', 'indisponivel', 'em_transporte') then
    raise exception 'Use as ações de reserva e instalação para esse status.';
  end if;
  if v.status = 'instalada' then
    raise exception 'A obra está instalada. Registre a retirada antes de mudar o status.';
  end if;
  if v.reserved_space_id is not null then
    raise exception 'A obra tem destino reservado. Cancele a reserva antes de mudar o status.';
  end if;
  if v.status = p_new_status then
    return;
  end if;
  perform _transition(p_artwork_id, p_new_status, null, null, null, p_notes);
end $$;

-- ---------------------------------------------------------------------
-- RECOMENDAÇÃO DETERMINÍSTICA (0–100)
--   40 · tamanho    : 40 × √(área da obra / área útil). Preenche tudo = 40.
--   30 · histórico  : nunca esteve no cliente = 30.
--                     já esteve = 24 × min(dias desde a saída / janela, 1)
--                     − 3 por passagem adicional (mínimo 0).
--   20 · ociosidade : 20 × min(dias parada no estoque / ociosidade máxima, 1)
--   10 · categoria  : tipo do espaço sem preferência = 5; categoria preferida = 10; outra = 0
-- Só entram obras DISPONÍVEIS que cabem com a margem configurada.
-- ---------------------------------------------------------------------
create or replace function recommend_artworks(p_space_id uuid, p_limit integer default 60)
returns table (
  artwork_id      uuid,
  code            text,
  title           text,
  artist_name     text,
  category_name   text,
  width_cm        numeric,
  height_cm       numeric,
  photo_path      text,
  idle_days       integer,
  times_at_client integer,
  last_at_client  date,
  score_size      numeric,
  score_history   numeric,
  score_idle      numeric,
  score_category  numeric,
  score_total     numeric
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
    select i.artwork_id,
           count(*)::int                                  as times,
           max(coalesce(i.removed_at, current_date))      as last_date
      from installations i
      join client_spaces cs on cs.id = i.space_id
      join sp on sp.client_id = cs.client_id
     group by i.artwork_id
  ),
  scored as (
    select a.id, a.code, a.title, ar.name as artist_name, cat.name as category_name,
           a.width_cm, a.height_cm, a.photo_path,
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
      left join hist h on h.artwork_id = a.id
     where a.status = 'disponivel'
       and a.width_cm  <= sp.uw
       and a.height_cm <= sp.uh
  )
  select id, code, title, artist_name, category_name, width_cm, height_cm, photo_path,
         idle_days, times, last_date, s_size, s_hist, s_idle, s_cat,
         s_size + s_hist + s_idle + s_cat as total
    from scored
   order by total desc, idle_days desc, code
   limit greatest(p_limit, 1)
$$;
