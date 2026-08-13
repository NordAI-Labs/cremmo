import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";

let cliente: Anthropic | null = null;

/**
 * Cliente de Anthropic. SOLO servidor: usa la clave secreta.
 *
 * Igual que el de Stripe, se construye al primer uso y no en el import: sin
 * clave configurada el resto de la app (carta incluida) sigue funcionando y
 * solo falla el asistente.
 */
export function anthropic(): Anthropic {
  if (!cliente) {
    cliente = new Anthropic({ apiKey: serverEnv.anthropicApiKey });
  }
  return cliente;
}
