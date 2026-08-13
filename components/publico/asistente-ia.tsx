"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatEuro } from "@/lib/utils";

/**
 * Chat del Asistente IA en la carta pública (planes Pro y Business).
 *
 * Solo habla con /api/asistente y muestra lo que este devuelve. Quién resuelve
 * cada sugerencia —añadirla al carrito o abrir el asistente de pasos— es la
 * carta, que es la que tiene el catálogo en memoria: aquí no se conoce ningún
 * precio ni se toca el carrito.
 */

export interface SugerenciaAsistente {
  tipo: "producto" | "categoria" | "combo";
  id: string;
  nombre: string;
  motivo?: string;
}

/** Cómo se puede pedir una sugerencia, según lo que sepa la carta de ella. */
export interface AccionSugerencia {
  /** Texto del botón: "Añadir" si entra directa, "Elegir" si hay que configurarla. */
  etiqueta: string;
  precio?: number | null;
}

interface Mensaje {
  rol: "usuario" | "asistente";
  texto: string;
  sugerencias?: SugerenciaAsistente[];
}

/** Atajos del primer mensaje: quitan la barrera de "¿y ahora qué le escribo?". */
const ATAJOS = [
  "¿Qué me recomiendas?",
  "Algo sin lactosa",
  "Algo para compartir",
];

const SALUDO =
  "¡Hola! Te ayudo a elegir: dime qué te apetece, si tienes alguna alergia o " +
  "para cuántos vais y te propongo algo de la carta.";

export function AsistenteIA({
  open,
  onClose,
  slug,
  carrito,
  resolver,
  onElegir,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  /** Lo que ya lleva el cliente, para que las sugerencias tengan sentido. */
  carrito: { nombre: string; cantidad: number }[];
  /** Devuelve null si la sugerencia ya no existe en la carta. */
  resolver: (s: SugerenciaAsistente) => AccionSugerencia | null;
  onElegir: (s: SugerenciaAsistente) => void;
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes, pensando, open]);

  async function enviar(pregunta: string) {
    const limpio = pregunta.trim();
    if (!limpio || pensando) return;

    // La historia que ve el servidor es solo la conversación real: el saludo se
    // pinta en la interfaz pero no cuenta como turno del asistente.
    const historia: Mensaje[] = [
      ...mensajes,
      { rol: "usuario" as const, texto: limpio },
    ];
    setMensajes(historia);
    setTexto("");
    setError(null);
    setPensando(true);

    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          carrito,
          mensajes: historia.map((m) => ({ rol: m.rol, texto: m.texto })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "El asistente no está disponible ahora mismo.");
        return;
      }
      setMensajes((prev) => [
        ...prev,
        {
          rol: "asistente",
          texto: data.texto,
          sugerencias: data.sugerencias ?? [],
        },
      ]);
    } catch {
      setError("Sin conexión. Inténtalo de nuevo.");
    } finally {
      setPensando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Te ayudo a elegir
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <Burbuja rol="asistente">{SALUDO}</Burbuja>

          {mensajes.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {ATAJOS.map((a) => (
                <button
                  key={a}
                  onClick={() => enviar(a)}
                  className="rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent"
                >
                  {a}
                </button>
              ))}
            </div>
          )}

          {mensajes.map((m, i) => (
            <div key={i} className="space-y-2">
              <Burbuja rol={m.rol}>{m.texto}</Burbuja>
              {m.sugerencias?.map((s) => (
                <TarjetaSugerencia
                  key={s.id}
                  sugerencia={s}
                  accion={resolver(s)}
                  onElegir={() => onElegir(s)}
                />
              ))}
            </div>
          ))}

          {pensando && (
            <Burbuja rol="asistente">
              <span className="text-muted-foreground">Pensando…</span>
            </Burbuja>
          )}
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <div ref={finRef} />
        </div>

        <div className="space-y-2 border-t p-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
          >
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pregúntame lo que quieras"
              maxLength={600}
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              disabled={pensando || !texto.trim()}
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Respuestas generadas por IA: pueden equivocarse. Si tienes alergia o
            intolerancia, confírmalo siempre con el personal.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Burbuja({
  rol,
  children,
}: {
  rol: "usuario" | "asistente";
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex", rol === "usuario" && "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm",
          rol === "usuario"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function TarjetaSugerencia({
  sugerencia,
  accion,
  onElegir,
}: {
  sugerencia: SugerenciaAsistente;
  accion: AccionSugerencia | null;
  onElegir: () => void;
}) {
  // Sin acción, la sugerencia ya no está en la carta (se agotó o se retiró
  // mientras hablaban): mejor no enseñar un botón que no lleva a nada.
  if (!accion) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{sugerencia.nombre}</p>
        {sugerencia.motivo && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {sugerencia.motivo}
          </p>
        )}
      </div>
      {accion.precio != null && (
        <span className="text-sm font-bold text-primary">
          {formatEuro(accion.precio)}
        </span>
      )}
      <Button size="sm" onClick={onElegir}>
        {accion.etiqueta}
      </Button>
    </div>
  );
}
