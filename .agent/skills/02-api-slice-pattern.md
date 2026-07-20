# 02 — API Lib & Redux Slice Architecture

## Nguyên tắc cốt lõi

```
Component (UI only)  →  dispatch(thunk)  →  lib/auth-api.ts  →  fetch()
                                              lib/api.ts       →  fetch()

TUYỆT ĐỐI KHÔNG:
  ❌ Component gọi fetch() trực tiếp
  ❌ URL API hoặc process.env nằm trong component
  ❌ Slice, types form/list để ngoài module
```

---

## Kiến trúc Store

```
src/store/
├── index.ts              # configureStore — import reducers từ modules
├── baseSlice.ts           # BaseReducer — common CRUD state & reducers
├── hooks.ts               # useAppDispatch, useAppSelector (typed)
└── StoreProvider.tsx       # 'use client' — Redux Provider

Module:
  _common/
    moduleSlice.ts          # Redux slice (createAsyncThunk + BaseReducer)
    types.ts                # FormData, ListParams
    constants.ts            # SORT_OPTIONS, ...
```

---

## `src/store/index.ts` — configureStore

```ts
import { configureStore } from "@reduxjs/toolkit";
import { productsReducer } from "@/src/app/(admin)/admin/products/_common/moduleSlice";

export const store = configureStore({
  reducer: {
    products: productsReducer,
    // Thêm module reducers ở đây khi tạo
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

## `src/store/StoreProvider.tsx` — Wrap App

```tsx
"use client";
import { Provider } from "react-redux";
import { store } from "./index";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

Đặt `<StoreProvider>` trong root layout (`src/app/layout.tsx`) để bọc toàn app.

---

## `src/store/baseSlice.ts` — BaseReducer

```ts
import type { PayloadAction } from "@reduxjs/toolkit";

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

export const baseCrudReducers = {
  createStart(state: BaseCrudState) { state.isCreating = true; state.error = null; },
  createSuccess(state: BaseCrudState) { state.isCreating = false; },
  createError(state: BaseCrudState, action: PayloadAction<string>) {
    state.isCreating = false; state.error = action.payload;
  },
  updateStart(state: BaseCrudState) { state.isUpdating = true; state.error = null; },
  updateSuccess(state: BaseCrudState) { state.isUpdating = false; },
  updateError(state: BaseCrudState, action: PayloadAction<string>) {
    state.isUpdating = false; state.error = action.payload;
  },
  deleteStart(state: BaseCrudState) { state.isDeleting = true; state.error = null; },
  deleteSuccess(state: BaseCrudState) { state.isDeleting = false; },
  deleteError(state: BaseCrudState, action: PayloadAction<string>) {
    state.isDeleting = false; state.error = action.payload;
  },
  clearError(state: BaseCrudState) { state.error = null; },
};
```

---

## Module `_common/types.ts`

```ts
// app/(admin)/admin/<module>/_common/types.ts

export interface SomethingListParams {
  search?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface SomethingFormData {
  name: string;
  slug: string;
  // ... fields
}
```

---

## Module `_common/moduleSlice.ts` — Redux Slice

```ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  baseCrudInitialState,
  baseCrudReducers,
  type BaseCrudState,
} from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";
import type { Something } from "@/src/types/something";
import type { SomethingListParams } from "./types";

/* ── State ── */
interface SomethingState extends BaseCrudState {
  items: Something[];
  total: number;
  page: number;
  limit: number;
  isListLoading: boolean;
}

const initialState: SomethingState = {
  ...baseCrudInitialState,
  items: [],
  total: 0,
  page: 1,
  limit: 25,
  isListLoading: false,
};

/* ── Thunks ── */
export const fetchSomethingList = createAsyncThunk(
  "something/fetchList",
  async (params: SomethingListParams) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.sort) qs.set("sort", params.sort);
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return authApi.get<{ data: Something[]; total: number; page: number; limit: number }>(
      `/api/admin/somethings?${qs.toString()}`
    );
  }
);

export const createSomething = createAsyncThunk(
  "something/create",
  async (body: Record<string, unknown>) => {
    const res = await authApi.post<{ data: Something }>("/api/admin/somethings", body);
    return res.data;
  }
);

export const updateSomething = createAsyncThunk(
  "something/update",
  async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
    const res = await authApi.patch<{ data: Something }>(
      `/api/admin/somethings/${id}`, body
    );
    return res.data;
  }
);

export const deleteSomething = createAsyncThunk(
  "something/delete",
  async (id: string) => {
    await authApi.delete(`/api/admin/somethings/${id}`);
    return id;
  }
);

/* ── Slice ── */
export const somethingSlice = createSlice({
  name: "something",
  initialState,
  reducers: {
    ...baseCrudReducers,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSomethingList.pending, (s) => { s.isListLoading = true; })
      .addCase(fetchSomethingList.fulfilled, (s, a) => {
        s.isListLoading = false;
        s.items = a.payload.data;
        s.total = a.payload.total;
        s.page = a.payload.page;
        s.limit = a.payload.limit;
      })
      .addCase(fetchSomethingList.rejected, (s, a) => {
        s.isListLoading = false;
        s.error = a.error.message ?? "Failed to fetch";
      });

    builder
      .addCase(createSomething.pending, (s) => { s.isCreating = true; s.error = null; })
      .addCase(createSomething.fulfilled, (s) => { s.isCreating = false; })
      .addCase(createSomething.rejected, (s, a) => {
        s.isCreating = false;
        s.error = a.error.message ?? "Failed to create";
      });

    builder
      .addCase(updateSomething.pending, (s) => { s.isUpdating = true; s.error = null; })
      .addCase(updateSomething.fulfilled, (s) => { s.isUpdating = false; })
      .addCase(updateSomething.rejected, (s, a) => {
        s.isUpdating = false;
        s.error = a.error.message ?? "Failed to update";
      });

    builder
      .addCase(deleteSomething.pending, (s) => { s.isDeleting = true; s.error = null; })
      .addCase(deleteSomething.fulfilled, (s) => { s.isDeleting = false; })
      .addCase(deleteSomething.rejected, (s, a) => {
        s.isDeleting = false;
        s.error = a.error.message ?? "Failed to delete";
      });
  },
});

export const { clearError } = somethingSlice.actions;
export const somethingReducer = somethingSlice.reducer;
```

---

## Component — Dùng Typed Hooks

```tsx
// ProductsContent.tsx
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  fetchProductList,
  createProduct,
  productsSlice,
} from "./_common/moduleSlice";

export default function ProductsContent() {
  const dispatch = useAppDispatch();
  const { items, total, isCreating, isListLoading } = useAppSelector(
    (s) => s.products
  );

  const handleSubmit = async (formData: ProductFormData) => {
    try {
      await dispatch(createProduct(formData)).unwrap();
      toast.success("Created");
      dispatch(fetchProductList({ page: 1, limit: 25 }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (/* ... */);
}
```

### DataTable Integration

Khi dùng DataTable, `fetchData` dispatch thunk:

```tsx
const fetchData = async (params: DataTableFetchParams) => {
  const result = await dispatch(
    fetchProductList({
      search: params.search || undefined,
      sort: params.sort,
      page: params.page,
      limit: params.limit,
    })
  ).unwrap();
  return { data: result.data, total: result.total };
};
```

---

## Cách thêm module mới vào Store

1. Tạo `_common/moduleSlice.ts` → export `xxxReducer`
2. Vào `src/store/index.ts`:
```ts
import { xxxReducer } from "@/src/app/(admin)/admin/xxx/_common/moduleSlice";

export const store = configureStore({
  reducer: {
    ...,
    xxx: xxxReducer,
  },
});
```

---

## Checklist khi tạo module mới

- [ ] `module/_common/types.ts` — `XxxFormData`, `XxxListParams`
- [ ] `module/_common/constants.ts` — SORT_OPTIONS, filter options
- [ ] `module/_common/moduleSlice.ts` — `createSlice` + `createAsyncThunk` + `BaseReducer`
- [ ] `src/store/index.ts` — import + add reducer
- [ ] Component dùng `useAppDispatch` / `useAppSelector` từ `@/src/store/hooks`
- [ ] KHÔNG `fetch()` hay `process.env` trong component
- [ ] Entity types cross-module → `src/types/`
- [ ] Form/list types → `module/_common/types.ts`

---

## Anti-patterns

```tsx
// ❌ Gọi fetch trực tiếp
const res = await fetch("/api/admin/products");

// ❌ process.env trong component
const URL = process.env.NEXT_PUBLIC_API_URL;

// ❌ Slice để ngoài module
// src/store/productsSlice.ts  ← SAI!

// ❌ Dùng useDispatch / useSelector thô
const dispatch = useDispatch();        // ← SAI! Dùng useAppDispatch
const x = useSelector((s) => s.x);     // ← SAI! Dùng useAppSelector

// ❌ Form types trong src/types/
// src/types/product.ts → ProductFormData  ← SAI! Vào module/_common/types.ts
```
