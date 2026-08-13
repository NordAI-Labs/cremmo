"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IceCream, ShoppingBag, Sparkles, Tag } from "lucide-react";
import {
  DESCRIPCION_ASISTENTE_POR_DEFECTO,
  IconoAsistente,
  TITULO_ASISTENTE_POR_DEFECTO,
} from "@/components/iconos-asistente";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatEuro } from "@/lib/utils";
import { nuevaLineaId, useCart } from "@/store/cart";
import {
  ProductWizard,
  configDesdeProducto,
  configDesdeCategoria,
  type WizardConfig,
} from "@/components/publico/product-wizard";
import { ComboWizard } from "@/components/publico/combo-wizard";
import { CartSheet } from "@/components/publico/cart-sheet";
import {
  AsistenteIA,
  type AccionSugerencia,
  type SugerenciaAsistente,
} from "@/components/publico/asistente-ia";
import type { Categoria } from "@/types/database.types";
import type {
  CategoriaConOpciones,
  ProductoConOpciones,
  PromocionConItems,
  PromocionConSlots,
} from "@/types";

interface HeladeriaPublica {
  nombre: string;
  slug: string;
  logo_url: string | null;
  direccion: string | null;
}

type Seccion =
  | { kind: "productos"; id: string; nombre: string; items: ProductoConOpciones[] }
  | {
      kind: "asistente";
      id: string;
      nombre: string;
      categoria: CategoriaConOpciones;
      /** Productos sueltos de la categoría, que se listan bajo el asistente. */
      items: ProductoConOpciones[];
    };

