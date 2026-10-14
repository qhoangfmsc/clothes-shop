/* ═══════════════════════════════════════════════════════════
   ADMIN REVIEWS MODULE SLICE — Redux Toolkit + BaseReducer
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import { buildListQuery, LIST_DEFAULT_LIMIT } from "@/src/lib/list-query";
import type { AdminReview } from "@/src/types/review";
import type { ReviewListParams, ReviewListResult } from "./types";

/* ── State ── */

interface ReviewsState extends BaseCrudState {
  items: AdminReview[];
  total: number;
  page: number;
  limit: number;
  isListLoading: boolean;
}

const initialState: ReviewsState = {
  ...baseCrudInitialState,
  items: [],
  total: 0,
  page: 1,
  limit: LIST_DEFAULT_LIMIT,
  isListLoading: false,
};

const reviewUrl = (reviewId: string) => `/api/admin/reviews/${encodeURIComponent(reviewId)}`;

/* ── Thunks ── */

export const fetchReviews = createAsyncThunk("reviews/fetchReviews", async (params: ReviewListParams) => {
  const qs = buildListQuery(params, {
    status: params.status,
    rating: params.rating,
    fit: params.fit,
    hasImages: params.hasImages,
    product: params.product,
    userId: params.userId,
    replied: params.replied,
  });
  return authApi.get<ReviewListResult>(`/api/admin/reviews?${qs}`);
});

export const fetchReviewDetail = createAsyncThunk("reviews/fetchReviewDetail", async (reviewId: string) => {
  const res = await authApi.get<{ data: AdminReview }>(reviewUrl(reviewId));
  return res.data;
});

/** `note` is the reason the author reads */
export const hideReview = createAsyncThunk(
  "reviews/hideReview",
  async ({ reviewId, note }: { reviewId: string; note: string }) => {
    const res = await authApi.post<{ data: AdminReview }>(`${reviewUrl(reviewId)}/hide`, { note });
    return res.data;
  }
);

export const publishReview = createAsyncThunk("reviews/publishReview", async (reviewId: string) => {
  const res = await authApi.post<{ data: AdminReview }>(`${reviewUrl(reviewId)}/publish`);
  return res.data;
});

/** Sets or replaces the store's public reply */
export const replyToReview = createAsyncThunk(
  "reviews/replyToReview",
  async ({ reviewId, content }: { reviewId: string; content: string }) => {
    const res = await authApi.put<{ data: AdminReview }>(`${reviewUrl(reviewId)}/reply`, { content });
    return res.data;
  }
);

export const deleteReviewReply = createAsyncThunk("reviews/deleteReviewReply", async (reviewId: string) => {
  const res = await authApi.delete<{ data: AdminReview }>(`${reviewUrl(reviewId)}/reply`);
  return res.data;
});

/* ── Slice ── */

export const reviewsSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {
    ...baseCrudReducers,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.isListLoading = true;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.error.message ?? "Failed to fetch";
      });

    for (const thunk of [hideReview, publishReview, replyToReview, deleteReviewReply]) {
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

export const { clearError } = reviewsSlice.actions;
export const reviewsReducer = reviewsSlice.reducer;
