"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  IceCreamCone,
  IceCreamBowl,
  Minus,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  TarrinaIcon,
  type IconoComponente,
} from "@/components/iconos-asistente";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn, formatEuro } from "@/lib/utils";
import { nombresAlergenos } from "@/lib/alergenos";
import { nuevaLineaId, useCart } from "@/store/cart";
import type {
  GrupoConOpcionesCargadas,
  PersonalizacionElegida,
  ProductoConOpciones,
  CategoriaConOpciones,
} from "@/types";
import type { Opcion, RolGrupo } from "@/types/database.types";

type Grupo = GrupoConOpcionesCargadas;

/**
 * Configuración de entrada del asistente. Sirve tanto para un producto normal
 * (kind 'producto', con precio base) como para una categoría-asistente de
 * helado (kind 'categoria', precio base 0: el importe lo pone el tamaño).
 */
export interface WizardConfig {
  kind: "producto" | "categoria";
  id: string;
  nombre: string;
  descripcion: string | null;
  foto_url: string | null;
  precioBase: number;
  /**
   * Alérgenos declarados (ver lib/alergenos.ts). Vacío en las categorías: lo
   * que se monta por pasos no los declara todavía, van por opción.
   */
  alergenos: string[];
  grupos: Grupo[];
}

const ROL_ORDEN: RolGrupo[] = [
  "formato",
  "tamano",
  "sabores",
  "toppings",
  "generico",
];

type IconoFormato = IconoComponente;

/** Icono coherente con el formato elegido (cucurucho / tarrina / copa). */
function iconoFormato(nombre: string): IconoFormato {
  const n = nombre.toLowerCase();
  if (n.includes("copa")) return IceCreamBowl;
  if (
    n.includes("tarrina") ||
    n.includes("tarro") ||
    n.includes("vaso") ||
    n.includes("cup")
  )
    return TarrinaIcon;
  return IceCreamCone; // cucurucho / cono / por defecto
}

/** Construye la config del asistente a partir de un producto. */
export function configDesdeProducto(p: ProductoConOpciones): WizardConfig {
  return {
    kind: "producto",
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    foto_url: p.foto_url,
    precioBase: Number(p.precio),
    alergenos: p.alergenos ?? [],
    grupos: p.grupos_opciones,
  };
}

/** Construye la config del asistente a partir de una categoría de helado. */
export function configDesdeCategoria(c: CategoriaConOpciones): WizardConfig {
  return {
    kind: "categoria",
    id: c.id,
    nombre: c.nombre,
    descripcion: null,
    foto_url: null,
    precioBase: 0,
    alergenos: [],
    grupos: c.grupos_opciones,
  };
}

