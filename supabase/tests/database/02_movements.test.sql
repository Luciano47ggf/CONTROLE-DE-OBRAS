begin;
\ir _fixtures.psql
select plan(38);

select tests.login('operador@teste.com');
set local role authenticated;

-- ---------------------------------------------------------- instalação
select isnt(install_artwork(tests.art('T-3'), tests.space('T-Corredor')), null, 'instala obra disponível');
select is((select status from artworks where code = 'T-3'), 'instalada'::artwork_status, 'status vira instalada');
select is((select expected_swap_at from installations where artwork_id = tests.art('T-3') and removed_at is null),
          current_date + 90, 'prazo padrão de 90 dias');
select is((select count(*)::int from artwork_movements where artwork_id = tests.art('T-3')), 2,
          'movimentação registrada (cadastro + instalação)');
select is((select user_id from artwork_movements where artwork_id = tests.art('T-3') and to_status = 'instalada'),
          'a0000000-0000-0000-0000-000000000002'::uuid, 'movimentação guarda o usuário');
select is((select current_space_name from v_artworks where code = 'T-3'), 'T-Corredor', 'localização atual derivada');

select throws_ok($$ select install_artwork(tests.art('T-3'), tests.space('T-Sala')) $$,
  'P0001', null, 'obra já instalada não pode ser instalada de novo');
select throws_like($$ select install_artwork(tests.art('T-1'), tests.space('T-Recepção')) $$,
  '%não cabe%', 'margem de segurança impede obra que só cabe na parede bruta');
select throws_like($$ select install_artwork(tests.art('T-7'), tests.space('T-Sala'), current_date + 1) $$,
  '%futuro%', 'data de instalação no futuro é recusada');
select throws_like($$ select install_artwork(tests.art('T-5'), tests.space('T-Sala')) $$,
  '%não pode ser instalada%', 'obra em manutenção não é instalada');

-- ---------------------------------------------------------- substituição
select isnt(install_artwork(tests.art('T-7'), tests.space('T-Corredor'), current_date, null, null, null,
  (select id from installations where artwork_id = tests.art('T-3') and removed_at is null)), null,
  'substituição confirmada instala a nova obra no lugar de uma específica');
select is((select status from artworks where code = 'T-3'), 'disponivel'::artwork_status, 'obra substituída volta ao estoque');
select is((select removed_at from installations where artwork_id = tests.art('T-3')), current_date, 'instalação anterior encerrada');
select is((select count(*)::int from installations where space_id = tests.space('T-Corredor') and removed_at is null), 1,
  'espaço segue com uma única obra');
select throws_like($$ select install_artwork(tests.art('T-3'), tests.space('T-Corredor'), current_date, null, null, null,
  '00000000-0000-0000-0000-000000000000'::uuid) $$,
  '%não está mais instalada%', 'não dá para substituir uma instalação inexistente ou de outro espaço');

-- ---------------------------------------------------------- prazos em cascata
reset role;
update clients set default_swap_days = 60 where name = 'T-Empresa';
set local role authenticated;
select install_artwork(tests.art('T-3'), tests.space('T-Sala'));
select is((select expected_swap_at - installed_at from installations where artwork_id = tests.art('T-3') and removed_at is null),
  60, 'prazo do cliente sobrepõe o padrão');
reset role;
update client_spaces set swap_days = 30 where name = 'T-Recepção';
set local role authenticated;
select install_artwork(tests.art('T-2'), tests.space('T-Recepção'), current_date - 5);
select is((select expected_swap_at from installations where artwork_id = tests.art('T-2') and removed_at is null),
  current_date + 25, 'prazo do espaço sobrepõe o cliente e conta a partir da data de instalação');

-- ---------------------------------------------------- várias obras por espaço
select isnt(install_artwork(tests.art('T-4'), tests.space('T-Recepção'), current_date, 7), null,
  'um espaço pode receber mais de uma obra ao mesmo tempo, sem precisar substituir a que já está lá');
select is((select expected_swap_at - installed_at from installations where artwork_id = tests.art('T-4') and removed_at is null),
  7, 'prazo informado na instalação sobrepõe tudo');
select is((select count(*)::int from installations where space_id = tests.space('T-Recepção') and removed_at is null), 2,
  'a Recepção acumula T-2 e T-4 ao mesmo tempo');

-- ---------------------------------------------------------- retirada
select throws_like($$ select return_artwork(
    (select id from installations where artwork_id = tests.art('T-4') and removed_at is null), current_date - 1) $$,
  '%anterior à instalação%', 'retirada antes da instalação é recusada');
select throws_like($$ select return_artwork(
    (select id from installations where artwork_id = tests.art('T-4') and removed_at is null), current_date, 'instalada') $$,
  '%Após a retirada%', 'retirada não pode deixar a obra como instalada');
select lives_ok($$ select return_artwork(
    (select id from installations where artwork_id = tests.art('T-4') and removed_at is null), current_date, 'em_manutencao', 'Moldura') $$,
  'retirada para manutenção');
select is((select status from artworks where code = 'T-4'), 'em_manutencao'::artwork_status, 'status vira em manutenção');
select is((select notes from artwork_movements where artwork_id = tests.art('T-4') order by id desc limit 1), 'Moldura',
  'observação da retirada registrada');
select throws_like($$ select return_artwork((select id from installations where artwork_id = tests.art('T-4'))) $$,
  '%já foi encerrada%', 'instalação encerrada não é retirada de novo');
select lives_ok($$ select set_artwork_status(tests.art('T-4'), 'disponivel', 'Reparada') $$, 'manutenção volta para disponível');
select throws_like($$ select set_artwork_status(tests.art('T-7'), 'em_manutencao') $$,
  '%Registre a retirada%', 'obra instalada não muda de status sem retirada');
select throws_like($$ select set_artwork_status(tests.art('T-4'), 'instalada') $$,
  '%Use as ações%', 'set_artwork_status não instala');

-- ---------------------------------------------------------- reserva
select lives_ok($$ select reserve_artwork(tests.art('T-4'), tests.space('T-Recepção')) $$, 'reserva obra disponível');
select is((select reserved_space_id from artworks where code = 'T-4'), tests.space('T-Recepção'), 'reserva guarda o destino');
select lives_ok($$ select dispatch_artwork(tests.art('T-4')) $$, 'envia obra reservada');
select throws_like($$ select install_artwork(tests.art('T-4'), tests.space('T-Sala')) $$,
  '%não pode ser instalada aqui%', 'obra a caminho só é instalada no destino reservado');
select lives_ok($$ select cancel_reservation(tests.art('T-4')) $$, 'cancela reserva em transporte');
select is((select row(status, reserved_space_id) from artworks where code = 'T-4'),
  row('disponivel'::artwork_status, null::uuid), 'cancelamento limpa destino e devolve ao estoque');

-- ---------------------------------------------------------- semáforo e histórico
reset role;
update installations set installed_at = current_date - 85, expected_swap_at = current_date + 5
 where artwork_id = tests.art('T-7') and removed_at is null;
update installations set installed_at = current_date - 70, expected_swap_at = current_date - 10
 where artwork_id = tests.art('T-3') and removed_at is null;
set local role authenticated;
select is((select swap_status from v_active_installations where artwork_code = 'T-7'), 'amarelo', 'troca em 5 dias fica amarela');
select is((select swap_status from v_active_installations where artwork_code = 'T-3'), 'vermelho', 'troca vencida fica vermelha');
select is((select count(*)::int from v_installation_history where artwork_code = 'T-3'), 2,
  'histórico da obra mostra as duas passagens');

select * from finish();
rollback;
