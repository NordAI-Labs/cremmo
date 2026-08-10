import Stripe from "stripe";
import { serverEnv } from "@/lib/env";

let cliente: Stripe | null = null;

/**
 * Cliente de Stripe. SOLO servidor: usa la clave secreta.
 *
 * Se construye al primer uso y no en el import para que la app siga
 * arrancando (login, carta, panel) aunque todavía no haya claves de Stripe
 * configuradas; solo fallan las acciones que de verdad necesitan cobrar.
 *
 * No se fija `apiVersion` a propósito: se usa la que trae el SDK instalado,
 * que es la que corresponde a sus tipos de TypeScript.
 */
export function stripe(): Stripe {
  if (!cliente) {
    cliente = new Stripe(serverEnv.stripeSecretKey, {
      appInfo: { name: "Cremmo", url: "https://www.cremmo.app" },
    });
  }
  return cliente;
}
