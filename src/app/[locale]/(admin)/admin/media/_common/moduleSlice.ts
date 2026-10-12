/* ═══════════════════════════════════════════════════════════
   MEDIA MODULE SLICE — Redux Toolkit + BaseReducer

   Uploads go through the shared `uploadMediaFile` (src/hooks/use-media-upload.ts):
   product / category / collection forms upload too, so it isn't module-private.
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import { buildListQuery, LIST_DEFAULT_LIMIT } from "@/src/lib/list-query";
import { ApiError } from "@/src/lib/api";
import type { MediaError, MediaFile, MediaListParams, MediaListResult } from "./types";

/* ── State ── */

interface MediaState extends BaseCrudState {
  items: MediaFile[];
  total: number;
  page: number;
  limit: number;
  isListLoading: boolean;
  isPinging: boolean;
}

const initialState: MediaState = {
  ...baseCrudInitialState,
  items: [],
  total: 0,
  page: 1,
  limit: LIST_DEFAULT_LIMIT,
  isListLoading: false,
  isPinging: false,
};

/* ── Errors ──
   Thunks reject with a plain `{ message, errorCode }` so the page can tell "storage not
   configured" (errorCode 1601) from a real failure, and still show the server's own text. */

function toMediaError(err: unknown): MediaError {
  if (err instanceof ApiError) return { message: err.message, errorCode: err.errorCode };
  return { message: err instanceof Error ? err.message : "" };
}

/* ── Thunks ── */

export const fetchMediaList = createAsyncThunk<
  MediaListResult,
  MediaListParams,
  { rejectValue: MediaError }
>("media/fetchList", async (params, { rejectWithValue }) => {
  const qs = buildListQuery(params);
  try {
    return await authApi.get<MediaListResult>(`/api/admin/media?${qs}`);
  } catch (err) {
    return rejectWithValue(toMediaError(err));
  }
});

export const deleteMediaFile = createAsyncThunk<string, string, { rejectValue: MediaError }>(
  "media/delete",
  async (id, { rejectWithValue }) => {
    try {
      await authApi.delete(`/api/admin/media/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(toMediaError(err));
    }
  }
);

/** Deletes several files. Resolves with how many succeeded / failed instead of rejecting,
 *  so one bad file doesn't stop the rest and the page can report a partial failure. */
export const deleteMediaFiles = createAsyncThunk(
  "media/deleteMany",
  async (ids: string[]): Promise<{ succeeded: number; failed: number }> => {
    const results = await Promise.allSettled(
      ids.map((id) => authApi.delete(`/api/admin/media/${id}`))
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    return { succeeded: ids.length - failed, failed };
  }
);

/** Checks that the Supabase service role key and bucket are reachable. */
export const pingMedia = createAsyncThunk<void, void, { rejectValue: MediaError }>(
  "media/ping",
  async (_arg, { rejectWithValue }) => {
    try {
      await authApi.get("/api/admin/media/ping");
    } catch (err) {
      return rejectWithValue(toMediaError(err));
    }
  }
);

/* ── Slice ── */

export const mediaSlice = createSlice({
  name: "media",
  initialState,
  reducers: {
    ...baseCrudReducers,
  },
  extraReducers: (builder) => {
    /* ── List ── */
    builder
      .addCase(fetchMediaList.pending, (state) => {
        state.isListLoading = true;
      })
      .addCase(fetchMediaList.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
      })
      .addCase(fetchMediaList.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.payload?.message || action.error.message || "Failed to fetch";
      });

    /* ── Delete (one + many) ── */
    builder
      .addCase(deleteMediaFile.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteMediaFile.fulfilled, (state) => {
        state.isDeleting = false;
      })
      .addCase(deleteMediaFile.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.payload?.message || action.error.message || "Failed to delete";
      })
      .addCase(deleteMediaFiles.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteMediaFiles.fulfilled, (state) => {
        state.isDeleting = false;
      })
      .addCase(deleteMediaFiles.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.error.message ?? "Failed to delete";
      });

    /* ── Ping ── */
    builder
      .addCase(pingMedia.pending, (state) => {
        state.isPinging = true;
      })
      .addCase(pingMedia.fulfilled, (state) => {
        state.isPinging = false;
      })
      .addCase(pingMedia.rejected, (state) => {
        state.isPinging = false;
      });
  },
});

export const { clearError } = mediaSlice.actions;
export const mediaReducer = mediaSlice.reducer;
