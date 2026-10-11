/* ═══════════════════════════════════════════════════════════
   USERS MODULE SLICE — Redux Toolkit + BaseReducer
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import type { AdminUser } from "@/src/hooks/use-admin-api";
import type { UserListParams, UserUpdateData } from "./types";

/* ── State ── */

interface UsersState extends BaseCrudState {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
  isListLoading: boolean;
}

const initialState: UsersState = {
  ...baseCrudInitialState,
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  isListLoading: false,
};

/* ── Thunks ── */

export const fetchUserList = createAsyncThunk(
  "users/fetchList",
  async (params: UserListParams) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.role) qs.set("role", params.role);
    if (params.status) qs.set("status", params.status);
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return authApi.get<{ data: AdminUser[]; total: number; page: number; limit: number }>(
      `/api/admin/users?${qs.toString()}`
    );
  }
);

export const updateUser = createAsyncThunk(
  "users/update",
  async ({ id, body }: { id: string; body: UserUpdateData }) => {
    const res = await authApi.patch<{ data: AdminUser }>(`/api/admin/users/${id}`, body);
    return res.data;
  }
);

/* ── Slice ── */

export const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    ...baseCrudReducers,
  },
  extraReducers: (builder) => {
    /* ── List ── */
    builder
      .addCase(fetchUserList.pending, (state) => {
        state.isListLoading = true;
      })
      .addCase(fetchUserList.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchUserList.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.error.message ?? "Failed to fetch";
      });

    /* ── Update ── */
    builder
      .addCase(updateUser.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state) => {
        state.isUpdating = false;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.error.message ?? "Failed to update";
      });
  },
});

export const { clearError } = usersSlice.actions;
export const usersReducer = usersSlice.reducer;
