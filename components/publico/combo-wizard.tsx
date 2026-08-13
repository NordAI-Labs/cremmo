"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowLeft, Check, Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn, formatEuro } from "@/lib/utils";
import { nuevaLineaId, useCart } from "@/store/cart";
import type { Producto } from "@/types/database.types";
import type { PersonalizacionElegida, PromocionConSlots } from "@/types";

/**
 * Asistente de un combo con pasos: el cliente elige un producto por paso y el
 * precio es fijo (lo elegido no suma nada). Los pasos con un único producto
 * disponible se resuelven solos y no se muestran.
 */
export function ComboWizard({
  promocion,
  open,
  onClose,
}: {
  promocion: PromocionConSlots | null;
  open: boolean;
  onClose: () => void;
}) {
  const addItem = useCart((s) => s.addItem);
  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState("");
  const [sel, setSel] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);

  // Reinicia el estado al cambiar de promoción (ajuste en render).
  const promoId = promocion?.id;
  const [prevId, setPrevId] = useState(promoId);
  if (promoId !== prevId) {
    setPrevId(promoId);
    setCantidad(1);
    setNotas("");
    setSel({});
    setStep(0);
  }

  const slots = useMemo(
    () => [...(promocion?.slots ?? [])].sort((a, b) => a.orden - b.orden),
    [promocion]
  );

  // Un paso con una única opción no se pregunta: se da por elegido.
  const automaticos = useMemo(() => {
    const fijos: Record<string, string> = {};
    for (const s of slots) {
      if (s.productos.length === 1) fijos[s.id] = s.productos[0].id;
    }
    return fijos;
  }, [slots]);

  const pasos = useMemo(
    () => slots.filter((s) => s.productos.length > 1),
    [slots]
  );

  if (!promocion) return null;

  const elecciones = { ...automaticos, ...sel };
  const totalSteps = pasos.length + 1;
  const enResumen = step >= pasos.length;
  const slotActual = enResumen ? null : pasos[step];
  const precioUnitario = Number(promocion.precio_promocional ?? 0);

  function elegir(slotId: string, productoId: string) {
    setSel((s) => ({ ...s, [slotId]: productoId }));
    setTimeout(() => setStep((st) => Math.min(st + 1, pasos.length)), 180);
  }

  function anadir() {
    const personalizaciones: PersonalizacionElegida[] = [];
    for (const slot of slots) {
      const productoId = elecciones[slot.id];
      const producto = slot.productos.find((p) => p.id === productoId);
      if (!producto) {
        toast.error(`Elige una opción en "${slot.nombre}"`);
        return;
      }
      personalizaciones.push({
        grupo_id: slot.id,
        grupo_nombre: slot.nombre,
        opcion_id: producto.id,
        opcion_nombre: producto.nombre,
        precio_extra: 0,
      });
    }

    addItem({
      lineId: nuevaLineaId(),
      producto_id: null,
      promocion_id: promocion!.id,
      nombre: promocion!.nombre,
      precio_base: precioUnitario,
      cantidad,
      foto_url: promocion!.foto_url,
      personalizaciones,
      notas: notas.trim() || undefined,
      precio_unitario: precioUnitario,
    });
    toast.success(`${promocion!.nombre} añadido al carrito`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 gap-0 flex flex-col max-h-[92vh] sm:max-w-lg">
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base">
                {promocion.nombre}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {enResumen
                  ? "Resumen"
                  : `Paso ${step + 1} de ${totalSteps} · ${slotActual?.nombre}`}
              </p>
            </div>
            <Badge>{formatEuro(precioUnitario)}</Badge>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {slotActual ? (
            <div className="space-y-2">
              {slotActual.productos.map((p) => (
                <OpcionProducto
                  key={p.id}
                  producto={p}
                  activo={elecciones[slotActual.id] === p.id}
                  onClick={() => elegir(slotActual.id, p.id)}
                />
              ))}
            </div>
          ) : (
            <ResumenCombo
              promocion={promocion}
              elecciones={elecciones}
              notas={notas}
              setNotas={setNotas}
            />
          )}
        </div>

        <div className="flex items-center gap-3 border-t p-4">
          {enResumen && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-7 text-center font-semibold">{cantidad}</span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setCantidad((c) => c + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {enResumen ? (
            <Button className="flex-1" onClick={anadir}>
              Añadir · {formatEuro(precioUnitario * cantidad)}
            </Button>
          ) : (
            <Button
              className="flex-1"
              disabled={!slotActual || !elecciones[slotActual.id]}
              onClick={() => setStep((s) => Math.min(s + 1, pasos.length))}
            >
              Continuar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OpcionProducto({
  producto,
  activo,
  onClick,
}: {
  producto: Producto;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors",
        activo ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"
      )}
    >
      {producto.foto_url && (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
          <Image
            src={producto.foto_url}
            alt={producto.nombre}
            fill
            className="object-cover"
            sizes="48px"
            unoptimized
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="font-medium">{producto.nombre}</span>
        {producto.descripcion && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {producto.descripcion}
          </p>
        )}
      </div>
      {activo && <Check className="h-5 w-5 shrink-0 text-primary" />}
    </button>
  );
}

function ResumenCombo({
  promocion,
  elecciones,
  notas,
  setNotas,
}: {
  promocion: PromocionConSlots;
  elecciones: Record<string, string>;
  notas: string;
  setNotas: (v: string) => void;
}) {
  const slots = [...promocion.slots].sort((a, b) => a.orden - b.orden);
  return (
    <div className="space-y-4">
      {promocion.foto_url && (
        <div className="relative h-40 w-full overflow-hidden rounded-xl bg-white">
          <Image
            src={promocion.foto_url}
            alt={promocion.nombre}
            fill
            className="object-cover"
            sizes="512px"
            unoptimized
          />
        </div>
      )}

      {promocion.descripcion && (
        <p className="text-sm text-muted-foreground">{promocion.descripcion}</p>
      )}

      <div className="space-y-3">
        {slots.map((slot) => {
          const producto = slot.productos.find(
            (p) => p.id === elecciones[slot.id]
          );
          return (
            <div key={slot.id} className="flex items-start justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {slot.nombre}
              </span>
              <span className="text-right text-sm font-medium">
                {producto?.nombre ?? "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Badge variant="secondary">Notas</Badge>
        <Textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Sin azúcar, poco hielo…"
          rows={2}
        />
      </div>
    </div>
  );
}
