begin;
\ir _fixtures.psql
select plan(26);

select tests.login('operador@teste.com');
set local role authenticated;

-- Recepção: área útil 360 × 210 = 75.600 cm²; tipo prefere T-Paisagem
create temp view r as select * from recommend_artworks(tests.space('T-Recepção'));

select set_eq($$ select code from r $$, array['T-2', 'T-3', 'T-4', 'T-7'],
  'só obras disponíveis que cabem na área útil');
select ok(not exists (select 1 from r where code = 'T-1'), 'obra que invade a margem fica de fora');
select ok(not exists (select 1 from r where code = 'T-5'), 'obra em manutenção fica de fora');

-- T-2: 300×180, inédita, parada 180 dias, categoria preferida
--   tamanho 40·√(54000/75600) = 33,8 · histórico 30 · ociosidade 20 · categoria 10 = 93,8
select is((select array[score_size, score_history, score_idle, score_category, score_total] from r where code = 'T-2'),
  array[33.8, 30.0, 20.0, 10, 93.8]::numeric[], 'nota detalhada da T-2');
-- T-4: 340×200, parada 90 dias, categoria não preferida
--   37,9 + 30 + 10 + 0 = 77,9
select is((select array[score_size, score_idle, score_category, score_total] from r where code = 'T-4'),
  array[37.9, 10.0, 0, 77.9]::numeric[], 'nota detalhada da T-4');
select is((select code from r limit 1), 'T-2', 'a melhor nota vem primeiro');

-- A regra de encaixe da recomendação e a da instalação (fits_space) precisam concordar
select is_empty($$
  select s.id from client_spaces s
   where (select compatible_available from v_spaces v where v.id = s.id)
      <> (select count(*)::int from recommend_artworks(s.id, 1000))
$$, 'contagem de compatíveis do espaço bate com a recomendação');

-- Espaço sem tipo: categoria neutra (5 para todas)
select is((select array_agg(distinct score_category) from recommend_artworks(tests.space('T-Sala'))),
  array[5]::numeric[], 'espaço sem tipo dá 5 pontos de categoria a todas');

-- Nenhuma obra ainda passou por nenhum cliente: ninguém fica bloqueado
select ok(not exists (select 1 from r where blocked), 'sem histórico no cliente, nada aparece bloqueado');

-- ---------------------------------------------------------- histórico no cliente
reset role;
-- T-2 saiu do T-Hotel há 30 dias; T-4 saiu há mais de 2 anos; T-7 passou 2 vezes, a última há 365 dias
insert into installations (artwork_id, space_id, installed_at, expected_swap_at, removed_at) values
  (tests.art('T-2'), tests.space('T-Corredor'), current_date - 120, current_date - 30, current_date - 30),
  (tests.art('T-4'), tests.space('T-Recepção'), current_date - 900, current_date - 800, current_date - 800),
  (tests.art('T-7'), tests.space('T-Corredor'), current_date - 600, current_date - 500, current_date - 500),
  (tests.art('T-7'), tests.space('T-Recepção'), current_date - 400, current_date - 365, current_date - 365),
  -- passagem por OUTRO cliente não pesa aqui
  (tests.art('T-3'), tests.space('T-Sala'), current_date - 100, current_date - 10, current_date - 10);
set local role authenticated;

select is((select score_history from r where code = 'T-3'), 30.0, 'inédita no cliente: 30 (outro cliente não conta)');
select is((select score_history from r where code = 'T-4'), 24.0, 'passagem antiga: teto de 24');
select is((select score_history from r where code = 'T-2'), 1.0, 'passagem recente: quase zero (24·30/730)');
select is((select score_history from r where code = 'T-7'), 9.0, 'duas passagens: 24·365/730 − 3 = 9');
select is((select times_at_client from r where code = 'T-7'), 2, 'conta as passagens pelo cliente');
select ok((select score_history from r where code = 'T-4') < 30, 'antiga nunca empata com inédita');

-- A mesma obra continua sendo sugerida em outro cliente sem penalidade
select is((select score_history from recommend_artworks(tests.space('T-Sala')) where code = 'T-7'), 30.0,
  'histórico é por cliente (T-7 passou duas vezes pelo hotel, é inédita na empresa)');

-- ---------------------------------------------------------- regra de não repetição
select is((select blocked from r where code = 'T-3'), false, 'obra inédita neste cliente não fica bloqueada');
select is((select blocked from r where code = 'T-4'), true, 'obra que já passou por este cliente fica bloqueada por padrão');
select ok((select r.id from r where code = 'T-4') is not null, 'a obra bloqueada continua aparecendo na lista, só marcada');

select tests.login('leitor@teste.com');
select throws_ok($$ select release_artwork_repeat(
    tests.art('T-4'), (select client_id from client_spaces where id = tests.space('T-Recepção')), 'teste') $$,
  '42501', null, 'leitor não pode liberar repetição');
select tests.login('operador@teste.com');

select lives_ok($$ select release_artwork_repeat(
    tests.art('T-4'), (select client_id from client_spaces where id = tests.space('T-Recepção')), 'Cliente pediu para repetir') $$,
  'libera a repetição da obra para o cliente, com motivo');
select is((select blocked from r where code = 'T-4'), false, 'depois de liberada, a obra deixa de aparecer bloqueada');
select is((select count(*)::int from artwork_repeat_releases where artwork_id = tests.art('T-4')), 1,
  'a liberação fica registrada para auditoria (quem, quando, motivo)');

-- ---------------------------------------------------------- recomendação por cliente
create temp view rc as select * from recommend_artworks_for_client((select id from clients where name = 'T-Hotel'));

select set_eq($$ select code from rc $$, array['T-2', 'T-3', 'T-4', 'T-7'],
  'cruza todos os espaços ativos do cliente, uma linha por obra');
select is((select space_name from rc where code = 'T-3'), 'T-Corredor',
  'escolhe, para cada obra, o espaço do cliente com melhor encaixe');
select is((select blocked from rc where code = 'T-4'), false, 'a liberação já registrada também vale na visão por cliente');

select * from finish();
rollback;
