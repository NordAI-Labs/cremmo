"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Settings2, Wand2 } from "lucide-react";
import {
  guardarCategoria,
  eliminarCategoria,
  guardarProducto,
  eliminarProducto,
  guardarGrupo,
  eliminarGrupo,
  guardarOpcion,
  eliminarOpcion,
  configurarHelado,
  configurarHeladoCategoria,
} from "@/app/(dashboard)/dashboard/catalogo/actions";
import type { GrupoConOpciones } from "@/app/(dashboard)/dashboard/catalogo/page";
import type {
  Categoria,
  Producto,
  TipoCategoria,
  TipoGrupoOpcion,
  RolGrupo,
} from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/dashboard/image-upload";
import {
  DESCRIPCION_ASISTENTE_POR_DEFECTO,
  ICONOS_ASISTENTE,
  ICONO_ASISTENTE_POR_DEFECTO,
  IconoAsistente,
  TITULO_ASISTENTE_POR_DEFECTO,
} from "@/components/iconos-asistente";
import { formatEuro } from "@/lib/utils";

const ROL_LABEL: Record<RolGrupo, string> = {
  formato: "Formato",
  tamano: "Tamaño",
  sabores: "Sabores",
  toppings: "Toppings",
  generico: "Genérico",
};

export function CatalogoManager({
  heladeriaId,
  categorias,
  productos,
  grupos,
}: {
  heladeriaId: string;
  categorias: Categoria[];
  productos: Producto[];
  grupos: GrupoConOpciones[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Catálogo</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona categorías, productos y opciones de personalización.
        </p>
      </div>

      <Tabs defaultValue="productos">
        <TabsList>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="asistentes">Asistentes</TabsTrigger>
          <TabsTrigger value="opciones">Personalización</TabsTrigger>
        </TabsList>

        <TabsContent value="productos">
          <ProductosTab
            heladeriaId={heladeriaId}
            productos={productos}
            categorias={categorias}
          />
        </TabsContent>
        <TabsContent value="categorias">
          <CategoriasTab categorias={categorias} />
        </TabsContent>
        <TabsContent value="asistentes">
          <GruposEditor
            ownerKind="categoria"
            owners={categorias
              .filter((c) => c.tipo === "asistente")
              .map((c) => ({ id: c.id, nombre: c.nombre }))}
            grupos={grupos}
          />
        </TabsContent>
        <TabsContent value="opciones">
          <GruposEditor
            ownerKind="producto"
            owners={productos.map((p) => ({ id: p.id, nombre: p.nombre }))}
            grupos={grupos}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>, okMsg?: string) =>
    start(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else {
        if (okMsg) toast.success(okMsg);
        router.refresh();
      }
    });
  return { pending, run };
}

// ===========================================================================
// Categorías
// ===========================================================================
function BadgeAsistente({ categoria }: { categoria: Categoria }) {
  return (
    <Badge className="gap-1">
      <IconoAsistente id={categoria.asistente_icono} className="h-3 w-3" />{" "}
      Asistente
    </Badge>
  );
}

