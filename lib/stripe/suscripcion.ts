import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planDePrecio } from "@/lib/stripe/planes";
import { stripe } from "@/lib/stripe/client";
import type {
  EstadoSuscripcionBD,
  Heladeria,
  PlanHeladeria,
} from "@/types/database.types";

/**
 * Puente entre Stripe y la tabla `heladerias`.
 *
 * Stripe manda: aquí solo se copia su estado a las columnas que usan RLS y el
 * panel. Se escribe siempre con la clave service_role, que es la única que el
 * trigger `heladerias_proteger_suscripcion` deja tocar esas columnas.
 */

function iso(epochSegundos: number): string {
  return new Date(epochSegundos * 1000).toISOString();
}

/** Traduce el estado de Stripe al que guardamos. */
function estadoDesdeStripe(
  status: Stripe.Subscription.Status
): EstadoSuscripcionBD {
  switch (status) {
    case "active":
    case "trialing":
      return "activa";
    // Stripe sigue reintentando el cobro: no se corta el servicio todavía.
    case "past_due":
      return "impago";
    // Aún no ha llegado a cobrarse el primer pago (3D Secure a medias, etc.).
    case "incomplete":
      return "pendiente";
    // 'canceled', 'incomplete_expired', 'paused', 'unpaid' (reintentos
    // agotados) y cualquier estado futuro: sin servicio.
    default:
      return "cancelada";
  }
}

/**
 * El fin del periodo vive en la línea de la suscripción, no en la suscripción
 * (la API lo movió a los items al soportar periodos distintos por línea).
 */
function finDePeriodo(sub: Stripe.Subscription): string | null {
  const fin = sub.items.data[0]?.current_period_end;
  return fin ? iso(fin) : null;
}

/** Fecha a partir de la cual la heladería deja de tener servicio. */
function fechaDeCorte(
  sub: Stripe.Subscription,
  estado: EstadoSuscripcionBD,
  periodoFin: string | null
): string | null {
  if (estado === "cancelada") {
    const fin = sub.ended_at ?? sub.canceled_at;
    return fin ? iso(fin) : new Date().toISOString();
  }
  if (sub.cancel_at) return iso(sub.cancel_at);
  if (sub.cancel_at_period_end) return periodoFin;
  return null;
}

function idCliente(sub: Stripe.Subscription): string {
  return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
}

export interface DatosSuscripcion {
  stripe_customer_id: string;
  stripe_subscription_id: string;
  suscripcion_estado: EstadoSuscripcionBD;
  periodo_fin: string | null;
  cancelada_en: string | null;
  plan?: PlanHeladeria;
}

/** Traduce una suscripción de Stripe a las columnas de `heladerias`. */
export function datosDesdeSuscripcion(
  sub: Stripe.Subscription
): DatosSuscripcion {
  const estado = estadoDesdeStripe(sub.status);
  const periodoFin = finDePeriodo(sub);
  const plan = planDePrecio(sub.items.data[0]?.price?.id);

  return {
    stripe_customer_id: idCliente(sub),
    stripe_subscription_id: sub.id,
    suscripcion_estado: estado,
    periodo_fin: periodoFin,
    cancelada_en: fechaDeCorte(sub, estado, periodoFin),
    // Si el precio no es de ningún plan conocido, se deja el que ya tuviera en
    // vez de inventarse uno.
    ...(plan ? { plan } : {}),
  };
}

/** Busca a qué heladería pertenece una suscripción. */
async function localizarHeladeria(
  sub: Stripe.Subscription
): Promise<string | null> {
  const porMetadatos = sub.metadata?.heladeria_id;
  if (porMetadatos) return porMetadatos;

  const admin = createAdminClient();
  const { data } = await admin
    .from("heladerias")
    .select("id")
    .or(
      `stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${idCliente(sub)}`
    )
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * Copia el estado de una suscripción de Stripe a su heladería. Es la única
 * función que escribe el estado de pago, y la llaman tanto el webhook como las
 * acciones del panel (para no depender de que el webhook llegue antes de que
 * el usuario vea la pantalla).
 */
export async function sincronizarSuscripcion(
  sub: Stripe.Subscription,
  heladeriaId?: string
): Promise<void> {
  const id = heladeriaId ?? (await localizarHeladeria(sub));
  if (!id) {
    console.error(
      `[stripe] suscripción ${sub.id} sin heladería asociada; no se sincroniza`
    );
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("heladerias")
    .update(datosDesdeSuscripcion(sub))
    .eq("id", id);

  if (error) {
    // Se propaga para que el webhook devuelva 500 y Stripe lo reintente.
    throw new Error(`No se pudo sincronizar la suscripción: ${error.message}`);
  }
}

/**
 * Devuelve el cliente de Stripe de la heladería, creándolo la primera vez.
 * El `heladeria_id` viaja en los metadatos para poder reconstruir el vínculo
 * desde el dashboard de Stripe.
 */
export async function asegurarClienteStripe(
  heladeria: Pick<Heladeria, "id" | "nombre" | "stripe_customer_id">,
  email: string | null
): Promise<string> {
  if (heladeria.stripe_customer_id) return heladeria.stripe_customer_id;

  const cliente = await stripe().customers.create({
    name: heladeria.nombre,
    email: email ?? undefined,
    metadata: { heladeria_id: heladeria.id },
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("heladerias")
    .update({ stripe_customer_id: cliente.id })
    .eq("id", heladeria.id);

  if (error) {
    throw new Error(`No se pudo guardar el cliente de Stripe: ${error.message}`);
  }

  return cliente.id;
}

/** Recupera la suscripción en curso de una heladería, si la tiene. */
export async function suscripcionDeHeladeria(
  heladeria: Pick<Heladeria, "stripe_subscription_id">
): Promise<Stripe.Subscription | null> {
  if (!heladeria.stripe_subscription_id) return null;
  try {
    return await stripe().subscriptions.retrieve(
      heladeria.stripe_subscription_id
    );
  } catch {
    // La suscripción ya no existe en Stripe (cuenta borrada, modo test/live
    // cruzados…): se trata como si no hubiera.
    return null;
  }
}
