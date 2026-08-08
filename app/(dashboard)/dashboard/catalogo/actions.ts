"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionData } from "@/lib/auth/session";
import type {
  TipoGrupoOpcion,
  RolGrupo,
  TipoCategoria,
} from "@/types/database.types";

type Result = { error?: string };

async function heladeriaId(): Promise<string | null> {
  const s = await getSessionData();
  return s?.heladeria?.id ?? null;
}

function ok() {
  revalidatePath("/dashboard/catalogo");
  return {};
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------
export async function guardarCategoria(input: {
  id?: string;
  nombre: string;
  tipo: TipoCategoria;
  orden: number;
  asistente_icono?: string | null;
  asistente_titulo?: string | null;
  asistente_descripcion?: string | null;
}): Promise<Result> {
  const hid = await heladeriaId();
  if (!hid) return { error: "Sesión no válida" };
  const supabase = await createClient();

  // La presentación de la tarjeta solo aplica a categorías con asistente.
  const esAsistente = input.tipo === "asistente";
  const limpiar = (v: string | null | undefined) => {
    if (!esAsistente) return null;
    const texto = v?.trim();
    return texto ? texto : null;
  };
  const presentacion = {
    asistente_icono: limpiar(input.asistente_icono),
    asistente_titulo: limpiar(input.asistente_titulo),
    asistente_descripcion: limpiar(input.asistente_descripcion),
  };

  if (input.id) {
    const { error } = await supabase
      .from("categorias")
      .update({
        nombre: input.nombre,
        tipo: input.tipo,
        orden: input.orden,
        ...presentacion,
      })
      .eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("categorias").insert({
      heladeria_id: hid,
      nombre: input.nombre,
      tipo: input.tipo,
      orden: input.orden,
      ...presentacion,
    });
    if (error) return { error: error.message };
  }
  return ok();
}

export async function eliminarCategoria(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) return { error: error.message };
  return ok();
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------
export async function guardarProducto(input: {
  id?: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria_id: string | null;
  foto_url: string | null;
  disponible: boolean;
  orden: number;
}): Promise<Result> {
  const hid = await heladeriaId();
  if (!hid) return { error: "Sesión no válida" };
  const supabase = await createClient();

  const payload = {
    nombre: input.nombre,
    descripcion: input.descripcion,
    precio: input.precio,
    categoria_id: input.categoria_id,
    foto_url: input.foto_url,
    disponible: input.disponible,
    orden: input.orden,
  };

  if (input.id) {
    const { error } = await supabase
      .from("productos")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("productos")
      .insert({ ...payload, heladeria_id: hid });
    if (error) return { error: error.message };
  }
  return ok();
}

export async function eliminarProducto(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) return { error: error.message };
  return ok();
}

// ---------------------------------------------------------------------------
// Grupos de opciones
// ---------------------------------------------------------------------------
export async function guardarGrupo(input: {
  id?: string;
  producto_id?: string | null;
  categoria_id?: string | null;
  nombre: string;
  tipo: TipoGrupoOpcion;
  rol: RolGrupo;
  min_selecciones: number;
  max_selecciones: number;
  obligatorio: boolean;
  orden: number;
}): Promise<Result> {
  const hid = await heladeriaId();
  if (!hid) return { error: "Sesión no válida" };
  const supabase = await createClient();

  const payload = {
    producto_id: input.producto_id ?? null,
    categoria_id: input.categoria_id ?? null,
    nombre: input.nombre,
    tipo: input.tipo,
    rol: input.rol,
    min_selecciones: input.min_selecciones,
    max_selecciones: input.max_selecciones,
    obligatorio: input.obligatorio,
    orden: input.orden,
  };

  if (input.id) {
    const { error } = await supabase
      .from("grupos_opciones")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("grupos_opciones")
      .insert({ ...payload, heladeria_id: hid });
    if (error) return { error: error.message };
  }
  return ok();
}

export async function eliminarGrupo(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("grupos_opciones")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  return ok();
}

