"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatEuro } from "@/lib/utils";
import type { PedidoCreado } from "@/lib/pedidos/crear";

export function ConfirmacionContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const mesa = searchParams.get("mesa");
  const [pedido, setPedido] = useState<PedidoCreado | null>(null);

  useEffect(() => {
    const raw =
      typeof window !== "undefined"
        ? sessionStorage.getItem("ultimo-pedido")
        : null;
    if (raw) {
      try {
        // Lectura de sessionStorage tras montar (evita mismatch de hidratación).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPedido(JSON.parse(raw));
      } catch {
        /* ignora */
      }
    }
  }, []);

  const volverUrl = `/${params.slug}${mesa ? `?mesa=${mesa}` : ""}`;

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <CardTitle className="text-2xl">¡Pedido enviado!</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tu pedido ha llegado a la heladería. En breve empezarán a
            prepararlo.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {pedido ? (
            <>
              <ul className="space-y-2 text-sm">
                {pedido.items.map((it, idx) => (
                  <li key={idx}>
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {it.cantidad}× {it.nombre_producto}
                      </span>
                      <span className="text-muted-foreground">
                        {formatEuro(it.subtotal)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatEuro(pedido.total)}</span>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Gracias por tu pedido.
            </p>
          )}

          <Button asChild className="w-full">
            <Link href={volverUrl}>Volver a la carta</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
