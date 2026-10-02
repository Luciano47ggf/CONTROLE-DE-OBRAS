begin;
\ir _fixtures.psql
select plan(8);

select is((select email from profiles where id = 'a0000000-0000-0000-0000-000000000002'), 'operador@teste.com',
  'perfil nasce com o e-mail do Auth');

update auth.users set email = 'novo@teste.com' where id = 'a0000000-0000-0000-0000-000000000002';
select is((select email from profiles where id = 'a0000000-0000-0000-0000-000000000002'), 'novo@teste.com',
  'troca de e-mail no Auth reflete no perfil');

-- primeiro usuário de uma base vazia vira admin; os seguintes, operador
select is((select role from profiles where id = 'a0000000-0000-0000-0000-000000000003'), 'leitura'::user_role,
  'papéis das fixtures aplicados');
insert into auth.users (id, email, raw_user_meta_data)
  values ('a0000000-0000-0000-0000-000000000009', 'novato@teste.com', '{"full_name": "Novato"}');
select is((select row(role, full_name) from profiles where id = 'a0000000-0000-0000-0000-000000000009'),
  row('operador'::user_role, 'Novato'::text), 'novo usuário entra como operador com o nome informado');

select tests.login('leitor@teste.com');
set local role authenticated;
select throws_ok($$ update profiles set email = 'x@x.com' where email = 'leitor@teste.com' $$,
  '42501', null, 'e-mail não é alterado pelo perfil (sem privilégio na coluna)');
select throws_like($$ update profiles set active = false where email = 'leitor@teste.com' $$,
  '%Somente administradores%', 'usuário não desativa a si mesmo nem outros sem ser admin');

-- atividade derivada das movimentações
select tests.login('novo@teste.com');
select install_artwork(tests.art('T-7'), tests.space('T-Corredor'));
select is((select movements from v_users where email = 'novo@teste.com'), 1, 'v_users conta movimentações do usuário');
select ok((select last_movement_at from v_users where email = 'novo@teste.com') is not null, 'v_users mostra a última movimentação');

select * from finish();
rollback;
