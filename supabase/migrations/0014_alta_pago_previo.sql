-- ============================================================================
-- 0014_alta_pago_previo.sql
-- Soporte para el alta con pago primero: el registro ya no crea el usuario
-- de Supabase, lo crea el webhook de Stripe tras el primer cobro
-- (`lib/stripe/alta.ts`, `completarAlta`).
--
-- Esta función solo cubre un caso raro: si el webhook se reintenta justo
-- después de invitar al usuario por email pero antes de terminar el resto
-- del alta, `inviteUserByEmail` falla la segunda vez porque el email ya
-- existe. La función permite recuperar su id en vez de fallar, sin tener que
-- exponer `auth.users` por la API pública.
-- ============================================================================

create or replace function public.usuario_id_por_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from auth.users where email = p_email limit 1;
$$;

comment on function public.usuario_id_por_email(text) is
  'Uso interno del webhook de Stripe (service_role) para recuperar el id de '
  'un usuario ya invitado cuando se reintenta un alta a medio terminar.';

revoke all on function public.usuario_id_por_email(text) from public;
grant execute on function public.usuario_id_por_email(text) to service_role;
