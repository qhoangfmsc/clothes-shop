/* ═══════════════════════════════════════════════════════════
   REDUX STORE — Centralized configureStore

   Imports slice reducers from each module's _common/moduleSlice.ts.
   Add new module slices here as you build them.

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

export const store = configureStore({
  reducer: {
    // ADMIN
    products: productsReducer,
    categories: categoriesReducer,
    collections: collectionsReducer,
    users: usersReducer,
    orders: ordersReducer,
    // CLIENT
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
