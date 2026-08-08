"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { actualizarHeladeria } from "@/app/(dashboard)/dashboard/ajustes/actions";
import type { Heladeria } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { PlanCard } from "@/components/dashboard/plan-card";
import type { EstadoSuscripcion } from "@/lib/planes";

export function AjustesForm({
  heladeria,
  slug,
  siteUrl,
  esOwner,
  suscripcion,
}: {
  heladeria: Heladeria;
  slug: string;
  siteUrl: string;
  esOwner: boolean;
  suscripcion: {
    estado: EstadoSuscripcion;
    canceladaEn: string | null;
    proximaRenovacion: string;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    nombre: heladeria.nombre,
    direccion: heladeria.direccion ?? "",
    telefono: heladeria.telefono ?? "",
    logo_url: heladeria.logo_url,
  });

  function guardar() {
    start(async () => {
      const res = await actualizarHeladeria({
        nombre: form.nombre,
        direccion: form.direccion.trim() || null,
        telefono: form.telefono.trim() || null,
        logo_url: form.logo_url,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Ajustes guardados");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Datos de tu heladería y suscripción.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la heladería</CardTitle>
          <CardDescription>
            Carta pública:{" "}
            <a
              href={`${siteUrl}/${slug}`}
              target="_blank"
              className="text-primary hover:underline"
            >
              {siteUrl}/{slug}
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Logo</Label>
            <ImageUpload
              heladeriaId={heladeria.id}
              value={form.logo_url}
              onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={form.nombre}
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Slogan</Label>
            <Input
              value={form.direccion}
              placeholder="El mejor helado de la ciudad"
              onChange={(e) =>
                setForm((f) => ({ ...f, direccion: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input
              value={form.telefono}
              onChange={(e) =>
                setForm((f) => ({ ...f, telefono: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {esOwner && (
        <PlanCard
          planActual={heladeria.plan}
          estado={suscripcion.estado}
          canceladaEn={suscripcion.canceladaEn}
          proximaRenovacion={suscripcion.proximaRenovacion}
          alta={heladeria.created_at}
          tienePago={!!heladeria.stripe_subscription_id}
        />
      )}

      <Button onClick={guardar} disabled={pending} size="lg">
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}
