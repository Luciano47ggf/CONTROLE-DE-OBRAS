begin;
\ir _fixtures.psql
select plan(8);

select tests.login('operador@teste.com');
set local role authenticated;

-- ---------------------------------------------------------- duas reservas, mesmo espaço
select lives_ok($$ select reserve_artwork(tests.art('T-2'), tests.space('T-Recepção')) $$,
  'primeira reserva da Recepção');
select throws_like($$ select reserve_artwork(tests.art('T-4'), tests.space('T-Recepção')) $$,
  '%já tem a obra%reservada%', 'segunda obra não pode reservar o mesmo espaço');
select lives_ok($$ select cancel_reservation(tests.art('T-2')) $$, 'cancela a primeira reserva');
select lives_ok($$ select reserve_artwork(tests.art('T-4'), tests.space('T-Recepção')) $$,
  'liberado o espaço, a segunda obra consegue reservar');
select lives_ok($$ select cancel_reservation(tests.art('T-4')) $$, 'limpa para os próximos testes');

-- ---------------------------------------------------------- ambiente inativo bloqueia
update client_environments set active = false where id = tests.environment('T-Ambiente Hotel');
select throws_like($$ select reserve_artwork(tests.art('T-2'), tests.space('T-Recepção')) $$,
  '%ambiente%inativo%', 'não reserva em ponto de ambiente inativo');
select throws_like($$ select install_artwork(tests.art('T-2'), tests.space('T-Recepção')) $$,
  '%ambiente%inativo%', 'não instala em ponto de ambiente inativo');
update client_environments set active = true where id = tests.environment('T-Ambiente Hotel');
select lives_ok($$ select reserve_artwork(tests.art('T-2'), tests.space('T-Recepção')) $$,
  'reativando o ambiente, volta a funcionar normalmente');

select * from finish();
rollback;
