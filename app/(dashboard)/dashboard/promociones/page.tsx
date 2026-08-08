import { createClient } from "@/lib/supabase/server";
import { getSessionData } from "@/lib/auth/session";
import { PromocionesManager } from "@/components/dashboard/promociones-manager";
import type {
  Categoria,
  Producto,
  Promocion,
  PromocionItem,
  PromocionSlot,
  PromocionSlotProducto,
} from "@/types/database.types";

export const dynamic = "force-dynamic";

export type PromocionConItems = Promocion & {
  promocion_items: PromocionItem[];
  promocion_slots: (PromocionSlot & {
    promocion_slot_productos: PromocionSlotProducto[];
  })[];
};

export default async function PromocionesPage() {
  const session = await getSessionData();
  const heladeriaId = session!.heladeria!.id;

  const supabase = await createClient();

  const [{ data: promociones }, { data: productos }, { data: categorias }] =
    await Promise.all([
      supabase
        .from("promociones")
        .select(
          "*, promocion_items(*), promocion_slots(*, promocion_slot_productos(*))"
        )
        .eq("heladeria_id", heladeriaId)
        .order("created_at", { ascending: false }),
      supabase
        .from("productos")
        .select("*")
        .eq("heladeria_id", heladeriaId)
        .order("nombre"),
      supabase
        .from("categorias")
        .select("*")
        .eq("heladeria_id", heladeriaId)
        .order("orden"),
    ]);

  return (
    <PromocionesManager
      heladeriaId={heladeriaId}
      promociones={(promociones ?? []) as unknown as PromocionConItems[]}
      productos={(productos ?? []) as Producto[]}
      categorias={(categorias ?? []) as Categoria[]}
    />
  );
}
