import { createHmac, timingSafeEqual } from "crypto";
import { serverEnv } from "@/lib/env";

/**
 * Sesión de mesa: se abre al pasar por `/m/[token]` (destino del QR) y da
 * acceso a la carta pública durante un tiempo limitado. Pasado ese tiempo, la
 * carta deja de mostrarse aunque la URL con `?mesa=` siga siendo la misma;
 * hay que volver a abrir el enlace del QR para renovarla.
 *
 * Se implementa como una cookie httpOnly con el payload firmado con HMAC, en
 * vez de un token de sesión en base de datos: no añade una tabla ni una
 * consulta extra, y el propio payload lleva su caducidad, así que no depende
 * de que el navegador respete el `maxAge` de la cookie.
 */

export const MESA_SESSION_COOKIE = "mesa_session";
export const MESA_SESSION_DURACION_SEGUNDOS = 30 * 60;

interface MesaSessionPayload {
  /** id de la mesa (no se usa para autorizar, solo informativo) */
  m: string;
  /** token de la mesa: la cookie solo vale para el enlace con el que se abrió */
  t: string;
  /** caducidad, en segundos desde epoch */
  exp: number;
}

function firmar(datos: string): string {
  return createHmac("sha256", serverEnv.sessionSecret).update(datos).digest("hex");
}

/** Valor a guardar en la cookie `mesa_session`. */
export function crearMesaSessionCookie(mesaId: string, token: string): string {
  const payload: MesaSessionPayload = {
    m: mesaId,
    t: token,
    exp: Math.floor(Date.now() / 1000) + MESA_SESSION_DURACION_SEGUNDOS,
  };
  const datos = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${datos}.${firmar(datos)}`;
}

/** Verifica la firma y devuelve el payload, o `null` si no es válido. */
function payloadFirmado(
  valorCookie: string | undefined
): MesaSessionPayload | null {
  if (!valorCookie) return null;
  const [datos, firma] = valorCookie.split(".");
  if (!datos || !firma) return null;

  const firmaEsperada = firmar(datos);
  const a = Buffer.from(firma);
  const b = Buffer.from(firmaEsperada);
  // Comparación en tiempo constante: evita filtrar por temporización cuánto
  // de la firma coincide.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(
      Buffer.from(datos, "base64url").toString("utf8")
    ) as MesaSessionPayload;
  } catch {
    return null;
  }
}

/**
 * True si la cookie es válida, no ha caducado y corresponde al `token` de la
 * mesa que se está intentando abrir (evita reutilizar la cookie de una mesa
 * para otra distinta).
 */
export function verificarMesaSessionCookie(
  valorCookie: string | undefined,
  tokenEsperado: string
): boolean {
  const payload = payloadFirmado(valorCookie);
  if (!payload) return false;
  if (payload.t !== tokenEsperado) return false;
  if (payload.exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}

/**
 * Instante (epoch en ms) en el que caduca la sesión de una cookie ya
 * validada, para que el cliente pueda programar el cierre automático de la
 * carta sin esperar a la siguiente petición al servidor.
 */
export function expiracionMesaSessionCookie(
  valorCookie: string | undefined,
  tokenEsperado: string
): number | null {
  const payload = payloadFirmado(valorCookie);
  if (!payload || payload.t !== tokenEsperado) return null;
  return payload.exp * 1000;
}
