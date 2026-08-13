/**
 * Los 14 alérgenos de declaración obligatoria del Reglamento (UE) 1169/2011.
 * Misma lista que el check de `productos.alergenos` (ver 0018_alergenos.sql):
 * si se toca una, hay que tocar la otra.
 *
 * Las claves se guardan en la base de datos; las etiquetas solo se muestran.
 */

export interface Alergeno {
  id: string;
  nombre: string;
  /** Ejemplos habituales en heladería, para que el personal sepa cuál marcar. */
  ejemplos?: string;
}

export const ALERGENOS: Alergeno[] = [
  { id: "gluten", nombre: "Gluten", ejemplos: "conos, galletas, barquillos" },
  { id: "crustaceos", nombre: "Crustáceos" },
  { id: "huevos", nombre: "Huevos", ejemplos: "helados de crema, merengue" },
  { id: "pescado", nombre: "Pescado" },
  { id: "cacahuetes", nombre: "Cacahuetes" },
  { id: "soja", nombre: "Soja", ejemplos: "lecitina, helados veganos" },
  { id: "lacteos", nombre: "Lácteos", ejemplos: "leche, nata, mantequilla" },
  {
    id: "frutos_cascara",
    nombre: "Frutos de cáscara",
    ejemplos: "nueces, almendras, avellanas, pistacho",
  },
  { id: "apio", nombre: "Apio" },
  { id: "mostaza", nombre: "Mostaza" },
  { id: "sesamo", nombre: "Sésamo" },
  { id: "sulfitos", nombre: "Sulfitos", ejemplos: "frutas confitadas, siropes" },
  { id: "altramuces", nombre: "Altramuces" },
  { id: "moluscos", nombre: "Moluscos" },
];

const POR_ID = new Map(ALERGENOS.map((a) => [a.id, a]));

/** Descarta claves desconocidas y duplicados (el check de la BD las rechazaría). */
export function alergenosValidos(ids: string[] | null | undefined): string[] {
  if (!ids) return [];
  return [...new Set(ids.filter((id) => POR_ID.has(id)))];
}

/** "Gluten, Lácteos, Frutos de cáscara" (en el orden oficial de la lista). */
export function nombresAlergenos(ids: string[] | null | undefined): string[] {
  const presentes = new Set(alergenosValidos(ids));
  return ALERGENOS.filter((a) => presentes.has(a.id)).map((a) => a.nombre);
}
