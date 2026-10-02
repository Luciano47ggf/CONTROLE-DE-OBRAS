-- =====================================================================
-- 0001 · Esquema base
-- Convenções:
--   * Dimensões sempre em CENTÍMETROS (numeric). A interface exibe em metros.
--   * Localização atual e histórico NÃO são colunas duplicadas: derivam de
--     installations (onde a obra esteve) e artwork_movements (toda mudança de status).
--   * artworks.status é a única informação de estado "cacheada"; ela só pode ser
--     alterada pelas funções de negócio (0002), nunca diretamente pelo cliente.
-- =====================================================================

create extension if not exists pgcrypto;

create type artwork_status as enum (
  'disponivel', 'reservada', 'em_transporte', 'instalada',
  'em_manutencao', 'em_restauracao', 'indisponivel'
);

create type user_role as enum ('admin', 'operador', 'leitura');

-- ---------------------------------------------------------------------
-- Utilitário: updated_at automático
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Perfis de usuário (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       user_role not null default 'operador',
  created_at timestamptz not null default now()
);

-- O primeiro usuário criado vira admin; os demais entram como operador.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    case when exists (select 1 from public.profiles) then 'operador'::user_role else 'admin'::user_role end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- Configurações (linha única)
-- ---------------------------------------------------------------------
create table app_settings (
  id                   boolean primary key default true check (id),
  edge_margin_cm       numeric(8,2) not null default 20  check (edge_margin_cm >= 0),
  default_swap_days    integer      not null default 90  check (default_swap_days > 0),
  swap_warning_days    integer      not null default 15  check (swap_warning_days >= 0),
  history_window_days  integer      not null default 730 check (history_window_days > 0),
  idle_max_days        integer      not null default 180 check (idle_max_days > 0),
  updated_at           timestamptz  not null default now()
);
insert into app_settings default values;

create trigger app_settings_updated before update on app_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------
create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table space_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(trim(name)) > 0),
  description text,
  created_at  timestamptz not null default now()
);

-- Categorias preferidas para cada tipo de espaço (alimenta os 10 pts de adequação)
create table space_type_categories (
  space_type_id uuid not null references space_types(id) on delete cascade,
  category_id   uuid not null references categories(id)  on delete cascade,
  primary key (space_type_id, category_id)
);

-- ---------------------------------------------------------------------
-- Artistas
-- ---------------------------------------------------------------------
create table artists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  nationality text,
  birth_year  integer check (birth_year between 1000 and 2100),
  bio         text,
  website     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index artists_name_idx on artists (lower(name));
create trigger artists_updated before update on artists
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table clients (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(trim(name)) > 0),
  legal_name        text,
  document          text unique,                -- CPF/CNPJ só com dígitos
  address           text,
  city              text,
  state             char(2),
  phone             text,
  email             text,
  contact_name      text,
  notes             text,
  active            boolean not null default true,
  default_swap_days integer check (default_swap_days > 0), -- sobrepõe a configuração global
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (document is null or document ~ '^[0-9]{11}$|^[0-9]{14}$')
);
create index clients_name_idx on clients (lower(name));
create index clients_active_idx on clients (active);
create trigger clients_updated before update on clients
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Espaços do cliente
-- ---------------------------------------------------------------------
create table client_spaces (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete restrict,
  name          text not null check (length(trim(name)) > 0),
  description   text,
  space_type_id uuid references space_types(id) on delete set null,
  width_cm      numeric(8,2) not null check (width_cm > 0),
  height_cm     numeric(8,2) not null check (height_cm > 0),
  photo_path    text,
  notes         text,
  swap_days     integer check (swap_days > 0),  -- sobrepõe cliente e global
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (client_id, name)
);
create index client_spaces_client_idx on client_spaces (client_id);
create trigger client_spaces_updated before update on client_spaces
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Obras
-- ---------------------------------------------------------------------
create table artworks (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique check (length(trim(code)) > 0),
  title             text not null check (length(trim(title)) > 0),
  artist_id         uuid not null references artists(id) on delete restrict,
  category_id       uuid references categories(id) on delete set null,
  description       text,
  technique         text,
  year              integer check (year between 1000 and 2100),
  width_cm          numeric(8,2) not null check (width_cm > 0),
  height_cm         numeric(8,2) not null check (height_cm > 0),
  depth_cm          numeric(8,2) check (depth_cm > 0),
  weight_kg         numeric(8,2) check (weight_kg > 0),
  value             numeric(14,2) check (value >= 0),
  photo_path        text,
  notes             text,
  -- Estado: alterado somente pelas funções de negócio
  status            artwork_status not null default 'disponivel',
  status_changed_at timestamptz not null default now(),
  reserved_space_id uuid references client_spaces(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Reserva aponta para um espaço; em transporte pode carregar o destino
  check (status <> 'reservada' or reserved_space_id is not null),
  check (status in ('reservada', 'em_transporte') or reserved_space_id is null)
);
create index artworks_status_dims_idx on artworks (status, width_cm, height_cm);
create index artworks_artist_idx on artworks (artist_id);
create index artworks_category_idx on artworks (category_id);
create index artworks_title_idx on artworks (lower(title));
create trigger artworks_updated before update on artworks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Instalações: cada passagem de uma obra por um espaço.
-- removed_at nulo = instalação ativa (local atual da obra).
-- O cliente é derivado do espaço (sem duplicação).
-- ---------------------------------------------------------------------
create table installations (
  id               uuid primary key default gen_random_uuid(),
  artwork_id       uuid not null references artworks(id) on delete restrict,
  space_id         uuid not null references client_spaces(id) on delete restrict,
  installed_at     date not null,
  expected_swap_at date not null,
  removed_at       date,
  responsible      text,
  notes            text,
  installed_by     uuid references auth.users(id) on delete set null,
  removed_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  check (expected_swap_at >= installed_at),
  check (removed_at is null or removed_at >= installed_at)
);
-- Uma obra só pode estar em um lugar; um espaço só recebe uma obra por vez.
create unique index installations_active_artwork_uq on installations (artwork_id) where removed_at is null;
create unique index installations_active_space_uq   on installations (space_id)   where removed_at is null;
create index installations_artwork_idx on installations (artwork_id, installed_at desc);
create index installations_space_idx   on installations (space_id, installed_at desc);
create index installations_swap_idx    on installations (expected_swap_at) where removed_at is null;

-- ---------------------------------------------------------------------
-- Movimentações: log imutável de toda mudança de status
-- ---------------------------------------------------------------------
create table artwork_movements (
  id              bigint generated always as identity primary key,
  artwork_id      uuid not null references artworks(id) on delete restrict,
  from_status     artwork_status,
  to_status       artwork_status not null,
  space_id        uuid references client_spaces(id) on delete restrict,
  installation_id uuid references installations(id) on delete restrict,
  occurred_at     timestamptz not null default now(),
  user_id         uuid references auth.users(id) on delete set null,
  notes           text
);
create index artwork_movements_artwork_idx on artwork_movements (artwork_id, occurred_at desc);
create index artwork_movements_space_idx   on artwork_movements (space_id, occurred_at desc);
