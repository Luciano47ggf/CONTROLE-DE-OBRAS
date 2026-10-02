begin;
\ir _fixtures.psql
select plan(22);

-- ---------------------------------------------------------- operador
select tests.login('operador@teste.com');
set local role authenticated;

select throws_ok($$ update artworks set status = 'disponivel' where code = 'T-5' $$,
  '42501', null, 'status não pode ser alterado direto na tabela');
select throws_ok($$ update artworks set reserved_space_id = null where code = 'T-5' $$,
  '42501', null, 'destino de reserva não pode ser alterado direto');
select lives_ok($$ update artworks set title = 'Novo título' where code = 'T-5' $$, 'dados cadastrais são editáveis');
select throws_ok($$ insert into artwork_movements (artwork_id, to_status) values (tests.art('T-5'), 'disponivel') $$,
  '42501', null, 'movimentação não é inserida manualmente');
select throws_ok($$ insert into installations (artwork_id, space_id, installed_at, expected_swap_at)
                    values (tests.art('T-2'), tests.space('T-Sala'), current_date, current_date) $$,
  '42501', null, 'instalação não é inserida manualmente');
select throws_ok($$ delete from artwork_movements $$, '42501', null, 'movimentações não são apagadas');
select throws_ok($$ select _transition(tests.art('T-2'), 'instalada', null, null, null, null) $$,
  '42501', null, 'funções internas não são acessíveis pela API');
with u as (update app_settings set edge_margin_cm = 0 returning 1) select is(count(*)::int, 0, 'operador não altera configurações') from u;
with u as (update profiles set full_name = 'x' where email = 'leitor@teste.com' returning 1) select is(count(*)::int, 0, 'operador não altera perfil de outra pessoa') from u;
select throws_like($$ update profiles set role = 'admin' where email = 'operador@teste.com' $$,
  '%Somente administradores%', 'operador não se promove');

-- ---------------------------------------------------------- leitura
select tests.login('leitor@teste.com');
select ok((select count(*) from artworks) > 0, 'leitor consulta o acervo');
select throws_ok($$ insert into artists (name) values ('X') $$, '42501', null, 'leitor não cadastra (RLS)');
with u as (update clients set notes = 'x' returning 1) select is(count(*)::int, 0, 'leitor não edita clientes') from u;
select throws_ok($$ select install_artwork(tests.art('T-2'), tests.space('T-Sala')) $$,
  '42501', null, 'leitor não movimenta obras');
select lives_ok($$ update profiles set full_name = 'Leitor Silva' where email = 'leitor@teste.com' $$,
  'qualquer usuário edita o próprio nome');

-- ---------------------------------------------------------- administração
select tests.login('admin@teste.com');
select throws_like($$ update profiles set role = 'operador' where email = 'admin@teste.com' $$,
  '%pelo menos um administrador%', 'único admin não pode se rebaixar');
select throws_like($$ update profiles set active = false where email = 'admin@teste.com' $$,
  '%pelo menos um administrador%', 'único admin não pode se desativar');
select lives_ok($$ update profiles set active = false where email = 'operador@teste.com' $$, 'admin desativa operador');

select tests.login('operador@teste.com');
select throws_ok($$ select install_artwork(tests.art('T-2'), tests.space('T-Sala')) $$,
  '42501', null, 'operador desativado perde a escrita na hora');

select tests.login('admin@teste.com');
select lives_ok($$ update profiles set role = 'admin' where email = 'leitor@teste.com' $$, 'admin promove outro usuário');
select lives_ok($$ update profiles set role = 'operador' where email = 'admin@teste.com' $$,
  'com outro admin ativo, o antigo pode deixar o papel');

-- ---------------------------------------------------------- anônimo
reset role;
select tests.logout();
set local role anon;
select throws_ok($$ select count(*) from artworks $$, '42501', null, 'visitante sem login não lê nada');

select * from finish();
rollback;
