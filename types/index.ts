import type {
  Categoria,
  GrupoOpcion,
  Opcion,
  Producto,
  Promocion,
  PromocionItem,
  PromocionSlot,
} from "./database.types";

/** Grupo de opciones con sus opciones ya cargadas. */
export type GrupoConOpcionesCargadas = GrupoOpcion & { opciones: Opcion[] };

/** Producto con sus grupos de opciones y opciones cargadas (para el detalle). */
export type ProductoConOpciones = Producto & {
  grupos_opciones: GrupoConOpcionesCargadas[];
};

/**
 * Categoría-asistente (tipo 'helado') con sus grupos de opciones.
 * El cliente construye su helado a partir de estos grupos (formato, tamaño,
 * sabores, toppings) sin pasar por productos individuales.
 */
export type CategoriaConOpciones = Categoria & {
  grupos_opciones: GrupoConOpcionesCargadas[];
};

/** Promoción con sus items (productos que la componen). */
export type PromocionConItems = Promocion & {
  promocion_items: (PromocionItem & { producto: Producto | null })[];
};

/**
 * Paso de un combo-asistente con los productos que el cliente puede elegir.
 * Los productos ya vienen resueltos: si el paso apunta a una categoría entera,
 * son los productos disponibles de esa categoría en ese momento.
 */
export type SlotConProductos = PromocionSlot & {
  productos: Producto[];
};

/** Promoción de tipo 'combo_asistente' lista para pedirse paso a paso. */
export type PromocionConSlots = Promocion & {
  slots: SlotConProductos[];
};

/** Producto elegido por el cliente en un paso del combo. */
export interface SlotElegido {
  slot_id: string;
  slot_nombre: string;
  producto_id: string;
  producto_nombre: string;
}

/** Una opción elegida por el cliente (se guarda como snapshot en el pedido). */
export interface PersonalizacionElegida {
  grupo_id: string;
  grupo_nombre: string;
  opcion_id: string;
  opcion_nombre: string;
  precio_extra: number;
}

/** Línea del carrito en el navegador. */
export interface CartItem {
  /** Id de línea único (permite el mismo producto con distintas opciones). */
  lineId: string;
  /** Producto (catálogo normal) o null si viene de un asistente o promoción. */
  producto_id: string | null;
  /** Categoría-asistente (helado, gofres…) o null. */
  categoria_id?: string | null;
  /** Promoción tipo combo-asistente o null. */
  promocion_id?: string | null;
  nombre: string;
  precio_base: number;
  cantidad: number;
  foto_url: string | null;
  personalizaciones: PersonalizacionElegida[];
  notas?: string;
  /** Precio unitario = precio_base + suma de precio_extra de personalizaciones. */
  precio_unitario: number;
}
