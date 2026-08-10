"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { registrarse, type AuthState } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PLANES,
  PLAN_POR_DEFECTO,
  esPlanContratable,
  formatPrecioPlan,
} from "@/lib/planes";

export function RegistroForm() {
  const searchParams = useSearchParams();
  // El plan puede venir preseleccionado desde la landing (?plan=pro).
  const planUrl = searchParams.get("plan");
  const [plan, setPlan] = useState(
    esPlanContratable(planUrl) ? planUrl! : PLAN_POR_DEFECTO
  );
  // Sin aceptación no se puede enviar el formulario.
  const [acepta, setAcepta] = useState(false);
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    registrarse,
    {}
  );

  const pago = searchParams.get("pago");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Crea tu heladería</CardTitle>
        <CardDescription>
          Rellena tus datos, elige un plan y termina de pagarlo para activar tu
          cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pago === "cancelado" && (
          <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
            Has cancelado el pago. Puedes intentarlo de nuevo cuando quieras.
          </p>
        )}
        {pago === "procesando" && (
          <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
            Tu pago se está procesando. Si no recibes el email de activación
            en unos minutos, escríbenos.
          </p>
        )}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="plan" value={plan} />

          <div className="space-y-2">
            <Label>Elige tu plan *</Label>
            <div className="grid gap-2">
              {PLANES.map((p) => {
                const activo = p.id === plan;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!p.disponible}
                    onClick={() => setPlan(p.id)}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left transition-colors",
                      activo
                        ? "border-primary bg-primary/5"
                        : p.disponible
                          ? "border-border hover:bg-accent/40"
                          : "border-border bg-muted/40 opacity-70"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold">
                        {p.nombre}
                        {!p.disponible && (
                          <Badge variant="secondary" className="text-[10px]">
                            Próximamente
                          </Badge>
                        )}
                      </span>
                      <span className="flex items-center gap-2 text-sm">
                        <span className="font-bold">
                          {formatPrecioPlan(p.precio)}
                        </span>
                        <span className="text-muted-foreground">/mes</span>
                        {activo && <Check className="h-4 w-4 text-primary" />}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.descripcion}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Precios sin IVA. Sin permanencia.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre_heladeria">Nombre de la heladería *</Label>
            <Input
              id="nombre_heladeria"
              name="nombre_heladeria"
              required
              placeholder="Heladería La Fresca"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Tu nombre</Label>
            <Input id="nombre" name="nombre" placeholder="María" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@heladeria.com"
            />
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="acepta"
              checked={acepta}
              onCheckedChange={(v) => setAcepta(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="acepta" className="text-xs font-normal leading-relaxed">
              He leído y acepto los{" "}
              <Link
                href="/terminos"
                target="_blank"
                className="text-primary underline underline-offset-2"
              >
                términos y condiciones
              </Link>
              , incluido el{" "}
              <Link
                href="/encargado-tratamiento"
                target="_blank"
                className="text-primary underline underline-offset-2"
              >
                contrato de encargado del tratamiento
              </Link>
              , y la{" "}
              <Link
                href="/privacidad"
                target="_blank"
                className="text-primary underline underline-offset-2"
              >
                política de privacidad
              </Link>
              .
            </Label>
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.message && (
            <p className="text-sm text-success">{state.message}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={pending || !acepta}
          >
            {pending ? "Redirigiendo al pago…" : "Continuar al pago"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Fijarás tu contraseña por email en cuanto se confirme el pago.
          </p>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
