# 01 — Cấu trúc thư mục & Module Architecture

## Nguyên tắc module hóa

```
ROOT (src/)           ← Chỉ chứa code dùng CHUNG ≥2 modules
  lib/                ← Cross-project libraries
  types/              ← Entity types dùng cross-module
  hooks/              ← Hooks dùng cross-module
  store/              ← Re-exports + cross-app stores

MODULE (app/.../tên/) ← Mọi thứ riêng của module nằm TRONG module
  _common/            ← Slice, types, constants, hooks riêng module
  _components/        ← UI components riêng module
```

**Tuyệt đối không:** để slice, types form, constants của module ra ngoài root dir.

---

## Cây thư mục chuẩn

```
src/
├── lib/                            # ⭐ Cross-project: dùng cho toàn dự án
│   ├── api.ts                      #   Public fetch — không auth
│   └── auth-api.ts                 #   Auth fetch — token, refresh
│
├── types/                          # ⭐ Cross-module: entity types dùng ≥2 nơi
│   ├── product.ts                  #   Product, ProductColor, ProductCategory
│   ├── category.ts                 #   Category, SubCategory
│   └── collection.ts               #   Collection
│
├── hooks/                          # ⭐ Cross-module: hooks dùng ≥2 nơi
│   ├── use-api-auth.ts             #   Auth hook
│   ├── use-admin-api.ts            #   Admin SWR hooks (gọi authApi)
│   └── use-debounce.ts             #   Debounce hook
│
├── store/                          # ⭐ Redux store — central config + base
│   ├── index.ts                    #   configureStore — import reducers từ modules
│   ├── baseSlice.ts                #   BaseReducer — common CRUD state & reducers
│   ├── hooks.ts                    #   useAppDispatch, useAppSelector (typed)
│   └── StoreProvider.tsx           #   'use client' — Redux Provider wrapper
│
├── app/
│   ├── _components/                # Shared components (≥2 modules)
│   │   ├── DataTable.tsx
│   │   ├── RoleGuard.tsx
│   │   └── Toast.tsx
│   │
│   ├── (admin)/admin/
│   │   ├── page.tsx
│   │   ├── DashboardContent.tsx
│   │   │
│   │   ├── products/               # ← Module: admin/products
│   │   │   ├── page.tsx
│   │   │   ├── ProductsContent.tsx
│   │   │   ├── _common/            # Module-internal: logic + data
│   │   │   │   ├── moduleSlice.ts  #   Redux slice (createAsyncThunk + BaseReducer)
│   │   │   │   ├── types.ts        #   ProductFormData, ProductListParams
│   │   │   │   └── constants.ts    #   SORT_OPTIONS, SIZE_GROUPS, ...
│   │   │   └── _components/        # Module-internal: UI (nếu cần tách)
│   │   │
│   │   ├── categories/             # ← Module: admin/categories
│   │   │   ├── page.tsx
│   │   │   ├── CategoriesContent.tsx
│   │   │   └── _common/
│   │   │       ├── moduleSlice.ts
│   │   │       └── types.ts
│   │   │
│   │   ├── orders/                 # ← Module: admin/orders
│   │   │   ├── page.tsx
│   │   │   ├── OrdersContent.tsx
│   │   │   └── _common/
│   │   │       ├── moduleSlice.ts
│   │   │       └── types.ts
│   │   │
│   │   ├── collections/            # ← Module: admin/collections
│   │   └── users/                  # ← Module: admin/users
│   │
│   ├── (public)/                   # Route group: public pages
│   │   ├── layout.tsx
│   │   ├── landing-page/
│   │   └── about/
│   │
│   └── (private)/                  # Route group: protected pages
│       ├── cart/                   # ← Module: cart
│       │   ├── page.tsx
│       │   ├── CartContent.tsx
│       │   └── _common/
│       │       ├── moduleSlice.ts  #   Cart store (Zustand hoặc Redux)
│       │       └── types.ts        #   CartItem
│       │
│       ├── wishlist/               # ← Module: wishlist
│       │   ├── page.tsx
│       │   ├── WishlistContent.tsx
│       │   └── _common/
│       │       ├── moduleSlice.ts  #   Wishlist store
│       │       └── types.ts        #   WishlistItem
│       │
│       └── account/
```

