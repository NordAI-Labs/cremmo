-- ============================================================================
-- 0001_schema.sql
-- Esquema base de la plataforma SaaS multi-tenant para heladerías.
-- Cada heladería es un "tenant"; casi todas las tablas llevan heladeria_id.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos (enums)
-- ---------------------------------------------------------------------------
do $$ begin
  create type plan_heladeria as enum ('basico', 'multi_sede');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rol_perfil as enum ('owner', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_grupo_opcion as enum ('unica', 'multiple');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_promocion as enum ('descuento', 'combo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_pedido as enum (
    'pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_pago as enum (
    'no_requerido', 'pendiente', 'pagado', 'fallido'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- heladerias (tenants)
-- ---------------------------------------------------------------------------
create table if not exists public.heladerias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  logo_url text,
  direccion text,
  telefono text,
  plan plan_heladeria not null default 'basico',
  acepta_pagos_online boolean not null default false,
  stripe_account_id text, -- reservado para Stripe Connect (futuro)
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- perfiles (vincula auth.users con su heladería)
-- ---------------------------------------------------------------------------
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  heladeria_id uuid not null references public.heladerias(id) on delete cascade,
  nombre text,
  rol rol_perfil not null default 'owner',
  created_at timestamptz not null default now()
);
create index if not exists idx_perfiles_heladeria on public.perfiles(heladeria_id);

-- ---------------------------------------------------------------------------
-- mesas (cada una tiene un token que codifica el QR)
-- ---------------------------------------------------------------------------
create table if not exists public.mesas (
  id uuid primary key default gen_random_uuid(),
  heladeria_id uuid not null references public.heladerias(id) on delete cascade,
  nombre text not null,
  token text not null unique,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_mesas_heladeria on public.mesas(heladeria_id);

-- ---------------------------------------------------------------------------
-- categorias
-- ---------------------------------------------------------------------------
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  heladeria_id uuid not null references public.heladerias(id) on delete cascade,
  nombre text not null,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_categorias_heladeria on public.categorias(heladeria_id);

-- ---------------------------------------------------------------------------
-- productos
-- ---------------------------------------------------------------------------
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  heladeria_id uuid not null references public.heladerias(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  nombre text not null,
  descripcion text,
  precio numeric(10,2) not null default 0,
  foto_url text,
  disponible boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_productos_heladeria on public.productos(heladeria_id);
create index if not exists idx_productos_categoria on public.productos(categoria_id);

-- ---------------------------------------------------------------------------
-- grupos_opciones (personalización de productos)
-- ---------------------------------------------------------------------------
create table if not exists public.grupos_opciones (
  id uuid primary key default gen_random_uuid(),
  heladeria_id uuid not null references public.heladerias(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete cascade,
  nombre text not null,
  tipo tipo_grupo_opcion not null default 'unica',
  min_selecciones int not null default 0,
  max_selecciones int not null default 1,
  obligatorio boolean not null default false,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_grupos_opciones_heladeria on public.grupos_opciones(heladeria_id);
create index if not exists idx_grupos_opciones_producto on public.grupos_opciones(producto_id);

-- ---------------------------------------------------------------------------
-- opciones
-- ---------------------------------------------------------------------------
create table if not exists public.opciones (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos_opciones(id) on delete cascade,
  nombre text not null,
  precio_extra numeric(10,2) not null default 0,
  disponible boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_opciones_grupo on public.opciones(grupo_id);

-- ---------------------------------------------------------------------------
-- promociones
-- ---------------------------------------------------------------------------
create table if not exists public.promociones (
  id uuid primary key default gen_random_uuid(),
  heladeria_id uuid not null references public.heladerias(id) on delete cascade,
  tipo tipo_promocion not null default 'descuento',
  nombre text not null,
  descripcion text,
  foto_url text,
  precio_promocional numeric(10,2),
  porcentaje_descuento numeric(5,2),
  activa boolean not null default true,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_promociones_heladeria on public.promociones(heladeria_id);

-- ---------------------------------------------------------------------------
-- promocion_items (productos que componen un combo / a los que aplica descuento)
-- ---------------------------------------------------------------------------
create table if not exists public.promocion_items (
  id uuid primary key default gen_random_uuid(),
  promocion_id uuid not null references public.promociones(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  cantidad int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists idx_promocion_items_promocion on public.promocion_items(promocion_id);
create index if not exists idx_promocion_items_producto on public.promocion_items(producto_id);

-- ---------------------------------------------------------------------------
-- pedidos
-- ---------------------------------------------------------------------------
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  heladeria_id uuid not null references public.heladerias(id) on delete cascade,
  mesa_id uuid references public.mesas(id) on delete set null,
  estado estado_pedido not null default 'pendiente',
  estado_pago estado_pago not null default 'no_requerido',
  total numeric(10,2) not null default 0,
  notas text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pedidos_heladeria on public.pedidos(heladeria_id);
create index if not exists idx_pedidos_mesa on public.pedidos(mesa_id);
create index if not exists idx_pedidos_estado on public.pedidos(heladeria_id, estado);

-- ---------------------------------------------------------------------------
-- pedido_items (guarda snapshots de nombre y precio del producto)
-- ---------------------------------------------------------------------------
create table if not exists public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  nombre_producto text not null,
  cantidad int not null default 1,
  precio_unitario numeric(10,2) not null default 0,
  personalizaciones jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  notas text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pedido_items_pedido on public.pedido_items(pedido_id);
create index if not exists idx_pedido_items_producto on public.pedido_items(producto_id);