export function CatalogoPublico({
  heladeria,
  mesaNombre,
  mesaToken,
  mesaSesionExpiraEn,
  categorias,
  productos,
  categoriasAsistente,
  promociones,
  combos,
  asistenteIA,
}: {
  heladeria: HeladeriaPublica;
  mesaNombre: string | null;
  mesaToken: string | null;
  /** Epoch en ms en el que caduca la sesión de mesa, o null si no aplica. */
  mesaSesionExpiraEn: number | null;
  categorias: Categoria[];
  productos: ProductoConOpciones[];
  categoriasAsistente: CategoriaConOpciones[];
  promociones: PromocionConItems[];
  combos: PromocionConSlots[];
  /** El plan incluye el Asistente IA y está configurado. */
  asistenteIA: boolean;
}) {
  const router = useRouter();
  const setSlug = useCart((s) => s.setSlug);
  const clearCart = useCart((s) => s.clear);
  const addItem = useCart((s) => s.addItem);
  const items = useCart((s) => s.items);
  const count = useCart((s) => s.count());
  const total = useCart((s) => s.total());
  // true solo en cliente (evita mismatch de hidratación con el carrito persistido).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [config, setConfig] = useState<WizardConfig | null>(null);
  const [combo, setCombo] = useState<PromocionConSlots | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const hayPromos = promociones.length > 0 || combos.length > 0;

  useEffect(() => {
    setSlug(heladeria.slug);
  }, [heladeria.slug, setSlug]);

  // Si la sesión de mesa tiene fecha de caducidad, se programa su cierre
  // automático: aunque la pestaña se quede abierta sin que nadie interactúe
  // con el servidor, al llegar la hora se vacía el carrito y se vuelve a
  // pedir la página, que entonces enseña la pantalla de "sesión caducada".
  useEffect(() => {
    if (!mesaSesionExpiraEn) return;
    const ms = mesaSesionExpiraEn - Date.now();
    const cerrar = () => {
      clearCart();
      router.refresh();
    };
    if (ms <= 0) {
      cerrar();
      return;
    }
    const id = setTimeout(cerrar, ms);
    return () => clearTimeout(id);
  }, [mesaSesionExpiraEn, clearCart, router]);

  // Construye las secciones de la carta respetando el orden de categorías.
  // Una categoría de tipo 'asistente' encabeza su sección con el acceso al
  // asistente y, debajo, lista sus productos sueltos como cualquier otra.
  const grupos = useMemo<Seccion[]>(() => {
    const asistenteMap = new Map(categoriasAsistente.map((c) => [c.id, c]));
    const porCat = new Map<string, ProductoConOpciones[]>();
    const sinCat: ProductoConOpciones[] = [];
    for (const p of productos) {
      if (p.categoria_id) {
        const arr = porCat.get(p.categoria_id) ?? [];
        arr.push(p);
        porCat.set(p.categoria_id, arr);
      } else {
        sinCat.push(p);
      }
    }

    const secciones: Seccion[] = [];
    for (const c of categorias) {
      const asistente = asistenteMap.get(c.id);
      const items = porCat.get(c.id) ?? [];
      if (asistente && asistente.grupos_opciones.length > 0) {
        secciones.push({
          kind: "asistente",
          id: c.id,
          nombre: c.nombre,
          categoria: asistente,
          items,
        });
      } else if (items.length > 0) {
        secciones.push({ kind: "productos", id: c.id, nombre: c.nombre, items });
      }
    }
    if (sinCat.length > 0) {
      secciones.push({
        kind: "productos",
        id: "otros",
        nombre: "Otros",
        items: sinCat,
      });
    }
    return secciones;
  }, [productos, categorias, categoriasAsistente]);

  function abrirProducto(p: ProductoConOpciones) {
    setConfig(configDesdeProducto(p));
  }

  function abrirAsistente(c: CategoriaConOpciones) {
    setConfig(configDesdeCategoria(c));
  }

  // El chat solo devuelve tipo + id: la carta es la que sabe si eso se añade de
  // un toque o hay que configurarlo, y cuánto cuesta.
  function resolverSugerencia(s: SugerenciaAsistente): AccionSugerencia | null {
    if (s.tipo === "producto") {
      const p = productos.find((x) => x.id === s.id);
      if (!p) return null;
      return {
        etiqueta: p.grupos_opciones.length > 0 ? "Elegir" : "Añadir",
        precio: Number(p.precio),
      };
    }
    if (s.tipo === "categoria") {
      const c = categoriasAsistente.find((x) => x.id === s.id);
      return c ? { etiqueta: "Elegir" } : null;
    }
    const k = combos.find((x) => x.id === s.id);
    return k ? { etiqueta: "Elegir", precio: k.precio_promocional } : null;
  }

  function elegirSugerencia(s: SugerenciaAsistente) {
    if (s.tipo === "categoria") {
      const c = categoriasAsistente.find((x) => x.id === s.id);
      if (!c) return;
      setChatOpen(false);
      abrirAsistente(c);
      return;
    }
    if (s.tipo === "combo") {
      const k = combos.find((x) => x.id === s.id);
      if (!k) return;
      setChatOpen(false);
      setCombo(k);
      return;
    }

    const p = productos.find((x) => x.id === s.id);
    if (!p) return;
    if (p.grupos_opciones.length > 0) {
      setChatOpen(false);
      abrirProducto(p);
      return;
    }

    // Producto sin opciones: entra directo y el chat sigue abierto, que es
    // donde el cliente está eligiendo.
    addItem({
      lineId: nuevaLineaId(),
      producto_id: p.id,
      nombre: p.nombre,
      precio_base: Number(p.precio),
      cantidad: 1,
      foto_url: p.foto_url,
      personalizaciones: [],
      precio_unitario: Number(p.precio),
    });
    toast.success(`${p.nombre} añadido al carrito`);
  }

  return (
    <div className="flex-1 pb-24">
      {/* Cabecera */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <div className="flex items-center gap-3">
            {heladeria.logo_url ? (
              <div className="relative h-14 w-32 shrink-0 sm:w-40">
                <Image
                  src={heladeria.logo_url}
                  alt={heladeria.nombre}
                  fill
                  className="object-contain object-left"
                  sizes="(max-width:640px) 128px, 160px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border bg-muted">
                <IceCream className="h-7 w-7 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              {/* Con logo el nombre ya se lee en la imagen: se mantiene el h1
                  solo para lectores de pantalla y buscadores. */}
              <h1
                className={
                  heladeria.logo_url ? "sr-only" : "truncate text-xl font-bold"
                }
              >
                {heladeria.nombre}
              </h1>
              {heladeria.direccion && (
                <p className="text-sm text-muted-foreground">
                  {heladeria.direccion}
                </p>
              )}
            </div>
          </div>
          {mesaNombre && (
            <Badge className="mt-3" variant="secondary">
              {mesaNombre}
            </Badge>
          )}
        </div>

        {/* Navegación por categorías */}
        {grupos.length > 0 && (
          <nav className="sticky top-0 z-20 overflow-x-auto border-t bg-card/95 backdrop-blur">
            <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3">
              {hayPromos && (
                <a
                  href="#promociones"
                  className="whitespace-nowrap rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground"
                >
                  Promos
                </a>
              )}
              {grupos.map((g) => (
                <a
                  key={g.id}
                  href={`#cat-${g.id}`}
                  className="whitespace-nowrap rounded-full border px-3 py-1 text-sm hover:bg-accent"
                >
                  {g.nombre}
                </a>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
        {/* Promociones */}
        {hayPromos && (
          <section id="promociones" className="space-y-3 scroll-mt-16">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Tag className="h-5 w-5 text-primary" /> Promociones
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {combos.map((combo) => (
                <TarjetaCombo
                  key={combo.id}
                  combo={combo}
                  onClick={() => setCombo(combo)}
                />
              ))}
              {promociones.map((promo) => (
                <Card key={promo.id} className="overflow-hidden">
                  {promo.foto_url && (
                    <div className="relative h-32 w-full bg-white">
                      <Image
                        src={promo.foto_url}
                        alt={promo.nombre}
                        fill
                        className="object-cover"
                        sizes="(max-width:640px) 100vw, 50vw"
                        unoptimized
                      />
                    </div>
                  )}
                  <CardContent className="pt-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{promo.nombre}</span>
                      {promo.tipo === "combo" &&
                        promo.precio_promocional != null && (
                          <Badge>{formatEuro(promo.precio_promocional)}</Badge>
                        )}
                      {promo.tipo === "descuento" &&
                        promo.porcentaje_descuento != null && (
                          <Badge>-{promo.porcentaje_descuento}%</Badge>
                        )}
                    </div>
                    {promo.descripcion && (
                      <p className="text-sm text-muted-foreground">
                        {promo.descripcion}
                      </p>
                    )}
                    <ul className="text-xs text-muted-foreground">
                      {promo.promocion_items.map((it) => (
                        <li key={it.id}>
                          {it.cantidad}× {it.producto?.nombre ?? "—"}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Catálogo */}
        {grupos.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            Esta heladería aún no tiene productos disponibles.
          </div>
        ) : (
          grupos.map((g) => (
            <section
              key={g.id}
              id={`cat-${g.id}`}
              className="space-y-3 scroll-mt-16"
            >
              <h2 className="text-lg font-bold">{g.nombre}</h2>
              {g.kind === "asistente" && (
                <TarjetaAsistente
                  categoria={g.categoria}
                  onClick={() => abrirAsistente(g.categoria)}
                />
              )}
              {g.items.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {g.items.map((p) => (
                    <TarjetaProducto
                      key={p.id}
                      producto={p}
                      onClick={() => abrirProducto(p)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-6 text-center text-xs text-muted-foreground">
        <Link href="/privacidad" className="hover:text-foreground">
          Privacidad
        </Link>
        {" · "}
        <Link href="/cookies" className="hover:text-foreground">
          Cookies
        </Link>
      </footer>

      {/* Asistente IA: se apoya sobre la barra del carrito cuando hay pedido */}
      {asistenteIA && (
        <>
          <Button
            size="lg"
            className={cn(
              "fixed right-4 z-30 rounded-full shadow-lg transition-all",
              mounted && count > 0 ? "bottom-24" : "bottom-6"
            )}
            onClick={() => setChatOpen(true)}
          >
            <Sparkles className="h-5 w-5" />
            Te ayudo a elegir
          </Button>
          <AsistenteIA
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            slug={heladeria.slug}
            carrito={items.map((i) => ({
              nombre: i.nombre,
              cantidad: i.cantidad,
            }))}
            resolver={resolverSugerencia}
            onElegir={elegirSugerencia}
          />
        </>
      )}

      {/* Botón flotante del carrito */}
      {mounted && count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card p-4">
          <div className="mx-auto max-w-3xl">
            <Button
              size="lg"
              className="w-full justify-between"
              onClick={() => setCartOpen(true)}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Ver pedido ({count})
              </span>
              <span>{formatEuro(total)}</span>
            </Button>
          </div>
        </div>
      )}

      <ProductWizard
        config={config}
        open={!!config}
        onClose={() => setConfig(null)}
      />

      <ComboWizard
        promocion={combo}
        open={!!combo}
        onClose={() => setCombo(null)}
      />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        slug={heladeria.slug}
        mesaToken={mesaToken}
      />
    </div>
  );
}

/** Producto del catálogo: abre su personalización o se añade tal cual. */
function TarjetaProducto({
  producto,
  onClick,
}: {
  producto: ProductoConOpciones;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors hover:bg-accent/40"
    >
      {producto.foto_url && (
        // Las fotos nuevas ya llegan cuadradas y llenan la caja; las antiguas,
        // con otra proporción, se ven enteras gracias a object-contain.
        <div className="relative aspect-square w-full bg-white">
          <Image
            src={producto.foto_url}
            alt={producto.nombre}
            fill
            className="object-contain"
            sizes="(max-width:768px) 50vw, 360px"
            unoptimized
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="font-semibold leading-tight">{producto.nombre}</span>
        {producto.descripcion && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {producto.descripcion}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
          <span className="font-bold text-primary">
            {formatEuro(producto.precio)}
          </span>
          {producto.grupos_opciones.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              Personalizable
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

/** Combo por pasos: el cliente elige un producto en cada paso, a precio fijo. */
function TarjetaCombo({
  combo,
  onClick,
}: {
  combo: PromocionConSlots;
  onClick: () => void;
}) {
  const pasos = [...combo.slots].sort((a, b) => a.orden - b.orden);
  return (
    <button
      onClick={onClick}
      className="overflow-hidden rounded-xl border-2 border-primary/30 bg-primary/5 text-left transition-colors hover:bg-primary/10"
    >
      {combo.foto_url && (
        <div className="relative h-32 w-full bg-white">
          <Image
            src={combo.foto_url}
            alt={combo.nombre}
            fill
            className="object-cover"
            sizes="(max-width:640px) 100vw, 50vw"
            unoptimized
          />
        </div>
      )}
      <div className="space-y-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{combo.nombre}</span>
          {combo.precio_promocional != null && (
            <Badge>{formatEuro(combo.precio_promocional)}</Badge>
          )}
        </div>
        {combo.descripcion && (
          <p className="text-sm text-muted-foreground">{combo.descripcion}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {pasos.map((s) => s.nombre).join(" · ")}
        </p>
        <span className="mt-1 inline-block text-sm font-medium text-primary">
          Elegir y añadir →
        </span>
      </div>
    </button>
  );
}

/** Acceso al asistente de una categoría (helados, gofres, crepes…). */
function TarjetaAsistente({
  categoria,
  onClick,
}: {
  categoria: CategoriaConOpciones;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-left transition-colors hover:bg-primary/10"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <IconoAsistente
          id={categoria.asistente_icono}
          className="h-8 w-8 text-primary"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">
          {categoria.asistente_titulo?.trim() || TITULO_ASISTENTE_POR_DEFECTO}
        </div>
        <p className="text-sm text-muted-foreground">
          {categoria.asistente_descripcion?.trim() ||
            DESCRIPCION_ASISTENTE_POR_DEFECTO}
        </p>
      </div>
      <Badge>Empezar</Badge>
    </button>
  );
}
