/* ═══════════════════════════════════════════════════════════
   PAYMENTS MODULE SLICE — Redux Toolkit + BaseReducer
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import { buildListQuery, LIST_DEFAULT_LIMIT } from "@/src/lib/list-query";
import { ORDER_PICKER_LIMIT } from "./constants";
import type {
  AdminQrSession,
  AttemptListParams,
  AttemptListResult,
  ConfirmPaymentInput,
  OrderPaymentOverview,
  PaymentListParams,
  PaymentListResult,
  UnpaidOrderOption,
} from "./types";

/* ── State ── */

interface PaymentsState extends BaseCrudState {
  items: PaymentListResult["data"];
  total: number;
  /** Total of the transfer-content lookup (second tab) */
  attemptsTotal: number;
  page: number;
  limit: number;
  isListLoading: boolean;
}

const initialState: PaymentsState = {
  ...baseCrudInitialState,
  items: [],
  total: 0,
  attemptsTotal: 0,
  page: 1,
  limit: LIST_DEFAULT_LIMIT,
  isListLoading: false,
};

/* ── Thunks ── */

export const fetchPaymentTransactions = createAsyncThunk(
  "payments/fetchTransactions",
  async (params: PaymentListParams) => {
    const qs = buildListQuery(params, {
      verificationStatus: params.verificationStatus,
      orderId: params.orderId,
      /* The BE accepts only `true` / `false`; absent = no filter */
      needsReview: params.needsReview ? "true" : undefined,
    });
    return authApi.get<PaymentListResult>(`/api/admin/payments/transactions?${qs}`);
  }
);

/** Every transfer code ever issued, searchable by the content printed on a bank statement */
export const fetchPaymentAttempts = createAsyncThunk("payments/fetchAttempts", async (params: AttemptListParams) => {
  const qs = buildListQuery(params, { status: params.status, orderId: params.orderId });
  return authApi.get<AttemptListResult>(`/api/admin/payments/attempts?${qs}`);
});

export const fetchOrderPayment = createAsyncThunk("payments/fetchOrderPayment", async (orderId: string) => {
  const res = await authApi.get<{ data: OrderPaymentOverview }>(
    `/api/admin/payments/orders/${encodeURIComponent(orderId)}`
  );
  return res.data;
});

/** Marks an order as paid by attaching a bank transaction (or recording one the webhook never delivered) */
export const confirmOrderPayment = createAsyncThunk(
  "payments/confirmOrderPayment",
  async ({ orderId, ...body }: ConfirmPaymentInput) => {
    const res = await authApi.post<{ data: { orderId: string; paymentStatus: "paid"; paidAt: string } }>(
      `/api/admin/payments/orders/${encodeURIComponent(orderId)}/confirm`,
      body
    );
    return res.data;
  }
);

/** Generates a fresh QR for an unpaid order (customer paying at the shop, or a lost code): every earlier pending code expires at once */
export const createAdminQr = createAsyncThunk("payments/createAdminQr", async (orderId: string) => {
  const res = await authApi.post<{ data: AdminQrSession }>(`/api/admin/payments/orders/${encodeURIComponent(orderId)}/qr`);
  return res.data;
});

/** Unpaid orders matching `search` (id, customer name or phone) for the "attach to order" picker */
export const searchUnpaidOrders = createAsyncThunk("payments/searchUnpaidOrders", async (search: string) => {
  const qs = buildListQuery(
    { search: search || undefined, sort: "-createdAt", limit: ORDER_PICKER_LIMIT },
    { paymentStatus: "unpaid" }
  );
  const res = await authApi.get<{ data: UnpaidOrderOption[] }>(`/api/admin/orders?${qs}`);
  return res.data;
});

/* ── Slice ── */

export const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    ...baseCrudReducers,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentTransactions.pending, (state) => {
        state.isListLoading = true;
      })
      .addCase(fetchPaymentTransactions.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchPaymentTransactions.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.error.message ?? "Failed to fetch";
      });

    builder.addCase(fetchPaymentAttempts.fulfilled, (state, action) => {
      state.attemptsTotal = action.payload.total;
    });

    builder
      .addCase(confirmOrderPayment.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(confirmOrderPayment.fulfilled, (state) => {
        state.isUpdating = false;
      })
      .addCase(confirmOrderPayment.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.error.message ?? "Failed to confirm";
      });
  },
});

export const { clearError } = paymentsSlice.actions;
export const paymentsReducer = paymentsSlice.reducer;
