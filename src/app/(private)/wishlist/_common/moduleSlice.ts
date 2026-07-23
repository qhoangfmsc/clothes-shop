/* ═══════════════════════════════════════════════════════════
   WISHLIST MODULE SLICE — Redux Toolkit + localStorage persistence

   Instant local state via reducers, API sync via thunks.
   Hydration from localStorage on store creation.

   Usage:
     import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
     import { selectWishlistItems, toggleWishlistItem } from "./_common/moduleSlice";
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/src/store";
import { apiFetchStandalone } from "@/src/hooks/use-api-auth";
import type { WishlistItem } from "./types";

/* ── State ── */

interface WishlistState {
  items: WishlistItem[];
  isSyncing: boolean;
}

/* ── Thunks ── */

export const syncAddToWishlist = createAsyncThunk<void, string>(
  "wishlist/syncAdd",
  async (productId) => {
    await apiFetchStandalone(`/api/wishlist/${productId}`, {
      method: "POST",
    });
  }
);

export const syncRemoveFromWishlist = createAsyncThunk<void, string>(
  "wishlist/syncRemove",
  async (productId) => {
    await apiFetchStandalone(`/api/wishlist/${productId}`, {
      method: "DELETE",
    });
  }
);

export const fetchWishlist = createAsyncThunk<WishlistItem[]>(
  "wishlist/fetch",
  async () => {
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

    return (res.data ?? []).map((si) => ({
      productId: si.productId,
      name: si.product?.name ?? "",
      price: Number(si.product?.price ?? 0),
      image: si.product?.images?.[0] ?? "",
      category:
        (si.product as any)?.category?.slug ??
        (si.product as any)?.category ??
        "",
      subcategory:
        (si.product as any)?.subcategory?.slug ??
        (si.product as any)?.subcategory ??
        "",
      addedAt: si.createdAt ?? new Date().toISOString(),
    }));
  }
);

/* ── Initial State ── */

const STORAGE_KEY = "ori-baebi-wishlist";

function loadFromStorage(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const items = parsed?.state?.items ?? parsed?.items ?? [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

const initialState: WishlistState = {
  items: loadFromStorage(),
  isSyncing: false,
};

/* ── Slice ── */

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    toggleWishlistItem(
      state,
      action: PayloadAction<Omit<WishlistItem, "addedAt">>
    ) {
      const item = action.payload;
      const idx = state.items.findIndex(
        (i) => i.productId === item.productId
      );

      if (idx >= 0) {
        state.items.splice(idx, 1);
      } else {
        state.items.push({ ...item, addedAt: new Date().toISOString() });
      }
    },

    removeWishlistItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(
        (i) => i.productId !== action.payload
      );
    },

    clearWishlist(state) {
      state.items = [];
    },
  },

  extraReducers: (builder) => {
    builder.addCase(fetchWishlist.pending, (state) => {
      state.isSyncing = true;
    });
    builder.addCase(fetchWishlist.fulfilled, (state, action) => {
      state.items = action.payload;
      state.isSyncing = false;
    });
    builder.addCase(fetchWishlist.rejected, (state) => {
      state.isSyncing = false;
    });
  },
});

/* ── Exports ── */

export const {
  toggleWishlistItem,
  removeWishlistItem,
  clearWishlist,
} = wishlistSlice.actions;

export const wishlistReducer = wishlistSlice.reducer;

export type { WishlistItem };

/* ── Selectors ── */

export const selectWishlistItems = (state: RootState) =>
  state.wishlist.items;
export const selectWishlistIsSyncing = (state: RootState) =>
  state.wishlist.isSyncing;

export const selectIsWishlisted =
  (productId: string) => (state: RootState) =>
    state.wishlist.items.some((i) => i.productId === productId);

export const selectWishlistTotal = (state: RootState) =>
  state.wishlist.items.length;
