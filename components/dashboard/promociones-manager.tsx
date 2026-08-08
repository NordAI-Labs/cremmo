"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Tag } from "lucide-react";
import {
  guardarPromocion,
  eliminarPromocion,
} from "@/app/(dashboard)/dashboard/promociones/actions";
import type { PromocionConItems } from "@/app/(dashboard)/dashboard/promociones/page";
import type {
  Categoria,
  Producto,
  TipoPromocion,
} from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatEuro } from "@/lib/utils";

interface SlotForm {
  nombre: string;
  categoria_id: string | null;
  /** Vacío = toda la categoría. */
  producto_ids: string[];
}

export function PromocionesManager({
  heladeriaId,
  promociones,
  productos,
  categorias,
}: {
  heladeriaId: string;
  promociones: PromocionConItems[];
  productos: Producto[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<PromocionConItems | null>(null);

  const prodNombre = useMemo(
    () => new Map(productos.map((p) => [p.id, p.nombre])),
    [productos]
  );
  const catNombre = useMemo(
    () => new Map(categorias.map((c) => [c.id, c.nombre])),
    [categorias]
  );

  const [form, setForm] = useState({
    tipo: "descuento" as TipoPromocion,
    nombre: "",
    descripcion: "",
    foto_url: null as string | null,
    precio_promocional: "",
    porcentaje_descuento: "",
    activa: true,
    items: [] as { producto_id: string; cantidad: number }[],
    slots: [] as SlotForm[],
  });

  function abrir(p?: PromocionConItems) {
    setEdit(p ?? null);
    setForm({
      tipo: p?.tipo ?? "descuento",
      nombre: p?.nombre ?? "",
      descripcion: p?.descripcion ?? "",
      foto_url: p?.foto_url ?? null,
      precio_promocional:
        p?.precio_promocional != null ? String(p.precio_promocional) : "",
      porcentaje_descuento:
        p?.porcentaje_descuento != null ? String(p.porcentaje_descuento) : "",
      activa: p?.activa ?? true,
      items:
        p?.promocion_items.map((it) => ({
          producto_id: it.producto_id,
          cantidad: it.cantidad,
        })) ?? [],
      slots:
        [...(p?.promocion_slots ?? [])]
          .sort((a, b) => a.orden - b.orden)
          .map((s) => ({
            nombre: s.nombre,
            categoria_id: s.categoria_id,
            producto_ids: (s.promocion_slot_productos ?? []).map(
              (sp) => sp.producto_id
            ),
          })) ?? [],
    });
    setOpen(true);
  }

  // --- Pasos del combo-asistente ------------------------------------------
  function addSlot() {
    setForm((f) => ({
      ...f,
      slots: [
        ...f.slots,
        { nombre: "", categoria_id: null, producto_ids: [] },
      ],
    }));
  }

  function updateSlot(index: number, cambios: Partial<SlotForm>) {
    setForm((f) => ({
      ...f,
      slots: f.slots.map((s, i) => (i === index ? { ...s, ...cambios } : s)),
    }));
  }

  function removeSlot(index: number) {
    setForm((f) => ({ ...f, slots: f.slots.filter((_, i) => i !== index) }));
  }

  function moveSlot(index: number, delta: number) {
    setForm((f) => {
      const destino = index + delta;
      if (destino < 0 || destino >= f.slots.length) return f;
      const slots = [...f.slots];
      [slots[index], slots[destino]] = [slots[destino], slots[index]];
      return { ...f, slots };
    });
  }

  function toggleProductoSlot(index: number, productoId: string) {
    setForm((f) => ({
      ...f,
      slots: f.slots.map((s, i) => {
        if (i !== index) return s;
        const ya = s.producto_ids.includes(productoId);
        return {
          ...s,
          producto_ids: ya
            ? s.producto_ids.filter((id) => id !== productoId)
            : [...s.producto_ids, productoId],
        };
      }),
    }));
  }

  function toggleProducto(id: string) {
    setForm((f) => {
      const existe = f.items.find((it) => it.producto_id === id);
      return {
        ...f,
        items: existe
          ? f.items.filter((it) => it.producto_id !== id)
          : [...f.items, { producto_id: id, cantidad: 1 }],
      };
    });
  }

  function setCantidad(id: string, cantidad: number) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it) =>
        it.producto_id === id ? { ...it, cantidad } : it
      ),
    }));
  }

  function guardar() {
    if (!form.nombre.trim()) return toast.error("Indica un nombre");

    const esAsistente = form.tipo === "combo_asistente";
    const conPrecio = form.tipo === "combo" || esAsistente;

    if (!esAsistente && form.items.length === 0)
      return toast.error("Selecciona al menos un producto");

    const precio = form.precio_promocional
      ? Number(form.precio_promocional.replace(",", "."))
      : null;
    const porcentaje = form.porcentaje_descuento
      ? Number(form.porcentaje_descuento.replace(",", "."))
      : null;

    if (conPrecio && (precio == null || Number.isNaN(precio)))
      return toast.error("Un combo necesita precio promocional");
    if (
      form.tipo === "descuento" &&
      (porcentaje == null || Number.isNaN(porcentaje))
    )
      return toast.error("Un descuento necesita porcentaje");

    if (esAsistente) {
      if (form.slots.length === 0)
        return toast.error("Añade al menos un paso al combo");
      for (const [i, s] of form.slots.entries()) {
        if (!s.nombre.trim())
          return toast.error(`Ponle nombre al paso ${i + 1}`);
        if (!s.categoria_id && s.producto_ids.length === 0)
          return toast.error(
            `Elige una categoría o productos en "${s.nombre.trim()}"`
          );
      }
    }

    start(async () => {
      const res = await guardarPromocion({
        id: edit?.id,
        tipo: form.tipo,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        foto_url: form.foto_url,
        precio_promocional: conPrecio ? precio : null,
        porcentaje_descuento: form.tipo === "descuento" ? porcentaje : null,
        activa: form.activa,
        items: esAsistente ? [] : form.items,
        slots: esAsistente
          ? form.slots.map((s) => ({
              nombre: s.nombre.trim(),
              categoria_id: s.categoria_id,
              producto_ids: s.producto_ids,
            }))
          : [],
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Promoción guardada");
        setOpen(false);
        router.refresh();
      }
    });
  }

  function borrar(id: string) {
    start(async () => {
      const res = await eliminarPromocion(id);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Promoción eliminada");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promociones</h1>
          <p className="text-sm text-muted-foreground">
            Descuentos y combos para tu carta.
          </p>
        </div>
        <Button onClick={() => abrir()}>
          <Plus className="h-4 w-4" /> Nueva promoción
        </Button>
      </div>

      {promociones.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          Aún no tienes promociones.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {promociones.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{p.nombre}</span>
                  </div>
                  <Badge variant={p.activa ? "success" : "secondary"}>
                    {p.activa ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <Badge variant="secondary">
                  {p.tipo === "descuento"
                    ? "Descuento"
                    : p.tipo === "combo"
                      ? "Combo"
                      : "Combo asistente"}
                </Badge>
                {p.tipo !== "descuento" && p.precio_promocional != null && (
                  <p className="font-bold text-primary">
                    {formatEuro(p.precio_promocional)}
                  </p>
                )}
                {p.tipo === "descuento" && p.porcentaje_descuento != null && (
                  <p className="font-bold text-primary">
                    -{p.porcentaje_descuento}%
                  </p>
                )}
                {p.descripcion && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {p.descripcion}
                  </p>
                )}
                <ul className="text-xs text-muted-foreground">
                  {p.tipo === "combo_asistente"
                    ? [...(p.promocion_slots ?? [])]
                        .sort((a, b) => a.orden - b.orden)
                        .map((s) => (
                          <li key={s.id}>
                            {s.nombre}:{" "}
                            {s.promocion_slot_productos?.length
                              ? `${s.promocion_slot_productos.length} producto(s)`
                              : (catNombre.get(s.categoria_id ?? "") ??
                                "categoría")}
                          </li>
                        ))
                    : p.promocion_items.map((it) => (
                        <li key={it.id}>
                          {it.cantidad}× {prodNombre.get(it.producto_id) ?? "—"}
                        </li>
                      ))}
                </ul>
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
                    onClick={() => borrar(p.id)}
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
              {edit ? "Editar promoción" : "Nueva promoción"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Imagen</Label>
              <ImageUpload
                normalizar
                heladeriaId={heladeriaId}
                value={form.foto_url}
                onChange={(url) => setForm((f) => ({ ...f, foto_url: url }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, tipo: v as TipoPromocion }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="descuento">Descuento (%)</SelectItem>
                  <SelectItem value="combo">
                    Combo (productos fijos, precio fijo)
                  </SelectItem>
                  <SelectItem value="combo_asistente">
                    Combo asistente (el cliente elige por pasos)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="Combo merienda, 2x1 helados…"
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

            {form.tipo !== "descuento" ? (
              <div className="space-y-2">
                <Label>Precio promocional (€)</Label>
                <Input
                  inputMode="decimal"
                  value={form.precio_promocional}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      precio_promocional: e.target.value,
                    }))
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Porcentaje de descuento (%)</Label>
                <Input
                  inputMode="decimal"
                  value={form.porcentaje_descuento}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      porcentaje_descuento: e.target.value,
                    }))
                  }
                />
              </div>
            )}

            {form.tipo === "combo_asistente" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pasos del combo</Label>
                  <Button size="sm" variant="outline" onClick={addSlot}>
                    <Plus className="h-4 w-4" /> Añadir paso
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  El cliente elegirá un producto en cada paso. Si un paso solo
                  tiene un producto disponible, se salta automáticamente.
                </p>
                {form.slots.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Añade un paso por cada cosa que el cliente elige (tortita,
                    café, bebida…).
                  </p>
                ) : (
                  <div className="space-y-3">
                    {form.slots.map((slot, i) => (
                      <SlotEditor
                        key={i}
                        indice={i}
                        total={form.slots.length}
                        slot={slot}
                        categorias={categorias}
                        productos={productos}
                        onChange={(cambios) => updateSlot(i, cambios)}
                        onToggleProducto={(id) => toggleProductoSlot(i, id)}
                        onMover={(delta) => moveSlot(i, delta)}
                        onEliminar={() => removeSlot(i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Productos incluidos</Label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {productos.length === 0 && (
                    <p className="p-2 text-sm text-muted-foreground">
                      Crea productos primero.
                    </p>
                  )}
                  {productos.map((p) => {
                    const item = form.items.find(
                      (it) => it.producto_id === p.id
                    );
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded px-1 py-1"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={!!item}
                            onCheckedChange={() => toggleProducto(p.id)}
                          />
                          {p.nombre}
                        </label>
                        {item && (
                          <Input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) =>
                              setCantidad(p.id, Number(e.target.value))
                            }
                            className="h-8 w-16"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Activa</Label>
              <Switch
                checked={form.activa}
                onCheckedChange={(v) => setForm((f) => ({ ...f, activa: v }))}
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

/** Un paso del combo: nombre + de dónde puede elegir el cliente. */
function SlotEditor({
  indice,
  total,
  slot,
  categorias,
  productos,
  onChange,
  onToggleProducto,
  onMover,
  onEliminar,
}: {
  indice: number;
  total: number;
  slot: SlotForm;
  categorias: Categoria[];
  productos: Producto[];
  onChange: (cambios: Partial<SlotForm>) => void;
  onToggleProducto: (productoId: string) => void;
  onMover: (delta: number) => void;
  onEliminar: () => void;
}) {
  // "Toda la categoría" mientras no se marque ningún producto concreto.
  const modo = slot.producto_ids.length > 0 ? "productos" : "categoria";
  const productosDeCategoria = slot.categoria_id
    ? productos.filter((p) => p.categoria_id === slot.categoria_id)
    : productos;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Paso {indice + 1}</Badge>
        <Input
          value={slot.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          placeholder="Elige tu tortita"
          className="h-8 flex-1"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={indice === 0}
          onClick={() => onMover(-1)}
          aria-label="Subir paso"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={indice === total - 1}
          onClick={() => onMover(1)}
          aria-label="Bajar paso"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onEliminar}
          aria-label="Eliminar paso"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Categoría</Label>
        <Select
          value={slot.categoria_id ?? ""}
          onValueChange={(v) =>
            onChange({ categoria_id: v || null, producto_ids: [] })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">
          Productos elegibles{" "}
          <span className="font-normal text-muted-foreground">
            {modo === "categoria"
              ? "(ninguno marcado = toda la categoría)"
              : `(${slot.producto_ids.length} marcados)`}
          </span>
        </Label>
        <div className="max-h-36 space-y-1 overflow-y-auto rounded border p-2">
          {productosDeCategoria.length === 0 ? (
            <p className="p-1 text-xs text-muted-foreground">
              No hay productos en esta categoría.
            </p>
          ) : (
            productosDeCategoria.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 rounded px-1 py-0.5 text-sm"
              >
                <Checkbox
                  checked={slot.producto_ids.includes(p.id)}
                  onCheckedChange={() => onToggleProducto(p.id)}
                />
                {p.nombre}
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
