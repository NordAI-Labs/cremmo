-- ============================================================================
-- 0018_alergenos.sql
-- Alérgenos por producto: los 14 de declaración obligatoria del Reglamento
-- (UE) 1169/2011. Se guardan como array de claves estables (ver lib/alergenos.ts,
-- que tiene la misma lista con sus etiquetas en español).
--
-- Se usa text[] con check en vez de un enum porque la lista es cerrada por ley
-- y no va a crecer: así se evita el baile de "añadir valor al enum en una
-- migración aparte" que ya arrastramos con plan_heladeria (ver 0015/0016).
--
-- Los alérgenos son la base del Asistente IA de la carta (planes Pro y
-- Business): sin esto no puede responder a "¿esto lleva frutos secos?".
-- Por ahora solo cuelgan del producto, no de cada opción/sabor.
-- ============================================================================

alter table public.productos
  add column if not exists alergenos text[] not null default '{}';

comment on column public.productos.alergenos is
  'Claves de los 14 alérgenos UE presentes en el producto (lib/alergenos.ts). '
  'Array vacío = el producto no declara ninguno (no equivale a "sin alérgenos").';

-- Solo claves conocidas: cualquier valor fuera de la lista es un error de la
-- app, no un dato del usuario (el panel envía checkboxes de una lista fija).
alter table public.productos
  drop constraint if exists productos_alergenos_validos;
alter table public.productos
  add constraint productos_alergenos_validos check (
    alergenos <@ array[
      'gluten',
      'crustaceos',
      'huevos',
      'pescado',
      'cacahuetes',
      'soja',
      'lacteos',
      'frutos_cascara',
      'apio',
      'mostaza',
      'sesamo',
      'sulfitos',
      'altramuces',
      'moluscos'
    ]::text[]
  );

-- (Sin cambios de RLS: la columna hereda las políticas de `productos`, que ya
-- permiten lectura pública de los productos disponibles.)
