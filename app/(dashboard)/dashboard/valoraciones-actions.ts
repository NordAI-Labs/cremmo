"use server";

import { getSessionData } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Resultado = { error?: string };

/**
 * Envía la valoración de la app (una por heladería, para siempre). Solo el
 * propietario puede hacerlo, y coincide con quién ve el modal en el panel
 * (ver dashboard/layout.tsx). Nace sin publicar: se aprueba a mano desde
 * Supabase para que salga en la landing (ver 0017_valoraciones_app.sql).
 */
export async function enviarValoracionApp(
  puntuacion: number,
  comentario: string
): Promise<Resultado> {
  const session = await getSessionData();
  if (!session?.heladeria) return { error: "Sesión no válida" };
  if (session.perfil?.rol !== "owner") {
    return { error: "Solo el propietario puede enviar la valoración" };
  }
  if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
    return { error: "La puntuación debe ser de 1 a 5" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("valoraciones_app").insert({
    heladeria_id: session.heladeria.id,
    puntuacion,
    comentario: comentario.trim() || null,
  });

  if (error) {
    console.error("[valoraciones] enviar:", error);
    return { error: "No se pudo enviar la valoración. Inténtalo de nuevo." };
  }

  return {};
}
