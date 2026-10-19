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
import { isPurchasable } from "@/src/lib/product-purchase";
import type { ProductBadge } from "@/src/types/enums";
import type { CartItem, NewCartItem } from "./types";

/* ── State ── */

interface CartState {
  items: CartItem[];
  /** Keys (see `cartItemKey`) of the items the shopper unticked. Storing the unticked ones means
   *  every item is selected by default, including items added later. */
  deselectedKeys: string[];
  /** Keys of lines whose "add" request is still in flight; a cart refetch must not drop them. Not persisted. */
  pendingAddKeys: string[];
  /** Cart writes (add / quantity / remove) the server has not answered yet. Line totals from an answer are only
   *  trusted when none is left. Not persisted. */
  pendingSync: number;
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
      lineTotalVnd?: number;
      lineTotalUsd?: number;
      product?: {
        priceVnd: number;
        priceUsd: number;
        name: string;
        badge?: ProductBadge | null;
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
      priceVnd: si.product?.priceVnd ?? 0,
      priceUsd: si.product?.priceUsd ?? 0,
      lineTotalVnd: si.lineTotalVnd ?? null,
      lineTotalUsd: si.lineTotalUsd ?? null,
      image: si.product?.images?.[0] ?? "",
      size: si.size,
      color: si.color,
      colorHex: matchedColor?.hex ?? si.color,
      quantity: si.quantity,
      category: slugOf(si.product?.category),
      subcategory: slugOf(si.product?.subcategory),
      badge: si.product?.badge ?? null,
    };
  });
}

/** Adds a line on the server. The response is the whole cart (`data.id` is the CART id, not the
 *  item id), so the new line's id is found by product + size + color, the same key the server merges on.
 *  Every cart write resolves with the server's lines: that is where the BE's line totals come from. */
export const syncAddToCartItem = createAsyncThunk<
  CartItem[],
  { productId: string; size: string; color: string; quantity: number }
>("cart/syncAdd", async ({ productId, size, color, quantity }) => {
  const res = await apiFetchStandalone<ServerCart>("/api/cart/items", {
    method: "POST",
    body: { productId, size, color, quantity },
  });
  return mapServerCart(res);
});

export const syncRemoveCartItem = createAsyncThunk<CartItem[], string>(
  "cart/syncRemove",
  async (serverItemId) =>
    mapServerCart(
      await apiFetchStandalone<ServerCart>(`/api/cart/items/${serverItemId}`, {
        method: "DELETE",
      })
    )
);

export const syncUpdateCartItemQuantity = createAsyncThunk<
  CartItem[],
  { serverItemId: string; quantity: number }
>("cart/syncUpdateQuantity", async ({ serverItemId, quantity }) =>
  mapServerCart(
    await apiFetchStandalone<ServerCart>(`/api/cart/items/${serverItemId}`, {
      method: "PATCH",
      body: { quantity },
    })
  )
);

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
    /* Lines saved before prices became a VND/USD pair carry no `priceVnd`: drop them (the server cart refills it) */
    return Array.isArray(items) ? items.filter((i) => typeof i?.priceVnd === "number") : [];
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
  pendingSync: 0,
  isOpen: false,
  isSyncing: false,
};

/** Takes the BE's prices and line totals from the server lines. A line total is only valid for the quantity the BE
 *  priced, so a line whose local quantity differs (a failed write) shows no total until the next refetch. */
function applyServerPricing(state: CartState, serverLines: CartItem[]) {
  if (state.pendingSync > 0) return;
  const byKey = new Map(serverLines.map((line) => [cartItemKey(line), line]));
  for (const line of state.items) {
    const server = byKey.get(cartItemKey(line));
    if (!server) continue;
    line.priceVnd = server.priceVnd;
    line.priceUsd = server.priceUsd;
    const sameQuantity = server.quantity === line.quantity;
    line.lineTotalVnd = sameQuantity ? server.lineTotalVnd : null;
    line.lineTotalUsd = sameQuantity ? server.lineTotalUsd : null;
  }
}

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
          item: NewCartItem;
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
          existing.lineTotalVnd = null;
          existing.lineTotalUsd = null;
        } else {
          state.items.push({ ...item, quantity, lineTotalVnd: null, lineTotalUsd: null });
        }
      },
      prepare(item: NewCartItem, quantity = 1) {
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
        item.lineTotalVnd = null;
        item.lineTotalUsd = null;
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
      /* `GET /api/cart` does not load the product's category / sub-category (they come back empty): keep the slugs
         the line was saved with so its link keeps working */
      const slugsOf = new Map(state.items.map((i) => [i.productId, i]));
      const merged = action.payload.map((i) => {
        const local = slugsOf.get(i.productId);
        return { ...i, category: i.category || local?.category || "", subcategory: i.subcategory || local?.subcategory || "" };
      });
      state.items = [...merged, ...inFlight];
      pruneDeselected(state);
      state.isSyncing = false;
    });
    builder.addCase(fetchCart.rejected, (state) => {
      state.isSyncing = false;
    });

    /* syncAddToCartItem — remember the server id of the line so it can be updated / removed / ordered */
    builder.addCase(syncAddToCartItem.pending, (state, action) => {
      state.pendingAddKeys.push(cartItemKey(action.meta.arg));
      state.pendingSync += 1;
    });
    builder.addCase(syncAddToCartItem.fulfilled, (state, action) => {
      const key = cartItemKey(action.meta.arg);
      const pendingIndex = state.pendingAddKeys.indexOf(key);
      if (pendingIndex >= 0) state.pendingAddKeys.splice(pendingIndex, 1);
      state.pendingSync -= 1;
      const serverId = action.payload.find((i) => cartItemKey(i) === key)?.serverItemId;
      const line = state.items.find((i) => cartItemKey(i) === key);
      if (line && serverId) line.serverItemId = serverId;
      applyServerPricing(state, action.payload);
    });
    builder.addCase(syncAddToCartItem.rejected, (state, action) => {
      const index = state.pendingAddKeys.indexOf(cartItemKey(action.meta.arg));
      if (index >= 0) state.pendingAddKeys.splice(index, 1);
      state.pendingSync -= 1;
    });

    /* Quantity changes and removals: the answer carries the BE's line totals */
    for (const thunk of [syncUpdateCartItemQuantity, syncRemoveCartItem]) {
      builder.addCase(thunk.pending, (state) => {
        state.pendingSync += 1;
      });
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.pendingSync -= 1;
        applyServerPricing(state, action.payload);
      });
      builder.addCase(thunk.rejected, (state) => {
        state.pendingSync -= 1;
      });
    }
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

/** Cart writes the server has not answered yet (a quote or total read now could miss them) */
export const selectCartPendingSync = (state: RootState) => state.cart.pendingSync;

/* Selection — what the bulk actions, the summary and checkout work on */
export const selectDeselectedKeys = (state: RootState) =>
  state.cart.deselectedKeys;

/** Lines that can be checked out — sold-out and custom-order products never can. */
export const selectPurchasableCartItems = createSelector([selectCartItems], (items) =>
  items.filter((i) => isPurchasable(i.badge))
);

export const selectSelectedCartItems = createSelector(
  [selectPurchasableCartItems, selectDeselectedKeys],
  (items, deselectedKeys) =>
    items.filter((i) => !deselectedKeys.includes(cartItemKey(i)))
);

export const selectSelectedTotalItems = createSelector(
  [selectSelectedCartItems],
  (items) => items.reduce((sum, i) => sum + i.quantity, 0)
);
