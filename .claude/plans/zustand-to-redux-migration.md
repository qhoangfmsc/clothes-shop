# Plan: Migrate Zustand → Redux Toolkit (Cart & Wishlist)

## Goal
Replace Zustand cart/wishlist stores with Redux Toolkit slices, unifying the state
management stack across admin and client. Remove Zustand as a dependency entirely.

## Current State
- **Redux Toolkit** handles 5 admin modules (products, categories, collections, users, orders)
  - `StoreProvider` wraps only `(admin)/layout.tsx`
- **Zustand** handles 2 client stores (`cart.ts`, `wishlist.ts`) with `persist` middleware + API sync methods
- Both are already in `package.json`

## Files to Create (2 new)

### 1. `src/store/slices/cartSlice.ts`
Convert the Zustand cart store to a Redux Toolkit slice + async thunks:
- **State**: `items: CartItem[]`, `isOpen: boolean`, `isSyncing: boolean`
- **Reducers**: `addItem`, `removeItem`, `updateQuantity`, `clearCart`, `toggleDrawer`, `openDrawer`, `closeDrawer`
- **Selectors**: `selectTotalItems`, `selectTotalPrice`
- **Thunks**: `syncAddToCartItem`, `syncRemoveCartItem`, `syncUpdateCartItemQuantity`, `fetchCart`, `clearCartOnServer`

### 2. `src/store/slices/wishlistSlice.ts`
Convert the Zustand wishlist store to a Redux Toolkit slice + async thunks:
- **State**: `items: WishlistItem[]`, `isSyncing: boolean`
- **Reducers**: `toggleItem`, `removeItem`, `clearWishlist`
- **Selectors**: `selectIsWishlisted(productId)`, `selectWishlistTotal`
- **Thunks**: `syncAddToWishlist`, `syncRemoveFromWishlist`, `fetchWishlist`

## Files to Modify (10)

### Infrastructure (3 files)

#### 3. `src/store/index.ts`
- Add `cart: cartReducer` and `wishlist: wishlistReducer` to the store config
- Add localStorage persistence: load initial state from localStorage on store creation, subscribe to persist cart items/wishlist items on every change

#### 4. `src/app/layout.tsx`
- Wrap `{children}` with `<StoreProvider>` (imported from `@/src/store/StoreProvider`)

#### 5. `src/app/(admin)/layout.tsx`
- **Remove** `<StoreProvider>` wrapper (now handled at root layout)

### Consumer files — Cart (4 files)
Replace `useCartStore(s => s.xxx)` with `useAppSelector` + `useAppDispatch`

#### 6. `src/app/_components/CartFAB.tsx`
- `useCartStore((s) => s.totalItems())` → `useAppSelector(selectTotalItems)`

#### 7. `src/app/_components/QuickAddDrawer.tsx`
- `useCartStore((s) => s.addItem)` + `syncCartAdd` → `dispatch(addItem(...))` + `dispatch(syncAddToCartItem(...))`

#### 8. `src/app/(private)/cart/CartContent.tsx`
- Multiple `useCartStore` selectors → `useAppSelector` with selectors
- Mutations → `dispatch(...)`
- Debounced sync pattern preserved via thunk dispatch

#### 9. `src/app/(private)/checkout/CheckoutContent.tsx`
- Cart read selectors → `useAppSelector`
- `clearCart` → `dispatch(clearCart())`

### Consumer files — Wishlist (3 files)

#### 10. `src/app/(public)/shop/_components/ProductCard.tsx`
- `useWishlistStore` → `useAppSelector` + `useAppDispatch`

#### 11. `src/app/(private)/wishlist/WishlistContent.tsx`
- `useWishlistStore` → `useAppSelector` + `useAppDispatch`

#### 12. `src/app/(private)/account/AccountContent.tsx`
- `useWishlistStore((s) => s.items)` → `useAppSelector(selectWishlistItems)`

### Consumer files — Both stores (1 file)

#### 13. `src/app/(public)/shop/[category]/[subcategory]/[productId]/_components/ProductDetailClient.tsx`
- Both cart and wishlist selectors → `useAppSelector` + `useAppDispatch`

## Files to Delete (2)

- `src/store/cart.ts`
- `src/store/wishlist.ts`

## Key Design Decisions

### Persistence Strategy
No `redux-persist` dependency. Instead:
1. On store creation in `configureStore`, read `localStorage.getItem("ori-baebi-cart")` and `localStorage.getItem("ori-baebi-wishlist")` to preload initial state
2. Use `store.subscribe()` to persist `state.cart.items` and `state.wishlist.items` on every change (debounced with a ref)

### API Sync Pattern
The Zustand stores had API sync methods mixed in. The Redux version uses thunks:
- Thunks call API → dispatch success/failure actions
- Existing pattern preserved: local state updates instantly, API syncs in background

### Selector Pattern
Computed values (`totalItems()`, `totalPrice()`, `isWishlisted()`) become memoized selectors:
```ts
export const selectTotalItems = (state: RootState) =>
  state.cart.items.reduce((sum, i) => sum + i.quantity, 0);
```

### Provider Strategy
Move `StoreProvider` to the root `app/layout.tsx` so Redux is available everywhere.
Remove it from `app/(admin)/layout.tsx` to avoid double-wrapping.

## Migration Order
1. Create `cartSlice.ts` + `wishlistSlice.ts`
2. Update `store/index.ts` with new reducers + persistence
3. Move `StoreProvider` to root layout, remove from admin layout
4. Update all 8 consumer files (order: CartFAB → QuickAddDrawer → CartContent → CheckoutContent → ProductCard → WishlistContent → AccountContent → ProductDetailClient)
5. Delete `cart.ts` + `wishlist.ts`
6. Run `npm uninstall zustand`
7. Verify build compiles + cart/wishlist work in browser
