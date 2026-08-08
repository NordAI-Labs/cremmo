import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { sincronizarSuscripcion } from "@/lib/stripe/suscripcion";

export const dynamic = "force-dynamic";

/**
 * Vuelta desde Stripe Checkout. Sincroniza el estado con Stripe antes de
 * devolver al panel para que el usuario no vea su cuenta como "pendiente de
 * pago" justo después de pagar, en el hueco hasta que llega el webhook.
 *
 * No sustituye al webhook: es solo para que la pantalla llegue actualizada.
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  const panel = new URL("/dashboard", request.url);

  if (!sessionId) return NextResponse.redirect(panel);

  try {
    const sesion = await stripe().checkout.sessions.retrieve(sessionId);
    if (sesion.subscription) {
      const sub = await stripe().subscriptions.retrieve(
        typeof sesion.subscription === "string"
          ? sesion.subscription
          : sesion.subscription.id
      );
      await sincronizarSuscripcion(sub, sesion.metadata?.heladeria_id);
    }
    panel.searchParams.set("pago", "ok");
  } catch (err) {
    // Si falla, el webhook acabará poniendo el estado al día; el panel se
    // limita a enseñar la pantalla que corresponda mientras tanto.
    console.error("[stripe] retorno de checkout:", err);
  }

  return NextResponse.redirect(panel);
}
