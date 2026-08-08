"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionData } from "@/lib/auth/session";
import { randomToken } from "@/lib/utils";

type Result = { error?: string };

export async function crearMesa(nombre: string): Promise<Result> {
  const s = await getSessionData();
  const hid = s?.heladeria?.id;
  if (!hid) return { error: "Sesión no válida" };
  if (!nombre.trim()) return { error: "Indica un nombre" };

  const supabase = await createClient();
  const { error } = await supabase.from("mesas").insert({
    heladeria_id: hid,
    nombre: nombre.trim(),
    token: randomToken(12),
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/mesas");
  return {};
}

export async function actualizarMesa(
  id: string,
  data: { nombre?: string; activa?: boolean }
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("mesas").update(data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/mesas");
  return {};
}

export async function eliminarMesa(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("mesas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/mesas");
  return {};
}
