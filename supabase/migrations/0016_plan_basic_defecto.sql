-- ============================================================================
-- 0016_plan_basic_defecto.sql
-- Usa el plan añadido en 0015: nuevo default de alta y onboarding acepta
-- también 'basic', que pasa a ser el plan de entrada por defecto.
-- Requiere que 0015_plan_basic.sql ya esté aplicado (y confirmado).
-- ============================================================================

-- 1) Las cuentas nuevas nacen en Basic (el plan de entrada más económico).
alter table public.heladerias alter column plan set default 'basic';

-- ---------------------------------------------------------------------------
-- 2) El alta recibe el plan elegido en el registro: ahora 'pro' o 'basic'.
--    El plan llega validado desde el servidor de Next (solo se aceptan planes
--    contratables), pero aquí se vuelve a acotar: cualquier otro valor cae a
--    'basic' para que nadie se dé de alta en un plan que aún no está a la
--    venta (como 'business').
-- ---------------------------------------------------------------------------
create or replace function public.onboarding_crear_heladeria(
  p_nombre text,
  p_slug text,
  p_nombre_usuario text default null,
  p_plan plan_heladeria default 'basic'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_heladeria_id uuid;
  v_plan plan_heladeria := case
    when p_plan in ('pro', 'basic') then p_plan
    else 'basic'
  end;
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
