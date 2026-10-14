/* ═══════════════════════════════════════════════════════════
   REFUNDS MODULE SLICE — Redux Toolkit + BaseReducer
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import { buildListQuery, LIST_DEFAULT_LIMIT } from "@/src/lib/list-query";
import type { CompleteRefundInput, Refund, RefundListParams, RefundListResult, RejectRefundInput } from "./types";

/* ── State ── */

interface RefundsState extends BaseCrudState {
  items: Refund[];
  total: number;
  page: number;
  limit: number;
  isListLoading: boolean;
}

const initialState: RefundsState = {
  ...baseCrudInitialState,
  items: [],
  total: 0,
  page: 1,
  limit: LIST_DEFAULT_LIMIT,
  isListLoading: false,
};

/* ── Thunks ── */

export const fetchRefunds = createAsyncThunk("refunds/fetchRefunds", async (params: RefundListParams) => {
  const qs = buildListQuery(params, { status: params.status, orderId: params.orderId });
  return authApi.get<RefundListResult>(`/api/admin/refunds?${qs}`);
});

/** The `REQUESTED` refunds of one order (to know whether "create a refund request" is still needed) */
export const fetchOrderOpenRefunds = createAsyncThunk("refunds/fetchOrderOpenRefunds", async (orderId: string) => {
  const qs = buildListQuery({ limit: 1 }, { status: "REQUESTED", orderId });
  const res = await authApi.get<RefundListResult>(`/api/admin/refunds?${qs}`);
  return res.total;
});

/** The admin transferred the money back: records the bank reference */
export const completeRefund = createAsyncThunk(
  "refunds/completeRefund",
  async ({ refundId, ...body }: CompleteRefundInput) => {
    const res = await authApi.post<{ data: Refund }>(`/api/admin/refunds/${encodeURIComponent(refundId)}/complete`, body);
    return res.data;
  }
);

export const rejectRefund = createAsyncThunk("refunds/rejectRefund", async ({ refundId, ...body }: RejectRefundInput) => {
  const res = await authApi.post<{ data: Refund }>(`/api/admin/refunds/${encodeURIComponent(refundId)}/reject`, body);
  return res.data;
});

/** Opens a refund request for a cancelled, paid order that has none (cancelled before refunds existed, or a rejected one) */
export const createRefund = createAsyncThunk("refunds/createRefund", async (orderId: string) => {
  const res = await authApi.post<{ data: Refund }>("/api/admin/refunds", { orderId });
  return res.data;
});

/* ── Slice ── */

export const refundsSlice = createSlice({
  name: "refunds",
  initialState,
  reducers: {
    ...baseCrudReducers,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRefunds.pending, (state) => {
        state.isListLoading = true;
      })
      .addCase(fetchRefunds.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchRefunds.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.error.message ?? "Failed to fetch";
      });

    for (const thunk of [completeRefund, rejectRefund, createRefund]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.isUpdating = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state) => {
          state.isUpdating = false;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.isUpdating = false;
          state.error = action.error.message ?? "Failed";
        });
    }
  },
});

export const { clearError } = refundsSlice.actions;
export const refundsReducer = refundsSlice.reducer;
