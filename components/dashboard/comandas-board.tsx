"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Clock, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cambiarEstadoPedido } from "@/app/(dashboard)/dashboard/comandas/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { cn, formatEuro, formatHora } from "@/lib/utils";
import type {
  EstadoPedido,
  Pedido,
  PedidoItem,
} from "@/types/database.types";
import type { PersonalizacionElegida } from "@/types";

export type PedidoConItems = Pedido & {
  mesa: { nombre: string } | null;
  items: PedidoItem[];
};

const ESTADOS: {
  value: EstadoPedido;
  label: string;
  badge: "default" | "secondary" | "success" | "warning" | "destructive";
}[] = [
  { value: "pendiente", label: "Pendiente", badge: "warning" },
  { value: "en_preparacion", label: "En preparación", badge: "default" },
  { value: "listo", label: "Listo", badge: "success" },
  { value: "entregado", label: "Entregado", badge: "secondary" },
  { value: "cancelado", label: "Cancelado", badge: "destructive" },
];

const SIGUIENTE: Partial<Record<EstadoPedido, EstadoPedido>> = {
  pendiente: "en_preparacion",
  en_preparacion: "listo",
  listo: "entregado",
};

function estadoInfo(estado: EstadoPedido) {
  return ESTADOS.find((e) => e.value === estado)!;
}

export function ComandasBoard({
  heladeriaId,
  pedidosIniciales,
}: {
  heladeriaId: string;
  pedidosIniciales: PedidoConItems[];
}) {
  const [pedidos, setPedidos] = useState<PedidoConItems[]>(pedidosIniciales);
  const [filtro, setFiltro] = useState<EstadoPedido | "activos">("activos");
  const [isPending, startTransition] = useTransition();

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("pedidos")
      .select("*, mesa:mesas(nombre), items:pedido_items(*)")
      .eq("heladeria_id", heladeriaId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setPedidos(data as unknown as PedidoConItems[]);
  }, [heladeriaId]);

  // Suscripción Realtime: cualquier cambio en pedidos/items recarga la lista.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comandas-${heladeriaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `heladeria_id=eq.${heladeriaId}`,
        },
        (payload) => {
          refetch();
          if (payload.eventType === "INSERT") {
            toast.success("¡Nuevo pedido recibido!");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_items" },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [heladeriaId, refetch]);

  function actualizarEstado(pedidoId: string, estado: EstadoPedido) {
    // Optimista
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, estado } : p))
    );
    startTransition(async () => {
      const res = await cambiarEstadoPedido(pedidoId, estado);
      if (res.error) {
        toast.error("No se pudo actualizar el pedido");
        refetch();
      }
    });
  }

  const visibles = pedidos.filter((p) =>
    filtro === "activos"
      ? p.estado !== "entregado" && p.estado !== "cancelado"
      : p.estado === filtro
  );

  const conteo = (estado: EstadoPedido) =>
    pedidos.filter((p) => p.estado === estado).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Comandas</h1>
          <p className="text-sm text-muted-foreground">
            Pedidos en tiempo real
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <Tabs
        value={filtro}
        onValueChange={(v) => setFiltro(v as EstadoPedido | "activos")}
      >
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="activos">
            Activos (
            {pedidos.filter(
              (p) => p.estado !== "entregado" && p.estado !== "cancelado"
            ).length}
            )
          </TabsTrigger>
          {ESTADOS.map((e) => (
            <TabsTrigger key={e.value} value={e.value}>
              {e.label} ({conteo(e.value)})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={filtro}>
          {visibles.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              No hay pedidos en esta vista.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibles.map((pedido) => (
                <PedidoCard
                  key={pedido.id}
                  pedido={pedido}
                  disabled={isPending}
                  onEstado={actualizarEstado}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PedidoCard({
  pedido,
  disabled,
  onEstado,
}: {
  pedido: PedidoConItems;
  disabled: boolean;
  onEstado: (id: string, estado: EstadoPedido) => void;
}) {
  const info = estadoInfo(pedido.estado);
  const siguiente = SIGUIENTE[pedido.estado];
  const cerrado = pedido.estado === "entregado" || pedido.estado === "cancelado";

  return (
    <Card className={cn(pedido.estado === "pendiente" && "ring-2 ring-primary/40")}>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold">
              {pedido.mesa?.nombre ?? "Sin mesa"}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatHora(pedido.created_at)}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={info.badge}>{info.label}</Badge>
          </div>
        </div>

        <ul className="space-y-2 text-sm border-t pt-3">
          {pedido.items.map((item) => {
            const pers = (item.personalizaciones ??
              []) as unknown as PersonalizacionElegida[];
            return (
              <li key={item.id}>
                <div className="flex justify-between gap-2">
                  <span className="font-medium">
                    {item.cantidad}× {item.nombre_producto}
                  </span>
                  <span className="text-muted-foreground">
                    {formatEuro(item.subtotal)}
                  </span>
                </div>
                {pers.length > 0 && (
                  <div className="text-xs text-muted-foreground pl-4">
                    {pers.map((p) => p.opcion_nombre).join(", ")}
                  </div>
                )}
                {item.notas && (
                  <div className="text-xs italic text-muted-foreground pl-4">
                    “{item.notas}”
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {pedido.notas && (
          <p className="text-xs italic text-muted-foreground border-t pt-2">
            Nota: {pedido.notas}
          </p>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-bold">{formatEuro(pedido.total)}</span>
        </div>

        {!cerrado && (
          <div className="flex flex-wrap gap-2 pt-1">
            {siguiente && (
              <Button
                size="sm"
                variant="success"
                disabled={disabled}
                onClick={() => onEstado(pedido.id, siguiente)}
                className="flex-1"
              >
                {estadoInfo(siguiente).label}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onEstado(pedido.id, "cancelado")}
            >
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
