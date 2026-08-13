/**
 * Limitador de peticiones en memoria, por instancia.
 *
 * No es una defensa fuerte: en serverless cada instancia tiene su propio
 * contador y al reciclarse se pierde. Sirve para lo que se necesita hoy —
 * frenar el uso a ráfagas del Asistente IA, que es público y se paga por
 * llamada— sin meter Redis ni otra dependencia. Si algún día hace falta un
 * límite de verdad, este es el sitio donde cambiarlo.
 */

interface Ventana {
  contador: number;
  /** Epoch en ms en el que se reinicia el contador. */
  reinicioEn: number;
}

const ventanas = new Map<string, Ventana>();

/** Evita que el Map crezca sin fin si llegan muchas claves distintas. */
function limpiar(ahora: number): void {
  for (const [clave, v] of ventanas) {
    if (v.reinicioEn <= ahora) ventanas.delete(clave);
  }
}

export interface ResultadoLimite {
  permitido: boolean;
  /** Segundos hasta que se puede volver a intentar (solo si no se permite). */
  esperarSegundos: number;
}

export function comprobarLimite(
  clave: string,
  maximo: number,
  ventanaSegundos: number
): ResultadoLimite {
  const ahora = Date.now();
  if (ventanas.size > 5000) limpiar(ahora);

  const actual = ventanas.get(clave);
  if (!actual || actual.reinicioEn <= ahora) {
    ventanas.set(clave, {
      contador: 1,
      reinicioEn: ahora + ventanaSegundos * 1000,
    });
    return { permitido: true, esperarSegundos: 0 };
  }

  if (actual.contador >= maximo) {
    return {
      permitido: false,
      esperarSegundos: Math.max(
        1,
        Math.ceil((actual.reinicioEn - ahora) / 1000)
      ),
    };
  }

  actual.contador += 1;
  return { permitido: true, esperarSegundos: 0 };
}
