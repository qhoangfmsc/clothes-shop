/* ═══════════════════════════════════════════════════════════
   PRODUCTS MODULE SLICE — Redux Toolkit + BaseReducer

   Usage in component:
     import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
     import { createProduct, fetchProductList, productsSlice } from "./_common/moduleSlice";

     const dispatch = useAppDispatch();
     const { isCreating, error } = useAppSelector((s) => s.products);
     await dispatch(createProduct(body)).unwrap();
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import type { Product } from "@/src/types/product";
import type { ProductListParams } from "./types";

/* ── State ── */

interface ProductsState extends BaseCrudState {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  isListLoading: boolean;
}

const initialState: ProductsState = {
  ...baseCrudInitialState,
  items: [],
  total: 0,
  page: 1,
  limit: 25,
  isListLoading: false,
};

/* ── Thunks ── */

export const fetchProductList = createAsyncThunk(
  "products/fetchList",
  async (params: ProductListParams) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.category) qs.set("category", params.category);
    if (params.badge) qs.set("badge", params.badge);
    if (params.status) qs.set("status", params.status);
    if (params.sort) qs.set("sort", params.sort);
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return authApi.get<{ data: Product[]; total: number; page: number; limit: number }>(
      `/api/admin/products?${qs.toString()}`
    );
  }
);

export const createProduct = createAsyncThunk(
  "products/create",
  async (body: Record<string, unknown>) => {
    const res = await authApi.post<{ data: Product }>("/api/admin/products", body);
    return res.data;
  }
);

export const updateProduct = createAsyncThunk(
  "products/update",
  async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
    const res = await authApi.patch<{ data: Product }>(
      `/api/admin/products/${id}`,
      body
    );
    return res.data;
  }
);

export const deleteProduct = createAsyncThunk(
  "products/delete",
  async (id: string) => {
    await authApi.delete(`/api/admin/products/${id}`);
    return id;
  }
);

/* ── Slice ── */

export const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    ...baseCrudReducers,
    /* Module-specific reducers (if any) */
  },
  extraReducers: (builder) => {
    /* ── List ── */
    builder
      .addCase(fetchProductList.pending, (state) => {
        state.isListLoading = true;
      })
      .addCase(fetchProductList.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchProductList.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.error.message ?? "Failed to fetch";
      });

    /* ── Create ── */
    builder
      .addCase(createProduct.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state) => {
        state.isCreating = false;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.error.message ?? "Failed to create";
      });

    /* ── Update ── */
    builder
      .addCase(updateProduct.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state) => {
        state.isUpdating = false;
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.error.message ?? "Failed to update";
      });

    /* ── Delete ── */
    builder
      .addCase(deleteProduct.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state) => {
        state.isDeleting = false;
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.error.message ?? "Failed to delete";
      });
  },
});

export const { clearError } = productsSlice.actions;
export const productsReducer = productsSlice.reducer;
