/* ═══════════════════════════════════════════════════════════
   COLLECTIONS MODULE SLICE — Redux Toolkit + BaseReducer
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import type { Collection } from "@/src/types/collection";
import type { CollectionListParams } from "./types";

/* ── State ── */

interface CollectionsState extends BaseCrudState {
  items: Collection[];
  total: number;
  page: number;
  limit: number;
  isListLoading: boolean;
}

const initialState: CollectionsState = {
  ...baseCrudInitialState,
  items: [],
  total: 0,
  page: 1,
  limit: 25,
  isListLoading: false,
};

/* ── Thunks ── */

export const fetchCollectionList = createAsyncThunk(
  "collections/fetchList",
  async (params: CollectionListParams) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.season) qs.set("season", params.season);
    if (params.sort) qs.set("sort", params.sort);
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    const res = await authApi.get<{
      data: (Omit<Collection, "productIds"> & { products?: { id: string }[] })[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/admin/collections?${qs.toString()}`);
    return {
      ...res,
      data: res.data.map((item) => ({
        ...item,
        productIds: item.products?.map((p) => p.id) ?? [],
      })),
    };
  }
);

export const createCollection = createAsyncThunk(
  "collections/create",
  async (body: Record<string, unknown>) => {
    const res = await authApi.post<{ data: Collection }>("/api/admin/collections", body);
    return res.data;
  }
);

export const updateCollection = createAsyncThunk(
  "collections/update",
  async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
    const res = await authApi.patch<{ data: Collection }>(
      `/api/admin/collections/${id}`,
      body
    );
    return res.data;
  }
);

export const deleteCollection = createAsyncThunk(
  "collections/delete",
  async (id: string) => {
    await authApi.delete(`/api/admin/collections/${id}`);
    return id;
  }
);

/* ── Slice ── */

export const collectionsSlice = createSlice({
  name: "collections",
  initialState,
  reducers: {
    ...baseCrudReducers,
  },
  extraReducers: (builder) => {
    /* ── List ── */
    builder
      .addCase(fetchCollectionList.pending, (state) => {
        state.isListLoading = true;
      })
      .addCase(fetchCollectionList.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchCollectionList.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.error.message ?? "Failed to fetch";
      });

    /* ── Create ── */
    builder
      .addCase(createCollection.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createCollection.fulfilled, (state) => {
        state.isCreating = false;
      })
      .addCase(createCollection.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.error.message ?? "Failed to create";
      });

    /* ── Update ── */
    builder
      .addCase(updateCollection.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateCollection.fulfilled, (state) => {
        state.isUpdating = false;
      })
      .addCase(updateCollection.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.error.message ?? "Failed to update";
      });

    /* ── Delete ── */
    builder
      .addCase(deleteCollection.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteCollection.fulfilled, (state) => {
        state.isDeleting = false;
      })
      .addCase(deleteCollection.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.error.message ?? "Failed to delete";
      });
  },
});

export const { clearError } = collectionsSlice.actions;
export const collectionsReducer = collectionsSlice.reducer;
