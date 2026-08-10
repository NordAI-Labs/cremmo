import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify, randomToken } from "@/lib/utils";
import { env } from "@/lib/env";
import { PLAN_POR_DEFECTO, esPlanContratable } from "@/lib/planes";
import { precioDePlan } from "./planes";
import { stripe } from "./client";
import { sincronizarSuscripcion } from "./suscripcion";
import type { PlanHeladeria } from "@/types/database.types";

/**
 * Alta con pago primero: el registro no crea nada en Supabase hasta que
 * Stripe confirma el primer cobro. Mientras tanto, los datos del formulario
 * viajan en la metadata de la sesión/suscripción de Stripe.
 */

interface DatosAlta {
  email: string;
  nombre: string;
  nombreHeladeria: string;
  plan: PlanHeladeria;
}

function leerDatosAlta(
  metadata: Stripe.Metadata | null | undefined
): DatosAlta | null {
  if (!metadata || metadata.modo !== "alta") return null;
  const email = metadata.email;
  const nombreHeladeria = metadata.nombre_heladeria;
  if (!email || !nombreHeladeria) return null;
  return {
    email,
    nombre: metadata.nombre ?? "",
    nombreHeladeria,
    plan: esPlanContratable(metadata.plan) ? (metadata.plan as PlanHeladeria) : PLAN_POR_DEFECTO,
  };
}

/**
 * Abre el pago del plan elegido en el registro. No requiere sesión ni crea
 * ningún usuario: si el cliente abandona el pago, no queda ninguna cuenta
 * huérfana.
 */
export async function iniciarCheckoutAlta(datos: {
  email: string;
  nombre: string;
  nombreHeladeria: string;
  plan: PlanHeladeria;
}): Promise<{ url?: string; error?: string }> {
  if (!esPlanContratable(datos.plan)) {
    return { error: "Ese plan todavía no está disponible" };
  }

  const precio = precioDePlan(datos.plan);
  if (!precio) {
    return { error: "Falta configurar el precio de este plan en Stripe" };
  }

  const metadata = {
    modo: "alta",
    email: datos.email,
    nombre: datos.nombre,
    nombre_heladeria: datos.nombreHeladeria,
    plan: datos.plan,
  };

  try {
    const sesion = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer_email: datos.email,
      line_items: [{ price: precio, quantity: 1 }],
      locale: "es",
      // Stripe Tax necesita la dirección de facturación para calcular el IVA.
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      metadata,
      // La metadata de la sesión no pasa a la suscripción: hay que repetirla
      // aquí para que el webhook la encuentre en `sub.metadata`.
      subscription_data: { metadata },
      success_url: `${env.siteUrl}/api/stripe/retorno?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/registro?pago=cancelado`,
    });

    if (!sesion.url) return { error: "Stripe no devolvió una URL de pago" };
    return { url: sesion.url };
  } catch (err) {
    console.error("[stripe] checkout de alta:", err);
    return { error: "No se pudo iniciar el pago. Inténtalo de nuevo." };
  }
}

/**
 * Tras el primer pago de un alta nueva: invita por email al usuario (fija su
 * contraseña él mismo desde el enlace), crea la heladería y sus mesas de
 * ejemplo, y sincroniza el estado de la suscripción.
 *
 * Idempotente: la llaman tanto el webhook como la ruta de retorno, y Stripe
 * puede reintentar el webhook si la respuesta tarda. En cada paso comprueba
 * si ya existe lo que va a crear antes de crearlo.
 */
export async function completarAlta(sub: Stripe.Subscription): Promise<void> {
  const datos = leerDatosAlta(sub.metadata);
  if (!datos) {
    console.error(
      `[stripe] alta sin metadata válida para la suscripción ${sub.id}`
    );
    return;
  }

  const admin = createAdminClient();

  const { data: yaVinculada } = await admin
    .from("heladerias")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (yaVinculada) {
    await sincronizarSuscripcion(sub, yaVinculada.id);
    return;
  }

  let usuarioId: string | undefined;
  const { data: invitado, error: errorInvitar } =
    await admin.auth.admin.inviteUserByEmail(datos.email, {
      data: { nombre: datos.nombre, nombre_heladeria: datos.nombreHeladeria },
      redirectTo: `${env.siteUrl}/activar-cuenta`,
    });

  if (invitado?.user) {
    usuarioId = invitado.user.id;
  } else {
    // El email ya tenía usuario: reintento del webhook a medio terminar. Se
    // recupera en vez de fallar (ver 0014_alta_pago_previo.sql).
    const { data: idExistente } = await admin.rpc("usuario_id_por_email", {
      p_email: datos.email,
    });
    usuarioId = idExistente ?? undefined;
  }

  if (!usuarioId) {
    console.error(
      `[stripe] no se pudo crear ni localizar el usuario de ${datos.email}:`,
      errorInvitar
    );
    throw new Error("No se pudo crear la cuenta tras el pago");
  }

  const { data: perfilExistente } = await admin
    .from("perfiles")
    .select("heladeria_id")
    .eq("id", usuarioId)
    .maybeSingle();

  let heladeriaId = perfilExistente?.heladeria_id;

  if (!heladeriaId) {
    const base = slugify(datos.nombreHeladeria) || "heladeria";
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const { data: existe } = await admin
        .from("heladerias")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existe) break;
      slug = `${base}-${randomToken(4)}`;
    }

    const { data: heladeria, error: errorHeladeria } = await admin
      .from("heladerias")
      .insert({ nombre: datos.nombreHeladeria, slug, plan: datos.plan })
      .select("id")
      .single();
    if (errorHeladeria || !heladeria) {
      throw new Error(
        `No se pudo crear la heladería: ${errorHeladeria?.message}`
      );
    }
    heladeriaId = heladeria.id;

    const { error: errorPerfil } = await admin.from("perfiles").insert({
      id: usuarioId,
      heladeria_id: heladeriaId,
      nombre: datos.nombre || null,
      rol: "owner",
    });
    if (errorPerfil) {
      throw new Error(`No se pudo crear el perfil: ${errorPerfil.message}`);
    }

    await admin.from("mesas").insert([
      { heladeria_id: heladeriaId, nombre: "Mesa 1", token: randomToken(12) },
      { heladeria_id: heladeriaId, nombre: "Mesa 2", token: randomToken(12) },
    ]);
  }

  await sincronizarSuscripcion(sub, heladeriaId);
}
