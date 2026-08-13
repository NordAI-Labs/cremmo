import { createAdminClient } from "@/lib/supabase/admin";
import { nombresAlergenos } from "@/lib/alergenos";
import type {
  Categoria,
  GrupoOpcion,
  Opcion,
  Producto,
  Promocion,
  PromocionSlot,
} from "@/types/database.types";

/**
 * Carta de una heladería preparada para el Asistente IA: un texto compacto que
 * se le pasa al modelo y la tabla que traduce las referencias cortas que use en
 * su respuesta ('p3', 'a1', 'k2') a ids reales.
 *
 * Se usan referencias cortas en vez de los uuid porque ahorran muchos tokens y,
 * sobre todo, porque el modelo no puede inventarse una que exista: cualquier
 * referencia que no esté en la tabla se descarta.
 */

/** Algo que el cliente puede añadir al pedido desde el chat. */
export interface ItemSugerible {
  tipo: "producto" | "categoria" | "combo";
  id: string;
  nombre: string;
}

export interface ContextoCarta {
  texto: string;
  refs: Map<string, ItemSugerible>;
}

/** Opciones que se listan por grupo: suficiente para recomendar sin inflar el prompt. */
const MAX_OPCIONES_POR_GRUPO = 40;

type GrupoConOpciones = GrupoOpcion & { opciones: Opcion[] };
type PromocionRaw = Promocion & {
  promocion_items: { cantidad: number; producto: Producto | null }[];
  promocion_slots: (PromocionSlot & {
    promocion_slot_productos: { producto_id: string }[];
  })[];
};

function euros(n: number): string {
  return `${Number(n).toFixed(2).replace(".", ",")} €`;
}

/**
 * Carga la carta y la formatea para el modelo. Usa la service role porque el
 * asistente responde a clientes anónimos: el filtro de qué heladería es viene
 * del route handler, que ya ha comprobado suscripción y plan.
 */
