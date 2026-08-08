/**
 * Deja Stripe listo para cobrar: crea los productos y precios de cada plan,
 * configura el portal de cliente y da de alta el endpoint del webhook.
 * Al terminar imprime las variables de entorno que hay que pegar en Vercel.
 *
 *   npm run stripe:setup
 *
 * Es idempotente: los precios se buscan por su `lookup_key`, el portal por su
 * metadato y el webhook por su URL, así que volver a ejecutarlo no duplica
 * nada. Trabaja contra el modo (test o live) al que pertenezca la
 * STRIPE_SECRET_KEY del entorno.
 *
 * El dominio público sale de STRIPE_APP_URL (por defecto https://www.cremmo.es).
 * Se usa para la URL del webhook y para los enlaces legales del portal.
 *
 * Los precios se crean con `tax_behavior: 'exclusive'` porque los importes de
 * lib/planes.ts son sin IVA: Stripe Tax lo añade en el Checkout.
 */

import Stripe from "stripe";

const PLANES = [
  {
    clave: "cremmo_pro_mensual",
    variable: "STRIPE_PRICE_PRO",
    nombre: "Cremmo Pro",
    descripcion:
      "Todas las funcionalidades: pedidos por QR, carta con asistentes, promociones, comandas en tiempo real y estadísticas.",
    centimos: 8990,
  },
  {
    clave: "cremmo_business_mensual",
    variable: "STRIPE_PRICE_BUSINESS",
    nombre: "Cremmo Business",
    descripcion:
      "Todo lo de Pro más sistema multisede y facturación automática de cada pedido.",
    centimos: 24990,
  },
];

/** Los mismos que atiende app/api/stripe/webhook/route.ts. */
const EVENTOS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];

/** Marca las configuraciones creadas por este script para reconocerlas luego. */
const ETIQUETA = { cremmo: "1" };

const clave = process.env.STRIPE_SECRET_KEY;
if (!clave) {
  console.error(
    "Falta STRIPE_SECRET_KEY. Rellénala en .env.local antes de ejecutar."
  );
  process.exit(1);
}

const sitio = (process.env.STRIPE_APP_URL || "https://www.cremmo.es").replace(
  /\/$/,
  ""
);

const stripe = new Stripe(clave);
const esLive = clave.startsWith("sk_live");
console.log(
  `Configurando Stripe · modo ${esLive ? "LIVE (dinero real)" : "test"} · ${sitio}\n`
);

/** Variables que el usuario tendrá que copiar al final. */
const variables = [];
/** Avisos que requieren una acción manual en el dashboard. */
const pendientes = [];

await crearPrecios();
await configurarPortal();
await registrarWebhook();

console.log("\n" + "─".repeat(70));
console.log("\nPega estas líneas en .env.local y en las variables de Vercel:\n");
console.log(variables.join("\n"));

if (pendientes.length) {
  console.log("\nPendiente de hacer a mano:\n");
  for (const aviso of pendientes) console.log(`  · ${aviso}`);
}
console.log();

// ---------------------------------------------------------------------------

async function crearPrecios() {
  console.log("Planes");

  for (const plan of PLANES) {
    const existentes = await stripe.prices.list({
      lookup_keys: [plan.clave],
      limit: 1,
    });

    let precio = existentes.data[0];

    if (precio) {
      console.log(`  = ${plan.nombre}: ya existía (${precio.id})`);
    } else {
      const producto = await stripe.products.create({
        name: plan.nombre,
        description: plan.descripcion,
      });
      precio = await stripe.prices.create({
        product: producto.id,
        currency: "eur",
        unit_amount: plan.centimos,
        recurring: { interval: "month" },
        tax_behavior: "exclusive",
        lookup_key: plan.clave,
      });
      console.log(`  + ${plan.nombre}: creado (${precio.id})`);
    }

    variables.push(`${plan.variable}=${precio.id}`);
  }
}

/**
 * Portal de cliente: método de pago, facturas y datos fiscales. El cambio de
 * plan queda desactivado a propósito, porque lo gestiona el propio panel (y
 * Business todavía no se puede contratar).
 */
async function configurarPortal() {
  console.log("\nPortal de cliente");

  const ajustes = {
    business_profile: {
      privacy_policy_url: `${sitio}/privacidad`,
      terms_of_service_url: `${sitio}/terminos`,
    },
    default_return_url: `${sitio}/dashboard/ajustes`,
    features: {
      customer_update: {
        enabled: true,
        // La dirección es necesaria para que Stripe Tax calcule el IVA.
        allowed_updates: ["email", "name", "address", "tax_id"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      subscription_update: { enabled: false },
    },
  };

  const { data } = await stripe.billingPortal.configurations.list({
    limit: 100,
  });
  const previa =
    data.find((c) => c.metadata?.cremmo === "1") ?? data.find((c) => c.is_default);

  let configuracion;
  if (previa) {
    configuracion = await stripe.billingPortal.configurations.update(previa.id, {
      ...ajustes,
      metadata: ETIQUETA,
    });
    console.log(`  = actualizada (${configuracion.id})`);
  } else {
    configuracion = await stripe.billingPortal.configurations.create({
      ...ajustes,
      metadata: ETIQUETA,
    });
    console.log(`  + creada (${configuracion.id})`);
  }

  variables.push(`STRIPE_PORTAL_CONFIG=${configuracion.id}`);
}

/**
 * Endpoint del webhook. Stripe solo enseña el secreto de firma en el momento
 * de crearlo, así que si ya existía hay que releerlo desde el dashboard.
 */
async function registrarWebhook() {
  console.log("\nWebhook");

  const destino = `${sitio}/api/stripe/webhook`;

  if (!destino.startsWith("https://")) {
    console.log(`  ! ${destino} no es https: Stripe lo rechazaría, lo salto`);
    pendientes.push(
      "Crear el webhook con una URL https (usa STRIPE_APP_URL=https://tu-dominio)"
    );
    return;
  }

  const { data } = await stripe.webhookEndpoints.list({ limit: 100 });
  const previo = data.find((e) => e.url === destino);

  if (previo) {
    await stripe.webhookEndpoints.update(previo.id, {
      enabled_events: EVENTOS,
      description: "Cremmo · suscripciones",
    });
    console.log(`  = ya existía, eventos actualizados (${previo.id})`);
    pendientes.push(
      `Copiar el signing secret del webhook ${previo.id} desde ` +
        "https://dashboard.stripe.com/webhooks y ponerlo en STRIPE_WEBHOOK_SECRET"
    );
    return;
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: destino,
    enabled_events: EVENTOS,
    description: "Cremmo · suscripciones",
    metadata: ETIQUETA,
  });
  console.log(`  + creado (${endpoint.id})`);
  variables.push(`STRIPE_WEBHOOK_SECRET=${endpoint.secret}`);
}
