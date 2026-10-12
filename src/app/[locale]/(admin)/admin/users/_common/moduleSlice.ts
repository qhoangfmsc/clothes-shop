/* ═══════════════════════════════════════════════════════════
   USERS MODULE SLICE — Redux Toolkit + BaseReducer
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import { buildListQuery, LIST_DEFAULT_LIMIT } from "@/src/lib/list-query";
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
  limit: LIST_DEFAULT_LIMIT,
  isListLoading: false,
};

/* ── Thunks ── */

export const fetchUserList = createAsyncThunk(
  "users/fetchList",
  async (params: UserListParams) => {
    const qs = buildListQuery(params, { role: params.role, status: params.status });
    return authApi.get<{ data: AdminUser[]; total: number; page: number; limit: number }>(
      `/api/admin/users?${qs}`
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