export function ProductWizard({
  config,
  open,
  onClose,
}: {
  config: WizardConfig | null;
  open: boolean;
  onClose: () => void;
}) {
  const addItem = useCart((s) => s.addItem);
  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState("");
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [step, setStep] = useState(0);

  // Reinicia el estado al cambiar de configuración (ajuste en render).
  const configId = config?.id;
  const [prevId, setPrevId] = useState(configId);
  if (configId !== prevId) {
    setPrevId(configId);
    setCantidad(1);
    setNotas("");
    setSel({});
    setStep(0);
  }

  // Grupos ordenados por rol → cada uno es un paso del asistente.
  const grupos = useMemo(() => {
    const gs = config?.grupos ?? [];
    return [...gs].sort((a, b) => {
      const ra = ROL_ORDEN.indexOf(a.rol);
      const rb = ROL_ORDEN.indexOf(b.rol);
      if (ra !== rb) return ra - rb;
      return a.orden - b.orden;
    });
  }, [config]);

  const totalSteps = grupos.length + 1;
  const enResumen = step >= grupos.length;
  const grupoActual = enResumen ? null : grupos[step];

  const grupoTamano = grupos.find((g) => g.rol === "tamano");
  const grupoSabores = grupos.find((g) => g.rol === "sabores");
  const maxSabores = useMemo(() => {
    if (grupoTamano) {
      const opId = sel[grupoTamano.id]?.[0];
      const op = grupoTamano.opciones.find((o) => o.id === opId);
      if (op?.max_sabores != null) return op.max_sabores;
    }
    return grupoSabores?.max_selecciones ?? 1;
  }, [grupoTamano, grupoSabores, sel]);

  if (!config) return null;

  const opcionesSeleccionadas: Opcion[] = grupos.flatMap((g) =>
    g.opciones.filter((o) => (sel[g.id] ?? []).includes(o.id))
  );
  const extras = opcionesSeleccionadas.reduce(
    (s, o) => s + Number(o.precio_extra),
    0
  );
  const precioUnitario = config.precioBase + extras;

  function elegirUnica(grupo: Grupo, opcionId: string) {
    setSel((s) => {
      const next = { ...s, [grupo.id]: [opcionId] };
      if (grupo.rol === "tamano" && grupoSabores) {
        const op = grupo.opciones.find((o) => o.id === opcionId);
        const nuevoMax = op?.max_sabores ?? grupoSabores.max_selecciones ?? 1;
        const saboresActuales = next[grupoSabores.id] ?? [];
        if (saboresActuales.length > nuevoMax) {
          next[grupoSabores.id] = saboresActuales.slice(0, nuevoMax);
        }
      }
      return next;
    });
    setTimeout(() => setStep((st) => Math.min(st + 1, grupos.length)), 180);
  }

  function toggleSabor(grupo: Grupo, opcionId: string) {
    setSel((s) => {
      const actuales = s[grupo.id] ?? [];
      if (actuales.includes(opcionId)) {
        return { ...s, [grupo.id]: actuales.filter((id) => id !== opcionId) };
      }
      if (actuales.length >= maxSabores) {
        toast.error(
          maxSabores === 1
            ? "Este tamaño permite 1 sabor"
            : `Este tamaño permite hasta ${maxSabores} sabores`
        );
        return s;
      }
      return { ...s, [grupo.id]: [...actuales, opcionId] };
    });
  }

  function toggleMultiple(grupo: Grupo, opcionId: string) {
    setSel((s) => {
      const actuales = s[grupo.id] ?? [];
      if (actuales.includes(opcionId)) {
        return { ...s, [grupo.id]: actuales.filter((id) => id !== opcionId) };
      }
      if (grupo.max_selecciones > 0 && actuales.length >= grupo.max_selecciones) {
        toast.error(`Máximo ${grupo.max_selecciones} en "${grupo.nombre}"`);
        return s;
      }
      return { ...s, [grupo.id]: [...actuales, opcionId] };
    });
  }

  function pasoValido(g: Grupo | null): boolean {
    if (!g) return true;
    const n = (sel[g.id] ?? []).length;
    if (g.rol === "sabores") {
      const min = Math.max(g.min_selecciones, g.obligatorio ? 1 : 0);
      return n >= min && n <= maxSabores;
    }
    if (g.tipo === "unica") {
      return g.obligatorio ? n >= 1 : true;
    }
    const min = Math.max(g.min_selecciones, g.obligatorio ? 1 : 0);
    return n >= min;
  }

  function anadir() {
    for (const g of grupos) {
      if (!pasoValido(g)) {
        toast.error(`Revisa "${g.nombre}"`);
        return;
      }
    }
    const personalizaciones: PersonalizacionElegida[] = grupos.flatMap((g) =>
      (sel[g.id] ?? []).map((opId) => {
        const o = g.opciones.find((x) => x.id === opId)!;
        return {
          grupo_id: g.id,
          grupo_nombre: g.nombre,
          opcion_id: o.id,
          opcion_nombre: o.nombre,
          precio_extra: Number(o.precio_extra),
        };
      })
    );

    addItem({
      lineId: nuevaLineaId(),
      producto_id: config!.kind === "producto" ? config!.id : null,
      categoria_id: config!.kind === "categoria" ? config!.id : null,
      nombre: config!.nombre,
      precio_base: config!.precioBase,
      cantidad,
      foto_url: config!.foto_url,
      personalizaciones,
      notas: notas.trim() || undefined,
      precio_unitario: precioUnitario,
    });
    toast.success(`${config!.nombre} añadido al carrito`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 gap-0 flex flex-col max-h-[92vh] sm:max-w-lg">
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base">
                {config.nombre}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {enResumen
                  ? "Resumen"
                  : `Paso ${step + 1} de ${totalSteps} · ${grupoActual?.nombre}`}
              </p>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {grupoActual ? (
            <PasoGrupo
              grupo={grupoActual}
              seleccion={sel[grupoActual.id] ?? []}
              maxSabores={maxSabores}
              onUnica={(id) => elegirUnica(grupoActual, id)}
              onSabor={(id) => toggleSabor(grupoActual, id)}
              onMultiple={(id) => toggleMultiple(grupoActual, id)}
            />
          ) : (
            <Resumen
              config={config}
              grupos={grupos}
              sel={sel}
              notas={notas}
              setNotas={setNotas}
            />
          )}
        </div>

        <div className="flex items-center gap-3 border-t p-4">
          {enResumen && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-7 text-center font-semibold">{cantidad}</span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setCantidad((c) => c + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {enResumen ? (
            <Button className="flex-1" onClick={anadir}>
              Añadir · {formatEuro(precioUnitario * cantidad)}
            </Button>
          ) : (
            <Button
              className="flex-1"
              disabled={!pasoValido(grupoActual)}
              onClick={() => setStep((s) => Math.min(s + 1, grupos.length))}
            >
              Continuar · {formatEuro(precioUnitario)}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Paso: renderiza el grupo según su rol
// ---------------------------------------------------------------------------
function PasoGrupo({
  grupo,
  seleccion,
  maxSabores,
  onUnica,
  onSabor,
  onMultiple,
}: {
  grupo: Grupo;
  seleccion: string[];
  maxSabores: number;
  onUnica: (id: string) => void;
  onSabor: (id: string) => void;
  onMultiple: (id: string) => void;
}) {
  const opciones = grupo.opciones.slice().sort((a, b) => a.orden - b.orden);

  if (grupo.rol === "formato") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {opciones.map((o) => {
          const activo = seleccion.includes(o.id);
          const Icono = iconoFormato(o.nombre);
          return (
            <button
              key={o.id}
              onClick={() => onUnica(o.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-6 transition-colors",
                activo
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent/40"
              )}
            >
              <Icono className="h-10 w-10 text-primary" />
              <span className="font-semibold">{o.nombre}</span>
              {Number(o.precio_extra) > 0 && (
                <span className="text-xs text-muted-foreground">
                  +{formatEuro(o.precio_extra)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (grupo.rol === "tamano") {
    return (
      <div className="grid gap-3">
        {opciones.map((o) => {
          const activo = seleccion.includes(o.id);
          return (
            <button
              key={o.id}
              onClick={() => onUnica(o.id)}
              className={cn(
                "flex items-center justify-between rounded-xl border-2 p-4 text-left transition-colors",
                activo
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent/40"
              )}
            >
              <div>
                <div className="font-semibold">{o.nombre}</div>
                {o.max_sabores != null && (
                  <div className="text-xs text-muted-foreground">
                    {o.max_sabores === 1
                      ? "1 sabor"
                      : `Hasta ${o.max_sabores} sabores`}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {Number(o.precio_extra) > 0 && (
                  <span className="text-sm font-medium">
                    {formatEuro(o.precio_extra)}
                  </span>
                )}
                {activo && <Check className="h-5 w-5 text-primary" />}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (grupo.rol === "sabores") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Elige {maxSabores === 1 ? "1 sabor" : `hasta ${maxSabores} sabores`} ·{" "}
          {seleccion.length}/{maxSabores}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {opciones.map((o) => {
            const activo = seleccion.includes(o.id);
            const bloqueado = !activo && seleccion.length >= maxSabores;
            return (
              <button
                key={o.id}
                disabled={bloqueado}
                onClick={() => onSabor(o.id)}
                className={cn(
                  "flex items-center justify-between rounded-lg border-2 px-3 py-3 text-left text-sm transition-colors",
                  activo
                    ? "border-primary bg-primary/5"
                    : bloqueado
                      ? "border-border opacity-40"
                      : "border-border hover:bg-accent/40"
                )}
              >
                <span>{o.nombre}</span>
                {activo && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const esUnica = grupo.tipo === "unica";
  return (
    <div className="space-y-2">
      {grupo.rol === "toppings" && (
        <p className="text-sm text-muted-foreground">
          Añade los toppings que quieras (opcional).
        </p>
      )}
      {opciones.map((o) => {
        const activo = seleccion.includes(o.id);
        return (
          <button
            key={o.id}
            onClick={() => (esUnica ? onUnica(o.id) : onMultiple(o.id))}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 text-left transition-colors",
              activo
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent/40"
            )}
          >
            <span>{o.nombre}</span>
            <div className="flex items-center gap-2">
              {Number(o.precio_extra) > 0 && (
                <span className="text-sm text-muted-foreground">
                  +{formatEuro(o.precio_extra)}
                </span>
              )}
              {activo && <Check className="h-5 w-5 text-primary" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resumen final
// ---------------------------------------------------------------------------
function Resumen({
  config,
  grupos,
  sel,
  notas,
  setNotas,
}: {
  config: WizardConfig;
  grupos: Grupo[];
  sel: Record<string, string[]>;
  notas: string;
  setNotas: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      {config.foto_url && (
        <div className="relative h-40 w-full overflow-hidden rounded-xl bg-white">
          <Image
            src={config.foto_url}
            alt={config.nombre}
            fill
            className="object-cover"
            sizes="512px"
            unoptimized
          />
        </div>
      )}

      <div className="space-y-3">
        {grupos.map((g) => {
          const ids = sel[g.id] ?? [];
          if (ids.length === 0) return null;
          const nombres = g.opciones
            .filter((o) => ids.includes(o.id))
            .map((o) => o.nombre);
          return (
            <div key={g.id} className="flex items-start justify-between gap-3">
              <span className="text-sm text-muted-foreground">{g.nombre}</span>
              <span className="text-right text-sm font-medium">
                {nombres.join(", ")}
              </span>
            </div>
          );
        })}
        {grupos.every((g) => (sel[g.id] ?? []).length === 0) && (
          <p className="text-sm text-muted-foreground">
            {config.descripcion ?? "Confirma tu elección."}
          </p>
        )}
      </div>

      {config.alergenos.length > 0 && (
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-semibold">Contiene</p>
          <p className="text-xs text-muted-foreground">
            {nombresAlergenos(config.alergenos).join(" · ")}. Si tienes alergia o
            intolerancia, consúltalo con el personal.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Badge variant="secondary">Notas</Badge>
        <Textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Sin azúcar, poco hielo…"
          rows={2}
        />
      </div>
    </div>
  );
}
