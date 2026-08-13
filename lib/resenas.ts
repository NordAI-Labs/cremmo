/**
 * Reseñas de la app que se muestran en la landing. Hoy son 7 de muestra
 * (inventadas, no ligadas a heladerías reales) para no lanzar la sección
 * vacía; conviven con las reales que se aprueben desde
 * `valoraciones_app.publicada` (ver 0017_valoraciones_app.sql y
 * `resenasPublicadas()` en lib/valoraciones.ts).
 */

export interface Resena {
  id: string;
  nombre: string;
  heladeria: string;
  ciudad: string;
  texto: string;
  /** 1 a 5. */
  puntuacion: number;
  /** Fecha ISO (solo se usa la parte de fecha). */
  fecha: string;
  /** Logo real de la heladería (solo en reseñas reales). Sin logo, se muestra un icono de helado. */
  logoUrl?: string | null;
}

export const RESENAS_MUESTRA: Resena[] = [
  {
    id: "muestra-1",
    nombre: "Marta Ibáñez",
    heladeria: "Heladería Nordic",
    ciudad: "Bilbao",
    texto:
      "Desde que pusimos el QR en las mesas se nos han acabado las colas en barra. Los clientes piden desde su móvil y a nosotros nos llega directo a comandas.",
    puntuacion: 5,
    fecha: "2026-08-05",
  },
  {
    id: "muestra-2",
    nombre: "Javier Roldán",
    heladeria: "Gelato Roma",
    ciudad: "Valencia",
    texto:
      "El panel de comandas en tiempo real nos ha ordenado muchísimo la cocina en verano, que es cuando más lo necesitamos. Se nota que está pensado para heladerías de verdad.",
    puntuacion: 5,
    fecha: "2026-07-24",
  },
  {
    id: "muestra-3",
    nombre: "Carla Muñoz",
    heladeria: "Heladería Dolce",
    ciudad: "Madrid",
    texto:
      "Nos costó un poco montar la carta con todos los sabores y toppings, pero una vez hecho funciona solo. El soporte nos ayudó bastante al principio.",
    puntuacion: 4,
    fecha: "2026-07-10",
  },
  {
    id: "muestra-4",
    nombre: "Andrés Peña",
    heladeria: "Frío&Sabor",
    ciudad: "Sevilla",
    texto:
      "Las estadísticas nos han ayudado a quitar dos sabores que apenas se vendían y meter más de los que sí funcionan. Se paga solo con eso.",
    puntuacion: 5,
    fecha: "2026-06-26",
  },
  {
    id: "muestra-5",
    nombre: "Laura Campos",
    heladeria: "Heladería Polar",
    ciudad: "Zaragoza",
    texto:
      "Lo que más nos gusta es que el cliente personaliza su helado solo (tamaño, sabores, toppings) sin que tengamos que explicarle nada en la mesa.",
    puntuacion: 5,
    fecha: "2026-06-12",
  },
  {
    id: "muestra-6",
    nombre: "Diego Salas",
    heladeria: "Crema&Cono",
    ciudad: "Málaga",
    texto:
      "Alguna vez hemos tenido dudas con las promociones y nos han respondido rápido por email. Para el precio que tiene, cumple de sobra.",
    puntuacion: 4,
    fecha: "2026-05-29",
  },
  {
    id: "muestra-7",
    nombre: "Nuria Vidal",
    heladeria: "Heladería Boreal",
    ciudad: "Alicante",
    texto:
      "Contratamos el plan y en una semana ya teníamos la carta publicada y los QR en las mesas. Muy fácil de poner en marcha sin saber de tecnología.",
    puntuacion: 5,
    fecha: "2026-05-14",
  },
];

/** "hace 3 días" / "hace 2 semanas" / "hace 4 meses". */
export function formatFechaRelativa(
  fecha: string,
  ahora: Date = new Date()
): string {
  const dias = Math.max(
    0,
    Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 86_400_000)
  );

  if (dias < 1) return "hoy";
  if (dias === 1) return "hace 1 día";
  if (dias < 7) return `hace ${dias} días`;

  const semanas = Math.floor(dias / 7);
  if (semanas < 5) return semanas === 1 ? "hace 1 semana" : `hace ${semanas} semanas`;

  const meses = Math.floor(dias / 30);
  return meses <= 1 ? "hace 1 mes" : `hace ${meses} meses`;
}
