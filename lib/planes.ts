import type {
  EstadoSuscripcionBD,
  PlanHeladeria,
} from "@/types/database.types";

/**
 * Planes de suscripción de la app. Se definen aquí una sola vez para que la
 * landing, el registro y el panel muestren siempre lo mismo.
 *
 * `disponible: false` deja el plan visible como reclamo pero no contratable:
 * el selector del registro lo bloquea y el servidor rechaza el alta.
 */
export interface Plan {
  id: PlanHeladeria;
  nombre: string;
  /** Precio mensual en euros, sin IVA. */
  precio: number;
  descripcion: string;
  caracteristicas: string[];
  disponible: boolean;
  /** Plan recomendado: se resalta en la landing. */
  destacado?: boolean;
}

export const PLANES: Plan[] = [
  {
    id: "pro",
    nombre: "Pro",
    precio: 89.9,
    descripcion: "Todo lo que necesitas para vender desde el primer día.",
    caracteristicas: [
      "Todas las funcionalidades de la app",
      "Pedidos por QR en cada mesa",
      "Carta con asistentes por pasos",
      "Promociones y combos",
      "Comandas en tiempo real",
      "Estadísticas de ventas",
    ],
    disponible: true,
    destacado: true,
  },
  {
    id: "business",
    nombre: "Business",
    precio: 249.9,
    descripcion: "Para cadenas con varias heladerías y facturación automática.",
    caracteristicas: [
      "Todas las funcionalidades del plan Pro",
      "Sistema multisede",
      "Facturación automática de cada pedido",
    ],
    disponible: false,
  },
];

/** Plan marcado por defecto en el registro. */
export const PLAN_POR_DEFECTO: PlanHeladeria = "pro";

export function getPlan(id: string | null | undefined): Plan | undefined {
  return PLANES.find((p) => p.id === id);
}

/** True si el id corresponde a un plan que hoy se puede contratar. */
export function esPlanContratable(id: string | null | undefined): boolean {
  return !!getPlan(id)?.disponible;
}

/** "89,90 €" con el formato español. */
export function formatPrecioPlan(precio: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(precio);
}

// Suscripción ----------------------------------------------------------------

export type EstadoSuscripcion =
  /** Dada de alta pero sin el primer pago confirmado. */
  | "pendiente"
  | "vigente"
  /** Pagada, pero con la baja ya programada para el final del periodo. */
  | "cancelacion_programada"
  /** Stripe no ha podido cobrar y está reintentando; el servicio sigue dado. */
  | "impago"
  | "vencida";

/** Datos mínimos de `heladerias` para conocer el estado de la suscripción. */
export interface SuscripcionHeladeria {
  suscripcion_estado: EstadoSuscripcionBD;
  cancelada_en: string | null;
}

/**
 * Deriva el estado que ve la app combinando lo que Stripe dejó en
 * `suscripcion_estado` con la fecha de corte de `cancelada_en`.
 */
export function estadoSuscripcion(
  heladeria: SuscripcionHeladeria,
  ahora: Date = new Date()
): EstadoSuscripcion {
  const vencida =
    !!heladeria.cancelada_en && new Date(heladeria.cancelada_en) <= ahora;

  switch (heladeria.suscripcion_estado) {
    case "pendiente":
      return "pendiente";
    case "cancelada":
      return "vencida";
    case "impago":
      return vencida ? "vencida" : "impago";
    default:
      if (vencida) return "vencida";
      return heladeria.cancelada_en ? "cancelacion_programada" : "vigente";
  }
}

/**
 * True si la heladería puede seguir vendiendo: su carta pública se sirve y
 * acepta pedidos. Réplica en TypeScript de la condición de la política
 * `heladerias_public_select` (ver 0013_stripe.sql).
 */
export function suscripcionVigente(
  heladeria: SuscripcionHeladeria,
  ahora: Date = new Date()
): boolean {
  const estado = estadoSuscripcion(heladeria, ahora);
  return (
    estado === "vigente" ||
    estado === "cancelacion_programada" ||
    estado === "impago"
  );
}

/** Suma meses clampando al último día del mes cuando el día no existe. */
function sumarMeses(base: Date, meses: number): Date {
  const dia = base.getDate();
  const fecha = new Date(base.getTime());
  fecha.setDate(1);
  fecha.setMonth(fecha.getMonth() + meses);
  const ultimoDia = new Date(
    fecha.getFullYear(),
    fecha.getMonth() + 1,
    0
  ).getDate();
  fecha.setDate(Math.min(dia, ultimoDia));
  return fecha;
}

/**
 * Próxima renovación: el ciclo va anclado al día de alta, no al mes natural.
 * Con un alta el 15, el 3 de agosto devuelve el 15 de agosto y el 20 de agosto
 * devuelve el 15 de septiembre. Réplica de lo que hace `cancelar_suscripcion()`
 * en SQL, aquí solo para mostrarlo en el panel.
 */
export function proximaRenovacion(
  altaISO: string,
  desde: Date = new Date()
): Date {
  const alta = new Date(altaISO);
  let meses =
    (desde.getFullYear() - alta.getFullYear()) * 12 +
    (desde.getMonth() - alta.getMonth());
  if (meses < 0) meses = 0;

  let fecha = sumarMeses(alta, meses);
  while (fecha.getTime() <= desde.getTime()) {
    meses += 1;
    fecha = sumarMeses(alta, meses);
  }
  return fecha;
}

/**
 * Fin del periodo facturado en curso. Manda la fecha que da Stripe; mientras
 * no haya suscripción creada se estima anclando al día de alta.
 */
export function finPeriodoActual(
  heladeria: { periodo_fin: string | null; created_at: string },
  desde: Date = new Date()
): Date {
  return heladeria.periodo_fin
    ? new Date(heladeria.periodo_fin)
    : proximaRenovacion(heladeria.created_at, desde);
}

/** "15 de septiembre de 2026". */
export function formatFechaLarga(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(d);
}
