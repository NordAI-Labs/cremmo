import { createAdminClient } from "@/lib/supabase/admin";
import { suscripcionVigente } from "@/lib/planes";
import type { CrearPedidoInput } from "@/lib/validation/pedido";
import type { Json } from "@/types/database.types";

export interface PedidoCreado {
  id: string;
  heladeria_id: string;
  total: number;
  estado: string;
  items: {
    nombre_producto: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    personalizaciones: Json;
    notas: string | null;
  }[];
}

export class PedidoError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Valida y crea un pedido recalculando SIEMPRE precios y total en el servidor
 * a partir de los datos de la BD. El cliente solo aporta ids y cantidades.
 *
 * Usa el cliente admin (service_role) porque el cliente final es anónimo y la
 * creación de pedidos no pasa por RLS de `anon` (que no tiene INSERT).
 */
export async function crearPedido(
  input: CrearPedidoInput
): Promise<PedidoCreado> {
  const supabase = createAdminClient();

  // 1) Heladería por slug --------------------------------------------------
  const { data: heladeria, error: hErr } = await supabase
    .from("heladerias")
    .select("id, activa, cancelada_en, suscripcion_estado")
    .eq("slug", input.slug)
    .maybeSingle();

  if (hErr) throw new PedidoError("Error al leer la heladería", 500);

  // Aquí se usa la service role, que salta RLS: el estado de la suscripción no
  // lo filtra la base de datos, hay que comprobarlo.
  if (!heladeria || !heladeria.activa || !suscripcionVigente(heladeria)) {
    throw new PedidoError("Heladería no encontrada", 404);
  }

  // 2) Mesa (opcional) por token ------------------------------------------
  let mesaId: string | null = null;
  if (input.mesa_token) {
    const { data: mesa } = await supabase
      .from("mesas")
      .select("id, heladeria_id, activa")
      .eq("token", input.mesa_token)
      .maybeSingle();
    if (!mesa || mesa.heladeria_id !== heladeria.id || !mesa.activa) {
      throw new PedidoError("Mesa no válida", 400);
    }
    mesaId = mesa.id;
  }

  // 3) Cargar productos y categorías-asistente implicados -----------------
  const productoIds = [
    ...new Set(
      input.items.map((i) => i.producto_id).filter((v): v is string => !!v)
    ),
  ];
  const categoriaIds = [
    ...new Set(
      input.items.map((i) => i.categoria_id).filter((v): v is string => !!v)
    ),
  ];
  const promocionIds = [
    ...new Set(
      input.items.map((i) => i.promocion_id).filter((v): v is string => !!v)
    ),
  ];

  const NONE = "00000000-0000-0000-0000-000000000000";

  // Los productos elegidos en los pasos de un combo llegan como opcion_id.
  const productosElegidosEnPromos = input.items
    .filter((i) => i.promocion_id)
    .flatMap((i) => i.personalizaciones.map((p) => p.opcion_id));
  const productoIdsConsulta = [
    ...new Set([...productoIds, ...productosElegidosEnPromos]),
  ];

  const { data: productos, error: pErr } = await supabase
    .from("productos")
    .select("id, nombre, precio, disponible, heladeria_id, categoria_id")
    .in("id", productoIdsConsulta.length ? productoIdsConsulta : [NONE]);
  if (pErr) throw new PedidoError("Error al leer productos", 500);
  const productosMap = new Map((productos ?? []).map((p) => [p.id, p]));

  const { data: categorias, error: cErr } = await supabase
    .from("categorias")
    .select("id, nombre, tipo, heladeria_id")
    .in("id", categoriaIds.length ? categoriaIds : [NONE]);
  if (cErr) throw new PedidoError("Error al leer categorías", 500);
  const categoriasMap = new Map((categorias ?? []).map((c) => [c.id, c]));

  // 3 bis) Promociones tipo combo-asistente con sus pasos ------------------
  const { data: promociones, error: prErr } = await supabase
    .from("promociones")
    .select("id, heladeria_id, tipo, nombre, activa, precio_promocional")
    .in("id", promocionIds.length ? promocionIds : [NONE]);
  if (prErr) throw new PedidoError("Error al leer promociones", 500);
  const promocionesMap = new Map((promociones ?? []).map((p) => [p.id, p]));

  const { data: slots } = await supabase
    .from("promocion_slots")
    .select("id, promocion_id, nombre, categoria_id, orden")
    .in("promocion_id", promocionIds.length ? promocionIds : [NONE])
    .order("orden");

  const slotsArr = slots ?? [];
  const slotIds = slotsArr.map((s) => s.id);
  const { data: slotProductos } = await supabase
    .from("promocion_slot_productos")
    .select("slot_id, producto_id")
    .in("slot_id", slotIds.length ? slotIds : [NONE]);

  const slotsPorPromocion = new Map<string, typeof slotsArr>();
  for (const s of slotsArr) {
    const arr = slotsPorPromocion.get(s.promocion_id) ?? [];
    arr.push(s);
    slotsPorPromocion.set(s.promocion_id, arr);
  }
  const productosPorSlot = new Map<string, Set<string>>();
  for (const sp of slotProductos ?? []) {
    const set = productosPorSlot.get(sp.slot_id) ?? new Set<string>();
    set.add(sp.producto_id);
    productosPorSlot.set(sp.slot_id, set);
  }

  // 4) Cargar grupos (de productos y de categorías) y sus opciones ---------
  const { data: grupos } = await supabase
    .from("grupos_opciones")
    .select(
      "id, producto_id, categoria_id, nombre, tipo, rol, min_selecciones, max_selecciones, obligatorio"
    )
    .or(
      `producto_id.in.(${productoIds.length ? productoIds.join(",") : NONE}),` +
        `categoria_id.in.(${categoriaIds.length ? categoriaIds.join(",") : NONE})`
    );

  const grupoIds = (grupos ?? []).map((g) => g.id);
  const { data: opciones } = await supabase
    .from("opciones")
    .select("id, grupo_id, nombre, precio_extra, max_sabores, disponible")
    .in("grupo_id", grupoIds.length ? grupoIds : [NONE]);

  const opcionesMap = new Map((opciones ?? []).map((o) => [o.id, o]));
  const gruposArr = grupos ?? [];
  type GrupoRow = (typeof gruposArr)[number];
  const gruposPorProducto = new Map<string, GrupoRow[]>();
  const gruposPorCategoria = new Map<string, GrupoRow[]>();
  for (const g of gruposArr) {
    if (g.producto_id) {
      const arr = gruposPorProducto.get(g.producto_id) ?? [];
      arr.push(g);
      gruposPorProducto.set(g.producto_id, arr);
    } else if (g.categoria_id) {
      const arr = gruposPorCategoria.get(g.categoria_id) ?? [];
      arr.push(g);
      gruposPorCategoria.set(g.categoria_id, arr);
    }
  }

  // Valida las personalizaciones de una línea contra sus grupos y devuelve el
  // snapshot + el importe de los extras. Reglas: sin opción repetida en un
  // grupo, respeta min/obligatorio, y el nº de sabores lo fija el tamaño.
  function procesarLinea(gruposLinea: GrupoRow[], personalizaciones: {
    grupo_id: string;
    opcion_id: string;
  }[]) {
    const seleccionesPorGrupo = new Map<string, string[]>();
    const gruposPermitidos = new Set(gruposLinea.map((g) => g.id));
    const snapshot = personalizaciones.map((sel) => {
      const opcion = opcionesMap.get(sel.opcion_id);
      if (
        !opcion ||
        opcion.grupo_id !== sel.grupo_id ||
        !opcion.disponible ||
        !gruposPermitidos.has(sel.grupo_id)
      ) {
        throw new PedidoError("Opción de personalización no válida", 400);
      }
      const ids = seleccionesPorGrupo.get(sel.grupo_id) ?? [];
      if (ids.includes(opcion.id)) {
        throw new PedidoError(`No puedes repetir "${opcion.nombre}" dos veces`, 400);
      }
      ids.push(opcion.id);
      seleccionesPorGrupo.set(sel.grupo_id, ids);
      return {
        grupo_id: sel.grupo_id,
        opcion_id: opcion.id,
        opcion_nombre: opcion.nombre,
        precio_extra: Number(opcion.precio_extra),
      };
    });

    // Máx. de sabores dinámico según el tamaño elegido.
    const grupoTamano = gruposLinea.find((g) => g.rol === "tamano");
    let maxSabores: number | null = null;
    if (grupoTamano) {
      const tamanoElegidoId = (seleccionesPorGrupo.get(grupoTamano.id) ?? [])[0];
      const opTamano = tamanoElegidoId
        ? opcionesMap.get(tamanoElegidoId)
        : undefined;
      if (opTamano?.max_sabores != null) maxSabores = opTamano.max_sabores;
    }

    for (const g of gruposLinea) {
      const n = (seleccionesPorGrupo.get(g.id) ?? []).length;
      if (g.obligatorio && n < Math.max(1, g.min_selecciones)) {
        throw new PedidoError(`Faltan selecciones en "${g.nombre}"`, 400);
      }
      if (g.min_selecciones > 0 && n > 0 && n < g.min_selecciones) {
        throw new PedidoError(`Selecciona al menos ${g.min_selecciones} en "${g.nombre}"`, 400);
      }
      const tope =
        g.rol === "sabores" && maxSabores != null
          ? maxSabores
          : g.max_selecciones;
      if (tope > 0 && n > tope) {
        throw new PedidoError(`Máximo ${tope} en "${g.nombre}"`, 400);
      }
    }

    const extras = snapshot.reduce((s, p) => s + p.precio_extra, 0);
    return { snapshot, extras };
  }

  // 5) Recalcular cada línea ----------------------------------------------
  let total = 0;
  const itemsToInsert = input.items.map((item) => {
    // ---- Línea de combo-asistente (promoción) ---------------------------
    if (item.promocion_id) {
      const promocion = promocionesMap.get(item.promocion_id);
      if (!promocion || promocion.heladeria_id !== heladeria.id) {
        throw new PedidoError("Promoción no válida", 400);
      }
      if (!promocion.activa || promocion.tipo !== "combo_asistente") {
        throw new PedidoError(
          `La promoción "${promocion.nombre}" ya no está disponible`,
          400
        );
      }
      if (promocion.precio_promocional == null) {
        throw new PedidoError("La promoción no tiene precio", 400);
      }

      const slotsPromo = slotsPorPromocion.get(item.promocion_id) ?? [];
      if (slotsPromo.length === 0) {
        throw new PedidoError("La promoción no tiene pasos configurados", 400);
      }

      const elegidoPorSlot = new Map<string, string>();
      for (const sel of item.personalizaciones) {
        if (elegidoPorSlot.has(sel.grupo_id)) {
          throw new PedidoError("Solo puedes elegir un producto por paso", 400);
        }
        elegidoPorSlot.set(sel.grupo_id, sel.opcion_id);
      }

      const snapshot = slotsPromo.map((slot) => {
        const productoId = elegidoPorSlot.get(slot.id);
        if (!productoId) {
          throw new PedidoError(`Falta tu elección en "${slot.nombre}"`, 400);
        }
        const producto = productosMap.get(productoId);
        if (
          !producto ||
          producto.heladeria_id !== heladeria.id ||
          !producto.disponible
        ) {
          throw new PedidoError(
            `El producto elegido en "${slot.nombre}" no está disponible`,
            400
          );
        }
        // Permitido si está en la lista explícita del paso o, cuando el paso
        // es una categoría entera, si pertenece a esa categoría.
        const listaExplicita = productosPorSlot.get(slot.id);
        const permitido = listaExplicita?.size
          ? listaExplicita.has(producto.id)
          : !!slot.categoria_id && producto.categoria_id === slot.categoria_id;
        if (!permitido) {
          throw new PedidoError(
            `"${producto.nombre}" no es una opción válida en "${slot.nombre}"`,
            400
          );
        }
        return {
          grupo_id: slot.id,
          grupo_nombre: slot.nombre,
          opcion_id: producto.id,
          opcion_nombre: producto.nombre,
          precio_extra: 0,
        };
      });

      if (elegidoPorSlot.size !== slotsPromo.length) {
        throw new PedidoError("Elecciones no válidas en la promoción", 400);
      }

      // El precio del combo es fijo: lo elegido en cada paso no suma nada.
      const precioUnitario = Number(promocion.precio_promocional);
      const subtotal = Number((precioUnitario * item.cantidad).toFixed(2));
      total += subtotal;
      return {
        producto_id: null as string | null,
        nombre_producto: promocion.nombre,
        cantidad: item.cantidad,
        precio_unitario: Number(precioUnitario.toFixed(2)),
        subtotal,
        personalizaciones: snapshot as unknown as Json,
        notas: item.notas ?? null,
      };
    }

    // ---- Línea de helado (categoría-asistente) --------------------------
    if (item.categoria_id) {
      const categoria = categoriasMap.get(item.categoria_id);
      if (!categoria || categoria.heladeria_id !== heladeria.id) {
        throw new PedidoError("Categoría no válida", 400);
      }
      if (categoria.tipo !== "asistente") {
        throw new PedidoError("Esta categoría no admite pedidos con asistente", 400);
      }
      const gruposLinea = gruposPorCategoria.get(item.categoria_id) ?? [];
      const { snapshot, extras } = procesarLinea(gruposLinea, item.personalizaciones);
      // El precio del helado va incluido en el tamaño: base 0 + extras.
      const precioUnitario = extras;
      const subtotal = Number((precioUnitario * item.cantidad).toFixed(2));
      total += subtotal;
      return {
        producto_id: null as string | null,
        nombre_producto: categoria.nombre,
        cantidad: item.cantidad,
        precio_unitario: Number(precioUnitario.toFixed(2)),
        subtotal,
        personalizaciones: snapshot as unknown as Json,
        notas: item.notas ?? null,
      };
    }

    // ---- Línea de producto normal ---------------------------------------
    const producto = productosMap.get(item.producto_id as string);
    if (!producto || producto.heladeria_id !== heladeria.id) {
      throw new PedidoError("Producto no disponible en esta heladería", 400);
    }
    if (!producto.disponible) {
      throw new PedidoError(`El producto "${producto.nombre}" no está disponible`, 400);
    }

    const gruposDelProducto = gruposPorProducto.get(producto.id) ?? [];
    const { snapshot, extras } = procesarLinea(gruposDelProducto, item.personalizaciones);
    const precioUnitario = Number(producto.precio) + extras;
    const subtotal = Number((precioUnitario * item.cantidad).toFixed(2));
    total += subtotal;

    return {
      producto_id: producto.id as string | null,
      nombre_producto: producto.nombre,
      cantidad: item.cantidad,
      precio_unitario: Number(precioUnitario.toFixed(2)),
      subtotal,
      personalizaciones: snapshot as unknown as Json,
      notas: item.notas ?? null,
    };
  });

  total = Number(total.toFixed(2));

  // 6) Insertar pedido + items --------------------------------------------
  const { data: pedido, error: insErr } = await supabase
    .from("pedidos")
    .insert({
      heladeria_id: heladeria.id,
      mesa_id: mesaId,
      estado: "pendiente",
      total,
      notas: input.notas ?? null,
    })
    .select("id, heladeria_id, total, estado")
    .single();

  if (insErr || !pedido) throw new PedidoError("No se pudo crear el pedido", 500);

  const { error: itemsErr } = await supabase.from("pedido_items").insert(
    itemsToInsert.map((it) => ({ ...it, pedido_id: pedido.id }))
  );

  if (itemsErr) {
    // Rollback manual: elimina el pedido si fallan los items.
    await supabase.from("pedidos").delete().eq("id", pedido.id);
    throw new PedidoError("No se pudieron crear las líneas del pedido", 500);
  }

  return {
    id: pedido.id,
    heladeria_id: pedido.heladeria_id,
    total: Number(pedido.total),
    estado: pedido.estado,
    items: itemsToInsert,
  };
}
