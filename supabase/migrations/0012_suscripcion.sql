-- ============================================================================
-- 0012_suscripcion.sql
-- Gestión de la suscripción desde el panel: cancelación programada al final
-- del periodo ya pagado, reanudación y cambio de plan.
--
-- El ciclo de facturación va anclado al día de alta (created_at), no al mes
-- natural: si la heladería se dio de alta un día 15, cancelar el 3 de agosto
-- deja el servicio activo hasta el 15 de agosto, y cancelar el 20 de agosto lo
-- deja hasta el 15 de septiembre. Los anclajes 29/30/31 se ajustan solos al
-- último día de los meses cortos, porque sumar meses en Postgres ya clampa.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Fecha en la que la suscripción deja de estar vigente.
-- null = suscripción activa sin cancelación programada.
-- ---------------------------------------------------------------------------
alter table public.heladerias
  add column if not exists cancelada_en timestamptz;

comment on column public.heladerias.cancelada_en is
  'Fin del periodo pagado tras cancelar. null = suscripción vigente. '
  'A partir de esta fecha la carta pública deja de estar accesible.';

-- ---------------------------------------------------------------------------
-- Lectura: el personal siempre ve su propia heladería (aunque la suscripción
-- haya vencido, para poder reactivarla desde el panel); el público solo la ve
-- si está activa y la suscripción sigue vigente.
-- ---------------------------------------------------------------------------
drop policy if exists heladerias_miembros_select on public.heladerias;
create policy heladerias_miembros_select on public.heladerias
  for select to authenticated
  using (id = public.heladeria_actual());

drop policy if exists heladerias_public_select on public.heladerias;
create policy heladerias_public_select on public.heladerias
  for select to anon, authenticated
  using (
    activa = true
    and (cancelada_en is null or cancelada_en > now())
  );

-- ---------------------------------------------------------------------------
-- El plan y el estado de la suscripción no se tocan con un update normal: la
-- política de update deja al personal editar su heladería, así que sin esto
-- cualquiera podría ponerse un plan superior desde el cliente. Solo pasan los
-- cambios hechos desde las funciones de abajo (security definer, se ejecutan
-- como el propietario) o desde service_role.
-- ---------------------------------------------------------------------------
create or replace function public.heladerias_proteger_suscripcion()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (
       new.plan is distinct from old.plan
       or new.activa is distinct from old.activa
       or new.cancelada_en is distinct from old.cancelada_en
     )
  then
    raise exception 'La suscripción solo se gestiona desde el panel de plan';
  end if;
  return new;
end;
$$;

drop trigger if exists heladerias_proteger_suscripcion on public.heladerias;
create trigger heladerias_proteger_suscripcion
  before update on public.heladerias
  for each row execute function public.heladerias_proteger_suscripcion();

-- ---------------------------------------------------------------------------
-- Comprueba que quien llama es el propietario y devuelve su heladería.
-- ---------------------------------------------------------------------------
create or replace function public.heladeria_del_owner()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hid uuid;
  v_rol rol_perfil;
begin
  select heladeria_id, rol into v_hid, v_rol
  from public.perfiles where id = auth.uid();

  if v_hid is null then
    raise exception 'No autenticado';
  end if;
  if v_rol is distinct from 'owner' then
    raise exception 'Solo el propietario puede gestionar la suscripción';
  end if;

  return v_hid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancela al final del periodo en curso y devuelve la fecha de corte.
-- Si ya estaba cancelada, devuelve la fecha existente sin recalcular (así una
-- segunda llamada no alarga el servicio ni revive una cuenta ya vencida).
-- ---------------------------------------------------------------------------
create or replace function public.cancelar_suscripcion()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hid uuid := public.heladeria_del_owner();
  v_created timestamptz;
  v_cancelada timestamptz;
  v_meses int;
begin
  select created_at, cancelada_en into v_created, v_cancelada
  from public.heladerias where id = v_hid;

  if v_cancelada is not null then
    return v_cancelada;
  end if;

  -- Meses completos transcurridos desde el alta + 1 = próximo aniversario.
  v_meses := (extract(year from age(now(), v_created)) * 12
            + extract(month from age(now(), v_created)))::int + 1;
  v_cancelada := v_created + make_interval(months => v_meses);

  update public.heladerias
  set cancelada_en = v_cancelada
  where id = v_hid;

  return v_cancelada;
end;
$$;

-- ---------------------------------------------------------------------------
-- Retira la cancelación programada (o reactiva una cuenta ya vencida).
-- ---------------------------------------------------------------------------
create or replace function public.reanudar_suscripcion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hid uuid := public.heladeria_del_owner();
begin
  update public.heladerias
  set cancelada_en = null
  where id = v_hid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cambio de plan. Solo se aceptan planes a la venta; 'business' todavía no lo
-- está, así que se rechaza aunque llegue desde un cliente manipulado.
-- ---------------------------------------------------------------------------
create or replace function public.cambiar_plan(p_plan plan_heladeria)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hid uuid := public.heladeria_del_owner();
begin
  if p_plan <> 'pro' then
    raise exception 'Ese plan todavía no está disponible';
  end if;

  update public.heladerias
  set plan = p_plan
  where id = v_hid;
end;
$$;
