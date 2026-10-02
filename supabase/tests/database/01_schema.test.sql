begin;
select plan(14);

select has_table('public', t, 'tabela ' || t) from unnest(array[
  'artworks', 'artists', 'clients', 'client_spaces', 'installations', 'artwork_movements', 'app_settings'
]) t;

select enum_has_labels('public', 'artwork_status', array[
  'disponivel', 'reservada', 'em_transporte', 'instalada', 'em_manutencao', 'em_restauracao', 'indisponivel'
], 'status de obra completos');

select has_index('public', 'installations', 'installations_active_artwork_uq', 'uma instalação ativa por obra');
select has_index('public', 'installations', 'installations_active_space_uq', 'uma instalação ativa por espaço');

select is_empty($$
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
$$, 'RLS ligado em todas as tabelas públicas');

select is_empty($$
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and not coalesce('security_invoker=true' = any(c.reloptions), false)
$$, 'todas as views respeitam o RLS de quem consulta (security_invoker)');

select is((select count(*)::int from app_settings), 1, 'configuração é linha única');

select is_empty($$
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')
$$, 'funções security definer fixam search_path');

select * from finish();
rollback;
