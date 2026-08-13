import { z } from "zod";

/**
 * Esquema de la conversación con el Asistente IA de la carta.
 *
 * Los topes (longitud, número de mensajes, líneas de carrito) no son cosmética:
 * el endpoint es público y cada llamada cuesta dinero, así que acotan lo que un
 * cliente puede llegar a mandar de una vez.
 */

export const mensajeChatSchema = z.object({
  rol: z.enum(["usuario", "asistente"]),
  texto: z.string().min(1).max(600),
});

export const lineaCarritoSchema = z.object({
  nombre: z.string().min(1).max(120),
  cantidad: z.number().int().min(1).max(99),
});

export const asistenteSchema = z
  .object({
    slug: z.string().min(1),
    /** Historia completa del chat; la última siempre es del cliente. */
    mensajes: z.array(mensajeChatSchema).min(1).max(16),
    /** Lo que ya lleva en el carrito, para que las sugerencias encajen. */
    carrito: z.array(lineaCarritoSchema).max(20).default([]),
  })
  // La conversación empieza y acaba con el cliente, y alterna turnos: es lo que
  // espera la API de Anthropic.
  .refine((v) => v.mensajes[0]?.rol === "usuario", {
    message: "La conversación debe empezar por el cliente",
  })
  .refine((v) => v.mensajes.at(-1)?.rol === "usuario", {
    message: "El último mensaje debe ser del cliente",
  })
  .refine(
    (v) =>
      v.mensajes.every((m, i) => i === 0 || m.rol !== v.mensajes[i - 1].rol),
    { message: "Los mensajes deben alternar cliente y asistente" }
  );

export type AsistenteInput = z.infer<typeof asistenteSchema>;
