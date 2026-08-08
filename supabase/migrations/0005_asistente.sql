-- ============================================================================
-- 0005_asistente.sql
-- Soporte para el asistente de pedido guiado por pasos (formato → tamaño →
-- sabores → toppings).
--   * grupos_opciones.rol: rol semántico del grupo (define el paso del asistente)
--   * opciones.max_sabores: cuántos sabores permite CADA opción de tamaño
-- ============================================================================

do $$ begin
  create type rol_grupo as enum (
    'formato', 'tamano', 'sabores', 'toppings', 'generico'
  );
exception when duplicate_object then null; end $$;

alter table public.grupos_opciones
  add column if not exists rol rol_grupo not null default 'generico';

-- Solo tiene sentido en opciones de un grupo con rol = 'tamano':
-- indica el nº máximo de sabores que permite ese tamaño (1, 2, …).
alter table public.opciones
  add column if not exists max_sabores int;
