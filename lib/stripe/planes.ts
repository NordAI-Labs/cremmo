import { serverEnv } from "@/lib/env";
import type { PlanHeladeria } from "@/types/database.types";

/**
 * Correspondencia entre los planes de `lib/planes.ts` y los precios
 * recurrentes creados en Stripe (`npm run stripe:setup`).
 */

/** Precio (price_...) con el que se factura un plan. */
export function precioDePlan(plan: PlanHeladeria): string | undefined {
  if (plan === "business") return serverEnv.stripePrecios.business;
  if (plan === "basic") return serverEnv.stripePrecios.basic;
  // 'basico' y 'multi_sede' son los planes heredados del esquema inicial:
  // equivalen a Pro y se facturan como tal.
  return serverEnv.stripePrecios.pro;
}

/** Plan al que corresponde un precio de Stripe, o null si no lo reconocemos. */
export function planDePrecio(
  precioId: string | null | undefined
): PlanHeladeria | null {
  if (!precioId) return null;
  if (precioId === serverEnv.stripePrecios.business) return "business";
  if (precioId === serverEnv.stripePrecios.pro) return "pro";
  if (precioId === serverEnv.stripePrecios.basic) return "basic";
  return null;
}
