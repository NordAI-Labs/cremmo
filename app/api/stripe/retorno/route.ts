import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { sincronizarSuscripcion } from "@/lib/stripe/suscripcion";
import { completarAlta } from "@/lib/stripe/alta";

export const dynamic = "force-dynamic";

/**
 * Vuelta desde Stripe Checkout. Sincroniza el estado con Stripe antes de
 * devolver a la app para que el usuario no vea su cuenta como "pendiente de
 * pago" justo después de pagar, en el hueco hasta que llega el webhook.
 *
 * No sustituye al webhook: es solo para que la pantalla llegue actualizada.
 * En un alta con pago primero, aquí no hay ninguna sesión todavía (el
 * usuario ni existe hasta este momento), así que el destino no puede ser el
 * panel: se manda a la pantalla de "revisa tu email".
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  const panel = new URL("/dashboard", request.url);
  // Si algo falla en un alta, no hay ninguna sesión a la que volver todavía:
  // el webhook lo completará por su cuenta, así que se manda al registro con
  // un aviso en vez de rebotar contra el panel sin sesión.
  const registroConAviso = new URL("/registro", request.url);
  registroConAviso.searchParams.set("pago", "procesando");

  if (!sessionId) return NextResponse.redirect(panel);

  try {
    const sesion = await stripe().checkout.sessions.retrieve(sessionId);
    if (!sesion.subscription) return NextResponse.redirect(panel);

    const esAlta = sesion.metadata?.modo === "alta";

    const sub = await stripe().subscriptions.retrieve(
      typeof sesion.subscription === "string"
        ? sesion.subscription
        : sesion.subscription.id
    );

    if (esAlta) {
      await completarAlta(sub);
      const completado = new URL("/registro/completado", request.url);
      if (sesion.metadata?.email) {
        completado.searchParams.set("email", sesion.metadata.email);
      }
      return NextResponse.redirect(completado);
    }

    await sincronizarSuscripcion(sub, sesion.metadata?.heladeria_id);
    panel.searchParams.set("pago", "ok");
    return NextResponse.redirect(panel);
  } catch (err) {
    // Si falla, el webhook acabará poniendo el estado al día (o completando
    // el alta); esta ruta solo se limita a enseñar algo razonable mientras.
    console.error("[stripe] retorno de checkout:", err);
    return NextResponse.redirect(registroConAviso);
  }
}
