"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionData } from "@/lib/auth/session";

type Result = { error?: string };

export async function actualizarHeladeria(input: {
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  logo_url: string | null;
}): Promise<Result> {
  const s = await getSessionData();
  const hid = s?.heladeria?.id;
  if (!hid) return { error: "Sesión no válida" };
  if (!input.nombre.trim()) return { error: "El nombre es obligatorio" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("heladerias")
    .update({
      nombre: input.nombre.trim(),
      direccion: input.direccion,
      telefono: input.telefono,
      logo_url: input.logo_url,
    })
    .eq("id", hid);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard");
  return {};
}

// La suscripción se gestiona en `dashboard/suscripcion-actions.ts`: pasa por
// Stripe y vuelve a la base de datos por el webhook.
