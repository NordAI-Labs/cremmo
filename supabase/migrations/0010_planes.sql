-- ============================================================================
-- 0010_planes.sql
-- Nuevos planes de suscripción: Pro y Business.
--
-- OJO: este archivo SOLO añade los valores al enum. Postgres no permite usar
-- un valor de enum recién creado en la misma transacción, así que el cambio de
-- default de la columna y la función de onboarding van en 0011.
-- Ejecuta primero este archivo y luego 0011_onboarding_plan.sql.
-- ============================================================================

alter type plan_heladeria add value if not exists 'pro';
alter type plan_heladeria add value if not exists 'business';
