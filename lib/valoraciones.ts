import { createClient } from "@/lib/supabase/server";
import type { Resena } from "@/lib/resenas";
import type { Heladeria } from "@/types/database.types";

/** Días desde el alta a partir de los que se empieza a pedir la valoración. */
const DIAS_PARA_PEDIR = 15;

/**
 * True si ya han pasado los días suficientes desde el alta como para
 * empezar a pedir la valoración de la app. No hay límite superior: sigue
 * siendo true en cada login hasta que la heladería la envíe (ver
 * `yaValoroLaApp`).
 */
export function tocaPedirValoracion(
  heladeria: Pick<Heladeria, "created_at">,
  ahora: Date = new Date()
): boolean {
  const dias =
    (ahora.getTime() - new Date(heladeria.created_at).getTime()) / 86_400_000;
  return dias >= DIAS_PARA_PEDIR;
}

/** True si la heladería ya dejó su valoración de la app (una por heladería, para siempre). */
export async function yaValoroLaApp(heladeriaId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("valoraciones_app")
    .select("id")
    .eq("heladeria_id", heladeriaId)
    .maybeSingle();
  return !!data;
}

/**
 * Valoraciones reales ya aprobadas (`publicada = true`), para mezclar con las
 * de muestra de `lib/resenas.ts` en la landing. Sin nombre de persona (no se
 * pide en el formulario): se muestra el nombre de la heladería.
 */
export async function resenasPublicadas(): Promise<Resena[]> {
  const supabase = await createClient();
  const { data: valoraciones } = await supabase
    .from("valoraciones_app")
    .select("id, heladeria_id, puntuacion, comentario, created_at")
    .eq("publicada", true)
    .order("created_at", { ascending: false });

  const conTexto = (valoraciones ?? []).filter(
    (v): v is typeof v & { comentario: string } => !!v.comentario
  );
  if (conTexto.length === 0) return [];

  const { data: heladerias } = await supabase
    .from("heladerias")
    .select("id, nombre, logo_url")
    .in("id", conTexto.map((v) => v.heladeria_id));
  const heladeriaPorId = new Map((heladerias ?? []).map((h) => [h.id, h]));

  return conTexto.map((v) => {
    const heladeria = heladeriaPorId.get(v.heladeria_id);
    return {
      id: v.id,
      nombre: heladeria?.nombre ?? "Heladería Cremmo",
      heladeria: "",
      ciudad: "",
      texto: v.comentario,
      puntuacion: v.puntuacion,
      fecha: v.created_at,
      logoUrl: heladeria?.logo_url,
    };
  });
}
