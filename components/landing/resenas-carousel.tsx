"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, IceCream, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFechaRelativa, type Resena } from "@/lib/resenas";
import { cn } from "@/lib/utils";

/** Reseñas visibles a la vez, según el ancho de pantalla (mismos cortes que sm:/lg: de Tailwind). */
function useVisibles() {
  const [visibles, setVisibles] = useState(1);

  useEffect(() => {
    const sm = window.matchMedia("(min-width: 640px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const actualizar = () => setVisibles(lg.matches ? 5 : sm.matches ? 2 : 1);
    actualizar();
    sm.addEventListener("change", actualizar);
    lg.addEventListener("change", actualizar);
    return () => {
      sm.removeEventListener("change", actualizar);
      lg.removeEventListener("change", actualizar);
    };
  }, []);

  return visibles;
}

/**
 * Carrusel deslizante (de una en una) con bucle infinito: al pasar la última
 * reseña vuelve a la primera y viceversa. Muestra 1/2/5 reseñas a la vez
 * según el ancho de pantalla.
 */
export function ResenasCarousel({ resenas }: { resenas: Resena[] }) {
  const visibles = useVisibles();
  const [indice, setIndice] = useState(0);
  const [direccion, setDireccion] = useState<1 | -1>(1);

  if (resenas.length === 0) return null;

  function mover(delta: 1 | -1) {
    setDireccion(delta);
    setIndice((i) => (i + delta + resenas.length) % resenas.length);
  }

  const mostradas = Array.from({ length: Math.min(visibles, resenas.length) }, (_, i) =>
    resenas[(indice + i) % resenas.length]
  );

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 rounded-full"
        onClick={() => mover(-1)}
        aria-label="Reseña anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div
        className={cn(
          "grid flex-1 gap-6 overflow-hidden",
          visibles === 1 && "grid-cols-1",
          visibles === 2 && "grid-cols-2",
          visibles === 5 && "grid-cols-5"
        )}
      >
        {mostradas.map((r) => (
          <Card
            key={`${indice}-${r.id}`}
            className={cn(
              "animate-in fade-in duration-300",
              direccion === 1 ? "slide-in-from-right-4" : "slide-in-from-left-4"
            )}
          >
            <CardContent className="flex h-full flex-col gap-3 pt-6">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                  {r.logoUrl ? (
                    <Image src={r.logoUrl} alt={r.nombre} fill className="object-cover" />
                  ) : (
                    <IceCream className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">{r.nombre}</p>
                  {(r.heladeria || r.ciudad) && (
                    <p className="text-xs text-muted-foreground">
                      {[r.heladeria, r.ciudad].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex" aria-label={`${r.puntuacion} de 5 estrellas`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < r.puntuacion
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>

              <p className="flex-1 text-sm text-muted-foreground">“{r.texto}”</p>
              <p className="text-xs text-muted-foreground">
                {formatFechaRelativa(r.fecha)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="shrink-0 rounded-full"
        onClick={() => mover(1)}
        aria-label="Reseña siguiente"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
