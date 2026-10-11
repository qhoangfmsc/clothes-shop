/* ═══════════════════════════════════════════════════════════
   CART MODULE SLICE — Redux Toolkit + localStorage persistence

   Instant local state via reducers, API sync via thunks.
   Hydration from localStorage on store creation.

   Usage:
     import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
     import { selectCartItems, addItem, syncAddToCartItem } from "./_common/moduleSlice";
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/src/store";
import { apiFetchStandalone } from "@/src/hooks/use-api-auth";
import type { CartItem } from "./types";

/* ── State ── */

interface CartState {
  items: CartItem[];
  /** Keys (see `cartItemKey`) of the items the shopper unticked. Storing the unticked ones means
   *  every item is selected by default, including items added later. */
  deselectedKeys: string[];
  /** Keys of lines whose "add" request is still in flight; a cart refetch must not drop them. Not persisted. */
  pendingAddKeys: string[];
  isOpen: boolean;
  isSyncing: boolean;
}

/** Identity of a cart line: the same product in another size or colour is a different line. */
export const cartItemKey = (item: Pick<CartItem, "productId" | "size" | "color">) =>
  `${item.productId}|${item.size}|${item.color}`;

/* ── Thunks ── */

/** `GET /api/cart` and every cart mutation answer with the whole cart in this shape. */
interface ServerCart {
  data?: {
    id?: string;
    items?: Array<{
      id: string;
      productId: string;
      product?: {
        price: number;
        name: string;
        images?: string[];
        category?: { slug?: string } | string;
        subcategory?: { slug?: string } | string;
        colors?: { name: string; hex: string }[];
      };
      size: string;
      color: string;
      quantity: number;
    }>;
  };
}

const slugOf = (value: { slug?: string } | string | undefined) =>
  typeof value === "string" ? value : (value?.slug ?? "");

function mapServerCart(res: ServerCart): CartItem[] {
  return (res.data?.items ?? []).map((si) => {
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
      category: slugOf(si.product?.category),
      subcategory: slugOf(si.product?.subcategory),
    };
  });
}

/** Adds a line on the server. The response is the whole cart (`data.id` is the CART id, not the
 *  item id), so the new line's id is found by product + size + color, the same key the server merges on. */
export const syncAddToCartItem = createAsyncThunk<
  CartItem | undefined,
  { productId: string; size: string; color: string; quantity: number }
>("cart/syncAdd", async ({ productId, size, color, quantity }) => {
  const res = await apiFetchStandalone<ServerCart>("/api/cart/items", {
    method: "POST",
    body: { productId, size, color, quantity },
  });
  return mapServerCart(res).find(
    (i) => i.productId === productId && i.size === size && i.color === color
  );
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
  async () => mapServerCart(await apiFetchStandalone<ServerCart>("/api/cart"))
);

export const clearCartOnServer = createAsyncThunk(
  "cart/clearOnServer",
  async () => {
    await apiFetchStandalone("/api/cart/clear", { method: "DELETE" });
  }
);

/* ── Initial State ── */

const STORAGE_KEY = "doovan-cart";
/** Written by the store subscriber in `src/store/index.ts` */
const SELECTION_STORAGE_KEY = "doovan-cart-selection";

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

function loadDeselectedFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SELECTION_STORAGE_KEY) ?? "null");
    const keys = parsed?.deselectedKeys;
    return Array.isArray(keys) ? keys.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

const initialState: CartState = {
  items: loadFromStorage(),
  deselectedKeys: loadDeselectedFromStorage(),
  pendingAddKeys: [],
  isOpen: false,
  isSyncing: false,
};

/** Drops unticked keys whose item is gone, so re-adding it later starts selected again. */
function pruneDeselected(state: CartState) {
  const present = new Set(state.items.map(cartItemKey));
  state.deselectedKeys = state.deselectedKeys.filter((key) => present.has(key));
}

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
      pruneDeselected(state);
    },

    /** Bulk remove: drops every line whose key is listed. */
    removeItems(state, action: PayloadAction<string[]>) {
      const keys = new Set(action.payload);
      state.items = state.items.filter((i) => !keys.has(cartItemKey(i)));
      pruneDeselected(state);
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
        pruneDeselected(state);
      } else {
        item.quantity = quantity;
      }
    },

    clearCart(state) {
      state.items = [];
      state.deselectedKeys = [];
    },

    toggleItemSelected(state, action: PayloadAction<string>) {
      const key = action.payload;
      state.deselectedKeys = state.deselectedKeys.includes(key)
        ? state.deselectedKeys.filter((k) => k !== key)
        : [...state.deselectedKeys, key];
    },

    /** Select-all / clear-all in one step. */
    setAllSelected(state, action: PayloadAction<boolean>) {
      state.deselectedKeys = action.payload ? [] : state.items.map(cartItemKey);
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
    /* fetchCart — the server cart is the source of truth, except lines still being added */
    builder.addCase(fetchCart.pending, (state) => {
      state.isSyncing = true;
    });
    builder.addCase(fetchCart.fulfilled, (state, action) => {
      const serverKeys = new Set(action.payload.map(cartItemKey));
      const inFlight = state.items.filter(
        (i) =>
          state.pendingAddKeys.includes(cartItemKey(i)) &&
          !serverKeys.has(cartItemKey(i))
      );
      state.items = [...action.payload, ...inFlight];
      pruneDeselected(state);
      state.isSyncing = false;
    });
    builder.addCase(fetchCart.rejected, (state) => {
      state.isSyncing = false;
    });

    /* syncAddToCartItem — remember the server id of the line so it can be updated / removed / ordered */
    builder.addCase(syncAddToCartItem.pending, (state, action) => {
      state.pendingAddKeys.push(cartItemKey(action.meta.arg));
    });
    builder.addCase(syncAddToCartItem.fulfilled, (state, action) => {
      const key = cartItemKey(action.meta.arg);
      const pendingIndex = state.pendingAddKeys.indexOf(key);
      if (pendingIndex >= 0) state.pendingAddKeys.splice(pendingIndex, 1);
      const serverId = action.payload?.serverItemId;
      if (!serverId) return;
      const line = state.items.find((i) => cartItemKey(i) === key);
      if (line) line.serverItemId = serverId;
    });
    builder.addCase(syncAddToCartItem.rejected, (state, action) => {
      const index = state.pendingAddKeys.indexOf(cartItemKey(action.meta.arg));
      if (index >= 0) state.pendingAddKeys.splice(index, 1);
    });
  },
});

/* ── Exports ── */

export const {
  addItem,
  removeItem,
  removeItems,
  updateQuantity,
  clearCart,
  toggleItemSelected,
  setAllSelected,
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

/* Selection — what the bulk actions, the summary and checkout work on */
export const selectDeselectedKeys = (state: RootState) =>
  state.cart.deselectedKeys;

export const selectSelectedCartItems = createSelector(
  [selectCartItems, selectDeselectedKeys],
  (items, deselectedKeys) =>
    items.filter((i) => !deselectedKeys.includes(cartItemKey(i)))
);

export const selectSelectedTotalItems = createSelector(
  [selectSelectedCartItems],
  (items) => items.reduce((sum, i) => sum + i.quantity, 0)
);

export const selectSelectedTotalPrice = createSelector(
  [selectSelectedCartItems],
  (items) => items.reduce((sum, i) => sum + i.price * i.quantity, 0)
);
