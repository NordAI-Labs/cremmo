-- ============================================================================
-- 0009_combo_asistente.sql
-- Promociones tipo "combo asistente": el combo se compone de PASOS (slots) y
-- el cliente elige un producto en cada uno, a precio fijo.
--   Ej.: Tortitas + Café + Agua →
--        slot 1 "Elige tu tortita"  → categoría Tortitas (o ciertos productos)
--        slot 2 "Elige tu café"     → categoría Cafés
--        slot 3 "Elige tu bebida"   → categoría Bebidas
-- El combo clásico (productos fijos, sin elección) sigue funcionando igual.
-- ============================================================================

-- 1) Nuevo tipo de promoción. Añadir un valor a un enum no se puede usar en la
--    misma transacción, pero aquí no se usa: solo se declara.
alter type tipo_promocion add value if not exists 'combo_asistente';

-- ---------------------------------------------------------------------------
-- 2) Pasos del combo.
--    * categoria_id set y sin filas en promocion_slot_productos
--        → vale cualquier producto disponible de esa categoría (se actualiza
--          solo cuando la heladería añade productos).
--    * con filas en promocion_slot_productos
--        → solo esos productos.
-- ---------------------------------------------------------------------------
create table if not exists public.promocion_slots (
  id uuid primary key default gen_random_uuid(),
  promocion_id uuid not null references public.promociones(id) on delete cascade,
  nombre text not null,
  categoria_id uuid references public.categorias(id) on delete set null,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_promocion_slots_promocion
  on public.promocion_slots(promocion_id);

create table if not exists public.promocion_slot_productos (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.promocion_slots(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (slot_id, producto_id)
);
create index if not exists idx_promocion_slot_productos_slot
  on public.promocion_slot_productos(slot_id);

-- ---------------------------------------------------------------------------
-- 3) RLS: mismo criterio que promocion_items (lectura pública, gestión por el
--    personal de la heladería dueña de la promoción).
-- ---------------------------------------------------------------------------
alter table public.promocion_slots enable row level security;
alter table public.promocion_slot_productos enable row level security;

drop policy if exists promocion_slots_public_select on public.promocion_slots;
create policy promocion_slots_public_select on public.promocion_slots
  for select to anon
  using (true);

drop policy if exists promocion_slots_staff_all on public.promocion_slots;
create policy promocion_slots_staff_all on public.promocion_slots
  for all to authenticated
  using (
    promocion_id in (
      select id from public.promociones
      where heladeria_id = public.heladeria_actual()
    )
  )
  with check (
    promocion_id in (
      select id from public.promociones
      where heladeria_id = public.heladeria_actual()
    )
  );

drop policy if exists promocion_slot_productos_public_select
  on public.promocion_slot_productos;
create policy promocion_slot_productos_public_select
  on public.promocion_slot_productos
  for select to anon
  using (true);

drop policy if exists promocion_slot_productos_staff_all
  on public.promocion_slot_productos;
create policy promocion_slot_productos_staff_all
  on public.promocion_slot_productos
  for all to authenticated
  using (
    slot_id in (
      select s.id
      from public.promocion_slots s
      join public.promociones p on p.id = s.promocion_id
      where p.heladeria_id = public.heladeria_actual()
    )
  )
  with check (
    slot_id in (
      select s.id
      from public.promocion_slots s
      join public.promociones p on p.id = s.promocion_id
      where p.heladeria_id = public.heladeria_actual()
    )
  );
