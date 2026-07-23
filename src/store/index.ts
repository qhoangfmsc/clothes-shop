/* ═══════════════════════════════════════════════════════════
   REDUX STORE — Centralized configureStore

   Imports slice reducers from each module's _common/moduleSlice.ts
   and from the shared client slices (cart, wishlist).

   Persistence: cart items and wishlist items are saved to
   localStorage on every change.

   Usage:
     // Wrap app in StoreProvider (src/store/StoreProvider.tsx)
     // In components: import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
   ═══════════════════════════════════════════════════════════ */

import { configureStore } from "@reduxjs/toolkit";
import { productsReducer } from "@/src/app/(admin)/admin/products/_common/moduleSlice";
import { categoriesReducer } from "@/src/app/(admin)/admin/categories/_common/moduleSlice";
import { collectionsReducer } from "@/src/app/(admin)/admin/collections/_common/moduleSlice";
import { usersReducer } from "@/src/app/(admin)/admin/users/_common/moduleSlice";
import { ordersReducer } from "@/src/app/(admin)/admin/orders/_common/moduleSlice";
import { cartReducer } from "@/src/app/(private)/cart/_common/moduleSlice";
import { wishlistReducer } from "@/src/app/(private)/wishlist/_common/moduleSlice";

export const store = configureStore({
  reducer: {
    // ADMIN
    products: productsReducer,
    categories: categoriesReducer,
    collections: collectionsReducer,
    users: usersReducer,
    orders: ordersReducer,
    // CLIENT
    cart: cartReducer,
    wishlist: wishlistReducer,
  },
});

/* ── localStorage persistence ── */

const CART_STORAGE_KEY = "ori-baebi-cart";
const WISHLIST_STORAGE_KEY = "ori-baebi-wishlist";

let prevCartItems = store.getState().cart.items;
let prevWishlistItems = store.getState().wishlist.items;

store.subscribe(() => {
  const state = store.getState();

  if (state.cart.items !== prevCartItems) {
    prevCartItems = state.cart.items;
    try {
      // Match persisted format for backward compatibility
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ state: { items: prevCartItems }, version: 0 })
      );
    } catch { /* quota exceeded — silently ignore */ }
  }

  if (state.wishlist.items !== prevWishlistItems) {
    prevWishlistItems = state.wishlist.items;
    try {
      localStorage.setItem(
        WISHLIST_STORAGE_KEY,
        JSON.stringify({ state: { items: prevWishlistItems }, version: 0 })
      );
    } catch { /* quota exceeded — silently ignore */ }
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
