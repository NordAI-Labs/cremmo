"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { env } from "@/lib/env";

/**
 * Cliente de Supabase para componentes de navegador ("use client").
 * Usa la clave anónima; el aislamiento de datos lo garantiza RLS.
 */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
