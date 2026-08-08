-- ============================================================================
-- 0007_estadisticas.sql
-- Funciones de agregación para el panel de estadísticas de la heladería.
--   * Se ejecutan como SECURITY INVOKER: la RLS de `pedidos` / `pedido_items`
--     ya limita las filas a la heladería del usuario. Además se filtra de forma
--     explícita por heladeria_actual() para dejarlo evidente.
--   * Los pedidos cancelados NO cuentan en ninguna métrica.
--   * Agregar en SQL evita traerse miles de filas al servidor de Next.js y el
--     límite de 1000 filas por petición de PostgREST.
-- ============================================================================

-- Índice para los filtros por rango de fechas del panel.
create index if not exists idx_pedidos_heladeria_fecha
  on public.pedidos(heladeria_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Resumen de un periodo: nº de pedidos, facturación y unidades vendidas.
-- Con p_desde / p_hasta a null devuelve el histórico completo.
-- ---------------------------------------------------------------------------
create or replace function public.estadisticas_resumen(
  p_desde timestamptz default null,
  p_hasta timestamptz default null
)
returns table (
  total_pedidos bigint,
  facturacion numeric,
  unidades bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with ped as (
    select p.id, p.total
    from public.pedidos p
    where p.heladeria_id = public.heladeria_actual()
      and p.estado <> 'cancelado'
      and (p_desde is null or p.created_at >= p_desde)
      and (p_hasta is null or p.created_at < p_hasta)
  )
  select
    (select count(*) from ped)::bigint,
    (select coalesce(sum(ped.total), 0) from ped)::numeric,
    (
      select coalesce(sum(i.cantidad), 0)
      from public.pedido_items i
      join ped on ped.id = i.pedido_id
    )::bigint;
$$;

-- ---------------------------------------------------------------------------
-- Ventas agrupadas por día natural en la zona horaria de la heladería.
-- ---------------------------------------------------------------------------
create or replace function public.estadisticas_por_dia(
  p_desde timestamptz,
  p_hasta timestamptz,
  p_zona text default 'Europe/Madrid'
)
returns table (
  dia date,
  total_pedidos bigint,
  facturacion numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (p.created_at at time zone p_zona)::date,
    count(*)::bigint,
    coalesce(sum(p.total), 0)::numeric
  from public.pedidos p
  where p.heladeria_id = public.heladeria_actual()
    and p.estado <> 'cancelado'
    and p.created_at >= p_desde
    and p.created_at < p_hasta
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Ranking de productos por unidades vendidas.
-- Agrupa por `nombre_producto` (el snapshot guardado en la línea del pedido):
-- así siguen contando los productos borrados y los helados construidos desde
-- una categoría-asistente, que no tienen producto_id.
-- Con p_desde / p_hasta a null devuelve el ranking histórico.
-- ---------------------------------------------------------------------------
create or replace function public.estadisticas_top_productos(
  p_desde timestamptz default null,
  p_hasta timestamptz default null,
  p_limite int default 10
)
returns table (
  nombre text,
  unidades bigint,
  facturacion numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    i.nombre_producto,
    sum(i.cantidad)::bigint,
    coalesce(sum(i.subtotal), 0)::numeric
  from public.pedido_items i
  join public.pedidos p on p.id = i.pedido_id
  where p.heladeria_id = public.heladeria_actual()
    and p.estado <> 'cancelado'
    and (p_desde is null or p.created_at >= p_desde)
    and (p_hasta is null or p.created_at < p_hasta)
  group by i.nombre_producto
  order by 2 desc, 3 desc
  limit greatest(coalesce(p_limite, 10), 1);
$$;
