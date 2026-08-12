-- ============================================================================
-- 0015_plan_basic.sql
-- Nuevo plan de entrada: Basic. Tiene las mismas funcionalidades que tenía
-- Pro antes de sumar el asistente de IA, a un precio menor.
--
-- OJO: igual que en 0010_planes.sql, este archivo SOLO añade el valor al
-- enum. Postgres no permite usar un valor de enum recién creado en la misma
-- transacción, así que el nuevo default y el onboarding van en 0016.
-- Ejecuta primero este archivo y luego 0016_plan_basic_defecto.sql.
-- ============================================================================

alter type plan_heladeria add value if not exists 'basic';
