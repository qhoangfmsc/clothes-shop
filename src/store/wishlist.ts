/* ═══════════════════════════════════════════════════════════
   WISHLIST STORE — Zustand + persist to localStorage
   
   Usage:
     const { items, toggleItem, isWishlisted } = useWishlistStore();
   ═══════════════════════════════════════════════════════════ */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  category: string;
  subcategory: string;
  addedAt: string;
}

interface WishlistState {
  items: WishlistItem[];

  /* Actions */
  toggleItem: (item: Omit<WishlistItem, "addedAt">) => boolean;
  removeItem: (productId: string) => void;
  clearWishlist: () => void;

  /* Queries */
  isWishlisted: (productId: string) => boolean;
  totalItems: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      toggleItem: (item) => {
        const exists = get().items.some(
          (i) => i.productId === item.productId
        );

        if (exists) {
          set((state) => ({
            items: state.items.filter(
              (i) => i.productId !== item.productId
            ),
          }));
          return false; /* removed */
        }

        set((state) => ({
          items: [
            ...state.items,
            { ...item, addedAt: new Date().toISOString() },
          ],
        }));
        return true; /* added */
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      clearWishlist: () => set({ items: [] }),

      isWishlisted: (productId) =>
        get().items.some((i) => i.productId === productId),

      totalItems: () => get().items.length,
    }),
    {
      name: "ori-baebi-wishlist",
    }
  )
);
