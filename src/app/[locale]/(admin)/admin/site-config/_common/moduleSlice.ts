/* ═══════════════════════════════════════════════════════════
   SITE CONFIG MODULE SLICE — Redux Toolkit + BaseReducer
   ═══════════════════════════════════════════════════════════ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers, type BaseCrudState } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import type { SiteConfig, SiteConfigKeyMeta } from "@/src/types/site-config";

/* ── State ── */

interface SiteConfigState extends BaseCrudState {
  keys: SiteConfigKeyMeta[];
  items: SiteConfig[];
  isListLoading: boolean;
}

const initialState: SiteConfigState = {
  ...baseCrudInitialState,
  keys: [],
  items: [],
  isListLoading: false,
};

/* ── Thunks ── */

export const fetchSiteConfigKeys = createAsyncThunk("siteConfig/fetchKeys", async () => {
  return authApi.get<{ data: SiteConfigKeyMeta[] }>("/api/admin/site-config/keys");
});

export const fetchSiteConfigList = createAsyncThunk("siteConfig/fetchList", async () => {
  return authApi.get<{ data: SiteConfig[]; total: number }>("/api/admin/site-config");
});

export const upsertSiteConfig = createAsyncThunk(
  "siteConfig/upsert",
  async ({ key, value }: { key: string; value: string }) => {
    const res = await authApi.put<{ data: SiteConfig }>(`/api/admin/site-config/${key}`, { value });
    return res.data;
  }
);

export const deleteSiteConfig = createAsyncThunk("siteConfig/delete", async (key: string) => {
  await authApi.delete(`/api/admin/site-config/${key}`);
  return key;
});

/* ── Slice ── */

export const siteConfigSlice = createSlice({
  name: "siteConfig",
  initialState,
  reducers: {
    ...baseCrudReducers,
  },
  extraReducers: (builder) => {
    /* ── Keys ── */
    builder.addCase(fetchSiteConfigKeys.fulfilled, (state, action) => {
      state.keys = action.payload.data;
    });

    /* ── List ── */
    builder
      .addCase(fetchSiteConfigList.pending, (state) => {
        state.isListLoading = true;
      })
      .addCase(fetchSiteConfigList.fulfilled, (state, action) => {
        state.isListLoading = false;
        state.items = action.payload.data;
      })
      .addCase(fetchSiteConfigList.rejected, (state, action) => {
        state.isListLoading = false;
        state.error = action.error.message ?? "Failed to fetch";
      });

    /* ── Upsert ── */
    builder
      .addCase(upsertSiteConfig.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(upsertSiteConfig.fulfilled, (state, action) => {
        state.isUpdating = false;
        const idx = state.items.findIndex((c) => c.key === action.payload.key);
        if (idx >= 0) {
          state.items[idx] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })
      .addCase(upsertSiteConfig.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.error.message ?? "Failed to save";
      });

    /* ── Delete ── */
    builder
      .addCase(deleteSiteConfig.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteSiteConfig.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.items = state.items.filter((c) => c.key !== action.payload);
      })
      .addCase(deleteSiteConfig.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.error.message ?? "Failed to delete";
      });
  },
});

export const { clearError } = siteConfigSlice.actions;
export const siteConfigReducer = siteConfigSlice.reducer;
