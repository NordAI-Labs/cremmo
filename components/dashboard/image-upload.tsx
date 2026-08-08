"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { randomToken } from "@/lib/utils";

/** Lado máximo del lienzo al normalizar (evita subir fotos enormes). */
const LADO_MAXIMO = 1000;

/**
 * Encaja la imagen entera, sin recortarla, en un lienzo cuadrado con fondo
 * blanco y la devuelve en WebP. Así todas las fotos del catálogo tienen la
 * misma forma y pesan menos. El lado se ajusta al mayor de la imagen (tope
 * LADO_MAXIMO) para no ampliar fotos pequeñas y que se vean borrosas.
 *
 * Devuelve null si el navegador no puede procesarla (SVG, formato raro…): en
 * ese caso se sube el archivo original tal cual.
 */
async function normalizarCuadrada(file: File): Promise<Blob | null> {
  if (typeof createImageBitmap !== "function") return null;
  if (file.type === "image/svg+xml") return null;

  try {
    const bitmap = await createImageBitmap(file);
    const mayor = Math.max(bitmap.width, bitmap.height);
    const lado = Math.min(LADO_MAXIMO, mayor);
    const escala = lado / mayor;
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = lado;
    canvas.height = lado;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, lado, lado);
    ctx.drawImage(bitmap, (lado - ancho) / 2, (lado - alto) / 2, ancho, alto);
    bitmap.close();

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/webp", 0.85)
    );
  } catch {
    return null;
  }
}

/**
 * Sube una imagen al bucket `imagenes` dentro de la carpeta de la heladería
 * (<heladeria_id>/...) y devuelve la URL pública mediante onChange.
 *
 * Con `normalizar` la foto se convierte en un cuadrado WebP con fondo blanco:
 * se usa en productos y promociones para que la carta quede uniforme. El logo
 * de la heladería se sube sin normalizar, para no perder la transparencia ni
 * la nitidez de un SVG.
 */
export function ImageUpload({
  heladeriaId,
  value,
  onChange,
  normalizar = false,
}: {
  heladeriaId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  normalizar?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar los 5 MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const normalizada = normalizar ? await normalizarCuadrada(file) : null;
      const cuerpo: Blob = normalizada ?? file;
      const ext = normalizada ? "webp" : file.name.split(".").pop() || "jpg";
      const path = `${heladeriaId}/${randomToken(16)}.${ext}`;
      const { error } = await supabase.storage
        .from("imagenes")
        .upload(path, cuerpo, {
          upsert: false,
          contentType: cuerpo.type || undefined,
        });
      if (error) throw error;

      const { data } = supabase.storage.from("imagenes").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
        {value ? (
          <>
            <Image
              src={value}
              alt="Imagen"
              fill
              className="object-contain"
              sizes="80px"
              unoptimized
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-0 top-0 rounded-bl bg-black/60 p-1 text-white"
              aria-label="Quitar imagen"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {value ? "Cambiar" : "Subir imagen"}
      </Button>
    </div>
  );
}
