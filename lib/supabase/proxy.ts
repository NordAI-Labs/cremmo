import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Refresca la sesión de Supabase en cada petición y protege las rutas del
 * dashboard: si no hay usuario autenticado, redirige a /login.
 *
 * Lo usa `proxy.ts` (la antigua convención `middleware`, renombrada en
 * Next.js 16).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // El webhook de Stripe llega sin sesión y se autentica por firma: no tiene
  // sentido gastar una llamada a Supabase en refrescar cookies que no existen.
  if (request.nextUrl.pathname === "/api/stripe/webhook") {
    return supabaseResponse;
  }

  // Sin configuración de Supabase la app sigue arrancando (landing, login…).
  // Rellena .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no ejecutar código entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/dashboard") || pathname === "/onboarding";
  const isAuthRoute = pathname === "/login" || pathname === "/registro";

  // Rutas protegidas del panel: exigen sesión.
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Si ya hay sesión, no tiene sentido ver login/registro.
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
