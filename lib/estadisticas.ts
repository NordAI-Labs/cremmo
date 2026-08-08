/**
 * Cálculo y utilidades del panel de estadísticas.
 *
 * Las métricas se agrupan por día natural de la heladería (no UTC): un pedido
 * de las 00:30 en España pertenece a ese día, no al anterior.
 */

/** Zona horaria de referencia para cerrar los días de venta. */
export const ZONA_HORARIA = "Europe/Madrid";

export interface ResumenPeriodo {
  pedidos: number;
  facturacion: number;
  unidades: number;
  ticketMedio: number;
}

export interface VentaDia {
  /** Clave YYYY-MM-DD en la zona horaria de la heladería. */
  dia: string;
  pedidos: number;
  facturacion: number;
}

export interface TopProducto {
  nombre: string;
  unidades: number;
  facturacion: number;
}

export interface Estadisticas {
  /** Mes mostrado, en formato YYYY-MM. */
  mes: string;
  etiquetaMes: string;
  mesAnterior: string;
  /** null cuando ya estamos en el mes actual (no se navega al futuro). */
  mesSiguiente: string | null;
  resumen: ResumenPeriodo;
  porDia: VentaDia[];
  topMes: TopProducto[];
  historico: ResumenPeriodo;
  topHistorico: TopProducto | null;
}

