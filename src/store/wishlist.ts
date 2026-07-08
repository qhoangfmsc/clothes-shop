/* ═══════════════════════════════════════════════════════════
   WISHLIST STORE — Zustand + persist + API sync
   
   Hybrid strategy:
   - Local Zustand for instant UI response
   - API sync in background for server persistence
   - On login: fetch server wishlist → replace local
   
   Usage:
     const { items, toggleItem, isWishlisted } = useWishlistStore();
   ═══════════════════════════════════════════════════════════ */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiFetchStandalone } from "@/src/hooks/use-api-auth";

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
  isSyncing: boolean;

  /* Actions */
  toggleItem: (item: Omit<WishlistItem, "addedAt">) => boolean;
  removeItem: (productId: string) => void;
  clearWishlist: () => void;

  /* API sync */
  syncAddToApi: (productId: string) => Promise<void>;
  syncRemoveFromApi: (productId: string) => Promise<void>;
  fetchWishlistFromApi: () => Promise<void>;

  /* Queries */
  isWishlisted: (productId: string) => boolean;
  totalItems: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isSyncing: false,

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

      /* ── API Sync Methods ── */
      syncAddToApi: async (productId) => {
        try {
          await apiFetchStandalone(`/api/wishlist/${productId}`, {
            method: "POST",
          });
        } catch {
          console.warn("[Wishlist] Failed to sync add to API");
        }
      },

      syncRemoveFromApi: async (productId) => {
        try {
          await apiFetchStandalone(`/api/wishlist/${productId}`, {
            method: "DELETE",
          });
        } catch {
          console.warn("[Wishlist] Failed to sync remove from API");
        }
      },

      fetchWishlistFromApi: async () => {
        set({ isSyncing: true });
        try {
          const res = await apiFetchStandalone<{
            data: Array<{
              productId: string;
              product: {
                id: string;
                name: string;
                price: number;
                images: string[];
                category: string;
                subcategory: string;
              };
              createdAt: string;
            }>;
          }>("/api/wishlist");

          const serverItems: WishlistItem[] = (res.data ?? []).map((si) => ({
            productId: si.productId,
            name: si.product?.name ?? "",
            price: Number(si.product?.price ?? 0),
            image: si.product?.images?.[0] ?? "",
            category: si.product?.category ?? "",
            subcategory: si.product?.subcategory ?? "",
            addedAt: si.createdAt ?? new Date().toISOString(),
          }));

          set({ items: serverItems });
        } catch {
          console.warn("[Wishlist] Failed to fetch wishlist from API");
        } finally {
          set({ isSyncing: false });
        }
      },

      isWishlisted: (productId) =>
        get().items.some((i) => i.productId === productId),

      totalItems: () => get().items.length,
    }),
    {
      name: "ori-baebi-wishlist",
    }
  )
);
