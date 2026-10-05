-- =====================================================================
-- 0013 · Foto do artista
--   Mesmo padrão já usado em ambientes/espaços/clientes: uma foto só,
--   guardada em artists.photo_path, enviada em artistas/{artistId}/{uuid}/original.{ext}.
-- =====================================================================

alter table artists add column photo_path text;

drop policy if exists "acervo_insert" on storage.objects;
create policy "acervo_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'acervo' and public.can_write()
              and (storage.foldername(name))[1] in ('obras', 'espacos', 'ambientes', 'clientes', 'artistas'));