const formateador = new Intl.DateTimeFormat("es-ES", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partesEnZona(instante: Date) {
  const partes = formateador.formatToParts(instante);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return {
    year: valor("year"),
    month: valor("month"),
    day: valor("day"),
    hour: valor("hour") % 24,
    minute: valor("minute"),
    second: valor("second"),
  };
}

/** Diferencia entre la hora local de la heladería y UTC para un instante dado. */
function offsetMs(instante: Date): number {
  const { year, month, day, hour, minute, second } = partesEnZona(instante);
  return Date.UTC(year, month - 1, day, hour, minute, second) - instante.getTime();
}

/** Instante UTC de las 00:00 de un día concreto en la zona de la heladería. */
function inicioDia(year: number, month: number, day: number): Date {
  const aprox = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = offsetMs(new Date(aprox));
  const candidato = new Date(aprox - offset);
  // Segunda pasada por si el candidato cae al otro lado de un cambio de hora.
  const offsetReal = offsetMs(candidato);
  return offsetReal === offset ? candidato : new Date(aprox - offsetReal);
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** Clave YYYY-MM-DD del día al que pertenece una fecha. */
export function claveDia(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const { year, month, day } = partesEnZona(d);
  return `${year}-${dosDigitos(month)}-${dosDigitos(day)}`;
}

/** Clave YYYY-MM del mes al que pertenece una fecha. */
export function claveMes(fecha: string | Date): string {
  return claveDia(fecha).slice(0, 7);
}

/** Desplaza una clave de mes un número de meses (positivo o negativo). */
export function desplazarMes(mes: string, delta: number): string {
  const [year, month] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${dosDigitos(d.getUTCMonth() + 1)}`;
}

/** Rango [desde, hasta) en instantes UTC que cubre un mes local completo. */
export function rangoMes(mes: string): { desde: Date; hasta: Date } {
  const [year, month] = mes.split("-").map(Number);
  const siguiente = desplazarMes(mes, 1).split("-").map(Number);
  return {
    desde: inicioDia(year, month, 1),
    hasta: inicioDia(siguiente[0], siguiente[1], 1),
  };
}

/** Valida el parámetro `?mes=` y lo limita como mucho al mes actual. */
export function normalizarMes(valor: string | undefined, ahora = new Date()): string {
  const actual = claveMes(ahora);
  if (!valor || !/^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) return actual;
  return valor > actual ? actual : valor;
}

/** "Agosto de 2026" */
export function etiquetaMes(mes: string): string {
  const [year, month] = mes.split("-").map(Number);
  const texto = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("es-ES", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Días del mes que ya han ocurrido (el mes en curso se corta en el día de hoy),
 * para que el gráfico no arrastre una cola de días vacíos.
 */
export function diasDelMes(mes: string, ahora = new Date()): string[] {
  const [year, month] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const hoy = claveDia(ahora);
  const dias: string[] = [];
  for (let d = 1; d <= ultimo; d++) {
    const clave = `${mes}-${dosDigitos(d)}`;
    if (clave > hoy) break;
    dias.push(clave);
  }
  return dias;
}

/** Rellena con ceros los días sin ventas para que la serie sea continua. */
export function completarDias(
  mes: string,
  ventas: VentaDia[],
  ahora = new Date()
): VentaDia[] {
  const porClave = new Map(ventas.map((v) => [v.dia, v]));
  return diasDelMes(mes, ahora).map(
    (dia) => porClave.get(dia) ?? { dia, pedidos: 0, facturacion: 0 }
  );
}

export function resumen(
  pedidos: number,
  facturacion: number,
  unidades: number
): ResumenPeriodo {
  return {
    pedidos,
    facturacion: redondear(facturacion),
    unidades,
    ticketMedio: pedidos > 0 ? redondear(facturacion / pedidos) : 0,
  };
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

function num(valor: number | string | null | undefined): number {
  const n = typeof valor === "string" ? Number(valor) : valor ?? 0;
  return Number.isFinite(n) ? n : 0;
}

/** Forma mínima de un pedido para poder calcular estadísticas en memoria. */
export interface PedidoParaEstadisticas {
  estado: string;
  total: number | string;
  created_at: string;
  items: {
    nombre_producto: string;
    cantidad: number;
    subtotal: number | string;
  }[];
}

/**
 * Agrega las estadísticas en memoria a partir de la lista completa de pedidos.
 * Se usa en modo demo; con Supabase la agregación la hace Postgres (0007).
 */
export function calcularEstadisticas(
  pedidos: PedidoParaEstadisticas[],
  mes: string,
  ahora = new Date()
): Estadisticas {
  const validos = pedidos.filter((p) => p.estado !== "cancelado");

  const dias = new Map<string, VentaDia>();
  const productosMes = new Map<string, TopProducto>();
  const productosHistorico = new Map<string, TopProducto>();

  let pedidosMes = 0;
  let facturacionMes = 0;
  let unidadesMes = 0;
  let pedidosTotal = 0;
  let facturacionTotal = 0;
  let unidadesTotal = 0;

  for (const pedido of validos) {
    const total = num(pedido.total);
    const unidades = pedido.items.reduce((s, i) => s + i.cantidad, 0);
    const delMes = claveMes(pedido.created_at) === mes;

    pedidosTotal += 1;
    facturacionTotal += total;
    unidadesTotal += unidades;

    if (delMes) {
      pedidosMes += 1;
      facturacionMes += total;
      unidadesMes += unidades;

      const dia = claveDia(pedido.created_at);
      const acumulado = dias.get(dia) ?? { dia, pedidos: 0, facturacion: 0 };
      acumulado.pedidos += 1;
      acumulado.facturacion += total;
      dias.set(dia, acumulado);
    }

    for (const item of pedido.items) {
      acumularProducto(productosHistorico, item);
      if (delMes) acumularProducto(productosMes, item);
    }
  }

  const topMes = ordenarTop([...productosMes.values()]).slice(0, 10);
  const topHistorico = ordenarTop([...productosHistorico.values()])[0] ?? null;

  return {
    mes,
    etiquetaMes: etiquetaMes(mes),
    mesAnterior: desplazarMes(mes, -1),
    mesSiguiente: mes >= claveMes(ahora) ? null : desplazarMes(mes, 1),
    resumen: resumen(pedidosMes, facturacionMes, unidadesMes),
    porDia: completarDias(
      mes,
      [...dias.values()].map((d) => ({ ...d, facturacion: redondear(d.facturacion) })),
      ahora
    ),
    topMes,
    historico: resumen(pedidosTotal, facturacionTotal, unidadesTotal),
    topHistorico,
  };
}

function acumularProducto(
  mapa: Map<string, TopProducto>,
  item: { nombre_producto: string; cantidad: number; subtotal: number | string }
) {
  const actual = mapa.get(item.nombre_producto) ?? {
    nombre: item.nombre_producto,
    unidades: 0,
    facturacion: 0,
  };
  actual.unidades += item.cantidad;
  actual.facturacion = redondear(actual.facturacion + num(item.subtotal));
  mapa.set(item.nombre_producto, actual);
}

function ordenarTop(lista: TopProducto[]): TopProducto[] {
  return lista.sort(
    (a, b) => b.unidades - a.unidades || b.facturacion - a.facturacion
  );
}
