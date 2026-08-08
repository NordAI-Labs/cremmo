-- ============================================================================
-- 0006_categoria_asistente.sql
-- El asistente de helado pasa a configurarse a NIVEL DE CATEGORÍA (no producto).
-- La heladería define una vez, en la categoría "Helados":
--   Formatos (cucurucho/tarrina/copa) · Tamaños (con precio y nº de sabores) ·
--   Sabores · Toppings.
-- El cliente ve la categoría como un único acceso y construye su helado.
-- ============================================================================

-- 1) Tipo de categoría: 'simple' (catálogo normal) | 'helado' (usa el asistente)
do $$ begin
  create type tipo_categoria as enum ('simple', 'helado');
exception when duplicate_object then null; end $$;

alter table public.categorias
  add column if not exists tipo tipo_categoria not null default 'simple';

-- 2) Los grupos de opciones ahora pueden colgar de una CATEGORÍA además de un
--    producto. Para categorías-asistente: categoria_id set, producto_id null.
alter table public.grupos_opciones
  add column if not exists categoria_id uuid
    references public.categorias(id) on delete cascade;

create index if not exists idx_grupos_opciones_categoria
  on public.grupos_opciones(categoria_id);
