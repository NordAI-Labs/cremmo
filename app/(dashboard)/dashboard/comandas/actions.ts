"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EstadoPedido } from "@/types/database.types";

/**
 * Cambia el estado de un pedido. RLS garantiza que solo se pueda actuar sobre
 * pedidos de la heladería del usuario autenticado.
 */
export async function cambiarEstadoPedido(
  pedidoId: string,
  estado: EstadoPedido
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ estado })
    .eq("id", pedidoId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/comandas");
  return {};
}
