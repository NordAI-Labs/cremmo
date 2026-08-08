"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Plus, Printer, QrCode, Trash2 } from "lucide-react";
import {
  crearMesa,
  actualizarMesa,
  eliminarMesa,
} from "@/app/(dashboard)/dashboard/mesas/actions";
import type { Mesa } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// El QR apunta a /m/<token> en vez de directamente a la carta: esa ruta abre
// una sesión de mesa de duración limitada (ver app/m/[token]/route.ts) antes
// de redirigir. Así, un enlace guardado o reenviado sin pasar por el QR deja
// de dar acceso indefinido a la carta.
function urlMesa(siteUrl: string, token: string) {
  return `${siteUrl}/m/${token}`;
}

export function MesasManager({
  siteUrl,
  mesas,
}: {
  siteUrl: string;
  mesas: Mesa[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nueva, setNueva] = useState("");
  const [qrMesa, setQrMesa] = useState<Mesa | null>(null);

  function run(fn: () => Promise<{ error?: string }>, okMsg?: string) {
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        if (okMsg) toast.success(okMsg);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mesas y QR</h1>
        <p className="text-sm text-muted-foreground">
          Crea mesas y genera el QR que tus clientes escanearán.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nombre de la mesa (ej. Mesa 5, Terraza 1)"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nueva.trim()) {
              run(() => crearMesa(nueva), "Mesa creada");
              setNueva("");
            }
          }}
        />
        <Button
          disabled={pending || !nueva.trim()}
          onClick={() => {
            run(() => crearMesa(nueva), "Mesa creada");
            setNueva("");
          }}
        >
          <Plus className="h-4 w-4" /> Crear
        </Button>
      </div>

      {mesas.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          Aún no tienes mesas.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mesas.map((m) => (
            <Card key={m.id}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{m.nombre}</span>
                  <Badge variant={m.activa ? "success" : "secondary"}>
                    {m.activa ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {urlMesa(siteUrl, m.token)}
                </p>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={m.activa}
                      onCheckedChange={(v) =>
                        run(() => actualizarMesa(m.id, { activa: v }))
                      }
                    />
                    Activa
                  </label>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setQrMesa(m)}
                  >
                    <QrCode className="h-4 w-4" /> Ver QR
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      run(() => eliminarMesa(m.id), "Mesa eliminada")
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QrDialog
        mesa={qrMesa}
        onClose={() => setQrMesa(null)}
        url={qrMesa ? urlMesa(siteUrl, qrMesa.token) : ""}
      />
    </div>
  );
}

function QrDialog({
  mesa,
  url,
  onClose,
}: {
  mesa: Mesa | null;
  url: string;
  onClose: () => void;
}) {
  const canvasWrap = useRef<HTMLDivElement>(null);

  function descargar() {
    const canvas = canvasWrap.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${mesa?.nombre.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function imprimir() {
    const canvas = canvasWrap.current?.querySelector("canvas");
    if (!canvas || !mesa) return;
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>QR ${mesa.nombre}</title>
      <style>
        body{display:flex;flex-direction:column;align-items:center;justify-content:center;
          font-family:sans-serif;height:100vh;margin:0}
        h1{font-size:24px} img{width:320px;height:320px}
        p{color:#666}
      </style></head>
      <body>
        <h1>${mesa.nombre}</h1>
        <img src="${dataUrl}" />
        <p>Escanea para ver la carta y pedir</p>
        <script>window.onload=()=>{window.print()}</script>
      </body></html>`);
    w.document.close();
  }

  return (
    <Dialog open={!!mesa} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>QR · {mesa?.nombre}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div ref={canvasWrap} className="rounded-lg bg-white p-4">
            {url && (
              <QRCodeCanvas value={url} size={240} level="M" includeMargin />
            )}
          </div>
          <p className="break-all text-center text-xs text-muted-foreground">
            {url}
          </p>
          <div className="flex w-full gap-2">
            <Button className="flex-1" onClick={descargar}>
              <Download className="h-4 w-4" /> Descargar
            </Button>
            <Button className="flex-1" variant="outline" onClick={imprimir}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