---

## Module Anatomy (chi tiết)

```
app/(group)/module-name/
├── page.tsx                        # Route entry (mỏng — chỉ re-export Content)
├── ModuleContent.tsx               # Main component (UI + orchestration)
├── _common/                        # Logic + data — private to module
│   ├── moduleSlice.ts              # Redux slice (createAsyncThunk + BaseReducer)
│   ├── types.ts                    # FormData, ListParams, Filter types
│   ├── constants.ts                # Options, labels, configs
│   └── hooks.ts                    # Module-specific hooks (nếu cần)
└── _components/                    # UI components — private to module
    ├── FormModal.tsx               # (nếu tách form khỏi Content)
    └── DetailPanel.tsx             # (nếu có panel chi tiết)
```

### Quy tắc `_common/`

| File | Chứa gì | Ví dụ |
|------|---------|-------|
| `moduleSlice.ts` | Redux slice (createAsyncThunk + BaseReducer) | `productsSlice`, `fetchProductList` |
| `types.ts` | Types cho form data, list params, filter configs | `ProductFormData`, `ProductListParams` |
| `constants.ts` | Constants dùng trong module | `SORT_OPTIONS`, `SIZE_GROUPS` |
| `hooks.ts` | Custom hooks riêng module | `useProductForm()` |

### Quy tắc `_components/`

- Component UI riêng của module → `_components/`
- Ví dụ: `FormModal.tsx` (tách form khỏi Content khi quá dài)
- Không export ra ngoài module

---

## Quy tắc phân loại

| Code dùng ở đâu | Đặt ở đâu | Ví dụ |
|-----------------|-----------|-------|
| ≥2 modules admin | `src/hooks/` | `use-admin-api.ts` (SWR hooks chung) |
| ≥2 modules bất kỳ | `src/lib/` | `api.ts`, `auth-api.ts` |
| ≥2 modules bất kỳ | `src/app/_components/` | `DataTable`, `RoleGuard`, `Toast` |
| ≥2 modules bất kỳ | `src/types/` | Entity types: `Product`, `Category` |
| 1 module duy nhất | `module/_common/` | Slice, form types, constants |
| 1 module duy nhất | `module/_components/` | FormModal, DetailPanel |

---

## Anti-patterns

```
❌ src/types/product.ts chứa ProductFormData    → Sai! Vào module/_common/types.ts
❌ src/store/products-slice.ts                  → Sai! Vào module/_common/moduleSlice.ts
❌ src/constants/admin-products.ts              → Sai! Vào module/_common/constants.ts
❌ Component chứa SORT_OPTIONS, SIZE_GROUPS     → Sai! Vào module/_common/constants.ts
```

---

## Đặt tên

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Route folders | `kebab-case` | `landing-page/` |
| Route groups | `(camelCase)` | `(public)/`, `(admin)/` |
| Private folders | `_prefix` | `_common/`, `_components/` |
| Component files | `PascalCase` | `ProductsContent.tsx` |
| Slice file | `moduleSlice.ts` | `_common/moduleSlice.ts` |
| Types file | `types.ts` | `_common/types.ts` |
| Constants file | `constants.ts` | `_common/constants.ts` |

---

## Import Rules

| Từ | Đến | Cách import |
|----|-----|-------------|
| Cùng module | `_common/`, `_components/` | Relative `./_common/slice` |
| Root lib | `src/lib/` | Absolute `@/src/lib/api` |
| Root hooks | `src/hooks/` | Absolute `@/src/hooks/use-admin-api` |
| Root types | `src/types/` | Absolute `@/src/types/product` |
| Shared components | `src/app/_components/` | Absolute `@/src/app/_components/DataTable` |
| Store re-exports | `src/store/` | Absolute `@/src/store` |
