begin;
\ir _fixtures.psql
select plan(5);

select tests.login('operador@teste.com');
set local role authenticated;

-- ---------------------------------------------------------- v_spaces traz o ambiente
select is((select environment_name from v_spaces where id = tests.space('T-Recepção')), 'T-Ambiente Hotel',
  'v_spaces traz o nome do ambiente do ponto de exposição');
select is((select environment_id from v_spaces where id = tests.space('T-Recepção')), tests.environment('T-Ambiente Hotel'),
  'v_spaces traz o id do ambiente do ponto de exposição');

-- ---------------------------------------------------------- recommend_artworks_for_client também traz o ambiente
select is(
  (select environment_name from recommend_artworks_for_client((select id from clients where name = 'T-Hotel')) where code = 'T-3'),
  'T-Ambiente Hotel', 'recommend_artworks_for_client devolve o ambiente do espaço de melhor encaixe');

-- ---------------------------------------------------------- não apaga ambiente com pontos de exposição
select throws_ok($$ delete from client_environments where id = tests.environment('T-Ambiente Hotel') $$,
  '23503', null, 'ambiente com pontos de exposição não pode ser apagado (on delete restrict)');

-- ---------------------------------------------------------- índice único trava duas liberações pendentes
-- mesmo contornando release_artwork_repeat e inserindo direto na tabela, como superusuário
reset role;
insert into artwork_repeat_releases (artwork_id, client_id)
values (tests.art('T-2'), (select id from clients where name = 'T-Hotel'));
select throws_ok($$
  insert into artwork_repeat_releases (artwork_id, client_id)
  values (tests.art('T-2'), (select id from clients where name = 'T-Hotel'))
$$, '23505', null, 'índice único parcial impede duas liberações pendentes para a mesma obra/cliente');

select * from finish();
rollback;
