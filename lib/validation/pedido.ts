import { z } from "zod";

/**
 * Esquemas de validación compartidos para la creación de pedidos.
 * El servidor recalcula precios y totales a partir de la BD; NUNCA confía en
 * los importes que envía el cliente (solo se usan ids y cantidades).
 */

// Nota: se usa string().min(1) en lugar de uuid() porque el servidor SIEMPRE
// vuelve a validar la existencia y pertenencia de cada id contra la BD (y así
// el modo demo, con ids no-uuid, también funciona). La seguridad no depende
// del formato del id sino de esa comprobación en servidor.
export const personalizacionInputSchema = z.object({
  grupo_id: z.string().min(1),
  opcion_id: z.string().min(1),
});

export const itemInputSchema = z
  .object({
    // Una línea es de un producto (catálogo normal), de una categoría-asistente
    // (helado, gofres…) o de una promoción tipo combo-asistente. Debe llegar
    // exactamente uno de los tres.
    producto_id: z.string().min(1).optional(),
    categoria_id: z.string().min(1).optional(),
    promocion_id: z.string().min(1).optional(),
    // En una promoción, cada "personalización" es la elección de un paso:
    // grupo_id = slot y opcion_id = producto elegido.
    cantidad: z.number().int().min(1).max(99),
    personalizaciones: z.array(personalizacionInputSchema).default([]),
    notas: z.string().max(500).optional(),
  })
  .refine(
    (v) =>
      [v.producto_id, v.categoria_id, v.promocion_id].filter(Boolean).length ===
      1,
    {
      message:
        "Cada línea debe tener producto_id, categoria_id o promocion_id (solo uno)",
    }
  );

export const crearPedidoSchema = z.object({
  slug: z.string().min(1),
  mesa_token: z.string().min(1).optional(),
  notas: z.string().max(1000).optional(),
  items: z.array(itemInputSchema).min(1, "El pedido no tiene productos"),
});

export type CrearPedidoInput = z.infer<typeof crearPedidoSchema>;
export type ItemInput = z.infer<typeof itemInputSchema>;
