/**
 * Datos identificativos del titular y metadatos de los textos legales.
 * Todos los documentos de `app/(legal)/` leen de aquí: cambiar un dato (nuevo
 * domicilio, alta como sociedad, otro email de contacto) es tocar solo este
 * archivo. Si cambias el contenido de los documentos, sube `ULTIMA_ACTUALIZACION`.
 */

export const TITULAR = {
  nombre: "Manuel Alarcón Gil",
  nif: "49247634B",
  direccion: "Calle Tudmir nº 1, 30006 Murcia (Murcia), España",
  email: "info@nordailbas.com",
  telefono: "+34 696 28 93 17",
  /** Marca comercial bajo la que se presta el servicio. */
  marca: "Cremmo",
  dominio: "www.cremmo.app",
  url: "https://www.cremmo.app",
  /** Partido judicial para la sumisión expresa. */
  fuero: "Murcia",
} as const;

export const ULTIMA_ACTUALIZACION = "7 de agosto de 2026";

/**
 * Terceros con acceso a datos personales. Se listan en la política de
 * privacidad y en el anexo de subencargados del contrato de encargado.
 */
export const SUBENCARGADOS = [
  {
    nombre: "Supabase, Inc.",
    finalidad: "Base de datos, autenticación y almacenamiento de archivos",
    ubicacion:
      "Servidores en Irlanda (Unión Europea). La entidad es estadounidense y su " +
      "personal de soporte puede acceder puntualmente desde fuera del EEE al " +
      "amparo de cláusulas contractuales tipo.",
  },
  {
    nombre: "Vercel, Inc.",
    finalidad: "Alojamiento y ejecución de la aplicación web",
    ubicacion:
      "Estados Unidos. Entidad adherida al Data Privacy Framework UE-EE. UU. y " +
      "con cláusulas contractuales tipo.",
  },
  {
    nombre: "Stripe Payments Europe, Ltd.",
    finalidad: "Cobro de las cuotas de suscripción y facturación",
    ubicacion: "Irlanda (Unión Europea)",
  },
] as const;

/** Enlaces del pie de página. */
export const PAGINAS_LEGALES = [
  { href: "/aviso-legal", titulo: "Aviso legal" },
  { href: "/privacidad", titulo: "Política de privacidad" },
  { href: "/cookies", titulo: "Política de cookies" },
  { href: "/terminos", titulo: "Términos y condiciones" },
  {
    href: "/encargado-tratamiento",
    titulo: "Contrato de encargado del tratamiento",
  },
] as const;
