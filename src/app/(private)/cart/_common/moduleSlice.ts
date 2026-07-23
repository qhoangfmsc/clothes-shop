/* ═══════════════════════════════════════════════════════════
   CART MODULE SLICE — Redux Toolkit + localStorage persistence

   Instant local state via reducers, API sync via thunks.
   Hydration from localStorage on store creation.

   Usage:
     import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
     import { selectCartItems, addItem, syncAddToCartItem } from "./_common/moduleSlice";
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/src/store";
import { apiFetchStandalone } from "@/src/hooks/use-api-auth";
import type { CartItem } from "./types";

/* ── State ── */

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isSyncing: boolean;
}

/* ── Thunks ── */

export const syncAddToCartItem = createAsyncThunk<
  string | undefined,
  { productId: string; size: string; color: string; quantity: number }
>("cart/syncAdd", async ({ productId, size, color, quantity }) => {
  const res = await apiFetchStandalone<{ data: { id: string } }>(
    "/api/cart/items",
    { method: "POST", body: { productId, size, color, quantity } }
  );
  return res.data?.id;
});

export const syncRemoveCartItem = createAsyncThunk<void, string>(
  "cart/syncRemove",
  async (serverItemId) => {
    await apiFetchStandalone(`/api/cart/items/${serverItemId}`, {
      method: "DELETE",
    });
  }
);

export const syncUpdateCartItemQuantity = createAsyncThunk<
  void,
  { serverItemId: string; quantity: number }
>("cart/syncUpdateQuantity", async ({ serverItemId, quantity }) => {
  await apiFetchStandalone(`/api/cart/items/${serverItemId}`, {
    method: "PATCH",
    body: { quantity },
  });
});

export const fetchCart = createAsyncThunk<CartItem[]>(
  "cart/fetch",
  async () => {
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

    return (res.data?.items ?? []).map((si) => {
      const matchedColor = si.product?.colors?.find(
        (c) => c.name === si.color
      );
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
        category:
          (si.product as any)?.category?.slug ??
          (si.product as any)?.category ??
          "",
        subcategory:
          (si.product as any)?.subcategory?.slug ??
          (si.product as any)?.subcategory ??
          "",
      };
    });
  }
);

export const clearCartOnServer = createAsyncThunk(
  "cart/clearOnServer",
  async () => {
    await apiFetchStandalone("/api/cart/clear", { method: "DELETE" });
  }
);

/* ── Initial State ── */

const STORAGE_KEY = "ori-baebi-cart";

function loadFromStorage(): CartItem[] {
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

const initialState: CartState = {
  items: loadFromStorage(),
  isOpen: false,
  isSyncing: false,
};

/* ── Slice ── */

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: {
      reducer(
        state,
        action: PayloadAction<{
          item: Omit<CartItem, "quantity" | "serverItemId">;
          quantity: number;
        }>
      ) {
        const { item, quantity } = action.payload;
        const existing = state.items.find(
          (i) =>
            i.productId === item.productId &&
            i.size === item.size &&
            i.color === item.color
        );

        if (existing) {
          existing.quantity += quantity;
        } else {
          state.items.push({ ...item, quantity });
        }
      },
      prepare(
        item: Omit<CartItem, "quantity" | "serverItemId">,
        quantity = 1
      ) {
        return { payload: { item, quantity } };
      },
    },

    removeItem(
      state,
      action: PayloadAction<{
        productId: string;
        size: string;
        color: string;
      }>
    ) {
      const { productId, size, color } = action.payload;
      state.items = state.items.filter(
        (i) =>
          !(
            i.productId === productId &&
            i.size === size &&
            i.color === color
          )
      );
    },

    updateQuantity(
      state,
      action: PayloadAction<{
        productId: string;
        size: string;
        color: string;
        quantity: number;
      }>
    ) {
      const { productId, size, color, quantity } = action.payload;
      const item = state.items.find(
        (i) =>
          i.productId === productId && i.size === size && i.color === color
      );
      if (!item) return;
      if (quantity <= 0) {
        state.items = state.items.filter(
          (i) =>
            !(
              i.productId === productId &&
              i.size === size &&
              i.color === color
            )
        );
      } else {
        item.quantity = quantity;
      }
    },

    clearCart(state) {
      state.items = [];
    },

    toggleDrawer(state) {
      state.isOpen = !state.isOpen;
    },
    openDrawer(state) {
      state.isOpen = true;
    },
    closeDrawer(state) {
      state.isOpen = false;
    },
  },

  extraReducers: (builder) => {
    /* fetchCart */
    builder.addCase(fetchCart.pending, (state) => {
      state.isSyncing = true;
    });
    builder.addCase(fetchCart.fulfilled, (state, action) => {
      state.items = action.payload;
      state.isSyncing = false;
    });
    builder.addCase(fetchCart.rejected, (state) => {
      state.isSyncing = false;
    });

    /* syncAddToCartItem — update serverItemId on success */
    builder.addCase(syncAddToCartItem.fulfilled, (state, action) => {
      const serverId = action.payload;
      if (!serverId) return;
      for (let i = state.items.length - 1; i >= 0; i--) {
        if (!state.items[i].serverItemId) {
          state.items[i].serverItemId = serverId;
          break;
        }
      }
    });
  },
});

/* ── Exports ── */

export const {
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  toggleDrawer,
  openDrawer,
  closeDrawer,
} = cartSlice.actions;

export const cartReducer = cartSlice.reducer;

export type { CartItem };

/* ── Selectors ── */

export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartIsOpen = (state: RootState) => state.cart.isOpen;
export const selectCartIsSyncing = (state: RootState) =>
  state.cart.isSyncing;

export const selectTotalItems = (state: RootState) =>
  state.cart.items.reduce((sum, i) => sum + i.quantity, 0);

export const selectTotalPrice = (state: RootState) =>
  state.cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
