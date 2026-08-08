import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

/**
 * Sirve el favicon personalizado desde app/cremmo-icon.ico para que pueda
 * usarse sin depender del nombre especial app/favicon.ico.
 */
export async function GET() {
  try {
    const iconPath = join(process.cwd(), "app", "cremmo-icon.ico");
    const bytes = await readFile(iconPath);
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/x-icon",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Icono no encontrado", { status: 404 });
  }
}
