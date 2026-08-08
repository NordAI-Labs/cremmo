"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionData } from "@/lib/auth/session";
import type { TipoPromocion } from "@/types/database.types";

type Result = { error?: string };

/** Paso de un combo-asistente tal y como lo edita el panel. */
export interface SlotInput {
  nombre: string;
  /** Categoría del paso; null si se listan productos sueltos. */
  categoria_id: string | null;
  /** Vacío = vale cualquier producto disponible de la categoría. */
  producto_ids: string[];
}

export async function guardarPromocion(input: {
  id?: string;
  tipo: TipoPromocion;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  precio_promocional: number | null;
  porcentaje_descuento: number | null;
  activa: boolean;
  items: { producto_id: string; cantidad: number }[];
  slots?: SlotInput[];
}): Promise<Result> {
  const s = await getSessionData();
  const hid = s?.heladeria?.id;
  if (!hid) return { error: "Sesión no válida" };
  const supabase = await createClient();

  const payload = {
    tipo: input.tipo,
    nombre: input.nombre,
    descripcion: input.descripcion,
    foto_url: input.foto_url,
    precio_promocional: input.precio_promocional,
    porcentaje_descuento: input.porcentaje_descuento,
    activa: input.activa,
  };

  let promocionId = input.id;

  if (promocionId) {
    const { error } = await supabase
      .from("promociones")
      .update(payload)
      .eq("id", promocionId);
    if (error) return { error: error.message };
    // Reemplaza items y pasos existentes (los productos de cada paso caen en
    // cascada al borrar el slot).
    await supabase
      .from("promocion_items")
      .delete()
      .eq("promocion_id", promocionId);
    await supabase
      .from("promocion_slots")
      .delete()
      .eq("promocion_id", promocionId);
  } else {
    const { data, error } = await supabase
      .from("promociones")
      .insert({ ...payload, heladeria_id: hid })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Error" };
    promocionId = data.id;
  }

  if (input.items.length > 0 && promocionId) {
    const { error } = await supabase.from("promocion_items").insert(
      input.items.map((it) => ({
        promocion_id: promocionId!,
        producto_id: it.producto_id,
        cantidad: it.cantidad,
      }))
    );
    if (error) return { error: error.message };
  }

  const slots = input.slots ?? [];
  if (slots.length > 0 && promocionId) {
    const { data: creados, error } = await supabase
      .from("promocion_slots")
      .insert(
        slots.map((s, i) => ({
          promocion_id: promocionId!,
          nombre: s.nombre,
          categoria_id: s.categoria_id,
          orden: i,
        }))
      )
      .select("id, orden");
    if (error) return { error: error.message };

    const porOrden = new Map((creados ?? []).map((s) => [s.orden, s.id]));
    const productosDeSlots = slots.flatMap((s, i) => {
      const slotId = porOrden.get(i);
      if (!slotId) return [];
      return s.producto_ids.map((producto_id) => ({
        slot_id: slotId,
        producto_id,
      }));
    });

    if (productosDeSlots.length > 0) {
      const { error: spErr } = await supabase
        .from("promocion_slot_productos")
        .insert(productosDeSlots);
      if (spErr) return { error: spErr.message };
    }
  }

  revalidatePath("/dashboard/promociones");
  return {};
}

export async function eliminarPromocion(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("promociones").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/promociones");
  return {};
}
