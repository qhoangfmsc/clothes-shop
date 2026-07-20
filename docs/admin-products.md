# Admin Pages — Architecture Reference

> **Pattern:** Redux Slice + DataTable + Tailwind + Modal/Panel
> **Applies to:** products, categories, collections, orders, users

---

## Architecture Layers

```
<Module>Content.tsx           ← Pure UI: renders DataTable + Modal
  │                               Zero raw fetch, zero env vars, zero URL building
  ├── Redux Thunks              ← CreateAsyncThunk in _common/moduleSlice.ts
  │     │                          Owns all API call logic
  │     └── lib/auth-api.ts     ← Authenticated fetch (token, refresh, 401)
  │
  ├── DataTable<T>              ← Reusable table: search, filters, sort, pagination
  │     └── fetchData()         ← Dispatches fetchXxxList thunk, returns { data, total }
  │
  └── SWR hooks (read-only)    ← Cross-module reference data only
        └── lib/auth-api.ts

### Rule: The Chain Never Breaks
```
Component → dispatch(thunk) → lib/auth-api.ts → fetch()

NEVER: Component → fetch() directly
NEVER: process.env outside lib/
```

---

## Module Structure (identical across all 5 modules)

```
admin/<module>/
├── page.tsx                    # Thin route entry — just renders Content
├── <Module>Content.tsx         # UI component (DataTable + Modal)
└── _common/
    ├── moduleSlice.ts          # Redux slice — createAsyncThunk + BaseReducer
    ├── types.ts                # FormData, ListParams, ListResult
    └── constants.ts            # SORT_OPTIONS, EMPTY_FORM, etc.
```

---

## Redux Store

```ts
// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import { productsReducer } from "@/src/app/(admin)/admin/products/_common/moduleSlice";
import { categoriesReducer } from "@/src/app/(admin)/admin/categories/_common/moduleSlice";
import { collectionsReducer } from "@/src/app/(admin)/admin/collections/_common/moduleSlice";
import { ordersReducer } from "@/src/app/(admin)/admin/orders/_common/moduleSlice";
import { usersReducer } from "@/src/app/(admin)/admin/users/_common/moduleSlice";

export const store = configureStore({
  reducer: {
    products: productsReducer,
    categories: categoriesReducer,
    collections: collectionsReducer,
    orders: ordersReducer,
    users: usersReducer,
  },
});
```

---

## Slice API (standard pattern)

```ts
// _common/moduleSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { baseCrudInitialState, baseCrudReducers } from "@/src/store/baseSlice";
import { authApi } from "@/src/lib/auth-api";

export const fetchXxxList = createAsyncThunk("xxx/fetchList", async (params) => {
  const qs = new URLSearchParams(/* build query */);
  return authApi.get<{ data: Xxx[]; total, page, limit }>(`/api/admin/xxx?${qs}`);
});

export const createXxx = createAsyncThunk("xxx/create", async (body) => {
  const res = await authApi.post<{ data: Xxx }>("/api/admin/xxx", body);
  return res.data;
});

// Similar: updateXxx, deleteXxx

export const xxxSlice = createSlice({
  name: "xxx",
  initialState: { ...baseCrudInitialState, items: [], total: 0, page: 1, limit: 25, isListLoading: false },
  reducers: { ...baseCrudReducers },
  extraReducers: (builder) => { /* pending/fulfilled/rejected for each thunk */ },
});

export const { clearError } = xxxSlice.actions;
export const xxxReducer = xxxSlice.reducer;
```

---

## Component Pattern

```tsx
"use client";

import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { fetchXxxList, createXxx, updateXxx, deleteXxx } from "./_common/moduleSlice";
import { DataTable, type DataTableColumn, type DataTableRef } from "@/src/app/_components/DataTable";

export default function XxxContent() {
  const dispatch = useAppDispatch();
  const { isCreating, isUpdating } = useAppSelector((s) => s.xxx);
  const tableRef = useRef<DataTableRef>(null);

  // fetchData callback for DataTable
  const fetchData = async (params: DataTableFetchParams) => {
    return dispatch(fetchXxxList({ search, sort, page, limit, ...params.filters })).unwrap();
  };

  // CRUD via dispatch(thunk).unwrap()
  const handleSubmit = async (e) => {
    await dispatch(editingId ? updateXxx({ id, body }) : createXxx(body)).unwrap();
    tableRef.current?.refresh();
  };

  const handleDelete = async (id) => {
    await dispatch(deleteXxx(id)).unwrap();
    tableRef.current?.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <DataTable<EntityType>
        tableRef={tableRef}
        title="Page Title"
        columns={columns}
        fetchData={fetchData}
        {/* ... filters, sortOptions, headerExtra */}
      />
      {/* Modal form (if module has create/edit) */}
    </div>
  );
}
```

---

## Styling Rules

1. **All styling via Tailwind utility classes** — `className="flex items-center gap-4"`
2. **CSS custom properties via Tailwind v4 canonical syntax** — `bg-(--bg-secondary)`, `text-(--text-muted)`
3. **Inline `style={}` only for dynamic values** — `style={{ background: colorHex }}`
4. **NO inline static styles** — NO `style={{ padding: "8px" }}`, NO `S:` / `FS:` objects
5. **NO new `.css` files** — `globals.css` only for `@keyframes`

---

## Adding a New Admin Module

1. Create folder: `admin/<module>/`
2. Create `_common/types.ts` — `XxxFormData`, `XxxListParams`, `XxxListResult`
3. Create `_common/constants.ts` — EMPTY_FORM, SORT_OPTIONS, etc.
4. Create `_common/moduleSlice.ts` — Redux slice with thunks
5. Create `page.tsx` — thin route entry
6. Create `<Module>Content.tsx` — DataTable + Modal, all Tailwind
7. Register reducer in `src/store/index.ts`

---

## Key Decisions

| Decision | Why |
|----------|-----|
| Redux Toolkit (not Zustand) | Centralized state, standard createAsyncThunk pattern, consistent across all admin modules |
| BaseReducer pattern | Shared CRUD loading/error state — DRY across 5 slices |
| DataTable for all lists | Zero boilerplate — search, filters, sort, pagination, loading, empty state all handled |
| authApi as module (not hook) | Callable from Redux thunks (non-React contexts) |
| Module-level slice co-location | Slice lives next to its page — easy to find, easy to delete |
| Tailwind-first styling | No inline static styles, consistent design tokens via CSS custom properties |
| SWR only for cross-module reads | `useAdminCategories()` used by products form, `useAdminProducts()` used by collections form |
