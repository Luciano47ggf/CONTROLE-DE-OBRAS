begin;
\ir _fixtures.psql
select plan(14);

select tests.login('operador@teste.com');
set local role authenticated;

insert into artwork_photos (artwork_id, original_path, display_path, thumb_path)
values (tests.art('T-2'), 'obras/a/1-o', 'obras/a/1-d', 'obras/a/1-t'),
       (tests.art('T-2'), 'obras/a/2-o', 'obras/a/2-d', 'obras/a/2-t'),
       (tests.art('T-2'), 'obras/a/3-o', 'obras/a/3-d', 'obras/a/3-t');

select is((select display_path from artwork_photos where is_cover and artwork_id = tests.art('T-2')), 'obras/a/1-d',
  'primeira foto vira capa automaticamente');
select is((select array_agg(position order by created_at, original_path) from artwork_photos where artwork_id = tests.art('T-2')),
  array[1, 2, 3], 'posições sequenciais');
select throws_like($$ insert into artwork_photos (artwork_id, original_path, display_path, thumb_path, is_cover)
                     values (tests.art('T-2'), 'x-o', 'x-d', 'x-t', true) $$,
  '%já tem capa%', 'não aceita segunda capa na inserção');

select lives_ok($$ select set_cover_photo((select id from artwork_photos where original_path = 'obras/a/3-o')) $$, 'troca a capa');
select is((select count(*)::int from artwork_photos where is_cover and artwork_id = tests.art('T-2')), 1, 'continua com uma única capa');
select is((select photo_thumb_path from v_artworks where code = 'T-2'), 'obras/a/3-t', 'view expõe a miniatura da capa');
select is((select photo_count from v_artworks where code = 'T-2'), 3, 'view conta as fotos');
select is((select photo_thumb_path from recommend_artworks(tests.space('T-Recepção')) where code = 'T-2'), 'obras/a/3-t',
  'recomendação traz a miniatura da capa');

delete from artwork_photos where original_path = 'obras/a/3-o';
select is((select display_path from artwork_photos where is_cover and artwork_id = tests.art('T-2')), 'obras/a/1-d',
  'ao apagar a capa, a primeira da ordem assume');

select lives_ok($$ select reorder_artwork_photos(tests.art('T-2'),
  array[(select id from artwork_photos where original_path = 'obras/a/2-o'), (select id from artwork_photos where original_path = 'obras/a/1-o')]) $$,
  'reordena');
select is((select original_path from artwork_photos where artwork_id = tests.art('T-2') order by position limit 1), 'obras/a/2-o',
  'nova ordem aplicada');
select throws_like($$ select reorder_artwork_photos(tests.art('T-2'), array[(select id from artwork_photos where original_path = 'obras/a/2-o')]) $$,
  '%exatamente as fotos%', 'reordenação incompleta é recusada');

select throws_ok($$ update artwork_photos set display_path = 'outro' $$, '42501', null, 'caminhos dos arquivos não são editáveis');

select tests.login('leitor@teste.com');
select throws_ok($$ insert into artwork_photos (artwork_id, original_path, display_path, thumb_path)
                    values (tests.art('T-3'), 'l-o', 'l-d', 'l-t') $$, '42501', null, 'leitor não envia fotos');

select * from finish();
rollback;
