"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CreditCard,
  Sparkles,
} from "lucide-react";
import {
  abrirPortalFacturacion,
  cambiarPlan,
  cancelarSuscripcion,
  iniciarCheckout,
  reanudarSuscripcion,
} from "@/app/(dashboard)/dashboard/suscripcion-actions";
import type { PlanHeladeria } from "@/types/database.types";
import {
  PLANES,
  formatFechaLarga,
  formatPrecioPlan,
  getPlan,
  type EstadoSuscripcion,
} from "@/lib/planes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Resultado común de las acciones: o error, o una URL de Stripe a la que ir. */
type Respuesta = { error?: string; url?: string };

export function PlanCard({
  planActual,
  estado,
  canceladaEn,
  proximaRenovacion,
  alta,
  tienePago,
}: {
  planActual: PlanHeladeria;
  estado: EstadoSuscripcion;
  canceladaEn: string | null;
  /** Fin del periodo en curso, ya calculado en servidor. */
  proximaRenovacion: string;
  alta: string;
  /** Si la cuenta tiene una suscripción viva en Stripe. */
  tienePago: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialogoPlanes, setDialogoPlanes] = useState(false);
  const [dialogoCancelar, setDialogoCancelar] = useState(false);

  const plan = getPlan(planActual);
  // Las cuentas antiguas ('basico') se muestran como Pro, que es su equivalente.
  const planMostrado = plan ?? PLANES[0];
  const vigente = estado === "vigente" || estado === "impago";

  /**
   * Ejecuta una acción de Stripe. Si devuelve una URL (Checkout o portal), se
   * sale de la app hacia Stripe; si no, se refresca el panel.
   */
  function ejecutar(accion: () => Promise<Respuesta>, ok: string) {
    start(async () => {
      const res = await accion();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      toast.success(ok);
      setDialogoPlanes(false);
      setDialogoCancelar(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" /> Tu plan
        </CardTitle>
        <CardDescription>
          Suscripción de la heladería. Cliente desde el {formatFechaLarga(alta)}.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{planMostrado.nombre}</span>
              {estado === "vigente" && <Badge>Activo</Badge>}
              {estado === "impago" && (
                <Badge variant="destructive">Pago pendiente</Badge>
              )}
              {estado === "cancelacion_programada" && (
                <Badge variant="secondary">Cancelación programada</Badge>
              )}
              {estado === "vencida" && (
                <Badge variant="secondary">Cancelado</Badge>
              )}
              {estado === "pendiente" && (
                <Badge variant="secondary">Sin activar</Badge>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">
                {formatPrecioPlan(planMostrado.precio)}
                <span className="text-sm font-normal text-muted-foreground">
                  /mes
                </span>
              </p>
              <p className="text-xs text-muted-foreground">IVA no incluido</p>
            </div>
          </div>

          <ul className="mt-4 space-y-1.5 text-sm">
            {planMostrado.caracteristicas.map((c) => (
              <li key={c} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        {estado === "vigente" && tienePago && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4 shrink-0" />
            Se renueva el {formatFechaLarga(proximaRenovacion)}.
          </p>
        )}

        {!tienePago && (
          <div className="flex gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>
              Esta cuenta todavía no tiene una tarjeta asociada, así que no se
              te está cobrando nada. Actívala para que la suscripción se renueve
              sola cada mes.
            </span>
          </div>
        )}

        {estado === "impago" && (
          <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <span>
              No hemos podido cobrar tu última cuota y Stripe volverá a
              intentarlo. Revisa tu método de pago para que no se interrumpa el
              servicio.
            </span>
          </div>
        )}

        {estado === "cancelacion_programada" && canceladaEn && (
          <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <span>
              Tu plan seguirá activo hasta el {formatFechaLarga(canceladaEn)}. A
              partir de esa fecha tu carta pública dejará de estar disponible y
              no podrás recibir pedidos.
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialogoPlanes(true)}>
            Cambiar de plan
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              ejecutar(abrirPortalFacturacion, "Abriendo la facturación")
            }
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Método de pago y facturas
          </Button>
          {!tienePago ? (
            <Button
              disabled={pending}
              onClick={() =>
                ejecutar(
                  () => iniciarCheckout(planMostrado.id),
                  "Suscripción activada"
                )
              }
            >
              Activar cobro con tarjeta
            </Button>
          ) : vigente ? (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDialogoCancelar(true)}
            >
              Cancelar suscripción
            </Button>
          ) : (
            <Button
              disabled={pending}
              onClick={() =>
                ejecutar(reanudarSuscripcion, "Cancelación anulada")
              }
            >
              Reanudar suscripción
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={dialogoPlanes} onOpenChange={setDialogoPlanes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar de plan</DialogTitle>
            <DialogDescription>
              El cambio se aplica al momento y Stripe prorratea la diferencia en
              la siguiente factura.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {PLANES.map((p) => {
              const actual = p.id === planMostrado.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-lg border-2 p-4",
                    actual ? "border-primary bg-primary/5" : "border-border",
                    !p.disponible && "bg-muted/40"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      {p.nombre}
                      {actual && <Badge>Plan actual</Badge>}
                      {!p.disponible && (
                        <Badge variant="secondary">Próximamente</Badge>
                      )}
                    </span>
                    <span className="text-sm">
                      <span className="font-bold">
                        {formatPrecioPlan(p.precio)}
                      </span>
                      <span className="text-muted-foreground">/mes</span>
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.descripcion}
                  </p>

                  {!actual && (
                    <Button
                      className="mt-3 w-full"
                      disabled={!p.disponible || pending}
                      onClick={() =>
                        ejecutar(
                          () => cambiarPlan(p.id),
                          `Ahora estás en el plan ${p.nombre}`
                        )
                      }
                    >
                      {p.disponible
                        ? `Cambiar a ${p.nombre}`
                        : "Te avisaremos cuando esté disponible"}
                    </Button>
                  )}

                  {actual && !tienePago && (
                    <Button
                      className="mt-3 w-full"
                      disabled={pending}
                      onClick={() =>
                        ejecutar(() => iniciarCheckout(p.id), "Plan contratado")
                      }
                    >
                      Activar cobro con tarjeta
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogoCancelar} onOpenChange={setDialogoCancelar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar la suscripción</DialogTitle>
            <DialogDescription>
              Mantendrás el plan {planMostrado.nombre} hasta el{" "}
              {formatFechaLarga(proximaRenovacion)}, el final del periodo que ya
              tienes pagado. Después tu carta pública dejará de estar accesible y
              no entrarán pedidos. Podrás reanudarla antes de esa fecha.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogoCancelar(false)}
              disabled={pending}
            >
              Seguir suscrito
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                ejecutar(cancelarSuscripcion, "Cancelación programada")
              }
            >
              {pending ? "Cancelando…" : "Sí, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
