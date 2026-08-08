-- ============================================================================
-- 0003_storage.sql
-- Bucket público para fotos de productos y promociones.
-- Convención de rutas: <heladeria_id>/<archivo>  (la primera carpeta es el
-- id de la heladería, lo que permite validar la propiedad en las políticas).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('imagenes', 'imagenes', true)
on conflict (id) do nothing;

-- Lectura pública de las imágenes del bucket.
drop policy if exists imagenes_public_read on storage.objects;
create policy imagenes_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'imagenes');

-- El personal solo puede subir/gestionar imágenes dentro de la carpeta de SU
-- heladería (primer segmento de la ruta = heladeria_id del perfil).
drop policy if exists imagenes_staff_insert on storage.objects;
create policy imagenes_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'imagenes'
    and (storage.foldername(name))[1] = public.heladeria_actual()::text
  );

drop policy if exists imagenes_staff_update on storage.objects;
create policy imagenes_staff_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'imagenes'
    and (storage.foldername(name))[1] = public.heladeria_actual()::text
  );

drop policy if exists imagenes_staff_delete on storage.objects;
create policy imagenes_staff_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'imagenes'
    and (storage.foldername(name))[1] = public.heladeria_actual()::text
  );
