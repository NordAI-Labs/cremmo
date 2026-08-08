-- ============================================================================
-- 0011_onboarding_plan.sql
-- Usa los planes añadidos en 0010: nuevo default, migración de las heladerías
-- existentes y alta con el plan elegido en el registro.
-- Requiere que 0010_planes.sql ya esté aplicado (y confirmado).
-- ============================================================================

-- 1) Las cuentas nuevas nacen en Pro.
alter table public.heladerias alter column plan set default 'pro';

-- 2) Las heladerías creadas antes de existir los planes pasan a Pro.
update public.heladerias set plan = 'pro' where plan = 'basico';

-- ---------------------------------------------------------------------------
-- 3) El alta recibe el plan elegido en el registro.
--    El plan llega validado desde el servidor de Next (solo se aceptan planes
--    contratables), pero aquí se vuelve a acotar: cualquier otro valor cae a
--    'pro' para que nadie se dé de alta en un plan que aún no está a la venta.
-- ---------------------------------------------------------------------------
create or replace function public.onboarding_crear_heladeria(
  p_nombre text,
  p_slug text,
  p_nombre_usuario text default null,
  p_plan plan_heladeria default 'pro'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_heladeria_id uuid;
  v_plan plan_heladeria := case when p_plan = 'pro' then p_plan else 'pro' end;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- Un usuario solo puede pertenecer a una heladería en esta fase.
  if exists (select 1 from public.perfiles where id = v_uid) then
    raise exception 'El usuario ya tiene una heladería asociada';
  end if;

  insert into public.heladerias (nombre, slug, plan)
  values (p_nombre, p_slug, v_plan)
  returning id into v_heladeria_id;

  insert into public.perfiles (id, heladeria_id, nombre, rol)
  values (v_uid, v_heladeria_id, coalesce(p_nombre_usuario, p_nombre), 'owner');

  return v_heladeria_id;
end;
$$;
