"use client";

import { useActionState } from "react";
import { crearHeladeriaAction, type AuthState } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    crearHeladeriaAction,
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Configura tu heladería</CardTitle>
        <CardDescription>
          Un último paso: dinos cómo se llama tu heladería.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
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

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creando…" : "Crear heladería"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
