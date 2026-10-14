/* ═══════════════════════════════════════════════════════════
   RETURNS MODULE SLICE — Redux Toolkit + BaseReducer
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import { buildListQuery, LIST_DEFAULT_LIMIT } from "@/src/lib/list-query";
import type { ReceiveReturnInput, ReturnListParams, ReturnListResult, ReturnRequest } from "./types";

/* ── State ── */

interface ReturnsState extends BaseCrudState {
  items: ReturnRequest[];
  total: number;
  page: number;
  limit: number;
  isListLoading: boolean;
}

const initialState: ReturnsState = {
  ...baseCrudInitialState,
  items: [],
  total: 0,
  page: 1,
  limit: LIST_DEFAULT_LIMIT,
  isListLoading: false,
};

/* ── Thunks ── */

export const fetchReturns = createAsyncThunk("returns/fetchReturns", async (params: ReturnListParams) => {
  const qs = buildListQuery(params, { status: params.status, orderId: params.orderId });
  return authApi.get<ReturnListResult>(`/api/admin/returns?${qs}`);
});

export const fetchReturnDetail = createAsyncThunk("returns/fetchReturnDetail", async (returnId: string) => {
  const res = await authApi.get<{ data: ReturnRequest }>(`/api/admin/returns/${encodeURIComponent(returnId)}`);
  return res.data;
});

/** Lets the customer send the parcel back; `note` is the shipping instructions (optional) */
export const approveReturn = createAsyncThunk(
  "returns/approveReturn",
  async ({ returnId, note }: { returnId: string; note?: string }) => {
    const res = await authApi.post<{ data: ReturnRequest }>(
      `/api/admin/returns/${encodeURIComponent(returnId)}/approve`,
      note ? { note } : {}
    );
    return res.data;
  }
);

/** `note` is the reason and is shown to the customer */
export const rejectReturn = createAsyncThunk(
  "returns/rejectReturn",
  async ({ returnId, note }: { returnId: string; note: string }) => {
    const res = await authApi.post<{ data: ReturnRequest }>(
      `/api/admin/returns/${encodeURIComponent(returnId)}/reject`,
      { note }
    );
    return res.data;
  }
);

/** The parcel arrived and was checked: fixes the accepted quantities and opens the refund request */
export const receiveReturn = createAsyncThunk(
  "returns/receiveReturn",
  async ({ returnId, ...body }: ReceiveReturnInput) => {
    const res = await authApi.post<{ data: ReturnRequest }>(
      `/api/admin/returns/${encodeURIComponent(returnId)}/receive`,
      body
    );
    return res.data;
  }
);

/* ── Slice ── */

export const returnsSlice = createSlice({
  name: "returns",
  initialState,
  reducers: {
    ...baseCrudReducers,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReturns.pending, (state) => {
        state.isListLoading = true;
      })
      .addCase(fetchReturns.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchReturns.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.error.message ?? "Failed to fetch";
      });

    for (const thunk of [approveReturn, rejectReturn, receiveReturn]) {
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

export const { clearError } = returnsSlice.actions;
export const returnsReducer = returnsSlice.reducer;
