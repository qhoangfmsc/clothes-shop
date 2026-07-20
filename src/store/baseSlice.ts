/* ═══════════════════════════════════════════════════════════
   BASE REDUCER — Common CRUD state & reducers

   Every module slice spreads these into its own createSlice().
   This keeps loading/error state DRY and consistent across
   all admin modules.

   Usage in module _common/moduleSlice.ts:
     import { baseCrudInitialState, baseCrudReducers } from "@/src/store/baseSlice";

     const productsSlice = createSlice({
       name: "products",
       initialState: { ...baseCrudInitialState, items: [] },
       reducers: {
         ...baseCrudReducers,
         // module-specific reducers here
       },
     });
   ═══════════════════════════════════════════════════════════ */

import type { PayloadAction } from "@reduxjs/toolkit";

/* ── State ── */

export interface BaseCrudState {
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
}

export const baseCrudInitialState: BaseCrudState = {
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
};

/* ── Reducers (Immer-powered mutations) ── */

export const baseCrudReducers = {
  createStart(state: BaseCrudState) {
    state.isCreating = true;
    state.error = null;
  },
  createSuccess(state: BaseCrudState) {
    state.isCreating = false;
  },
  createError(state: BaseCrudState, action: PayloadAction<string>) {
    state.isCreating = false;
    state.error = action.payload;
  },

  updateStart(state: BaseCrudState) {
    state.isUpdating = true;
    state.error = null;
  },
  updateSuccess(state: BaseCrudState) {
    state.isUpdating = false;
  },
  updateError(state: BaseCrudState, action: PayloadAction<string>) {
    state.isUpdating = false;
    state.error = action.payload;
  },

  deleteStart(state: BaseCrudState) {
    state.isDeleting = true;
    state.error = null;
  },
  deleteSuccess(state: BaseCrudState) {
    state.isDeleting = false;
  },
  deleteError(state: BaseCrudState, action: PayloadAction<string>) {
    state.isDeleting = false;
    state.error = action.payload;
  },

  clearError(state: BaseCrudState) {
    state.error = null;
  },
};
