"use server";

import { revalidatePath } from "next/cache";
import { getSessionData } from "@/lib/auth/session";
import { env, isStripeConfigured, serverEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe/client";
import { precioDePlan } from "@/lib/stripe/planes";
import {
  asegurarClienteStripe,
  sincronizarSuscripcion,
  suscripcionDeHeladeria,
} from "@/lib/stripe/suscripcion";
import { esPlanContratable } from "@/lib/planes";
import type { Heladeria, PlanHeladeria } from "@/types/database.types";

/**
 * Acciones de la suscripción. Todas llaman a Stripe y, con la respuesta,
 * sincronizan la base de datos en el momento: el webhook volverá a hacerlo,
 * pero así el panel refleja el cambio sin esperar a que llegue.
 */

type Resultado = { error?: string };
type ResultadoUrl = Resultado & { url?: string };

interface Contexto {
  error?: string;
  heladeria?: Heladeria;
  email?: string | null;
}

/** Solo el propietario gestiona el cobro, y solo si Stripe está configurado. */
async function contexto(): Promise<Contexto> {
  const s = await getSessionData();
  if (!s?.heladeria) return { error: "Sesión no válida" };
  if (s.perfil?.rol !== "owner") {
    return { error: "Solo el propietario puede gestionar la suscripción" };
  }
  if (!isStripeConfigured()) {
    return { error: "El cobro con tarjeta todavía no está configurado" };
  }
  return { heladeria: s.heladeria, email: s.email };
}

function fallo(operacion: string, err: unknown): Resultado {
  console.error(`[stripe] ${operacion}:`, err);
  return {
    error: "No se pudo completar la operación con Stripe. Inténtalo de nuevo.",
  };
}

function refrescar() {
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard");
}

/**
 * Abre un pago de Stripe Checkout para contratar (o volver a contratar) un
 * plan. Devuelve la URL a la que el navegador tiene que ir.
 */
export async function iniciarCheckout(
  plan: PlanHeladeria
): Promise<ResultadoUrl> {
  const ctx = await contexto();
  if (!ctx.heladeria) return { error: ctx.error };
  if (!esPlanContratable(plan)) {
    return { error: "Ese plan todavía no está disponible" };
  }

  const precio = precioDePlan(plan);
  if (!precio) {
    return { error: "Falta configurar el precio de este plan en Stripe" };
  }

  try {
    const cliente = await asegurarClienteStripe(
      ctx.heladeria,
      ctx.email ?? null
    );
    const sesion = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: cliente,
      line_items: [{ price: precio, quantity: 1 }],
      locale: "es",
      // Stripe Tax calcula el IVA sobre el precio sin impuestos, y para eso
      // necesita la dirección de facturación del cliente.
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      // Permite al cliente indicar su NIF/CIF y que salga en la factura.
      tax_id_collection: { enabled: true },
      metadata: { heladeria_id: ctx.heladeria.id },
      subscription_data: { metadata: { heladeria_id: ctx.heladeria.id } },
      // El retorno pasa por una ruta propia que sincroniza el estado antes de
      // devolver al panel: si esperásemos al webhook, el usuario podría ver su
      // cuenta como no pagada justo después de pagar.
      success_url: `${env.siteUrl}/api/stripe/retorno?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/dashboard?pago=cancelado`,
    });

    if (!sesion.url) return { error: "Stripe no devolvió una URL de pago" };
    return { url: sesion.url };
  } catch (err) {
    return fallo("checkout", err);
  }
}

/** Portal de cliente de Stripe: método de pago, facturas y datos fiscales. */
export async function abrirPortalFacturacion(): Promise<ResultadoUrl> {
  const ctx = await contexto();
  if (!ctx.heladeria) return { error: ctx.error };

  try {
    const cliente = await asegurarClienteStripe(
      ctx.heladeria,
      ctx.email ?? null
    );
    const sesion = await stripe().billingPortal.sessions.create({
      customer: cliente,
      locale: "es",
      configuration: serverEnv.stripePortalConfig,
      return_url: `${env.siteUrl}/dashboard/ajustes`,
    });
    return { url: sesion.url };
  } catch (err) {
    return fallo("portal", err);
  }
}

/** Programa la baja para el final del periodo ya pagado. */
export async function cancelarSuscripcion(): Promise<
  Resultado & { canceladaEn?: string }
> {
  const ctx = await contexto();
  if (!ctx.heladeria) return { error: ctx.error };

  try {
    const sub = await suscripcionDeHeladeria(ctx.heladeria);
    if (!sub) return { error: "No hay ninguna suscripción activa que cancelar" };

    const actualizada = await stripe().subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });
    await sincronizarSuscripcion(actualizada, ctx.heladeria.id);
    refrescar();

    const fin = actualizada.items.data[0]?.current_period_end;
    return { canceladaEn: fin ? new Date(fin * 1000).toISOString() : undefined };
  } catch (err) {
    return fallo("cancelar", err);
  }
}

/** Retira una baja programada (solo si la suscripción sigue viva en Stripe). */
export async function reanudarSuscripcion(): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx.heladeria) return { error: ctx.error };

  try {
    const sub = await suscripcionDeHeladeria(ctx.heladeria);
    if (!sub || sub.status === "canceled" || sub.status === "incomplete_expired") {
      return {
        error:
          "Tu suscripción ya terminó. Vuelve a contratar el plan para reactivarla.",
      };
    }

    const actualizada = await stripe().subscriptions.update(sub.id, {
      cancel_at_period_end: false,
    });
    await sincronizarSuscripcion(actualizada, ctx.heladeria.id);
    refrescar();
    return {};
  } catch (err) {
    return fallo("reanudar", err);
  }
}

/**
 * Cambia de plan. Con una suscripción viva se cambia la línea y Stripe
 * prorratea; si ya no hay suscripción, se contrata de nuevo por Checkout.
 */
export async function cambiarPlan(plan: PlanHeladeria): Promise<ResultadoUrl> {
  const ctx = await contexto();
  if (!ctx.heladeria) return { error: ctx.error };
  if (!esPlanContratable(plan)) {
    return { error: "Ese plan todavía no está disponible" };
  }

  const precio = precioDePlan(plan);
  if (!precio) {
    return { error: "Falta configurar el precio de este plan en Stripe" };
  }

  try {
    const sub = await suscripcionDeHeladeria(ctx.heladeria);
    if (!sub || sub.status === "canceled" || sub.status === "incomplete_expired") {
      return iniciarCheckout(plan);
    }

    const linea = sub.items.data[0];
    if (!linea) return { error: "La suscripción de Stripe no tiene líneas" };

    const actualizada = await stripe().subscriptions.update(sub.id, {
      items: [{ id: linea.id, price: precio }],
      proration_behavior: "create_prorations",
    });
    await sincronizarSuscripcion(actualizada, ctx.heladeria.id);
    refrescar();
    return {};
  } catch (err) {
    return fallo("cambiar plan", err);
  }
}