export async function contextoCarta(
  heladeriaId: string
): Promise<ContextoCarta> {
  const admin = createAdminClient();

  const [{ data: categorias }, { data: productos }, { data: grupos }, { data: promociones }] =
    await Promise.all([
      admin
        .from("categorias")
        .select("*")
        .eq("heladeria_id", heladeriaId)
        .order("orden"),
      admin
        .from("productos")
        .select("*")
        .eq("heladeria_id", heladeriaId)
        .eq("disponible", true)
        .order("orden"),
      admin
        .from("grupos_opciones")
        .select("*, opciones(*)")
        .eq("heladeria_id", heladeriaId)
        .order("orden"),
      admin
        .from("promociones")
        .select(
          "*, promocion_items(cantidad, producto:productos(*)), promocion_slots(*, promocion_slot_productos(producto_id))"
        )
        .eq("heladeria_id", heladeriaId)
        .eq("activa", true),
    ]);

  const categoriasArr = (categorias ?? []) as Categoria[];
  const productosArr = (productos ?? []) as Producto[];
  const gruposArr = (grupos ?? []) as unknown as GrupoConOpciones[];
  const promocionesArr = (promociones ?? []) as unknown as PromocionRaw[];

  const refs = new Map<string, ItemSugerible>();
  const lineas: string[] = [];
  const nombreCategoria = new Map(categoriasArr.map((c) => [c.id, c.nombre]));
  const opcionesDe = (g: GrupoConOpciones) =>
    (g.opciones ?? [])
      .filter((o) => o.disponible)
      .sort((a, b) => a.orden - b.orden);

  // --- Productos, agrupados por categoría para que el modelo entienda la carta.
  const porCategoria = new Map<string, Producto[]>();
  for (const p of productosArr) {
    const clave = p.categoria_id ?? "sin_categoria";
    const arr = porCategoria.get(clave) ?? [];
    arr.push(p);
    porCategoria.set(clave, arr);
  }

  let n = 0;
  lineas.push("## Productos");
  for (const [claveCat, items] of porCategoria) {
    const titulo = nombreCategoria.get(claveCat) ?? "Otros";
    lineas.push(`### ${titulo}`);
    for (const p of items) {
      n += 1;
      const ref = `p${n}`;
      refs.set(ref, { tipo: "producto", id: p.id, nombre: p.nombre });

      const partes = [`[${ref}] ${p.nombre} — ${euros(p.precio)}`];
      if (p.descripcion) partes.push(p.descripcion);

      const alergenos = nombresAlergenos(p.alergenos);
      partes.push(
        alergenos.length > 0
          ? `Alérgenos: ${alergenos.join(", ")}`
          : "Alérgenos: no declarados (sin datos, no afirmes que no los lleva)"
      );

      const gruposDelProducto = gruposArr.filter((g) => g.producto_id === p.id);
      if (gruposDelProducto.length > 0) {
        partes.push(
          `Personalizable: ${gruposDelProducto.map((g) => g.nombre).join(", ")}`
        );
      }
      lineas.push(`- ${partes.join(". ")}`);
    }
  }

  // --- Categorías-asistente: el cliente se lo monta por pasos (helado, gofre…).
  const asistentes = categoriasArr.filter((c) => c.tipo === "asistente");
  let a = 0;
  const bloquesAsistente: string[] = [];
  for (const c of asistentes) {
    const gruposDeCategoria = gruposArr
      .filter((g) => g.categoria_id === c.id)
      .sort((x, y) => x.orden - y.orden);
    if (gruposDeCategoria.length === 0) continue;

    a += 1;
    const ref = `a${a}`;
    refs.set(ref, { tipo: "categoria", id: c.id, nombre: c.nombre });

    bloquesAsistente.push(
      `- [${ref}] ${c.nombre} (se monta por pasos, el precio depende de lo que elija)`
    );
    for (const g of gruposDeCategoria) {
      const opciones = opcionesDe(g).slice(0, MAX_OPCIONES_POR_GRUPO);
      if (opciones.length === 0) continue;
      const listado = opciones
        .map((o) =>
          Number(o.precio_extra) > 0
            ? `${o.nombre} (+${euros(o.precio_extra)})`
            : o.nombre
        )
        .join(", ");
      bloquesAsistente.push(`  - ${g.nombre}: ${listado}`);
    }
  }
  if (bloquesAsistente.length > 0) {
    lineas.push("## Para montar por pasos");
    lineas.push(...bloquesAsistente);
  }

  // --- Promociones. Los combos por pasos se piden desde el chat; el resto
  //     (descuentos y combos fijos) solo se pueden mencionar.
  const combos: string[] = [];
  const informativas: string[] = [];
  let k = 0;
  for (const promo of promocionesArr) {
    if (promo.tipo === "combo_asistente") {
      const slots = [...(promo.promocion_slots ?? [])].sort(
        (x, y) => x.orden - y.orden
      );
      const pedible =
        promo.precio_promocional != null &&
        slots.length > 0 &&
        slots.every((s) => {
          const elegidos = new Set(
            (s.promocion_slot_productos ?? []).map((sp) => sp.producto_id)
          );
          return elegidos.size > 0
            ? productosArr.some((p) => elegidos.has(p.id))
            : productosArr.some((p) => p.categoria_id === s.categoria_id);
        });
      if (!pedible) continue;

      k += 1;
      const ref = `k${k}`;
      refs.set(ref, { tipo: "combo", id: promo.id, nombre: promo.nombre });
      combos.push(
        `- [${ref}] ${promo.nombre} — ${euros(promo.precio_promocional!)}` +
          `. Pasos: ${slots.map((s) => s.nombre).join(", ")}` +
          (promo.descripcion ? `. ${promo.descripcion}` : "")
      );
      continue;
    }

    const precio =
      promo.tipo === "descuento" && promo.porcentaje_descuento != null
        ? `-${promo.porcentaje_descuento}%`
        : promo.precio_promocional != null
          ? euros(promo.precio_promocional)
          : "";
    const incluye = (promo.promocion_items ?? [])
      .map((it) => `${it.cantidad}× ${it.producto?.nombre ?? "—"}`)
      .join(", ");
    informativas.push(
      `- ${promo.nombre}${precio ? ` (${precio})` : ""}` +
        (incluye ? `. Incluye: ${incluye}` : "") +
        (promo.descripcion ? `. ${promo.descripcion}` : "")
    );
  }
  if (combos.length > 0) {
    lineas.push("## Combos por pasos (se pueden añadir al pedido)");
    lineas.push(...combos);
  }
  if (informativas.length > 0) {
    lineas.push(
      "## Otras promociones (solo informativas: NO se pueden añadir desde el chat, se piden en barra)"
    );
    lineas.push(...informativas);
  }

  return { texto: lineas.join("\n"), refs };
}
