/* ═══════════════════════════════════════════════════════════
   CART STORE — Zustand + persist + API sync
   
   Hybrid strategy:
   - Local Zustand for instant UI response
   - API sync in background for server persistence
   - On login: fetch server cart → merge with local
   
   Usage:
     const { items, addItem, removeItem, total } = useCartStore();
   ═══════════════════════════════════════════════════════════ */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiFetchStandalone } from "@/src/hooks/use-api-auth";

export interface CartItem {
  /** Server-side cart item ID (set after API sync) */
  serverItemId?: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color: string;
  colorHex: string;
  quantity: number;
  category: string;
  subcategory: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isSyncing: boolean;

  /* Actions */
  addItem: (item: Omit<CartItem, "quantity" | "serverItemId">, quantity?: number) => void;
  removeItem: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  toggleDrawer: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;

  /* API sync */
  syncAddToApi: (productId: string, size: string, color: string, quantity: number) => Promise<void>;
  syncRemoveFromApi: (serverItemId: string) => Promise<void>;
  syncUpdateQuantityApi: (serverItemId: string, quantity: number) => Promise<void>;
  fetchCartFromApi: () => Promise<void>;
  clearCartApi: () => Promise<void>;

  /* Computed (as getters via selectors) */
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isSyncing: false,

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find(
            (i) =>
              i.productId === item.productId &&
              i.size === item.size &&
              i.color === item.color
          );

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId &&
                i.size === item.size &&
                i.color === item.color
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }

          return {
            items: [...state.items, { ...item, quantity }],
          };
        });
      },

      removeItem: (productId, size, color) => {
        set((state) => ({
          items: state.items.filter(
            (i) =>
              !(
                i.productId === productId &&
                i.size === size &&
                i.color === color
              )
          ),
        }));
      },

      updateQuantity: (productId, size, color, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, size, color);
          return;
        }

        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId &&
            i.size === size &&
            i.color === color
              ? { ...i, quantity }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      toggleDrawer: () => set((s) => ({ isOpen: !s.isOpen })),
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),

      /* ── API Sync Methods ── */
      syncAddToApi: async (productId, size, color, quantity) => {
        try {
          const res = await apiFetchStandalone<{ data: { id: string } }>(
            "/api/cart/items",
            {
              method: "POST",
              body: { productId, size, color, quantity },
            }
          );
          /* Update serverItemId for the matching item */
          set((state) => ({
            items: state.items.map((i) =>
              i.productId === productId && i.size === size && i.color === color
                ? { ...i, serverItemId: res.data?.id }
                : i
            ),
          }));
        } catch {
          /* Silently fail — local cart is still valid */
          console.warn("[Cart] Failed to sync add to API");
        }
      },

      syncRemoveFromApi: async (serverItemId) => {
        try {
          await apiFetchStandalone(`/api/cart/items/${serverItemId}`, {
            method: "DELETE",
          });
        } catch {
          console.warn("[Cart] Failed to sync remove to API");
        }
      },

      syncUpdateQuantityApi: async (serverItemId, quantity) => {
        try {
          await apiFetchStandalone(`/api/cart/items/${serverItemId}`, {
            method: "PATCH",
            body: { quantity },
          });
        } catch {
          console.warn("[Cart] Failed to sync quantity to API");
        }
      },

      fetchCartFromApi: async () => {
        set({ isSyncing: true });
        try {
          const res = await apiFetchStandalone<{
            data: {
              id: string;
              items: Array<{
                id: string;
                productId: string;
                product: {
                  id: string;
                  slug: string;
                  name: string;
                  price: number;
                  originalPrice: number | null;
                  images: string[];
                  category: string;
                  subcategory: string;
                  colors: { name: string; hex: string }[];
                };
                size: string;
                color: string;
                quantity: number;
                lineTotal: number;
              }>;
              subtotal: number;
              itemCount: number;
            };
          }>("/api/cart");

          const serverItems: CartItem[] = (res.data?.items ?? []).map((si) => {
            const matchedColor = si.product?.colors?.find((c) => c.name === si.color);
            return {
              serverItemId: si.id,
              productId: si.productId,
              name: si.product?.name ?? "",
              price: Number(si.product?.price ?? 0),
              image: si.product?.images?.[0] ?? "",
              size: si.size,
              color: si.color,
              colorHex: matchedColor?.hex ?? si.color,
              quantity: si.quantity,
              category: (si.product as any)?.category?.slug ?? (si.product as any)?.category ?? "",
              subcategory: (si.product as any)?.subcategory?.slug ?? (si.product as any)?.subcategory ?? "",
            };
          });

          set({ items: serverItems });
        } catch {
          console.warn("[Cart] Failed to fetch cart from API");
        } finally {
          set({ isSyncing: false });
        }
      },

      clearCartApi: async () => {
        try {
          await apiFetchStandalone("/api/cart/clear", { method: "DELETE" });
        } catch {
          console.warn("[Cart] Failed to clear cart on API");
        }
        set({ items: [] });
      },

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "ori-baebi-cart",
      /* Only persist items, not UI state */
      partialize: (state) => ({ items: state.items }),
    }
  )
);
