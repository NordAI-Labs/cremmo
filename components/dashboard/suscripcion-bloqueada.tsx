"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, CreditCard } from "lucide-react";
import { iniciarCheckout } from "@/app/(dashboard)/dashboard/suscripcion-actions";
import { PLANES, formatFechaLarga, formatPrecioPlan, getPlan } from "@/lib/planes";
import type { PlanHeladeria } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Sustituye al panel entero cuando la heladería no tiene una suscripción que
 * lo sostenga: recién registrada sin pagar, o con la suscripción ya terminada.
 */
export function SuscripcionBloqueada({
  plan,
  vencidaEn,
  esOwner,
  onLogout,
}: {
  plan: PlanHeladeria;
  /** Fecha en la que terminó la suscripción; null si nunca llegó a pagarse. */
  vencidaEn: string | null;
  esOwner: boolean;
  onLogout: () => Promise<void>;
}) {
  const [pending, start] = useTransition();
  // Las cuentas antiguas ('basico') se facturan como Pro.
  const planMostrado = getPlan(plan) ?? getPlan("pro") ?? PLANES[0];

  function pagar() {
    start(async () => {
      const res = await iniciarCheckout(planMostrado.id);
      if (res.error || !res.url) {
        toast.error(res.error ?? "No se pudo abrir el pago");
        return;
      }
      window.location.href = res.url;
    });
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {vencidaEn ? "Tu suscripción ha terminado" : "Activa tu suscripción"}
          </CardTitle>
          <CardDescription>
            {vencidaEn
              ? `Tu plan terminó el ${formatFechaLarga(vencidaEn)}. Mientras tanto, tu carta pública no está accesible y no entran pedidos.`
              : "Para empezar a usar el panel y publicar tu carta, activa el plan con tu tarjeta."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-lg font-bold">{planMostrado.nombre}</span>
              <span className="text-right">
                <span className="text-xl font-bold">
                  {formatPrecioPlan(planMostrado.precio)}
                </span>
                <span className="text-sm text-muted-foreground">/mes</span>
                <span className="block text-xs text-muted-foreground">
                  IVA incluido
                </span>
              </span>
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

          {esOwner ? (
            <Button
              size="lg"
              className="w-full"
              disabled={pending}
              onClick={pagar}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {pending
                ? "Abriendo el pago…"
                : vencidaEn
                  ? "Reactivar suscripción"
                  : "Pagar y activar"}
            </Button>
          ) : (
            <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              Pídele a la persona propietaria de la cuenta que active la
              suscripción para volver a usar el panel.
            </p>
          )}

          <form action={onLogout}>
            <Button type="submit" variant="ghost" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
