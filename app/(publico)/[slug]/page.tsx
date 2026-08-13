import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CatalogoPublico } from "@/components/publico/catalogo-publico";
import { SesionMesaCaducada } from "@/components/publico/sesion-mesa-caducada";
import {
  MESA_SESSION_COOKIE,
  expiracionMesaSessionCookie,
  verificarMesaSessionCookie,
} from "@/lib/mesa-session";
import { suscripcionVigente, tieneAsistenteIA } from "@/lib/planes";
import { isAnthropicConfigured } from "@/lib/env";
import type {
  Categoria,
  GrupoOpcion,
  Opcion,
  Producto,
  Promocion,
  PromocionSlot,
} from "@/types/database.types";
import type {
  CategoriaConOpciones,
  ProductoConOpciones,
  PromocionConItems,
  PromocionConSlots,
} from "@/types";

export const dynamic = "force-dynamic";

/** Fila de `promociones` tal y como llega con sus items y pasos anidados. */
type PromocionRaw = Promocion & {
  promocion_slots: (PromocionSlot & {
    promocion_slot_productos: { producto_id: string }[];
  })[];
};

export default async function CartaPublicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mesa?: string }>;
}) {
  const { slug } = await params;
  const { mesa: mesaToken } = await searchParams;

  const supabase = await createClient();

  const { data: heladeria } = await supabase
    .from("heladerias")
    .select(
      "id, nombre, slug, logo_url, direccion, plan, activa, cancelada_en, suscripcion_estado"
    )
    .eq("slug", slug)
    .maybeSingle();

  // RLS ya oculta al público las heladerías sin suscripción, pero el personal
  // sí puede leer la suya: se comprueba aquí para que la carta esté igual de
  // cerrada para todos.
  if (!heladeria || !heladeria.activa || !suscripcionVigente(heladeria)) {
    notFound();
  }

  // Validar mesa (opcional) y su sesión. Un `?mesa=` que no corresponde a
  // ninguna mesa real se ignora (como hoy: se ve la carta general). Uno que sí
  // corresponde a una mesa activa pero sin una cookie de sesión vigente
  // significa que el enlace se abrió sin pasar por el QR o que ya caducó: en
  // ese caso se bloquea toda la carta, no solo el botón de pedir.
  let mesaNombre: string | null = null;
  let mesaValida: string | null = null;
  let mesaSesionExpiraEn: number | null = null;
  let sesionCaducada = false;
  if (mesaToken) {
    const { data: mesa } = await supabase
      .from("mesas")
      .select("nombre, activa, heladeria_id, token")
      .eq("token", mesaToken)
      .maybeSingle();
    if (mesa && mesa.activa && mesa.heladeria_id === heladeria.id) {
      const cookieStore = await cookies();
      const cookieSesion = cookieStore.get(MESA_SESSION_COOKIE)?.value;
      if (verificarMesaSessionCookie(cookieSesion, mesaToken)) {
        mesaNombre = mesa.nombre;
        mesaValida = mesa.token;
        mesaSesionExpiraEn = expiracionMesaSessionCookie(cookieSesion, mesaToken);
      } else {
        sesionCaducada = true;
      }
    }
  }

  if (sesionCaducada) {
    return <SesionMesaCaducada />;
  }

  const [{ data: categorias }, { data: productos }, { data: grupos }, { data: promociones }] =
    await Promise.all([
      supabase
        .from("categorias")
        .select("*")
        .eq("heladeria_id", heladeria.id)
        .order("orden"),
      supabase
        .from("productos")
        .select("*")
        .eq("heladeria_id", heladeria.id)
        .eq("disponible", true)
        .order("orden"),
      supabase
        .from("grupos_opciones")
        .select("*, opciones(*)")
        .eq("heladeria_id", heladeria.id)
        .order("orden"),
      supabase
        .from("promociones")
        .select(
          "*, promocion_items(*, producto:productos(*)), promocion_slots(*, promocion_slot_productos(producto_id))"
        )
        .eq("heladeria_id", heladeria.id)
        .eq("activa", true)
        .order("created_at", { ascending: false }),
    ]);

  // Ensamblar productos con sus grupos/opciones.
  const gruposList = (grupos ?? []) as unknown as (GrupoOpcion & {
    opciones: Opcion[];
  })[];
  const opcionesOrdenadas = (g: GrupoOpcion & { opciones: Opcion[] }) =>
    (g.opciones ?? [])
      .filter((o) => o.disponible)
      .sort((a, b) => a.orden - b.orden);

  const productosConOpciones: ProductoConOpciones[] = (productos ?? []).map(
    (p) => ({
      ...(p as Producto),
      grupos_opciones: gruposList
        .filter((g) => g.producto_id === p.id)
        .map((g) => ({ ...g, opciones: opcionesOrdenadas(g) })),
    })
  );

  const categoriasArr = (categorias ?? []) as Categoria[];
  const categoriasAsistente: CategoriaConOpciones[] = categoriasArr
    .filter((c) => c.tipo === "asistente")
    .map((c) => ({
      ...c,
      grupos_opciones: gruposList
        .filter((g) => g.categoria_id === c.id)
        .sort((a, b) => a.orden - b.orden)
        .map((g) => ({ ...g, opciones: opcionesOrdenadas(g) })),
    }));

  // Combos-asistente: cada paso se resuelve a los productos disponibles ahora
  // mismo. Si un paso se queda sin opciones, el combo no se puede pedir y no se
  // enseña.
  const promocionesArr = (promociones ?? []) as unknown as PromocionRaw[];
  const disponibles = (productos ?? []) as Producto[];

  const combos: PromocionConSlots[] = [];
  const promocionesSimples: PromocionConItems[] = [];
  for (const promo of promocionesArr) {
    if (promo.tipo !== "combo_asistente") {
      promocionesSimples.push(promo as unknown as PromocionConItems);
      continue;
    }
    const slots = [...(promo.promocion_slots ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((s) => {
        const elegidos = new Set(
          (s.promocion_slot_productos ?? []).map((sp) => sp.producto_id)
        );
        return {
          ...s,
          productos: elegidos.size
            ? disponibles.filter((p) => elegidos.has(p.id))
            : disponibles.filter((p) => p.categoria_id === s.categoria_id),
        };
      });
    const pedible =
      slots.length > 0 &&
      slots.every((s) => s.productos.length > 0) &&
      promo.precio_promocional != null;
    if (pedible) combos.push({ ...promo, slots } as PromocionConSlots);
  }

  return (
    <CatalogoPublico
      heladeria={{
        nombre: heladeria.nombre,
        slug: heladeria.slug,
        logo_url: heladeria.logo_url,
        direccion: heladeria.direccion,
      }}
      mesaNombre={mesaNombre}
      mesaToken={mesaValida}
      mesaSesionExpiraEn={mesaSesionExpiraEn}
      categorias={categoriasArr}
      productos={productosConOpciones}
      categoriasAsistente={categoriasAsistente}
      promociones={promocionesSimples}
      combos={combos}
      asistenteIA={tieneAsistenteIA(heladeria.plan) && isAnthropicConfigured()}
    />
  );
}
