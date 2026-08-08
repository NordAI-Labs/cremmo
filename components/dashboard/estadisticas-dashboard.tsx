"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  Euro,
  IceCream,
  Receipt,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { formatEuro } from "@/lib/utils";
import type { Estadisticas, VentaDia } from "@/lib/estadisticas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Metrica = "facturacion" | "pedidos";

function diaCorto(clave: string): string {
  return String(Number(clave.slice(8, 10)));
}

function diaLargo(clave: string): string {
  const [y, m, d] = clave.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-ES", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function EstadisticasDashboard({ datos }: { datos: Estadisticas }) {
  const [metrica, setMetrica] = useState<Metrica>("facturacion");

  const serie = useMemo(
    () =>
      datos.porDia.map((d) => ({
        ...d,
        etiqueta: diaCorto(d.dia),
        valor: metrica === "facturacion" ? d.facturacion : d.pedidos,
      })),
    [datos.porDia, metrica]
  );

  const mejorDia = useMemo(
    () =>
      datos.porDia.reduce<VentaDia | null>(
        (mejor, d) => (!mejor || d.facturacion > mejor.facturacion ? d : mejor),
        null
      ),
    [datos.porDia]
  );

  const diasRecientes = useMemo(
    () => [...datos.porDia].reverse(),
    [datos.porDia]
  );

  const maxUnidades = datos.topMes[0]?.unidades ?? 0;
  const sinDatos = datos.resumen.pedidos === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Estadísticas</h1>
          <p className="text-sm text-muted-foreground">
            Resumen de ventas de tu heladería. No se cuentan los pedidos
            cancelados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link
              href={`/dashboard/estadisticas?mes=${datos.mesAnterior}`}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-40 text-center text-sm font-medium">
            {datos.etiquetaMes}
          </div>
          {datos.mesSiguiente ? (
            <Button variant="outline" size="icon" asChild>
              <Link
                href={`/dashboard/estadisticas?mes=${datos.mesSiguiente}`}
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" disabled aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={ShoppingBag}
          label="Pedidos del mes"
          valor={String(datos.resumen.pedidos)}
        />
        <Kpi
          icon={Euro}
          label="Facturación del mes"
          valor={formatEuro(datos.resumen.facturacion)}
        />
        <Kpi
          icon={Receipt}
          label="Ticket medio"
          valor={formatEuro(datos.resumen.ticketMedio)}
        />
        <Kpi
          icon={IceCream}
          label="Unidades vendidas"
          valor={String(datos.resumen.unidades)}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Actividad diaria</CardTitle>
            <CardDescription>
              {mejorDia && mejorDia.facturacion > 0
                ? `Mejor día: ${diaLargo(mejorDia.dia)} · ${formatEuro(
                    mejorDia.facturacion
                  )}`
                : "Todavía no hay ventas registradas este mes."}
            </CardDescription>
          </div>
          <div className="flex gap-1 rounded-lg border p-1">
            <BotonMetrica
              activo={metrica === "facturacion"}
              onClick={() => setMetrica("facturacion")}
            >
              Facturación
            </BotonMetrica>
            <BotonMetrica
              activo={metrica === "pedidos"}
              onClick={() => setMetrica("pedidos")}
            >
              Pedidos
            </BotonMetrica>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="etiqueta"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                  interval="preserveStartEnd"
                  minTickGap={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={56}
                  stroke="var(--muted-foreground)"
                  allowDecimals={metrica === "facturacion"}
                  tickFormatter={(v: number) =>
                    metrica === "facturacion" ? `${v} €` : String(v)
                  }
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                  content={<TooltipDia metrica={metrica} />}
                />
                <Bar
                  dataKey="valor"
                  radius={[4, 4, 0, 0]}
                  fill="var(--primary)"
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 del mes</CardTitle>
            <CardDescription>
              Productos más vendidos por unidades en {datos.etiquetaMes.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {datos.topMes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin ventas este mes.
              </p>
            ) : (
              <div style={{ height: Math.max(200, datos.topMes.length * 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={datos.topMes}
                    layout="vertical"
                    margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      width={140}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      stroke="var(--muted-foreground)"
                    />
                    <Tooltip
                      cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                      content={<TooltipProducto />}
                    />
                    <Bar dataKey="unidades" radius={[0, 4, 4, 0]} maxBarSize={24}>
                      {datos.topMes.map((p) => (
                        <Cell
                          key={p.nombre}
                          fill="var(--primary)"
                          fillOpacity={
                            maxUnidades > 0
                              ? 0.45 + (0.55 * p.unidades) / maxUnidades
                              : 1
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalle por día</CardTitle>
            <CardDescription>
              Pedidos y facturación de cada día, del más reciente al más
              antiguo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 font-medium">Día</th>
                    <th className="py-2 text-right font-medium">Pedidos</th>
                    <th className="py-2 text-right font-medium">Facturación</th>
                  </tr>
                </thead>
                <tbody>
                  {diasRecientes.map((d) => (
                    <tr
                      key={d.dia}
                      className="border-b last:border-0 [&>td]:py-2"
                    >
                      <td className="capitalize">{diaLargo(d.dia)}</td>
                      <td
                        className={
                          d.pedidos === 0
                            ? "text-right text-muted-foreground"
                            : "text-right"
                        }
                      >
                        {d.pedidos}
                      </td>
                      <td
                        className={
                          d.pedidos === 0
                            ? "text-right text-muted-foreground"
                            : "text-right font-medium"
                        }
                      >
                        {formatEuro(d.facturacion)}
                      </td>
                    </tr>
                  ))}
                  {diasRecientes.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Sin datos para este mes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>
            Desde el primer pedido registrado en tu heladería.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-lg border p-4 sm:col-span-1">
            <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Producto más vendido
              </p>
              <p className="truncate font-semibold">
                {datos.topHistorico?.nombre ?? "—"}
              </p>
              {datos.topHistorico && (
                <p className="text-xs text-muted-foreground">
                  {datos.topHistorico.unidades} uds ·{" "}
                  {formatEuro(datos.topHistorico.facturacion)}
                </p>
              )}
            </div>
          </div>
          <Dato label="Pedidos totales" valor={String(datos.historico.pedidos)} />
          <Dato
            label="Facturación total"
            valor={formatEuro(datos.historico.facturacion)}
          />
        </CardContent>
      </Card>

      {sinDatos && (
        <p className="text-center text-sm text-muted-foreground">
          Cuando empieces a recibir pedidos verás aquí la evolución de tus
          ventas.
        </p>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  valor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valor: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="rounded-lg bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-bold">{valor}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{valor}</p>
    </div>
  );
}

function BotonMetrica({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        activo
          ? "rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
          : "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
      }
    >
      {children}
    </button>
  );
}

interface PayloadDia {
  dia: string;
  pedidos: number;
  facturacion: number;
}

function TooltipDia({
  active,
  payload,
  metrica,
}: {
  active?: boolean;
  payload?: { payload: PayloadDia }[];
  metrica: Metrica;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium capitalize">{diaLargo(d.dia)}</p>
      <p className={metrica === "pedidos" ? "font-semibold" : undefined}>
        {d.pedidos} pedido{d.pedidos === 1 ? "" : "s"}
      </p>
      <p className={metrica === "facturacion" ? "font-semibold" : undefined}>
        {formatEuro(d.facturacion)}
      </p>
    </div>
  );
}

interface PayloadProducto {
  nombre: string;
  unidades: number;
  facturacion: number;
}

function TooltipProducto({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PayloadProducto }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{p.nombre}</p>
      <p>{p.unidades} unidades</p>
      <p>{formatEuro(p.facturacion)}</p>
    </div>
  );
}
