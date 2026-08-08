/**
 * Acceso centralizado a variables de entorno y feature flags.
 * Las variables `NEXT_PUBLIC_*` son accesibles en cliente y servidor.
 * Las que no llevan ese prefijo SOLO deben leerse en servidor.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** Variables solo-servidor. Lanza si se accede sin estar configuradas. */
export const serverEnv = {
  get supabaseServiceRoleKey(): string {
    const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!v) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
    return v;
  },
  /** Firma la cookie de sesión de mesa (ver lib/mesa-session.ts). */
  get sessionSecret(): string {
    const v = process.env.SESSION_SECRET;
    if (!v) throw new Error("Falta SESSION_SECRET");
    return v;
  },
  get stripeSecretKey(): string {
    const v = process.env.STRIPE_SECRET_KEY;
    if (!v) throw new Error("Falta STRIPE_SECRET_KEY");
    return v;
  },
  get stripeWebhookSecret(): string {
    const v = process.env.STRIPE_WEBHOOK_SECRET;
    if (!v) throw new Error("Falta STRIPE_WEBHOOK_SECRET");
    return v;
  },
  /**
   * Configuración del portal de cliente (bpc_...) creada por
   * `npm run stripe:setup`. Sin ella Stripe usa la configuración por defecto
   * de la cuenta.
   */
  get stripePortalConfig(): string | undefined {
    return process.env.STRIPE_PORTAL_CONFIG || undefined;
  },
  /** Id del precio recurrente de cada plan en Stripe (price_...). */
  stripePrecios: {
    get pro(): string | undefined {
      return process.env.STRIPE_PRICE_PRO || undefined;
    },
    get business(): string | undefined {
      return process.env.STRIPE_PRICE_BUSINESS || undefined;
    },
  },
};

/** True si hay clave de Stripe configurada (el cobro puede operar). */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** True si hay URL y clave anónima de Supabase configuradas. */
export function isSupabaseConfigured(): boolean {
  return !!env.supabaseUrl && !!env.supabaseAnonKey;
}
