# Plan: Refactor Client Slices → Module `_common/` Pattern

## Goal
Apply the `_common/moduleSlice.ts` pattern (from `.agent/skills/02-api-slice-pattern.md`) to client-side cart and wishlist modules, aligning their architecture with admin modules.

## Current Problem
Cart/wishlist slices live in `src/store/slices/` (outside their modules), breaking the rule:
> "Tuyệt đối không: để slice, types form, constants của module ra ngoài root dir."

Admin modules follow the correct pattern:
```
admin/products/_common/moduleSlice.ts
admin/products/_common/types.ts
admin/products/_common/constants.ts
```

Client modules need the same structure:
```
(private)/cart/_common/moduleSlice.ts
(private)/cart/_common/types.ts
(private)/wishlist/_common/moduleSlice.ts
(private)/wishlist/_common/types.ts
```

## Files to Create (4)

### 1. `src/app/(private)/cart/_common/types.ts`
Extract `CartItem` interface from current slice into a module-level types file.

### 2. `src/app/(private)/cart/_common/moduleSlice.ts`
Move cart slice here. Keep same logic (reducers, thunks, selectors). Update API thunks to import `apiFetchStandalone` from `@/src/hooks/use-api-auth` (same pattern as before, just relocated). Export `cartReducer` as default module export.

### 3. `src/app/(private)/wishlist/_common/types.ts`
Extract `WishlistItem` interface.

### 4. `src/app/(private)/wishlist/_common/moduleSlice.ts`
Move wishlist slice here. Export `wishlistReducer`.

## Files to Modify (10)

### 5. `src/store/index.ts`
```diff
- import { cartReducer } from "./slices/cartSlice";
- import { wishlistReducer } from "./slices/wishlistSlice";
+ import { cartReducer } from "@/src/app/(private)/cart/_common/moduleSlice";
+ import { wishlistReducer } from "@/src/app/(private)/wishlist/_common/moduleSlice";
```

### 6-13. All 8 consumer files — update import paths
Replace `@/src/store/slices/cartSlice` → `@/src/app/(private)/cart/_common/moduleSlice`
Replace `@/src/store/slices/wishlistSlice` → `@/src/app/(private)/wishlist/_common/moduleSlice`

| # | File | Imports to update |
|---|------|-------------------|
| 6 | `CartFAB.tsx` | `selectTotalItems` from cart moduleSlice |
| 7 | `QuickAddDrawer.tsx` | `addItem`, `syncAddToCartItem` from cart moduleSlice |
| 8 | `CartContent.tsx` | All cart exports from cart moduleSlice |
| 9 | `CheckoutContent.tsx` | All cart exports from cart moduleSlice |
| 10 | `WishlistContent.tsx` | All wishlist exports from wishlist moduleSlice |
| 11 | `AccountContent.tsx` | `selectWishlistItems` from wishlist moduleSlice |
| 12 | `ProductCard.tsx` | All wishlist exports from wishlist moduleSlice |
| 13 | `ProductDetailClient.tsx` | Both cart + wishlist exports |

### 14. `.agent/skills/01-project-structure.md`
Line 91: Remove `(Zustand hoặc Redux)` → just `Redux`
```
- │       │       ├── moduleSlice.ts  #   Cart store (Zustand hoặc Redux)
+ │       │       ├── moduleSlice.ts  #   Cart store (Redux Toolkit)
```
Same for wishlist on line 98.

## Files to Delete (2 + dir)
- `src/store/slices/cartSlice.ts`
- `src/store/slices/wishlistSlice.ts`
- `src/store/slices/` directory (empty after removal)

## No Zustand references found anywhere
- `.agent/skills/` — clean (only mention in `01-project-structure.md` as "Zustand hoặc Redux" comment, being fixed above)
- All `.ts`/`.tsx` files — clean
- `package.json` — already uninstalled

## Build Verification
Run `npx next build` to confirm zero errors after all changes.
