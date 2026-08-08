-- ============================================================================
-- 0002_rls.sql
-- Row Level Security (RLS) para el aislamiento multi-tenant.
--   * El personal autenticado solo accede a filas de SU heladería.
--   * El cliente anónimo (anon) puede leer el catálogo público.
--   * La creación de pedidos se hace por backend (service_role), no por anon.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: heladeria del usuario logueado.
-- SECURITY DEFINER para poder leer `perfiles` sin recursión de RLS.
-- ---------------------------------------------------------------------------
create or replace function public.heladeria_actual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select heladeria_id from public.perfiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Onboarding: crea la heladería y el perfil (owner) del usuario actual de
-- forma atómica. SECURITY DEFINER para poder insertar en tablas con RLS.
-- ---------------------------------------------------------------------------
create or replace function public.onboarding_crear_heladeria(
  p_nombre text,
  p_slug text,
  p_nombre_usuario text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_heladeria_id uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- Un usuario solo puede pertenecer a una heladería en esta fase.
  if exists (select 1 from public.perfiles where id = v_uid) then
    raise exception 'El usuario ya tiene una heladería asociada';
  end if;

  insert into public.heladerias (nombre, slug)
  values (p_nombre, p_slug)
  returning id into v_heladeria_id;

  insert into public.perfiles (id, heladeria_id, nombre, rol)
  values (v_uid, v_heladeria_id, coalesce(p_nombre_usuario, p_nombre), 'owner');

  return v_heladeria_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Activar RLS en todas las tablas de negocio.
-- ---------------------------------------------------------------------------
alter table public.heladerias        enable row level security;
alter table public.perfiles          enable row level security;
alter table public.mesas             enable row level security;
alter table public.categorias        enable row level security;
alter table public.productos         enable row level security;
alter table public.grupos_opciones   enable row level security;
alter table public.opciones          enable row level security;
alter table public.promociones       enable row level security;
alter table public.promocion_items   enable row level security;
alter table public.pedidos           enable row level security;
alter table public.pedido_items      enable row level security;

-- ---------------------------------------------------------------------------
-- heladerias
-- ---------------------------------------------------------------------------
drop policy if exists heladerias_public_select on public.heladerias;
create policy heladerias_public_select on public.heladerias
  for select to anon, authenticated
  using (activa = true);

drop policy if exists heladerias_staff_update on public.heladerias;
create policy heladerias_staff_update on public.heladerias
  for update to authenticated
  using (id = public.heladeria_actual())
  with check (id = public.heladeria_actual());

-- (INSERT de heladerias solo vía onboarding_crear_heladeria)

-- ---------------------------------------------------------------------------
-- perfiles
-- ---------------------------------------------------------------------------
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
  for select to authenticated
  using (id = auth.uid() or heladeria_id = public.heladeria_actual());

drop policy if exists perfiles_update on public.perfiles;
create policy perfiles_update on public.perfiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- mesas (lectura pública para validar el token del QR)
-- ---------------------------------------------------------------------------
drop policy if exists mesas_public_select on public.mesas;
create policy mesas_public_select on public.mesas
  for select to anon, authenticated
  using (activa = true or heladeria_id = public.heladeria_actual());

drop policy if exists mesas_staff_all on public.mesas;
create policy mesas_staff_all on public.mesas
  for all to authenticated
  using (heladeria_id = public.heladeria_actual())
  with check (heladeria_id = public.heladeria_actual());

-- ---------------------------------------------------------------------------
-- categorias
-- ---------------------------------------------------------------------------
drop policy if exists categorias_public_select on public.categorias;
create policy categorias_public_select on public.categorias
  for select to anon, authenticated
  using (true);

drop policy if exists categorias_staff_all on public.categorias;
create policy categorias_staff_all on public.categorias
  for all to authenticated
  using (heladeria_id = public.heladeria_actual())
  with check (heladeria_id = public.heladeria_actual());

-- ---------------------------------------------------------------------------
-- productos (anon solo ve disponibles)
-- ---------------------------------------------------------------------------
drop policy if exists productos_public_select on public.productos;
create policy productos_public_select on public.productos
  for select to anon
  using (disponible = true);

drop policy if exists productos_staff_all on public.productos;
create policy productos_staff_all on public.productos
  for all to authenticated
  using (heladeria_id = public.heladeria_actual())
  with check (heladeria_id = public.heladeria_actual());

-- ---------------------------------------------------------------------------
-- grupos_opciones
-- ---------------------------------------------------------------------------
drop policy if exists grupos_opciones_public_select on public.grupos_opciones;
create policy grupos_opciones_public_select on public.grupos_opciones
  for select to anon
  using (true);

drop policy if exists grupos_opciones_staff_all on public.grupos_opciones;
create policy grupos_opciones_staff_all on public.grupos_opciones
  for all to authenticated
  using (heladeria_id = public.heladeria_actual())
  with check (heladeria_id = public.heladeria_actual());

-- ---------------------------------------------------------------------------
-- opciones (no tiene heladeria_id: se resuelve por su grupo)
-- ---------------------------------------------------------------------------
drop policy if exists opciones_public_select on public.opciones;
create policy opciones_public_select on public.opciones
  for select to anon
  using (disponible = true);

drop policy if exists opciones_staff_all on public.opciones;
create policy opciones_staff_all on public.opciones
  for all to authenticated
  using (
    grupo_id in (
      select id from public.grupos_opciones
      where heladeria_id = public.heladeria_actual()
    )
  )
  with check (
    grupo_id in (
      select id from public.grupos_opciones
      where heladeria_id = public.heladeria_actual()
    )
  );

-- ---------------------------------------------------------------------------
-- promociones (anon solo ve activas)
-- ---------------------------------------------------------------------------
drop policy if exists promociones_public_select on public.promociones;
create policy promociones_public_select on public.promociones
  for select to anon
  using (activa = true);

drop policy if exists promociones_staff_all on public.promociones;
create policy promociones_staff_all on public.promociones
  for all to authenticated
  using (heladeria_id = public.heladeria_actual())
  with check (heladeria_id = public.heladeria_actual());

-- ---------------------------------------------------------------------------
-- promocion_items
-- ---------------------------------------------------------------------------
drop policy if exists promocion_items_public_select on public.promocion_items;
create policy promocion_items_public_select on public.promocion_items
  for select to anon
  using (true);

drop policy if exists promocion_items_staff_all on public.promocion_items;
create policy promocion_items_staff_all on public.promocion_items
  for all to authenticated
  using (
    promocion_id in (
      select id from public.promociones
      where heladeria_id = public.heladeria_actual()
    )
  )
  with check (
    promocion_id in (
      select id from public.promociones
      where heladeria_id = public.heladeria_actual()
    )
  );

-- ---------------------------------------------------------------------------
-- pedidos (creación por backend/service_role; personal gestiona los suyos)
-- ---------------------------------------------------------------------------
drop policy if exists pedidos_staff_all on public.pedidos;
create policy pedidos_staff_all on public.pedidos
  for all to authenticated
  using (heladeria_id = public.heladeria_actual())
  with check (heladeria_id = public.heladeria_actual());

-- ---------------------------------------------------------------------------
-- pedido_items
-- ---------------------------------------------------------------------------
drop policy if exists pedido_items_staff_all on public.pedido_items;
create policy pedido_items_staff_all on public.pedido_items
  for all to authenticated
  using (
    pedido_id in (
      select id from public.pedidos where heladeria_id = public.heladeria_actual()
    )
  )
  with check (
    pedido_id in (
      select id from public.pedidos where heladeria_id = public.heladeria_actual()
    )
  );
