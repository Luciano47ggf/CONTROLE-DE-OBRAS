-- =====================================================================
-- 0012 · Correções da auditoria geral do sistema
--   Não altera nenhuma migration anterior (0001-0011 continuam intocadas).
--
--   a. _check_space_fit passava a validar o espaço e o cliente, mas nunca
--      passou a validar o AMBIENTE do ponto depois que client_environments
--      foi criado (0008). Resultado: desativar um ambiente não impedia
--      reservar/instalar em um dos seus pontos (bastava acessar
--      /espacos/[id] direto, já que a tela não filtra por ambiente
--      inativo). Agora a função também verifica client_environments.active.
--
--   b. reserve_artwork nunca verificou se o espaço de destino já tinha
--      OUTRA obra reservada: nada impedia duas obras diferentes ficarem
--      com reserved_space_id apontando para o mesmo ponto. Consequência
--      observada: a 2ª reserva fica "invisível" na tela do cliente (o
--      mapeamento por espaço guarda só uma) e, se a 1ª for instalada, a
--      2ª obra fica presa em "reservada" para um ponto já ocupado, sem
--      jeito de perceber isso pela interface. Agora a função rejeita a
--      segunda reserva com mensagem clara, e um índice único parcial
--      garante a regra mesmo com duas requisições simultâneas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- a. _check_space_fit: ambiente inativo também bloqueia
-- ---------------------------------------------------------------------
create or replace function _check_space_fit(p_artwork artworks, p_space_id uuid) returns client_spaces
language plpgsql security definer set search_path = public as $$
declare
  v_space              client_spaces;
  v_client_active      boolean;
  v_environment_active boolean;
  v_margin             numeric;
begin
  select * into v_space from client_spaces where id = p_space_id for update;
  if not found then raise exception 'Espaço não encontrado.'; end if;
  if not v_space.active then raise exception 'O espaço "%" está inativo.', v_space.name; end if;

  select active into v_environment_active from client_environments where id = v_space.environment_id;
  if not coalesce(v_environment_active, false) then
    raise exception 'O ambiente do espaço "%" está inativo.', v_space.name;
  end if;

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
-- b. reserve_artwork: rejeita reservar um espaço que já tem outra obra
--    reservada (mensagem amigável; a assinatura não muda)
-- ---------------------------------------------------------------------
create or replace function reserve_artwork(
  p_artwork_id   uuid,
  p_space_id     uuid,
  p_notes        text default null,
  p_planned_at   date default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v       artworks;
  v_other text;
begin
  perform _assert_can_write();
  v := _lock_artwork(p_artwork_id);
  if v.status <> 'disponivel' then
    raise exception 'Só é possível reservar uma obra disponível (status atual: %).', v.status;
  end if;
  perform _check_space_fit(v, p_space_id);

  select a.title into v_other from artworks a
   where a.reserved_space_id = p_space_id and a.id <> p_artwork_id
   for update;
  if v_other is not null then
    raise exception 'Este espaço já tem a obra "%" reservada para ele. Cancele aquela reserva antes de reservar outra.', v_other;
  end if;

  perform _transition(p_artwork_id, 'reservada', p_space_id, null, p_space_id, p_notes);
  update artworks set reserved_planned_at = p_planned_at where id = p_artwork_id;
end $$;

-- Trava real contra a corrida (duas reservas simultâneas para o mesmo espaço).
-- Se já existir inconsistência em produção, a migration para aqui e avisa —
-- não decide sozinha qual das duas reservas cancelar.
do $$
declare v_dupes int;
begin
  select count(*) into v_dupes from (
    select reserved_space_id from artworks
     where reserved_space_id is not null
     group by reserved_space_id
    having count(*) > 1
  ) d;
  if v_dupes > 0 then
    raise exception
      'Existem % espaço(s) com mais de uma obra reservada ao mesmo tempo. Cancele manualmente as reservas duplicadas (cancel_reservation) antes de aplicar esta migration.',
      v_dupes;
  end if;
end $$;

create unique index artworks_reserved_space_uq on artworks (reserved_space_id) where reserved_space_id is not null;
