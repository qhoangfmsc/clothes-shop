/* ═══════════════════════════════════════════════════════════
   ORDERS MODULE SLICE — Redux Toolkit + BaseReducer
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import { buildListQuery, LIST_DEFAULT_LIMIT } from "@/src/lib/list-query";
import type { AdminOrder } from "@/src/hooks/use-admin-api";
import type { OrderStatus } from "@/src/types/enums";
import type { OrderListParams } from "./types";

/* ── State ── */

interface OrdersState extends BaseCrudState {
  items: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  isListLoading: boolean;
}

const initialState: OrdersState = {
  ...baseCrudInitialState,
  items: [],
  total: 0,
  page: 1,
  limit: LIST_DEFAULT_LIMIT,
  isListLoading: false,
};

/* ── Thunks ── */

export const fetchOrderList = createAsyncThunk(
  "orders/fetchList",
  async (params: OrderListParams) => {
    const qs = buildListQuery(params, { status: params.status, paymentStatus: params.paymentStatus });
    return authApi.get<{ data: AdminOrder[]; total: number; page: number; limit: number }>(
      `/api/admin/orders?${qs}`
    );
  }
);

export const updateOrderStatus = createAsyncThunk(
  "orders/updateStatus",
  async ({ id, status }: { id: string; status: OrderStatus }) => {
    const res = await authApi.patch<{ data: AdminOrder }>(
      `/api/admin/orders/${id}/status`,
      { status }
    );
    return res.data;
  }
);

export const fetchOrderDetail = createAsyncThunk(
  "orders/fetchDetail",
  async (id: string) => {
    const res = await authApi.get<{ data: AdminOrder }>(`/api/admin/orders/${id}`);
    return res.data;
  }
);

/* ── Slice ── */

export const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    ...baseCrudReducers,
  },
  extraReducers: (builder) => {
    /* ── List ── */
    builder
      .addCase(fetchOrderList.pending, (state) => {
        state.isListLoading = true;
      })
      .addCase(fetchOrderList.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchOrderList.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.error.message ?? "Failed to fetch";
      });

    /* ── Update Status ── */
    builder
      .addCase(updateOrderStatus.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state) => {
        state.isUpdating = false;
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.error.message ?? "Failed to update status";
      });
  },
});

export const { clearError } = ordersSlice.actions;
export const ordersReducer = ordersSlice.reducer;
