-- =====================================================================
-- 0004 · Storage de fotos (obras e espaços)
-- Bucket público para leitura (URLs estáveis em <img>); escrita só autenticada
-- com permissão. Se preferir privado, troque public=false e use signed URLs.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('acervo', 'acervo', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "acervo_read"   on storage.objects for select to authenticated using (bucket_id = 'acervo');
create policy "acervo_insert" on storage.objects for insert to authenticated with check (bucket_id = 'acervo' and public.can_write());
create policy "acervo_update" on storage.objects for update to authenticated using (bucket_id = 'acervo' and public.can_write());
create policy "acervo_delete" on storage.objects for delete to authenticated using (bucket_id = 'acervo' and public.can_write());
