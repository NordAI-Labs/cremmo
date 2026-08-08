"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { abrirPortalFacturacion } from "@/app/(dashboard)/dashboard/suscripcion-actions";
import { Button } from "@/components/ui/button";

/**
 * Aviso mientras Stripe reintenta cobrar una cuota. No se corta el servicio en
 * este estado: la carta sigue publicada hasta que Stripe da la suscripción por
 * cancelada, así que basta con avisar y ofrecer cambiar la tarjeta.
 */
export function AvisoImpago({ esOwner }: { esOwner: boolean }) {
  const [pending, start] = useTransition();

  function abrir() {
    start(async () => {
      const res = await abrirPortalFacturacion();
      if (res.error || !res.url) {
        toast.error(res.error ?? "No se pudo abrir la facturación");
        return;
      }
      window.location.href = res.url;
    });
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
      <p className="flex-1 min-w-[16rem]">
        No hemos podido cobrar tu última cuota. Actualiza el método de pago para
        que tu carta siga publicada.
      </p>
      {esOwner && (
        <Button size="sm" disabled={pending} onClick={abrir}>
          {pending ? "Abriendo…" : "Actualizar pago"}
        </Button>
      )}
    </div>
  );
}
