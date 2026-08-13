-- ============================================================================
-- 0017_valoraciones_app.sql
-- Valoración de la app (no de la heladería): cada heladería puede dejar una
-- puntuación y un comentario sobre Cremmo, una sola vez en toda su vida como
-- cliente (índice único por heladeria_id). El panel deja de pedirla en cuanto
-- existe la fila (ver dashboard/layout.tsx).
--
-- `publicada` nace en false siempre: no hay pantalla de moderación todavía,
-- así que para que una valoración salga en la landing (mezclada con las de
-- lib/resenas.ts) hay que aprobarla a mano desde el SQL Editor de Supabase:
--   update public.valoraciones_app set publicada = true where id = '...';
-- ============================================================================

create table if not exists public.valoraciones_app (
  id uuid primary key default gen_random_uuid(),
  heladeria_id uuid not null references public.heladerias(id) on delete cascade,
  puntuacion smallint not null check (puntuacion between 1 and 5),
  comentario text,
  publicada boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.valoraciones_app is
  'Valoración de la propia app Cremmo hecha por una heladería (no confundir '
  'con reseñas de la heladería a sus clientes finales, que no existen hoy).';
comment on column public.valoraciones_app.publicada is
  'true = se muestra en la sección de reseñas de la landing. Se aprueba a '
  'mano; no hay pantalla de moderación todavía.';

-- Una heladería solo deja una valoración en toda su vida como cliente.
create unique index if not exists idx_valoraciones_app_heladeria
  on public.valoraciones_app(heladeria_id);

alter table public.valoraciones_app enable row level security;

-- Lectura pública: solo las aprobadas, para la sección de reseñas de la landing.
drop policy if exists valoraciones_app_public_select on public.valoraciones_app;
create policy valoraciones_app_public_select on public.valoraciones_app
  for select to anon, authenticated
  using (publicada = true);

-- El personal de la heladería también puede ver la suya aunque no esté publicada.
drop policy if exists valoraciones_app_staff_select on public.valoraciones_app;
create policy valoraciones_app_staff_select on public.valoraciones_app
  for select to authenticated
  using (heladeria_id = public.heladeria_actual());

-- Solo el propietario puede dejar la valoración (coincide con quién ve el
-- modal en el panel, ver dashboard/layout.tsx).
drop policy if exists valoraciones_app_owner_insert on public.valoraciones_app;
create policy valoraciones_app_owner_insert on public.valoraciones_app
  for insert to authenticated
  with check (
    heladeria_id = public.heladeria_actual()
    and exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'owner'
    )
  );

-- (Sin políticas de update/delete: una valoración enviada no se puede tocar.)
