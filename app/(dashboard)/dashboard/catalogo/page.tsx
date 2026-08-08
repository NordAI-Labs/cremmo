import { createClient } from "@/lib/supabase/server";
import { getSessionData } from "@/lib/auth/session";
import { CatalogoManager } from "@/components/dashboard/catalogo-manager";
import type {
  Categoria,
  GrupoOpcion,
  Opcion,
  Producto,
} from "@/types/database.types";

export const dynamic = "force-dynamic";

export type GrupoConOpciones = GrupoOpcion & { opciones: Opcion[] };

export default async function CatalogoPage() {
  const session = await getSessionData();
  const heladeriaId = session!.heladeria!.id;

  const supabase = await createClient();

  const [{ data: categorias }, { data: productos }, { data: grupos }] =
    await Promise.all([
      supabase
        .from("categorias")
        .select("*")
        .eq("heladeria_id", heladeriaId)
        .order("orden"),
      supabase
        .from("productos")
        .select("*")
        .eq("heladeria_id", heladeriaId)
        .order("orden"),
      supabase
        .from("grupos_opciones")
        .select("*, opciones(*)")
        .eq("heladeria_id", heladeriaId)
        .order("orden"),
    ]);

  return (
    <CatalogoManager
      heladeriaId={heladeriaId}
      categorias={(categorias ?? []) as Categoria[]}
      productos={(productos ?? []) as Producto[]}
      grupos={(grupos ?? []) as unknown as GrupoConOpciones[]}
    />
  );
}