function CategoriasTab({ categorias }: { categorias: Categoria[] }) {
  const { pending, run } = useRefresh();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoCategoria>("simple");
  const [orden, setOrden] = useState(0);
  const [icono, setIcono] = useState(ICONO_ASISTENTE_POR_DEFECTO);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  function abrir(c?: Categoria) {
    setEdit(c ?? null);
    setNombre(c?.nombre ?? "");
    setTipo(c?.tipo ?? "simple");
    setOrden(c?.orden ?? categorias.length);
    setIcono(c?.asistente_icono ?? ICONO_ASISTENTE_POR_DEFECTO);
    setTitulo(c?.asistente_titulo ?? "");
    setDescripcion(c?.asistente_descripcion ?? "");
    setOpen(true);
  }

  function guardar() {
    if (!nombre.trim()) return toast.error("Indica un nombre");
    run(
      () =>
        guardarCategoria({
          id: edit?.id,
          nombre: nombre.trim(),
          tipo,
          orden,
          asistente_icono: icono,
          asistente_titulo: titulo,
          asistente_descripcion: descripcion,
        }),
      "Categoría guardada"
    );
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => abrir()}>
          <Plus className="h-4 w-4" /> Nueva categoría
        </Button>
      </div>

      {categorias.length === 0 ? (
        <Empty texto="Aún no tienes categorías." />
      ) : (
        <div className="grid gap-2">
          {categorias.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">#{c.orden}</Badge>
                  <span className="font-medium">{c.nombre}</span>
                  {c.tipo === "asistente" && <BadgeAsistente categoria={c} />}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => abrir(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      run(() => eliminarCategoria(c.id), "Categoría eliminada")
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Helados, Cafés…"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as TipoCategoria)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">
                    Simple (lista de productos)
                  </SelectItem>
                  <SelectItem value="asistente">
                    Asistente (pedido por pasos)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                «Asistente» sirve para helados, gofres, crepes, tortitas… El
                cliente elige paso a paso. Configura los pasos en la pestaña
                «Asistentes».
              </p>
            </div>

            {tipo === "asistente" && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Tarjeta que verá el cliente en la carta
                </p>
                <div className="space-y-2">
                  <Label>Icono</Label>
                  <Select value={icono} onValueChange={setIcono}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICONOS_ASISTENTE.map(({ id, etiqueta }) => (
                        <SelectItem key={id} value={id}>
                          <span className="flex items-center gap-2">
                            <IconoAsistente
                              id={id}
                              className="h-4 w-4 text-primary"
                            />
                            {etiqueta}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder={TITULO_ASISTENTE_POR_DEFECTO}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder={DESCRIPCION_ASISTENTE_POR_DEFECTO}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Si los dejas vacíos se usarán los textos de ejemplo.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Orden</Label>
              <Input
                type="number"
                value={orden}
                onChange={(e) => setOrden(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={pending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===========================================================================
// Productos
// ===========================================================================
function ProductosTab({
  heladeriaId,
  productos,
  categorias,
}: {
  heladeriaId: string;
  productos: Producto[];
  categorias: Categoria[];
}) {
  const { pending, run } = useRefresh();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Producto | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "0",
    categoria_id: "" as string,
    foto_url: null as string | null,
    disponible: true,
    orden: 0,
  });

  const catNombre = useMemo(
    () => new Map(categorias.map((c) => [c.id, c.nombre])),
    [categorias]
  );

  function abrir(p?: Producto) {
    setEdit(p ?? null);
    setForm({
      nombre: p?.nombre ?? "",
      descripcion: p?.descripcion ?? "",
      precio: p ? String(p.precio) : "0",
      categoria_id: p?.categoria_id ?? "",
      foto_url: p?.foto_url ?? null,
      disponible: p?.disponible ?? true,
      orden: p?.orden ?? productos.length,
    });
    setOpen(true);
  }

  function guardar() {
    if (!form.nombre.trim()) return toast.error("Indica un nombre");
    const precio = Number(form.precio.replace(",", "."));
    if (Number.isNaN(precio) || precio < 0)
      return toast.error("Precio no válido");

    run(
      () =>
        guardarProducto({
          id: edit?.id,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          precio,
          categoria_id: form.categoria_id || null,
          foto_url: form.foto_url,
          disponible: form.disponible,
          orden: form.orden,
        }),
      "Producto guardado"
    );
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => abrir()}>
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      {productos.length === 0 ? (
        <Empty texto="Aún no tienes productos." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="relative h-36 w-full bg-muted">
                {p.foto_url ? (
                  <Image
                    src={p.foto_url}
                    alt={p.nombre}
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, 33vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sin foto
                  </div>
                )}
                {!p.disponible && (
                  <Badge variant="destructive" className="absolute left-2 top-2">
                    No disponible
                  </Badge>
                )}
              </div>
              <CardContent className="space-y-1 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{p.nombre}</span>
                  <span className="font-bold text-primary">
                    {formatEuro(p.precio)}
                  </span>
                </div>
                {p.categoria_id && (
                  <Badge variant="secondary">
                    {catNombre.get(p.categoria_id) ?? "—"}
                  </Badge>
                )}
                {p.descripcion && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {p.descripcion}
                  </p>
                )}
                <div className="flex gap-1 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => abrir(p)}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      run(() => eliminarProducto(p.id), "Producto eliminado")
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Foto</Label>
              <ImageUpload
                normalizar
                heladeriaId={heladeriaId}
                value={form.foto_url}
                onChange={(url) => setForm((f) => ({ ...f, foto_url: url }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.descripcion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio (€)</Label>
                <Input
                  inputMode="decimal"
                  value={form.precio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, precio: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={form.orden}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, orden: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={form.categoria_id || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, categoria_id: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Disponible</Label>
              <Switch
                checked={form.disponible}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, disponible: v }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={pending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===========================================================================
// Editor de grupos de opciones (reutilizable: por producto o por categoría)
// ===========================================================================
function GruposEditor({
  ownerKind,
  owners,
  grupos,
}: {
  ownerKind: "producto" | "categoria";
  owners: { id: string; nombre: string }[];
  grupos: GrupoConOpciones[];
}) {
  const { pending, run } = useRefresh();
  const [ownerId, setOwnerId] = useState<string>(owners[0]?.id ?? "");
  const esCategoria = ownerKind === "categoria";
  const ownerLabel = esCategoria ? "Categoría" : "Producto";

  const gruposDelOwner = grupos.filter((g) =>
    esCategoria ? g.categoria_id === ownerId : g.producto_id === ownerId
  );

  // Dialog grupo
  const [grupoOpen, setGrupoOpen] = useState(false);
  const [grupoEdit, setGrupoEdit] = useState<GrupoConOpciones | null>(null);
  const [grupoForm, setGrupoForm] = useState({
    nombre: "",
    tipo: "unica" as TipoGrupoOpcion,
    rol: "generico" as RolGrupo,
    min_selecciones: 0,
    max_selecciones: 1,
    obligatorio: false,
    orden: 0,
  });

  function abrirGrupo(g?: GrupoConOpciones) {
    setGrupoEdit(g ?? null);
    setGrupoForm({
      nombre: g?.nombre ?? "",
      tipo: g?.tipo ?? "unica",
      rol: g?.rol ?? "generico",
      min_selecciones: g?.min_selecciones ?? 0,
      max_selecciones: g?.max_selecciones ?? 1,
      obligatorio: g?.obligatorio ?? false,
      orden: g?.orden ?? gruposDelOwner.length,
    });
    setGrupoOpen(true);
  }

  function guardarGrupoFn() {
    if (!ownerId) return toast.error(`Selecciona ${ownerLabel.toLowerCase()}`);
    if (!grupoForm.nombre.trim()) return toast.error("Indica un nombre");
    run(
      () =>
        guardarGrupo({
          id: grupoEdit?.id,
          producto_id: esCategoria ? null : ownerId,
          categoria_id: esCategoria ? ownerId : null,
          nombre: grupoForm.nombre.trim(),
          tipo: grupoForm.tipo,
          rol: grupoForm.rol,
          min_selecciones: grupoForm.min_selecciones,
          max_selecciones: grupoForm.max_selecciones,
          obligatorio: grupoForm.obligatorio,
          orden: grupoForm.orden,
        }),
      "Grupo guardado"
    );
    setGrupoOpen(false);
  }

  // Dialog opción
  const [opcionOpen, setOpcionOpen] = useState(false);
  const [opcionGrupoId, setOpcionGrupoId] = useState<string>("");
  const [opcionEdit, setOpcionEdit] = useState<{ id: string } | null>(null);
  const [opcionForm, setOpcionForm] = useState({
    nombre: "",
    precio_extra: "0",
    max_sabores: "",
    disponible: true,
    orden: 0,
  });

  const opcionGrupo = gruposDelOwner.find((g) => g.id === opcionGrupoId);
  const esGrupoTamano = opcionGrupo?.rol === "tamano";

  function abrirOpcion(
    grupoId: string,
    o?: {
      id: string;
      nombre: string;
      precio_extra: number;
      max_sabores?: number | null;
      disponible: boolean;
      orden: number;
    }
  ) {
    setOpcionGrupoId(grupoId);
    setOpcionEdit(o ? { id: o.id } : null);
    setOpcionForm({
      nombre: o?.nombre ?? "",
      precio_extra: o ? String(o.precio_extra) : "0",
      max_sabores: o?.max_sabores != null ? String(o.max_sabores) : "",
      disponible: o?.disponible ?? true,
      orden: o?.orden ?? 0,
    });
    setOpcionOpen(true);
  }

  function guardarOpcionFn() {
    if (!opcionForm.nombre.trim()) return toast.error("Indica un nombre");
    const precio = Number(opcionForm.precio_extra.replace(",", "."));
    if (Number.isNaN(precio)) return toast.error("Precio no válido");
    let maxSabores: number | null = null;
    if (esGrupoTamano && opcionForm.max_sabores.trim() !== "") {
      maxSabores = Number(opcionForm.max_sabores);
      if (!Number.isInteger(maxSabores) || maxSabores < 1) {
        return toast.error("Nº de sabores no válido");
      }
    }
    run(
      () =>
        guardarOpcion({
          id: opcionEdit?.id,
          grupo_id: opcionGrupoId,
          nombre: opcionForm.nombre.trim(),
          precio_extra: precio,
          max_sabores: maxSabores,
          disponible: opcionForm.disponible,
          orden: opcionForm.orden,
        }),
      "Opción guardada"
    );
    setOpcionOpen(false);
  }

  if (owners.length === 0) {
    return (
      <Empty
        texto={
          esCategoria
            ? "Crea una categoría de tipo «Asistente» para configurar sus pasos."
            : "Crea productos antes de configurar su personalización."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label>{ownerLabel}</Label>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger>
              <SelectValue
                placeholder={`Selecciona ${ownerLabel.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {owners.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!ownerId || pending}
            onClick={() =>
              run(
                () =>
                  esCategoria
                    ? configurarHeladoCategoria(ownerId)
                    : configurarHelado(ownerId),
                "Pasos del asistente creados"
              )
            }
            title="Crea de golpe Formato, Tamaño, Sabores y Toppings"
          >
            <Wand2 className="h-4 w-4" /> Usar plantilla de helado
          </Button>
          <Button onClick={() => abrirGrupo()} disabled={!ownerId}>
            <Plus className="h-4 w-4" /> Nuevo grupo
          </Button>
        </div>
      </div>

      {gruposDelOwner.length === 0 ? (
        <Empty
          texto={
            esCategoria
              ? "Esta categoría aún no tiene pasos. Pulsa «Usar plantilla de helado» o crea los grupos a mano."
              : "Este producto no tiene grupos de opciones."
          }
        />
      ) : (
        <div className="space-y-4">
          {gruposDelOwner.map((g) => (
            <Card key={g.id}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {g.rol === "sabores" || g.rol === "tamano" || g.rol === "formato" ? (
                        <Wand2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold">{g.nombre}</span>
                      {g.rol !== "generico" && (
                        <Badge variant="secondary">{ROL_LABEL[g.rol]}</Badge>
                      )}
                      {g.obligatorio && (
                        <Badge variant="warning">Obligatorio</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {g.tipo === "unica" ? "Elección única" : "Elección múltiple"}{" "}
                      · min {g.min_selecciones} / max {g.max_selecciones}
                      {g.rol === "sabores" &&
                        " · el nº real de sabores lo fija cada tamaño"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => abrirGrupo(g)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        run(() => eliminarGrupo(g.id), "Grupo eliminado")
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 border-t pt-3">
                  {g.opciones
                    .slice()
                    .sort((a, b) => a.orden - b.orden)
                    .map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className={o.disponible ? "" : "line-through text-muted-foreground"}>
                          {o.nombre}
                          {Number(o.precio_extra) > 0 && (
                            <span className="text-muted-foreground">
                              {" "}
                              (+{formatEuro(o.precio_extra)})
                            </span>
                          )}
                          {g.rol === "tamano" && o.max_sabores != null && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {o.max_sabores}{" "}
                              {o.max_sabores === 1 ? "sabor" : "sabores"}
                            </span>
                          )}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => abrirOpcion(g.id, o)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={pending}
                            onClick={() =>
                              run(() => eliminarOpcion(o.id), "Opción eliminada")
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1"
                    onClick={() => abrirOpcion(g.id)}
                  >
                    <Plus className="h-4 w-4" /> Añadir opción
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog grupo */}
      <Dialog open={grupoOpen} onOpenChange={setGrupoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {grupoEdit ? "Editar grupo" : "Nuevo grupo de opciones"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={grupoForm.nombre}
                onChange={(e) =>
                  setGrupoForm((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="Tamaño, Sabores, Toppings…"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol en el asistente</Label>
              <Select
                value={grupoForm.rol}
                onValueChange={(v) =>
                  setGrupoForm((f) => ({ ...f, rol: v as RolGrupo }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formato">Formato (cucurucho/tarrina)</SelectItem>
                  <SelectItem value="tamano">Tamaño (define nº de sabores)</SelectItem>
                  <SelectItem value="sabores">Sabores</SelectItem>
                  <SelectItem value="toppings">Toppings</SelectItem>
                  <SelectItem value="generico">Genérico</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define en qué paso del asistente aparece este grupo.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={grupoForm.tipo}
                onValueChange={(v) =>
                  setGrupoForm((f) => ({ ...f, tipo: v as TipoGrupoOpcion }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Elección única</SelectItem>
                  <SelectItem value="multiple">Elección múltiple</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mín. selecciones</Label>
                <Input
                  type="number"
                  value={grupoForm.min_selecciones}
                  onChange={(e) =>
                    setGrupoForm((f) => ({
                      ...f,
                      min_selecciones: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. selecciones</Label>
                <Input
                  type="number"
                  value={grupoForm.max_selecciones}
                  onChange={(e) =>
                    setGrupoForm((f) => ({
                      ...f,
                      max_selecciones: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Obligatorio</Label>
              <Switch
                checked={grupoForm.obligatorio}
                onCheckedChange={(v) =>
                  setGrupoForm((f) => ({ ...f, obligatorio: v }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrupoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarGrupoFn} disabled={pending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog opción */}
      <Dialog open={opcionOpen} onOpenChange={setOpcionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {opcionEdit ? "Editar opción" : "Nueva opción"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={opcionForm.nombre}
                onChange={(e) =>
                  setOpcionForm((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="Fresa, Grande, Nata…"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio extra (€)</Label>
              <Input
                inputMode="decimal"
                value={opcionForm.precio_extra}
                onChange={(e) =>
                  setOpcionForm((f) => ({ ...f, precio_extra: e.target.value }))
                }
              />
            </div>
            {esGrupoTamano && (
              <div className="space-y-2">
                <Label>Nº de sabores que permite este tamaño</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="1"
                  value={opcionForm.max_sabores}
                  onChange={(e) =>
                    setOpcionForm((f) => ({
                      ...f,
                      max_sabores: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Los sabores van incluidos en el precio del tamaño.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Disponible</Label>
              <Switch
                checked={opcionForm.disponible}
                onCheckedChange={(v) =>
                  setOpcionForm((f) => ({ ...f, disponible: v }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpcionOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarOpcionFn} disabled={pending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
      {texto}
    </div>
  );
}
