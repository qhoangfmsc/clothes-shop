// Persistence: cart and wishlist items are saved to localStorage on every change.

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { productsReducer } from "@/src/app/[locale]/(admin)/admin/products/_common/moduleSlice";
import { categoriesReducer } from "@/src/app/[locale]/(admin)/admin/categories/_common/moduleSlice";
import { collectionsReducer } from "@/src/app/[locale]/(admin)/admin/collections/_common/moduleSlice";
import { usersReducer } from "@/src/app/[locale]/(admin)/admin/users/_common/moduleSlice";
import { ordersReducer } from "@/src/app/[locale]/(admin)/admin/orders/_common/moduleSlice";
import { mediaReducer } from "@/src/app/[locale]/(admin)/admin/media/_common/moduleSlice";
import { paymentsReducer } from "@/src/app/[locale]/(admin)/admin/payments/_common/moduleSlice";
import { refundsReducer } from "@/src/app/[locale]/(admin)/admin/refunds/_common/moduleSlice";
import { returnsReducer } from "@/src/app/[locale]/(admin)/admin/returns/_common/moduleSlice";
import { reviewsReducer } from "@/src/app/[locale]/(admin)/admin/reviews/_common/moduleSlice";
import { siteConfigReducer } from "@/src/app/[locale]/(admin)/admin/site-config/_common/moduleSlice";
import { cartReducer } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import { wishlistReducer } from "@/src/app/[locale]/(private)/wishlist/_common/moduleSlice";

const rootReducer = combineReducers({
  // ADMIN
  products: productsReducer,
  categories: categoriesReducer,
  collections: collectionsReducer,
  users: usersReducer,
  orders: ordersReducer,
  media: mediaReducer,
  siteConfig: siteConfigReducer,
  payments: paymentsReducer,
  refunds: refundsReducer,
  returns: returnsReducer,
  reviews: reviewsReducer,
  // CLIENT
  cart: cartReducer,
  wishlist: wishlistReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/** A new store; tests pass `preloadedState`, the app uses the `store` below. */
export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];

/* ── localStorage persistence ── */

const CART_STORAGE_KEY = "doovan-cart";
const CART_SELECTION_STORAGE_KEY = "doovan-cart-selection";
const WISHLIST_STORAGE_KEY = "doovan-wishlist";

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — silently ignore */ }
}

/** Writes the cart, the unticked lines and the wishlist whenever they change. Returns a function that stops it. */
export function attachPersistence(target: AppStore) {
  let prevCartItems = target.getState().cart.items;
  let prevDeselectedKeys = target.getState().cart.deselectedKeys;
  let prevWishlistItems = target.getState().wishlist.items;

  return target.subscribe(() => {
    const state = target.getState();

    if (state.cart.items !== prevCartItems) {
      prevCartItems = state.cart.items;
      // Match persisted format for backward compatibility
      save(CART_STORAGE_KEY, { state: { items: prevCartItems }, version: 0 });
    }
    if (state.cart.deselectedKeys !== prevDeselectedKeys) {
      prevDeselectedKeys = state.cart.deselectedKeys;
      save(CART_SELECTION_STORAGE_KEY, { deselectedKeys: prevDeselectedKeys });
    }
    if (state.wishlist.items !== prevWishlistItems) {
      prevWishlistItems = state.wishlist.items;
      save(WISHLIST_STORAGE_KEY, { state: { items: prevWishlistItems }, version: 0 });
    }
  });
}

export const store = makeStore();
attachPersistence(store);
