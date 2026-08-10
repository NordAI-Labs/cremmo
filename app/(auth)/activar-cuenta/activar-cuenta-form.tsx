"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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

type Estado = "cargando" | "listo" | "guardando" | "hecho" | "error";

/**
 * Destino del enlace de invitación que manda `completarAlta()` tras el pago.
 *
 * `inviteUserByEmail` no admite PKCE (el navegador que crea la invitación es
 * el servidor, no el del usuario), así que el enlace llega con los tokens en
 * el hash de la URL (`#access_token=...`), no en `?code=`. El cliente de
 * Supabase de esta app fuerza `flowType: "pkce"`, así que su detección
 * automática los ignora: hay que leer el hash a mano y llamar a
 * `setSession()` directamente.
 */
export function ActivarCuentaForm() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [estado, setEstado] = useState<Estado>("cargando");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      // Puede que ya hubiera una sesión (el usuario recargó la página después
      // de que el hash se limpiara).
      supabase.auth.getSession().then(({ data }) => {
        setEstado(data.session ? "listo" : "error");
      });
      return;
    }

    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      // Los tokens no deben quedar visibles en la URL ni en el historial.
      window.history.replaceState(null, "", window.location.pathname);
      setEstado(error ? "error" : "listo");
    });
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setError(null);
    setEstado("guardando");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setEstado("listo");
      return;
    }

    setEstado("hecho");
    router.push("/dashboard");
    router.refresh();
  }

  if (estado === "cargando") {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Comprobando tu enlace…
        </CardContent>
      </Card>
    );
  }

  if (estado === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Enlace no válido</CardTitle>
          <CardDescription>
            Este enlace de activación ha caducado o ya se usó.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Si ya activaste tu cuenta, inicia sesión directamente.{" "}
            <Link href="/login" className="text-primary hover:underline">
              Ir a iniciar sesión
            </Link>
            . Si no, escríbenos y te mandamos uno nuevo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Activa tu cuenta</CardTitle>
        <CardDescription>
          Ya está todo pagado. Solo falta que elijas tu contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={estado === "guardando" || estado === "hecho"}
          >
            {estado === "guardando" || estado === "hecho"
              ? "Entrando…"
              : "Activar y entrar al panel"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
