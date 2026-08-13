import { NextResponse } from "next/server";
import { asistenteSchema } from "@/lib/validation/asistente";
import { contextoCarta } from "@/lib/asistente/catalogo";
import { AsistenteError, responder } from "@/lib/asistente/responder";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAnthropicConfigured } from "@/lib/env";
import { comprobarLimite } from "@/lib/rate-limit";
import { suscripcionVigente, tieneAsistenteIA } from "@/lib/planes";

/**
 * POST /api/asistente
 * Asistente IA de la carta pública (planes Pro y Business). Responde al cliente
 * final, que es anónimo: todo lo que decide qué se puede recomendar sale de la
 * base de datos, nunca del cuerpo de la petición.
 */

/** Mensajes por IP y heladería en la ventana. Da para una conversación normal. */
const LIMITE_MENSAJES = 15;
const LIMITE_VENTANA_SEGUNDOS = 60;

function ip(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "desconocida";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = asistenteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { slug, mensajes, carrito } = parsed.data;

  const limite = comprobarLimite(
    `asistente:${ip(request)}:${slug}`,
    LIMITE_MENSAJES,
    LIMITE_VENTANA_SEGUNDOS
  );
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Vas muy rápido. Espera unos segundos y vuelve a preguntar." },
      { status: 429, headers: { "Retry-After": String(limite.esperarSegundos) } }
    );
  }

  try {
    // Cliente con service role: salta RLS, así que suscripción y plan se
    // comprueban a mano (igual que en /api/pedidos).
    const admin = createAdminClient();
    const { data: heladeria } = await admin
      .from("heladerias")
      .select("id, nombre, plan, activa, cancelada_en, suscripcion_estado")
      .eq("slug", slug)
      .maybeSingle();

    if (!heladeria || !heladeria.activa || !suscripcionVigente(heladeria)) {
      return NextResponse.json(
        { error: "Heladería no encontrada" },
        { status: 404 }
      );
    }

    // La carta esconde el asistente cuando el plan no lo incluye, pero el
    // endpoint no puede fiarse de eso.
    if (!tieneAsistenteIA(heladeria.plan) || !isAnthropicConfigured()) {
      return NextResponse.json(
        { error: "El asistente no está disponible" },
        { status: 403 }
      );
    }

    const contexto = await contextoCarta(heladeria.id);
    const respuesta = await responder({
      heladeria: heladeria.nombre,
      contexto,
      mensajes,
      carrito,
    });

    return NextResponse.json(respuesta);
  } catch (err) {
    console.error("[/api/asistente] error:", err);
    const mensaje =
      err instanceof AsistenteError
        ? "No he entendido la respuesta. Prueba a preguntármelo otra vez."
        : "El asistente no está disponible ahora mismo.";
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
