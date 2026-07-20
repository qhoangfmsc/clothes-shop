# Plan: Migrate to New Admin API Conventions

## Summary

Update all admin API hooks and consuming pages to match the new BE conventions:
- **Endpoints:** `/api/products` → `/api/admin/products`, `/api/categories` → `/api/admin/categories`, `/api/collections` → `/api/admin/collections`
- **Auth:** All admin GET now requires auth (remove `public: true`)
- **Sort convention:** `field` = DESC, `-field` = ASC, default `createdAt`
- **New filters:** `status` on products, `season` on collections, `search` on all

---

## 1. `use-admin-api.ts` — Hook Changes

### `useAdminProducts`
| Aspect | Old | New |
|--------|-----|-----|
| GET endpoint | `/api/products` (public) | `/api/admin/products` (auth) |
| `subcategory` filter | ✅ | ❌ remove |
| `status` filter | ❌ | ✅ add (active/disbled) |
| Sort comment | `price_asc \| price_desc \| newest` | `price \| -price \| createdAt \| -createdAt \| name \| -name` |
| Default sort | undefined (passed as-is) | `createdAt` (sent when sort is set) |

### `useAdminCategories`
| Aspect | Old | New |
|--------|-----|-----|
| GET endpoint | `/api/categories` (public) | `/api/admin/categories` (auth) |
| Params | none | +`search`, `sort`, `page`, `limit` |
| Signature change | `useAdminCategories()` | `useAdminCategories(filters?)` |

### `useAdminCollections`
| Aspect | Old | New |
|--------|-----|-----|
| GET endpoint | `/api/collections` (public) | `/api/admin/collections` (auth) |
| Params | none | +`search`, `season`, `sort`, `page`, `limit` |
| Signature change | `useAdminCollections()` | `useAdminCollections(filters?)` |

### `useAdminOrders`
| Aspect | Old | New |
|--------|-----|-----|
| `search` param | ❌ | ✅ add |
| `sort` param | ❌ | ✅ add |

---

## 2. `ProductsContent.tsx` — Page Changes

- `fetchProducts`: switch URL to `/api/admin/products`
- Update `SORT_OPTIONS`:
  ```ts
  { value: "createdAt", label: "Newest" }       // was "newest"
  { value: "-price", label: "Price ↑" }          // was "price_asc"
  { value: "price", label: "Price ↓" }           // was "price_desc"
  ```
- Add `status` filter to DataTable:
  ```ts
  { key: "status", label: "Status", options: [
    { value: "active", label: "Active" },
    { value: "disabled", label: "Disabled" },
  ]}
  ```
- `useAdminCategories()` now needs `limit: 200` for the modal form dropdown

---

## 3. Other Pages — Minimal Updates

| Page | Change |
|------|--------|
| `DashboardContent.tsx` | None needed (pass through hook, hook handles endpoint) |
| `CategoriesContent.tsx` | Now receives search/sort/page/limit from hook (pass through) |
| `CollectionsContent.tsx` | Now receives search/season/sort/page/limit (pass through) |
| `OrdersContent.tsx` | Add search/sort params |
| `UsersContent.tsx` | No change already at `/api/admin/users` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-admin-api.ts` | Endpoints, auth, params, interfaces |
| `src/app/(admin)/admin/products/ProductsContent.tsx` | fetchProducts URL, SORT_OPTIONS, status filter, categories limit |
