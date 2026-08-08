import type { ComponentType } from "react";
import {
  CakeSlice,
  Candy,
  Cherry,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Dessert,
  Donut,
  IceCreamBowl,
  IceCreamCone,
  Milk,
  Utensils,
} from "lucide-react";

export type IconoComponente = ComponentType<{ className?: string }>;

/** Tarrina / tarro de helado (trazado tipo "bucket" de Bootstrap Icons). */
export function TarrinaIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.522 5H2a.5.5 0 0 0-.494.574l1.372 9.149A1.5 1.5 0 0 0 4.36 16h7.278a1.5 1.5 0 0 0 1.483-1.277l1.373-9.149A.5.5 0 0 0 14 5h-.522A5.5 5.5 0 0 0 2.522 5m1.005 0a4.5 4.5 0 0 1 8.945 0zm9.892 1-1.286 8.574a.5.5 0 0 1-.494.426H4.36a.5.5 0 0 1-.494-.426L2.58 6h10.838z" />
    </svg>
  );
}

/**
 * Iconos que una heladería puede elegir para la tarjeta de una categoría con
 * asistente (helados, gofres, crepes, tortitas…). En la BD se guarda el `id`,
 * nunca un SVG. Cada id debe tener su `case` en <IconoAsistente>.
 */
export const ICONOS_ASISTENTE = [
  { id: "cucurucho", etiqueta: "Cucurucho" },
  { id: "tarrina", etiqueta: "Tarrina" },
  { id: "copa", etiqueta: "Copa" },
  { id: "postre", etiqueta: "Postre" },
  { id: "gofre", etiqueta: "Gofre / galleta" },
  { id: "crepe", etiqueta: "Crepe / croissant" },
  { id: "tortita", etiqueta: "Tortita / tarta" },
  { id: "donut", etiqueta: "Donut" },
  { id: "chuche", etiqueta: "Chuchería" },
  { id: "batido", etiqueta: "Batido" },
  { id: "refresco", etiqueta: "Refresco" },
  { id: "cafe", etiqueta: "Café" },
  { id: "fruta", etiqueta: "Fruta" },
  { id: "generico", etiqueta: "Genérico" },
] as const;

export const ICONO_ASISTENTE_POR_DEFECTO: string = "cucurucho";

/** Textos de la tarjeta cuando la heladería no ha escrito los suyos. */
export const TITULO_ASISTENTE_POR_DEFECTO = "Crea tu pedido";
export const DESCRIPCION_ASISTENTE_POR_DEFECTO =
  "Personaliza tu pedido paso a paso.";

/** Pinta el icono elegido para una categoría-asistente (cucurucho por defecto). */
export function IconoAsistente({
  id,
  className,
}: {
  id: string | null | undefined;
  className?: string;
}) {
  switch (id) {
    case "tarrina":
      return <TarrinaIcon className={className} />;
    case "copa":
      return <IceCreamBowl className={className} />;
    case "postre":
      return <Dessert className={className} />;
    case "gofre":
      return <Cookie className={className} />;
    case "crepe":
      return <Croissant className={className} />;
    case "tortita":
      return <CakeSlice className={className} />;
    case "donut":
      return <Donut className={className} />;
    case "chuche":
      return <Candy className={className} />;
    case "batido":
      return <Milk className={className} />;
    case "refresco":
      return <CupSoda className={className} />;
    case "cafe":
      return <Coffee className={className} />;
    case "fruta":
      return <Cherry className={className} />;
    case "generico":
      return <Utensils className={className} />;
    default:
      return <IceCreamCone className={className} />;
  }
}
