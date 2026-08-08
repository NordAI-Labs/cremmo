import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { crearPedidoSchema } from "@/lib/validation/pedido";
import { crearPedido, PedidoError } from "@/lib/pedidos/crear";
import { createAdminClient } from "@/lib/supabase/admin";
import { MESA_SESSION_COOKIE, verificarMesaSessionCookie } from "@/lib/mesa-session";
import { suscripcionVigente } from "@/lib/planes";

/**
 * POST /api/pedidos
 * Creación de pedidos del cliente final. Recalcula el total en servidor.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = crearPedidoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const { data: heladeria } = await admin
      .from("heladerias")
      .select("activa, cancelada_en, suscripcion_estado")
      .eq("slug", parsed.data.slug)
      .maybeSingle();

    // Este cliente usa la service role y salta RLS, así que el estado de la
    // suscripción hay que comprobarlo a mano.
    if (!heladeria || !heladeria.activa || !suscripcionVigente(heladeria)) {
      return NextResponse.json(
        { error: "Heladería no encontrada" },
        { status: 404 }
      );
    }

    // Si el pedido lleva mesa, exige una sesión de mesa vigente (la misma
    // cookie que comprueba la carta al mostrarse). Evita que un pedido se
    // cuele por esta API aunque la UI que lo generó estuviera desactualizada
    // (por ejemplo, una pestaña abierta desde antes de que caducase).
    if (parsed.data.mesa_token) {
      const cookieStore = await cookies();
      const cookieSesion = cookieStore.get(MESA_SESSION_COOKIE)?.value;
      if (!verificarMesaSessionCookie(cookieSesion, parsed.data.mesa_token)) {
        return NextResponse.json(
          {
            error:
              "Tu sesión de mesa ha caducado. Vuelve a escanear el código QR para pedir.",
          },
          { status: 401 }
        );
      }
    }

    const pedido = await crearPedido(parsed.data);

    return NextResponse.json({ pedido }, { status: 201 });
  } catch (err) {
    if (err instanceof PedidoError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[/api/pedidos] error:", err);
    return NextResponse.json(
      { error: "Error interno al crear el pedido" },
      { status: 500 }
    );
  }
}
