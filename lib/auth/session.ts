import { createClient } from "@/lib/supabase/server";
import type { Heladeria, Perfil } from "@/types/database.types";

export interface SessionData {
  userId: string;
  email: string | null;
  perfil: Perfil | null;
  heladeria: Heladeria | null;
}

/**
 * Carga el usuario autenticado junto con su perfil y heladería.
 * Devuelve null si no hay sesión.
 */
export async function getSessionData(): Promise<SessionData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let heladeria: Heladeria | null = null;
  if (perfil) {
    const { data } = await supabase
      .from("heladerias")
      .select("*")
      .eq("id", perfil.heladeria_id)
      .maybeSingle();
    heladeria = data;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    perfil,
    heladeria,
  };
}
