import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { env, serverEnv } from "@/lib/env";

/**
 * Cliente administrativo con la clave service_role. SALTA RLS.
 * ⚠️ USAR SOLO EN SERVIDOR (Route Handlers, Server Actions, webhooks) y con
 * validación propia de los datos. Nunca importar desde código de cliente.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
