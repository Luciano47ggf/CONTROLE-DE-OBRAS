-- Dados de exemplo para desenvolvimento (rodar após as migrations).
-- Usa inserts diretos porque roda como superusuário, sem auth.uid().
insert into categories (name) values ('Abstrato'), ('Paisagem'), ('Fotografia'), ('Geométrico'), ('Figurativo');
insert into space_types (name) values ('Recepção'), ('Corredor'), ('Sala de reunião'), ('Restaurante');

insert into space_type_categories (space_type_id, category_id)
select t.id, c.id from space_types t, categories c
 where (t.name = 'Recepção'        and c.name in ('Paisagem', 'Abstrato'))
    or (t.name = 'Sala de reunião' and c.name in ('Geométrico', 'Fotografia'))
    or (t.name = 'Restaurante'     and c.name in ('Figurativo', 'Paisagem'));

insert into artists (name, nationality) values
  ('João Silva', 'Brasil'), ('Marina Duarte', 'Brasil'), ('Tomás Oliveira', 'Portugal'), ('Lia Kato', 'Brasil');

insert into clients (name, legal_name, document, city, state, contact_name, email) values
  ('Hotel Exemplo', 'Hotel Exemplo Ltda', '12345678000190', 'Cuiabá', 'MT', 'Carla Mendes', 'carla@hotelexemplo.com.br'),
  ('Empresa ABC', 'ABC Participações S.A.', '98765432000110', 'Cuiabá', 'MT', 'Rafael Costa', 'rafael@abc.com.br'),
  ('Hotel Central', null, null, 'Várzea Grande', 'MT', 'Paula Lima', null);

insert into client_spaces (client_id, name, space_type_id, width_cm, height_cm)
select c.id, v.name, t.id, v.w, v.h
  from (values
    ('Hotel Exemplo', 'Recepção',           'Recepção',        400, 250),
    ('Hotel Exemplo', 'Corredor principal', 'Corredor',        250, 180),
    ('Hotel Exemplo', 'Sala da diretoria',  'Sala de reunião', 300, 200),
    ('Hotel Exemplo', 'Restaurante',        'Restaurante',     500, 220),
    ('Empresa ABC',   'Sala diretoria',     'Sala de reunião', 320, 210),
    ('Hotel Central', 'Lobby',              'Recepção',        600, 300)
  ) as v(client, name, type, w, h)
  join clients c on c.name = v.client
  join space_types t on t.name = v.type;

insert into artworks (code, title, artist_id, category_id, technique, year, width_cm, height_cm)
select v.code, v.title, a.id, c.id, v.tech, v.year, v.w, v.h
  from (values
    ('OB-102', 'Horizonte Azul',   'João Silva',     'Paisagem',   'Óleo sobre tela',     2019, 380, 220),
    ('OB-103', 'Geometria 03',     'Marina Duarte',  'Geométrico', 'Acrílica sobre tela', 2021, 160, 120),
    ('OB-104', 'Movimento',        'Tomás Oliveira', 'Abstrato',   'Técnica mista',       2018, 200, 140),
    ('OB-105', 'Cerrado ao meio-dia', 'João Silva',  'Paisagem',   'Óleo sobre tela',     2022, 300, 180),
    ('OB-106', 'Ruído branco',     'Lia Kato',       'Fotografia', 'Fotografia fine art', 2020, 120, 90),
    ('OB-107', 'Superfícies',      'Marina Duarte',  'Geométrico', 'Acrílica sobre tela', 2023, 240, 160),
    ('OB-108', 'Retrato de Ana',   'Tomás Oliveira', 'Figurativo', 'Óleo sobre tela',     2017, 90, 120),
    ('OB-109', 'Rio Cuiabá',       'Lia Kato',       'Fotografia', 'Fotografia fine art', 2024, 180, 100),
    ('OB-110', 'Grande mural',     'João Silva',     'Abstrato',   'Acrílica sobre tela', 2016, 520, 260)
  ) as v(code, title, artist, cat, tech, year, w, h)
  join artists a on a.name = v.artist
  join categories c on c.name = v.cat;

-- Simula "tempo no estoque" variado
update artworks set status_changed_at = now() - (random() * 200 || ' days')::interval;

-- Histórico passado: Horizonte Azul passou pela Empresa ABC e pelo Hotel Central
insert into installations (artwork_id, space_id, installed_at, expected_swap_at, removed_at)
select a.id, s.id, v.ins::date, v.ins::date + 90, v.rem::date
  from (values
    ('OB-102', 'Hotel Central', 'Lobby',          '2025-09-01', '2025-12-01'),
    ('OB-102', 'Empresa ABC',   'Sala diretoria', '2026-01-10', '2026-04-20'),
    ('OB-104', 'Hotel Exemplo', 'Corredor principal', '2026-02-01', '2026-05-30')
  ) as v(code, client, space, ins, rem)
  join artworks a on a.code = v.code
  join clients c on c.name = v.client
  join client_spaces s on s.client_id = c.id and s.name = v.space;

-- Instalações ativas
with ins as (
  insert into installations (artwork_id, space_id, installed_at, expected_swap_at)
  select a.id, s.id, v.ins, v.ins + 90
    from (values
      ('OB-102', 'Hotel Exemplo', 'Recepção',           current_date - 73),
      ('OB-103', 'Hotel Exemplo', 'Corredor principal', current_date - 96)
    ) as v(code, client, space, ins)
    join artworks a on a.code = v.code
    join clients c on c.name = v.client
    join client_spaces s on s.client_id = c.id and s.name = v.space
  returning artwork_id, space_id, id, installed_at
)
insert into artwork_movements (artwork_id, from_status, to_status, space_id, installation_id, occurred_at, notes)
select artwork_id, 'disponivel', 'instalada', space_id, id, installed_at, 'Carga inicial' from ins;

update artworks set status = 'instalada', status_changed_at = now() - interval '73 days' where code = 'OB-102';
update artworks set status = 'instalada', status_changed_at = now() - interval '96 days' where code = 'OB-103';
update artworks set status = 'em_manutencao' where code = 'OB-108';
