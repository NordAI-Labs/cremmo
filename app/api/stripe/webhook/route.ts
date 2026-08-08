import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe/client";
import { sincronizarSuscripcion } from "@/lib/stripe/suscripcion";

export const dynamic = "force-dynamic";

/**
 * Webhook de Stripe: la única vía por la que el estado de pago entra en la
 * base de datos de forma autónoma. Se verifica la firma con el cuerpo en crudo
 * (por eso `request.text()` y no `request.json()`), y ante cualquier fallo se
 * responde 500 para que Stripe lo reintente.
 */
export async function POST(request: Request) {
  const firma = request.headers.get("stripe-signature");
  if (!firma) {
    return NextResponse.json({ error: "Falta la firma" }, { status: 400 });
  }

  const cuerpo = await request.text();

  let evento: Stripe.Event;
  try {
    evento = await stripe().webhooks.constructEventAsync(
      cuerpo,
      firma,
      serverEnv.stripeWebhookSecret
    );
  } catch (err) {
    console.error("[stripe] firma de webhook inválida:", err);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  try {
    await procesar(evento);
  } catch (err) {
    console.error(`[stripe] error procesando ${evento.type}:`, err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  return NextResponse.json({ recibido: true });
}

async function procesar(evento: Stripe.Event) {
  switch (evento.type) {
    // Primer pago hecho: la suscripción ya existe y hay que engancharla a su
    // heladería.
    case "checkout.session.completed": {
      const sesion = evento.data.object;
      if (sesion.mode !== "subscription" || !sesion.subscription) return;

      const sub = await stripe().subscriptions.retrieve(
        typeof sesion.subscription === "string"
          ? sesion.subscription
          : sesion.subscription.id
      );
      await sincronizarSuscripcion(sub, sesion.metadata?.heladeria_id);
      return;
    }

    // Altas, cambios de plan, cancelaciones y renovaciones.
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await sincronizarSuscripcion(evento.data.object);
      return;
    }

    // Cobros del ciclo: el estado de la suscripción ya cambió en Stripe, se
    // relee para no depender del orden de llegada de los eventos.
    case "invoice.paid":
    case "invoice.payment_failed": {
      const factura = evento.data.object;
      const subId = idSuscripcionDeFactura(factura);
      if (!subId) return;

      const sub = await stripe().subscriptions.retrieve(subId);
      await sincronizarSuscripcion(sub);
      return;
    }

    default:
      // El resto de eventos no afectan al acceso a la app.
      return;
  }
}

/**
 * La factura referencia su suscripción dentro de las líneas (el campo
 * `subscription` de nivel superior desapareció de la API).
 */
function idSuscripcionDeFactura(factura: Stripe.Invoice): string | null {
  for (const linea of factura.lines.data) {
    const sub = linea.parent?.subscription_item_details?.subscription;
    if (sub) return sub;
  }
  return null;
}
