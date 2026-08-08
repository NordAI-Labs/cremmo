import { createClient } from "@/lib/supabase/server";
import { EstadisticasDashboard } from "@/components/dashboard/estadisticas-dashboard";
import {
  ZONA_HORARIA,
  claveMes,
  completarDias,
  desplazarMes,
  etiquetaMes,
  normalizarMes,
  rangoMes,
  resumen,
  type Estadisticas,
} from "@/lib/estadisticas";

export const dynamic = "force-dynamic";

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const ahora = new Date();
  const mes = normalizarMes(mesParam, ahora);

  // Las funciones de agregación resuelven la heladería con heladeria_actual().
  const supabase = await createClient();
  const { desde, hasta } = rangoMes(mes);
  const rango = { p_desde: desde.toISOString(), p_hasta: hasta.toISOString() };

  const [resMes, resDias, resTopMes, resHistorico, resTopHistorico] =
    await Promise.all([
      supabase.rpc("estadisticas_resumen", rango),
      supabase.rpc("estadisticas_por_dia", { ...rango, p_zona: ZONA_HORARIA }),
      supabase.rpc("estadisticas_top_productos", { ...rango, p_limite: 10 }),
      supabase.rpc("estadisticas_resumen", {}),
      supabase.rpc("estadisticas_top_productos", { p_limite: 1 }),
    ]);

  const fallo =
    resMes.error ?? resDias.error ?? resTopMes.error ?? resHistorico.error;
  if (fallo) {
    return <ErrorEstadisticas mensaje={fallo.message} />;
  }

  const filaMes = resMes.data?.[0];
  const filaHistorico = resHistorico.data?.[0];

  const datos: Estadisticas = {
    mes,
    etiquetaMes: etiquetaMes(mes),
    mesAnterior: desplazarMes(mes, -1),
    mesSiguiente: mes >= claveMes(ahora) ? null : desplazarMes(mes, 1),
    resumen: resumen(
      Number(filaMes?.total_pedidos ?? 0),
      Number(filaMes?.facturacion ?? 0),
      Number(filaMes?.unidades ?? 0)
    ),
    porDia: completarDias(
      mes,
      (resDias.data ?? []).map((d) => ({
        dia: String(d.dia).slice(0, 10),
        pedidos: Number(d.total_pedidos),
        facturacion: Number(d.facturacion),
      })),
      ahora
    ),
    topMes: (resTopMes.data ?? []).map((p) => ({
      nombre: p.nombre,
      unidades: Number(p.unidades),
      facturacion: Number(p.facturacion),
    })),
    historico: resumen(
      Number(filaHistorico?.total_pedidos ?? 0),
      Number(filaHistorico?.facturacion ?? 0),
      Number(filaHistorico?.unidades ?? 0)
    ),
    topHistorico: resTopHistorico.data?.[0]
      ? {
          nombre: resTopHistorico.data[0].nombre,
          unidades: Number(resTopHistorico.data[0].unidades),
          facturacion: Number(resTopHistorico.data[0].facturacion),
        }
      : null,
  };

  return <EstadisticasDashboard datos={datos} />;
}

function ErrorEstadisticas({ mensaje }: { mensaje: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de ventas de tu heladería.
        </p>
      </div>
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
        <p className="font-medium">No se han podido calcular las estadísticas.</p>
        <p className="mt-2 text-muted-foreground">
          Comprueba que has aplicado la migración{" "}
          <code>supabase/migrations/0007_estadisticas.sql</code> en el editor SQL
          de Supabase.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Detalle: {mensaje}</p>
      </div>
    </div>
  );
}
