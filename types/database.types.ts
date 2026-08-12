/**
 * Tipos de la base de datos de Supabase.
 *
 * En un proyecto real, regenera este archivo con:
 *   npx supabase gen types typescript --project-id <REF> --schema public > types/database.types.ts
 *
 * Aquí se mantiene una versión escrita a mano que refleja las migraciones de
 * /supabase/migrations para tener tipado end-to-end desde el primer momento.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// 'basico' y 'multi_sede' son los valores heredados del esquema inicial: se
// mantienen porque Postgres no permite borrar valores de un enum. 'basic' es
// el plan de entrada actual (0015/0016_plan_basic.sql) y NO es lo mismo que
// 'basico': ese es el heredado, este es el nuevo plan de pago.
export type PlanHeladeria = "pro" | "business" | "basic" | "basico" | "multi_sede";
export type RolPerfil = "owner" | "staff";
export type TipoCategoria = "simple" | "asistente";
export type TipoGrupoOpcion = "unica" | "multiple";
export type RolGrupo =
  | "formato"
  | "tamano"
  | "sabores"
  | "toppings"
  | "generico";
export type TipoPromocion = "descuento" | "combo" | "combo_asistente";
export type EstadoPedido =
  | "pendiente"
  | "en_preparacion"
  | "listo"
  | "entregado"
  | "cancelado";
export type EstadoPago = "no_requerido" | "pendiente" | "pagado" | "fallido";
/** Estado de la suscripción cacheado desde Stripe (columna de texto, no enum). */
export type EstadoSuscripcionBD =
  | "pendiente"
  | "activa"
  | "impago"
  | "cancelada";

