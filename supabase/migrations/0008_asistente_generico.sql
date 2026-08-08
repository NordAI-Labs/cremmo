-- ============================================================================
-- 0008_asistente_generico.sql
-- El asistente por pasos deja de ser exclusivo de los helados: cualquier
-- categoría (gofres, crepes, tortitas…) puede usarlo.
--   * `tipo_categoria`: el valor 'helado' pasa a llamarse 'asistente'.
--   * Cada categoría define el icono y los textos de su tarjeta en la carta.
-- La configuración de los pasos (grupos_opciones con categoria_id) no cambia:
-- ya era genérica.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Renombrar el valor del enum.
-- Postgres no permite borrar valores de un enum, así que se recrea el tipo.
-- El bloque solo actúa si todavía existe la etiqueta 'helado', de modo que
-- volver a ejecutar la migración no toca nada.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'tipo_categoria' and e.enumlabel = 'helado'
  ) then
    execute 'drop type if exists tipo_categoria_v2';
    execute 'create type tipo_categoria_v2 as enum (''simple'', ''asistente'')';
    execute 'alter table public.categorias alter column tipo drop default';
    execute $conv$
      alter table public.categorias
        alter column tipo type tipo_categoria_v2
        using (
          case tipo::text when 'helado' then 'asistente' else 'simple' end
        )::tipo_categoria_v2
    $conv$;
    execute 'alter table public.categorias alter column tipo set default ''simple''';
    execute 'drop type tipo_categoria';
    execute 'alter type tipo_categoria_v2 rename to tipo_categoria';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Presentación de la tarjeta que abre el asistente en la carta pública.
--    `asistente_icono` guarda un identificador del catálogo de iconos de la
--    app (cucurucho, tarrina, gofre…), nunca un SVG arbitrario.
-- ---------------------------------------------------------------------------
alter table public.categorias
  add column if not exists asistente_icono text,
  add column if not exists asistente_titulo text,
  add column if not exists asistente_descripcion text;

-- ---------------------------------------------------------------------------
-- 3) Las categorías que ya usaban el asistente conservan el aspecto actual.
-- ---------------------------------------------------------------------------
update public.categorias
set
  asistente_icono = coalesce(asistente_icono, 'cucurucho'),
  asistente_titulo = coalesce(asistente_titulo, 'Crea tu helado'),
  asistente_descripcion = coalesce(
    asistente_descripcion,
    'Elige formato, tamaño, sabores y toppings.'
  )
where tipo = 'asistente';
