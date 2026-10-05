begin;
\ir _fixtures.psql
select plan(14);

select tests.login('operador@teste.com');
set local role authenticated;

-- ---------------------------------------------------------- troca planejada
select lives_ok($$ select reserve_artwork(tests.art('T-2'), tests.space('T-Recepção'),
    'Cliente pediu para o mês que vem', current_date + 10) $$,
  'reserva com data prevista');
select is((select reserved_planned_at from artworks where code = 'T-2'), current_date + 10, 'guarda a data prevista');
select is((select reserved_planned_at from v_artworks where code = 'T-2'), current_date + 10, 'v_artworks também expõe a data prevista');

select lives_ok($$ select cancel_reservation(tests.art('T-2')) $$, 'cancela a reserva');
select is((select reserved_planned_at from artworks where code = 'T-2'), null, 'cancelar limpa a data prevista');

select lives_ok($$ select reserve_artwork(tests.art('T-2'), tests.space('T-Recepção'), null, current_date + 3) $$,
  'reserva de novo, com nova data prevista');
select isnt(install_artwork(tests.art('T-2'), tests.space('T-Recepção')), null,
  'instala a obra reservada no destino planejado');
select is((select reserved_planned_at from artworks where code = 'T-2'), null,
  'instalar efetivamente encerra o planejamento');

-- ---------------------------------------------------------- repetição consumida no histórico
select isnt(install_artwork(tests.art('T-3'), tests.space('T-Corredor')), null, 'instala T-3 no corredor');
select lives_ok($$ select return_artwork((select id from installations where artwork_id = tests.art('T-3') and removed_at is null)) $$,
  'retira T-3');
select throws_like($$ select install_artwork(tests.art('T-3'), tests.space('T-Corredor')) $$,
  '%já passou por este cliente%', 'sem liberação, não repete');
select lives_ok($$ select release_artwork_repeat(tests.art('T-3'), (select id from clients where name = 'T-Hotel')) $$,
  'libera a repetição');
select isnt(install_artwork(tests.art('T-3'), tests.space('T-Corredor')), null, 'com liberação, repete e consome');
select ok(exists (
  select 1 from v_client_events
   where kind = 'repeat_consumed'
     and artwork_id = tests.art('T-3')
     and client_id = (select id from clients where name = 'T-Hotel')
), 'a repetição consumida vira seu próprio evento no histórico do cliente');

select * from finish();
rollback;
