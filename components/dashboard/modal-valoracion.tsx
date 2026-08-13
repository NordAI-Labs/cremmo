"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { enviarValoracionApp } from "@/app/(dashboard)/dashboard/valoraciones-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Se muestra en cada login del propietario a partir de los 15 días del alta
 * (ver dashboard/layout.tsx) hasta que envía su valoración: cerrarla con la X
 * solo la oculta para esta sesión, en el próximo login vuelve a aparecer.
 */
export function ModalValoracion() {
  const [abierto, setAbierto] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [puntuacion, setPuntuacion] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [pending, start] = useTransition();

  function enviar() {
    if (puntuacion === 0) {
      toast.error("Elige una puntuación de 1 a 5");
      return;
    }
    start(async () => {
      const res = await enviarValoracionApp(puntuacion, comentario);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setEnviado(true);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogContent className="max-w-md">
        {enviado ? (
          <>
            <DialogHeader>
              <DialogTitle>¡Gracias por tu valoración!</DialogTitle>
              <DialogDescription>
                Nos ayuda mucho a seguir mejorando Cremmo.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setAbierto(false)}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>¿Qué te está pareciendo Cremmo?</DialogTitle>
              <DialogDescription>
                Llevas unos días usando la app. Tu opinión nos ayuda a mejorar
                y puede aparecer publicada en nuestra web.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-center gap-1 py-2">
              {[1, 2, 3, 4, 5].map((valor) => (
                <button
                  key={valor}
                  type="button"
                  aria-label={`${valor} de 5 estrellas`}
                  className="p-1"
                  onMouseEnter={() => setHover(valor)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setPuntuacion(valor)}
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      valor <= (hover || puntuacion)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Cuéntanos qué te gusta o qué mejorarías (opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
            />

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAbierto(false)}
                disabled={pending}
              >
                Ahora no
              </Button>
              <Button onClick={enviar} disabled={pending}>
                {pending ? "Enviando…" : "Enviar valoración"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
