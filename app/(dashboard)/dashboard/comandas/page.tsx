import { createClient } from "@/lib/supabase/server";
import { getSessionData } from "@/lib/auth/session";
import { ComandasBoard } from "@/components/dashboard/comandas-board";
import type { PedidoConItems } from "@/components/dashboard/comandas-board";

export const dynamic = "force-dynamic";

export default async function ComandasPage() {
  const session = await getSessionData();
  const heladeriaId = session!.heladeria!.id;

  const supabase = await createClient();
  const { data } = await supabase
    .from("pedidos")
    .select("*, mesa:mesas(nombre), items:pedido_items(*)")
    .eq("heladeria_id", heladeriaId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <ComandasBoard
      heladeriaId={heladeriaId}
      pedidosIniciales={(data ?? []) as unknown as PedidoConItems[]}
    />
  );
}