export interface Database {
  public: {
    Tables: {
      heladerias: {
        Row: {
          id: string;
          nombre: string;
          slug: string;
          logo_url: string | null;
          direccion: string | null;
          telefono: string | null;
          plan: PlanHeladeria;
          acepta_pagos_online: boolean;
          stripe_account_id: string | null;
          activa: boolean;
          /** Fin del periodo pagado tras cancelar; null = suscripción vigente. */
          cancelada_en: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          suscripcion_estado: EstadoSuscripcionBD;
          /** Fin del periodo facturado en curso, según Stripe. */
          periodo_fin: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          slug: string;
          logo_url?: string | null;
          direccion?: string | null;
          telefono?: string | null;
          plan?: PlanHeladeria;
          acepta_pagos_online?: boolean;
          stripe_account_id?: string | null;
          activa?: boolean;
          cancelada_en?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          suscripcion_estado?: EstadoSuscripcionBD;
          periodo_fin?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["heladerias"]["Insert"]>;
        Relationships: [];
      };
      perfiles: {
        Row: {
          id: string;
          heladeria_id: string;
          nombre: string | null;
          rol: RolPerfil;
          created_at: string;
        };
        Insert: {
          id: string;
          heladeria_id: string;
          nombre?: string | null;
          rol?: RolPerfil;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["perfiles"]["Insert"]>;
        Relationships: [];
      };
      mesas: {
        Row: {
          id: string;
          heladeria_id: string;
          nombre: string;
          token: string;
          activa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          heladeria_id: string;
          nombre: string;
          token: string;
          activa?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mesas"]["Insert"]>;
        Relationships: [];
      };
      categorias: {
        Row: {
          id: string;
          heladeria_id: string;
          nombre: string;
          tipo: TipoCategoria;
          asistente_icono: string | null;
          asistente_titulo: string | null;
          asistente_descripcion: string | null;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          heladeria_id: string;
          nombre: string;
          tipo?: TipoCategoria;
          asistente_icono?: string | null;
          asistente_titulo?: string | null;
          asistente_descripcion?: string | null;
          orden?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categorias"]["Insert"]>;
        Relationships: [];
      };
      productos: {
        Row: {
          id: string;
          heladeria_id: string;
          categoria_id: string | null;
          nombre: string;
          descripcion: string | null;
          precio: number;
          foto_url: string | null;
          disponible: boolean;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          heladeria_id: string;
          categoria_id?: string | null;
          nombre: string;
          descripcion?: string | null;
          precio?: number;
          foto_url?: string | null;
          disponible?: boolean;
          orden?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["productos"]["Insert"]>;
        Relationships: [];
      };
      grupos_opciones: {
        Row: {
          id: string;
          heladeria_id: string;
          producto_id: string | null;
          categoria_id: string | null;
          nombre: string;
          tipo: TipoGrupoOpcion;
          rol: RolGrupo;
          min_selecciones: number;
          max_selecciones: number;
          obligatorio: boolean;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          heladeria_id: string;
          producto_id?: string | null;
          categoria_id?: string | null;
          nombre: string;
          tipo?: TipoGrupoOpcion;
          rol?: RolGrupo;
          min_selecciones?: number;
          max_selecciones?: number;
          obligatorio?: boolean;
          orden?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["grupos_opciones"]["Insert"]
        >;
        Relationships: [];
      };
      opciones: {
        Row: {
          id: string;
          grupo_id: string;
          nombre: string;
          precio_extra: number;
          max_sabores: number | null;
          disponible: boolean;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          grupo_id: string;
          nombre: string;
          precio_extra?: number;
          max_sabores?: number | null;
          disponible?: boolean;
          orden?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["opciones"]["Insert"]>;
        Relationships: [];
      };
      promociones: {
        Row: {
          id: string;
          heladeria_id: string;
          tipo: TipoPromocion;
          nombre: string;
          descripcion: string | null;
          foto_url: string | null;
          precio_promocional: number | null;
          porcentaje_descuento: number | null;
          activa: boolean;
          fecha_inicio: string | null;
          fecha_fin: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          heladeria_id: string;
          tipo?: TipoPromocion;
          nombre: string;
          descripcion?: string | null;
          foto_url?: string | null;
          precio_promocional?: number | null;
          porcentaje_descuento?: number | null;
          activa?: boolean;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["promociones"]["Insert"]>;
        Relationships: [];
      };
      promocion_items: {
        Row: {
          id: string;
          promocion_id: string;
          producto_id: string;
          cantidad: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          promocion_id: string;
          producto_id: string;
          cantidad?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["promocion_items"]["Insert"]
        >;
        Relationships: [];
      };
      promocion_slots: {
        Row: {
          id: string;
          promocion_id: string;
          nombre: string;
          categoria_id: string | null;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          promocion_id: string;
          nombre: string;
          categoria_id?: string | null;
          orden?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["promocion_slots"]["Insert"]
        >;
        Relationships: [];
      };
      promocion_slot_productos: {
        Row: {
          id: string;
          slot_id: string;
          producto_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slot_id: string;
          producto_id: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["promocion_slot_productos"]["Insert"]
        >;
        Relationships: [];
      };
      pedidos: {
        Row: {
          id: string;
          heladeria_id: string;
          mesa_id: string | null;
          estado: EstadoPedido;
          estado_pago: EstadoPago;
          total: number;
          notas: string | null;
          stripe_payment_intent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          heladeria_id: string;
          mesa_id?: string | null;
          estado?: EstadoPedido;
          estado_pago?: EstadoPago;
          total?: number;
          notas?: string | null;
          stripe_payment_intent_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pedidos"]["Insert"]>;
        Relationships: [];
      };
      pedido_items: {
        Row: {
          id: string;
          pedido_id: string;
          producto_id: string | null;
          nombre_producto: string;
          cantidad: number;
          precio_unitario: number;
          personalizaciones: Json;
          subtotal: number;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pedido_id: string;
          producto_id?: string | null;
          nombre_producto: string;
          cantidad?: number;
          precio_unitario?: number;
          personalizaciones?: Json;
          subtotal?: number;
          notas?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pedido_items"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      heladeria_actual: {
        Args: Record<string, never>;
        Returns: string;
      };
      onboarding_crear_heladeria: {
        Args: {
          p_nombre: string;
          p_slug: string;
          p_nombre_usuario?: string | null;
          p_plan?: PlanHeladeria;
        };
        Returns: string;
      };
      usuario_id_por_email: {
        Args: { p_email: string };
        Returns: string | null;
      };
      estadisticas_resumen: {
        Args: {
          p_desde?: string | null;
          p_hasta?: string | null;
        };
        Returns: {
          total_pedidos: number;
          facturacion: number;
          unidades: number;
        }[];
      };
      estadisticas_por_dia: {
        Args: {
          p_desde: string;
          p_hasta: string;
          p_zona?: string;
        };
        Returns: {
          dia: string;
          total_pedidos: number;
          facturacion: number;
        }[];
      };
      estadisticas_top_productos: {
        Args: {
          p_desde?: string | null;
          p_hasta?: string | null;
          p_limite?: number;
        };
        Returns: {
          nombre: string;
          unidades: number;
          facturacion: number;
        }[];
      };
    };
    Enums: {
      plan_heladeria: PlanHeladeria;
      rol_perfil: RolPerfil;
      tipo_categoria: TipoCategoria;
      tipo_grupo_opcion: TipoGrupoOpcion;
      rol_grupo: RolGrupo;
      tipo_promocion: TipoPromocion;
      estado_pedido: EstadoPedido;
      estado_pago: EstadoPago;
    };
  };
}

// Alias de conveniencia -------------------------------------------------------
type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Heladeria = Tables<"heladerias">;
export type Perfil = Tables<"perfiles">;
export type Mesa = Tables<"mesas">;
export type Categoria = Tables<"categorias">;
export type Producto = Tables<"productos">;
export type GrupoOpcion = Tables<"grupos_opciones">;
export type Opcion = Tables<"opciones">;
export type Promocion = Tables<"promociones">;
export type PromocionItem = Tables<"promocion_items">;
export type PromocionSlot = Tables<"promocion_slots">;
export type PromocionSlotProducto = Tables<"promocion_slot_productos">;
export type Pedido = Tables<"pedidos">;
export type PedidoItem = Tables<"pedido_items">;
