/* ═══════════════════════════════════════════════════════════
   CATEGORIES MODULE SLICE — Redux Toolkit + BaseReducer
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import type { Category } from "@/src/types/category";
import type { CategoryListParams } from "./types";

/* ── State ── */

interface CategoriesState extends BaseCrudState {
  items: Category[];
  total: number;
  page: number;
  limit: number;
  isListLoading: boolean;
}

const initialState: CategoriesState = {
  ...baseCrudInitialState,
  items: [],
  total: 0,
  page: 1,
  limit: 200,
  isListLoading: false,
};

/* ── Thunks ── */

export const fetchCategoryList = createAsyncThunk(
  "categories/fetchList",
  async (params: CategoryListParams) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.sort) qs.set("sort", params.sort);
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return authApi.get<{ data: Category[]; total: number; page: number; limit: number }>(
      `/api/admin/categories?${qs.toString()}`
    );
  }
);

export const createCategory = createAsyncThunk(
  "categories/create",
  async (body: Record<string, unknown>) => {
    const res = await authApi.post<{ data: Category }>("/api/admin/categories", body);
    return res.data;
  }
);

export const updateCategory = createAsyncThunk(
  "categories/update",
  async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
    const res = await authApi.patch<{ data: Category }>(
      `/api/admin/categories/${id}`,
      body
    );
    return res.data;
  }
);

export const deleteCategory = createAsyncThunk(
  "categories/delete",
  async (id: string) => {
    await authApi.delete(`/api/admin/categories/${id}`);
    return id;
  }
);

/* ── Slice ── */

export const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    ...baseCrudReducers,
  },
  extraReducers: (builder) => {
    /* ── List ── */
    builder
      .addCase(fetchCategoryList.pending, (state) => {
        state.isListLoading = true;
      })
      .addCase(fetchCategoryList.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchCategoryList.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.error.message ?? "Failed to fetch";
      });

    /* ── Create ── */
    builder
      .addCase(createCategory.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state) => {
        state.isCreating = false;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.error.message ?? "Failed to create";
      });

    /* ── Update ── */
    builder
      .addCase(updateCategory.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state) => {
        state.isUpdating = false;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.error.message ?? "Failed to update";
      });

    /* ── Delete ── */
    builder
      .addCase(deleteCategory.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state) => {
        state.isDeleting = false;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.error.message ?? "Failed to delete";
      });
  },
});

export const { clearError } = categoriesSlice.actions;
export const categoriesReducer = categoriesSlice.reducer;
