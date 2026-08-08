"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatEuro } from "@/lib/utils";
import { useCart } from "@/store/cart";

export function CartSheet({
  open,
  onClose,
  slug,
  mesaToken,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  mesaToken: string | null;
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const updateCantidad = useCart((s) => s.updateCantidad);
  const removeLine = useCart((s) => s.removeLine);
  const clear = useCart((s) => s.clear);
  const total = useCart((s) => s.total());
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviarPedido() {
    if (items.length === 0) return;
    setEnviando(true);

    const payload = {
      slug,
      mesa_token: mesaToken ?? undefined,
      notas: notas.trim() || undefined,
      items: items.map((i) => ({
        producto_id: i.producto_id ?? undefined,
        categoria_id: i.categoria_id ?? undefined,
        promocion_id: i.promocion_id ?? undefined,
        cantidad: i.cantidad,
        personalizaciones: i.personalizaciones.map((p) => ({
          grupo_id: p.grupo_id,
          opcion_id: p.opcion_id,
        })),
        notas: i.notas,
      })),
    };

    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "No se pudo enviar el pedido");
        setEnviando(false);
        if (res.status === 401) {
          // Sesión de mesa caducada justo al enviar: se vacía el carrito y se
          // vuelve a pedir la página para que enseñe la pantalla de caducidad.
          clear();
          onClose();
          router.refresh();
        }
        return;
      }

      // Guarda el resumen para la pantalla de confirmación.
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "ultimo-pedido",
          JSON.stringify(data.pedido)
        );
      }
      clear();
      onClose();
      router.push(
        `/${slug}/confirmacion${mesaToken ? `?mesa=${mesaToken}` : ""}`
      );
    } catch {
      toast.error("Error de conexión");
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 gap-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> Tu pedido
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Tu carrito está vacío.
            </p>
          ) : (
            items.map((item) => (
              <div key={item.lineId} className="flex gap-3">
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{item.nombre}</span>
                    <span className="text-muted-foreground">
                      {formatEuro(item.precio_unitario * item.cantidad)}
                    </span>
                  </div>
                  {item.personalizaciones.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {item.personalizaciones
                        .map((p) => p.opcion_nombre)
                        .join(", ")}
                    </p>
                  )}
                  {item.notas && (
                    <p className="text-xs italic text-muted-foreground">
                      “{item.notas}”
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() =>
                        updateCantidad(item.lineId, item.cantidad - 1)
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">
                      {item.cantidad}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() =>
                        updateCantidad(item.lineId, item.cantidad + 1)
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 ml-auto"
                      onClick={() => removeLine(item.lineId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas para la cocina (opcional)"
              rows={2}
            />
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatEuro(total)}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={enviando}
              onClick={enviarPedido}
            >
              {enviando ? "Enviando…" : "Enviar pedido"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
