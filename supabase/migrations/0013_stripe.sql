-- ============================================================================
-- 0013_stripe.sql
-- Cobro real de la suscripción con Stripe Billing.
--
-- A partir de aquí Stripe es la fuente de verdad del estado de pago. La app
-- solo cachea ese estado en estas columnas, escritas exclusivamente por el
-- webhook (`/api/stripe/webhook`) con la clave service_role, para que RLS y el
-- panel puedan decidir sin llamar a Stripe en cada petición.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Estado de la suscripción cacheado desde Stripe.
--
-- El default se añade como 'activa' y luego se cambia a 'pendiente': así las
-- heladerías que ya existían (anteriores al cobro) se quedan dentro y solo las
-- nuevas nacen esperando el primer pago. Hacerlo en dos pasos, en vez de con
-- un update, deja la migración repetible sin reactivar cuentas sin pagar.
-- ---------------------------------------------------------------------------
alter table public.heladerias
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists suscripcion_estado text not null default 'activa',
  add column if not exists periodo_fin timestamptz;

alter table public.heladerias
  alter column suscripcion_estado set default 'pendiente';

comment on column public.heladerias.stripe_customer_id is
  'Cliente de Stripe (cus_...) al que se le factura la suscripción.';
comment on column public.heladerias.stripe_subscription_id is
  'Suscripción de Stripe (sub_...) en curso.';
comment on column public.heladerias.suscripcion_estado is
  'Estado cacheado desde Stripe: pendiente (sin primer pago), activa, '
  'impago (Stripe reintentando el cobro) o cancelada.';
comment on column public.heladerias.periodo_fin is
  'Fin del periodo facturado en curso, según Stripe.';

alter table public.heladerias
  drop constraint if exists heladerias_suscripcion_estado_check;
alter table public.heladerias
  add constraint heladerias_suscripcion_estado_check
  check (suscripcion_estado in ('pendiente', 'activa', 'impago', 'cancelada'));

create unique index if not exists idx_heladerias_stripe_customer
  on public.heladerias(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists idx_heladerias_stripe_subscription
  on public.heladerias(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ---------------------------------------------------------------------------
-- La carta pública deja de servirse cuando no hay suscripción que la sostenga.
-- 'impago' sigue dentro a propósito: mientras Stripe reintenta el cobro no se
-- corta el servicio, solo se avisa en el panel; el corte llega cuando Stripe
-- da la suscripción por cancelada.
-- ---------------------------------------------------------------------------
drop policy if exists heladerias_public_select on public.heladerias;
create policy heladerias_public_select on public.heladerias
  for select to anon, authenticated
  using (
    activa = true
    and suscripcion_estado in ('activa', 'impago')
    and (cancelada_en is null or cancelada_en > now())
  );

-- ---------------------------------------------------------------------------
-- Mismo blindaje que en 0012, ampliado a las columnas nuevas: nadie que llegue
-- como anon/authenticated puede tocar su propio estado de pago (la política de
-- update de `heladerias` autoriza la fila entera, no columnas sueltas).
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
       or new.suscripcion_estado is distinct from old.suscripcion_estado
       or new.periodo_fin is distinct from old.periodo_fin
       or new.stripe_customer_id is distinct from old.stripe_customer_id
       or new.stripe_subscription_id is distinct from old.stripe_subscription_id
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
-- Se retiran las funciones de 0012: cambiaban el estado de la suscripción en
-- la base de datos sin pasar por Stripe. Con el cobro activo eso sería servicio
-- gratis (`reanudar_suscripcion` limpiaba `cancelada_en` a petición del propio
-- cliente). Ahora todo pasa por la API de Stripe y vuelve por el webhook.
-- ---------------------------------------------------------------------------
drop function if exists public.cancelar_suscripcion();
drop function if exists public.reanudar_suscripcion();
drop function if exists public.cambiar_plan(plan_heladeria);
drop function if exists public.heladeria_del_owner();
