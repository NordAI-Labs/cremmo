"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartState {
  slug: string | null;
  items: CartItem[];
  /** Fija la heladería activa; si cambia, vacía el carrito (evita mezclar cartas). */
  setSlug: (slug: string) => void;
  addItem: (item: CartItem) => void;
  removeLine: (lineId: string) => void;
  updateCantidad: (lineId: string, cantidad: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      slug: null,
      items: [],

      setSlug: (slug) => {
        if (get().slug !== slug) {
          set({ slug, items: [] });
        }
      },

      addItem: (item) =>
        set((state) => ({ items: [...state.items, item] })),

      removeLine: (lineId) =>
        set((state) => ({
          items: state.items.filter((i) => i.lineId !== lineId),
        })),

      updateCantidad: (lineId, cantidad) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.lineId === lineId
                ? { ...i, cantidad: Math.max(0, cantidad) }
                : i
            )
            .filter((i) => i.cantidad > 0),
        })),

      clear: () => set({ items: [] }),

      total: () =>
        get().items.reduce(
          (sum, i) => sum + i.precio_unitario * i.cantidad,
          0
        ),

      count: () => get().items.reduce((sum, i) => sum + i.cantidad, 0),
    }),
    { name: "heladeria-cart" }
  )
);
