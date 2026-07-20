# Plan: Production-Grade API Lib + Store Architecture

## Architecture

```
lib/
  api.ts               — Public fetch (no auth, callable anywhere)
  auth-api.ts           — Auth-aware fetch (token, refresh, 401 handling)

store/
  index.ts              — Single centralized Zustand store (slices pattern)
  cart-slice.ts         — Cart slice (existing, moved)
  wishlist-slice.ts     — Wishlist slice (existing, moved)

app/(admin)/admin/products/
  products-slice.ts     — Admin Products slice (owns all product API calls)
  ProductsContent.tsx   — Pure UI: calls slice actions, renders
  page.tsx
```

### Rule:
1. **Components never call `apiFetch` or contain API URLs** — only slices do
2. **Slices call `lib/auth-api.ts`** for authenticated endpoints, `lib/api.ts` for public
3. **`lib/api.ts`** — simple fetch wrapper, no auth, usable everywhere
4. **`lib/auth-api.ts`** — token management, refresh flow, used by slices/stores
5. **One centralized store (`store/index.ts`)** — combines all slices via Zustand slices pattern
6. **No `process.env` outside `lib/`** — API_URL only in lib layer
7. **Module-level slices** live next to the module they serve

### Implementation

Step 1: Create `lib/api.ts` — simple public fetcher
Step 2: Create `lib/auth-api.ts` — auth-aware fetcher (extracted from hooks/use-api-auth.ts)
Step 3: Create centralized `store/index.ts` with slices pattern
Step 4: Move existing cart/wishlist into store slices
Step 5: Create `products-slice.ts` in admin/products folder
Step 6: Refactor ProductsContent — remove all raw apiFetch, use slice
Step 7: Update `use-admin-api.ts` hooks to use `lib/auth-api.ts`
Step 8: Update docs
