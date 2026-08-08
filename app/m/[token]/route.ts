import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  crearMesaSessionCookie,
  MESA_SESSION_COOKIE,
  MESA_SESSION_DURACION_SEGUNDOS,
} from "@/lib/mesa-session";
import { suscripcionVigente } from "@/lib/planes";

export const dynamic = "force-dynamic";

/**
 * Destino real del QR de cada mesa (ver `mesas-manager.tsx`). Valida el
 * token, abre una sesión de mesa de duración limitada mediante una cookie
 * httpOnly y redirige a la carta. Cada visita a esta URL renueva la sesión:
 * es lo más parecido a "volver a escanear" que puede detectar un servidor,
 * ya que una petición directa a `/slug?mesa=token` guardada como enlace no
 * pasa por aquí y por tanto no renueva nada.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const inicio = new URL("/", request.url);

  const supabase = await createClient();
  const { data: mesa } = await supabase
    .from("mesas")
    .select("id, activa, heladeria_id")
    .eq("token", token)
    .maybeSingle();

  if (!mesa || !mesa.activa) {
    return NextResponse.redirect(inicio);
  }

  const { data: heladeria } = await supabase
    .from("heladerias")
    .select("slug, activa, cancelada_en, suscripcion_estado")
    .eq("id", mesa.heladeria_id)
    .maybeSingle();

  if (!heladeria || !heladeria.activa || !suscripcionVigente(heladeria)) {
    return NextResponse.redirect(inicio);
  }

  const destino = new URL(`/${heladeria.slug}`, request.url);
  destino.searchParams.set("mesa", token);

  const response = NextResponse.redirect(destino);
  response.cookies.set(
    MESA_SESSION_COOKIE,
    crearMesaSessionCookie(mesa.id, token),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MESA_SESSION_DURACION_SEGUNDOS,
    }
  );
  return response;
}
