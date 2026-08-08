"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify, randomToken } from "@/lib/utils";
import { PLAN_POR_DEFECTO, esPlanContratable } from "@/lib/planes";
import { isStripeConfigured } from "@/lib/env";
import { iniciarCheckout } from "@/app/(dashboard)/dashboard/suscripcion-actions";
import type { PlanHeladeria } from "@/types/database.types";

export interface AuthState {
  error?: string;
  message?: string;
}

/**
 * Solo se acepta un plan que hoy esté a la venta. Si llega otro (formulario
 * manipulado o plan retirado), cae al plan por defecto en lugar de fallar.
 */
function planValido(valor: unknown): PlanHeladeria {
  const id = typeof valor === "string" ? valor : null;
  return esPlanContratable(id) ? (id as PlanHeladeria) : PLAN_POR_DEFECTO;
}

/**
 * A dónde se manda al usuario nada más crear su heladería: al pago del plan.
 * Si Stripe no está configurado o falla al abrir el Checkout, entra al panel,
 * que le enseñará la pantalla de suscripción pendiente con otro botón de pago
 * (mejor eso que dejarlo en un callejón sin salida en pleno registro).
 */
async function destinoTrasElAlta(plan: PlanHeladeria): Promise<string> {
  if (!isStripeConfigured()) return "/dashboard";

  const pago = await iniciarCheckout(plan);
  if (pago.url) return pago.url;

  console.error("[registro] no se pudo abrir el pago:", pago.error);
  return "/dashboard";
}

/** Inicia sesión con email + contraseña. */
export async function iniciarSesion(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Introduce email y contraseña" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenciales incorrectas" };
  }

  redirect(redirectTo || "/dashboard");
}

/**
 * Registro del personal + alta de heladería.
 * Guarda el nombre de la heladería en los metadatos por si el proyecto exige
 * confirmar el email antes de tener sesión (en ese caso se crea al primer login
 * desde la pantalla de onboarding).
 */
export async function registrarse(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const nombreHeladeria = String(formData.get("nombre_heladeria") ?? "").trim();
  const plan = planValido(formData.get("plan"));

  if (!email || !password || !nombreHeladeria) {
    return { error: "Completa todos los campos obligatorios" };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // El plan viaja en los metadatos para no perderse si hay que confirmar el
    // email: la heladería se crea después, desde la pantalla de onboarding.
    options: {
      data: { nombre, nombre_heladeria: nombreHeladeria, plan },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Si hay sesión (confirmación de email desactivada), creamos la heladería ya.
  if (data.session) {
    const res = await crearHeladeriaInterno(nombreHeladeria, nombre, plan);
    if (res.error) return res;
    redirect(await destinoTrasElAlta(plan));
  }

  return {
    message:
      "Cuenta creada. Revisa tu email para confirmarla y luego inicia sesión.",
  };
}

/** Cierra la sesión actual. */
export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Crea la heladería del usuario actual (owner) usando la función RPC atómica y
 * genera un par de mesas de ejemplo. Se usa desde la pantalla de onboarding.
 */
export async function crearHeladeriaInterno(
  nombreHeladeria: string,
  nombreUsuario: string,
  plan: PlanHeladeria = PLAN_POR_DEFECTO
): Promise<AuthState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Genera un slug único (añade sufijo si ya existe).
  const base = slugify(nombreHeladeria) || "heladeria";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const { data: existe } = await supabase
      .from("heladerias")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existe) break;
    slug = `${base}-${randomToken(4)}`;
  }

  const { data: heladeriaId, error } = await supabase.rpc(
    "onboarding_crear_heladeria",
    {
      p_nombre: nombreHeladeria,
      p_slug: slug,
      p_nombre_usuario: nombreUsuario || null,
      p_plan: plan,
    }
  );

  if (error) {
    return { error: error.message };
  }

  // Mesas de ejemplo para poder generar QRs desde el primer momento.
  if (heladeriaId) {
    await supabase.from("mesas").insert([
      { heladeria_id: heladeriaId, nombre: "Mesa 1", token: randomToken(12) },
      { heladeria_id: heladeriaId, nombre: "Mesa 2", token: randomToken(12) },
    ]);
  }

  revalidatePath("/dashboard");
  return { message: "Heladería creada" };
}

/** Server action para el formulario de onboarding. */
export async function crearHeladeriaAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const nombreHeladeria = String(formData.get("nombre_heladeria") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombreHeladeria) return { error: "Indica el nombre de la heladería" };

  // El plan se eligió en el registro; aquí se recupera de los metadatos porque
  // con confirmación de email el alta ocurre en esta pantalla, no en el registro.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const plan = planValido(user?.user_metadata?.plan);

  const res = await crearHeladeriaInterno(nombreHeladeria, nombre, plan);
  if (res.error) return res;
  redirect(await destinoTrasElAlta(plan));
}
