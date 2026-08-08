-- ============================================================================
-- 0004_realtime.sql
-- Activa Supabase Realtime en pedidos y pedido_items para que el panel de
-- comandas se actualice en vivo. (El acceso sigue restringido por RLS.)
-- ============================================================================

do $$ begin
  alter publication supabase_realtime add table public.pedidos;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.pedido_items;
exception when duplicate_object then null; end $$;

-- Necesario para recibir los valores previos en updates/deletes por Realtime.
alter table public.pedidos replica identity full;
alter table public.pedido_items replica identity full;