// ---------------------------------------------------------------------------
// Opciones
// ---------------------------------------------------------------------------
export async function guardarOpcion(input: {
  id?: string;
  grupo_id: string;
  nombre: string;
  precio_extra: number;
  max_sabores?: number | null;
  disponible: boolean;
  orden: number;
}): Promise<Result> {
  const supabase = await createClient();
  const payload = {
    grupo_id: input.grupo_id,
    nombre: input.nombre,
    precio_extra: input.precio_extra,
    max_sabores: input.max_sabores ?? null,
    disponible: input.disponible,
    orden: input.orden,
  };

  if (input.id) {
    const { error } = await supabase
      .from("opciones")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("opciones").insert(payload);
    if (error) return { error: error.message };
  }
  return ok();
}

export async function eliminarOpcion(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("opciones").delete().eq("id", id);
  if (error) return { error: error.message };
  return ok();
}

// ---------------------------------------------------------------------------
// Preset: configurar el asistente de helado (grupos Formato → Tamaño →
// Sabores → Toppings con roles). Funciona a nivel de producto o de categoría.
// ---------------------------------------------------------------------------
async function crearGruposHelado(
  owner: { producto_id?: string; categoria_id?: string }
): Promise<Result> {
  const hid = await heladeriaId();
  if (!hid) return { error: "Sesión no válida" };
  const supabase = await createClient();

  const base = {
    heladeria_id: hid,
    producto_id: owner.producto_id ?? null,
    categoria_id: owner.categoria_id ?? null,
  };

  const { data: grupos, error: gErr } = await supabase
    .from("grupos_opciones")
    .insert([
      { ...base, nombre: "Formato", tipo: "unica" as TipoGrupoOpcion, rol: "formato" as RolGrupo, min_selecciones: 1, max_selecciones: 1, obligatorio: true, orden: 0 },
      { ...base, nombre: "Tamaño", tipo: "unica" as TipoGrupoOpcion, rol: "tamano" as RolGrupo, min_selecciones: 1, max_selecciones: 1, obligatorio: true, orden: 1 },
      { ...base, nombre: "Sabores", tipo: "multiple" as TipoGrupoOpcion, rol: "sabores" as RolGrupo, min_selecciones: 1, max_selecciones: 2, obligatorio: true, orden: 2 },
      { ...base, nombre: "Toppings", tipo: "multiple" as TipoGrupoOpcion, rol: "toppings" as RolGrupo, min_selecciones: 0, max_selecciones: 5, obligatorio: false, orden: 3 },
    ])
    .select("id, rol");

  if (gErr) return { error: gErr.message };

  const formato = grupos?.find((g) => g.rol === "formato");
  const tamano = grupos?.find((g) => g.rol === "tamano");
  const opcionesIniciales = [
    ...(formato
      ? [
          { grupo_id: formato.id, nombre: "Cucurucho", precio_extra: 0, orden: 0 },
          { grupo_id: formato.id, nombre: "Tarrina", precio_extra: 0, orden: 1 },
          { grupo_id: formato.id, nombre: "Copa", precio_extra: 0, orden: 2 },
        ]
      : []),
    ...(tamano
      ? [
          { grupo_id: tamano.id, nombre: "Pequeño", precio_extra: 2.5, max_sabores: 1, orden: 0 },
          { grupo_id: tamano.id, nombre: "Grande", precio_extra: 3.5, max_sabores: 2, orden: 1 },
        ]
      : []),
  ];

  if (opcionesIniciales.length) {
    const { error: oErr } = await supabase
      .from("opciones")
      .insert(opcionesIniciales);
    if (oErr) return { error: oErr.message };
  }

  return ok();
}

/** Configura un PRODUCTO como helado (asistente por producto). */
export async function configurarHelado(productoId: string): Promise<Result> {
  return crearGruposHelado({ producto_id: productoId });
}

/** Configura una CATEGORÍA como helado (asistente por categoría). */
export async function configurarHeladoCategoria(
  categoriaId: string
): Promise<Result> {
  return crearGruposHelado({ categoria_id: categoriaId });
}
