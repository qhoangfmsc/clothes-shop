# 🛍️ Client App — Báo cáo Tiến độ Dự án (BE + FE)

> **Ngày cập nhật:** 2026-07-23
> **Người báo cáo:** BA/PO Team
> **Phạm vi:** Backend (NestJS) + Frontend (Next.js) Client Application

---

## 📋 EXECUTIVE SUMMARY

Client App đã hoàn thành **93%** các chức năng theo phạm vi Phase 1. Hệ thống bao gồm **6 nhóm chức năng** với **25/27 features** hoàn thiện. BE Public API đã được nâng cấp đầy đủ Search + Pagination + Filter (Phase 1 BE). FE đã triển khai SearchBar, Search Results page, ShopFilters (Price/Size/Color) + SortSelect + Load More pagination cho toàn bộ shop pages.

| Chỉ số | Giá trị |
| --- | --- |
| **Tổng số Module** | 6 |
| **Tổng số Features** | 27 |
| **Hoàn thành** | ✅ 25 (93%) |
| **Có BE nhưng FE chưa dùng hết** | ⚠️ 1 (4%) |
| **Chưa có** | 🔲 1 (4%) |
| **Trạng thái tổng thể** | 🟢 **READY FOR LAUNCH** |

### Điểm nổi bật
- **BE Public API Phase 1 hoàn thành:** Search (ILIKE), Pagination (page/limit), Filter (minPrice/maxPrice/sizes/colors), Sort (5 options)
- **FE Search:** SearchBar trên Header → `/search?q=keyword` (dynamic SSR) → pagination server-side
- **FE Shop Filters:** SortSelect + FilterBar (Price Range, Size checkboxes, Color swatches) — client-side filtering từ SSR data
- **FE Pagination:** Load More button (24 items/page) trên tất cả shop pages
- Cart + Checkout flow hoạt động end-to-end: add item → sync BE → checkout (save address → create order → clear cart)
- Auth system: Google OAuth → JWT access/refresh token → session restore → auto-refresh
- PDP đầy đủ: carousel (touch/mouse/keyboard), size/color/qty, size guide, reviews, wishlist, share

### Rủi ro / Lưu ý chính
- 🟡 **FE Filter/Sort là client-side** — Lọc từ SSR data đã fetch. Hoạt động tốt với <200 sản phẩm. Khi catalog lớn hơn cần migrate sang server-side filter với URL params.
- 🟢 **Animation landing page** — GSAP + RAF loop cần test performance mobile

---

## 📈 BE↔FE INTEGRATION DASHBOARD

```
Module                     BE Endpoints   FE Features   BE↔FE Match   Trạng thái
─────────────────────────────────────────────────────────────────────────────────
Storefront (SSR)           3 (public)     10            3/3 ✅         🟢 Hoàn thiện*
Product Detail (PDP)       3 (public)     9             3/3 ✅         🟢 Hoàn thiện
Cart                       5 (auth)       6             5/5 ✅         🟢 Hoàn thiện
Checkout                   2 (auth)       4             2/2 ✅         🟢 Hoàn thiện
Auth                       3 (public+auth) 6            3/3 ✅         🟢 Hoàn thiện
Account + Orders           7 (auth)       6             5/7 ⚠️         🟡 Chưa dùng hết BE
─────────────────────────────────────────────────────────────────────────────────
TOTAL                      32 endpoints    41 features   21/23 match   🟡 91% sync
```

\* Storefront pages là SSR, dùng chung public API. Thiếu Search + Filter.

---

## 🔗 BE↔FE ENDPOINT MAPPING CHI TIẾT

### Module 1: Auth (Public + Authenticated)

| # | BE Endpoint | Method | Auth | FE Sử dụng | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | `/api/auth/google` | `POST` | Public | `AuthContext.login(idToken)` — Google OAuth flow | ✅ |
| 2 | `/api/auth/me` | `GET` | Bearer | `AuthContext.fetchMe()` — Session restore + user state | ✅ |
| 3 | `/api/auth/refresh` | `POST` | Public | `AuthContext.tryRefresh()` + `useApiAuth.refreshOnce()` | ✅ |

**BE Implementation:**
- Google OAuth: verify Google `idToken` → find/create user → issue JWT access + refresh token
- Token response: `{ accessToken, refreshToken, user }`
- JWT strategy: extract user từ access token, attach vào `request.user`

**FE Implementation:**
- `AuthContext` (`contexts/auth-context.tsx`):
  - `login()`: Google OAuth → lưu tokens vào localStorage → set user
  - Session restore on mount: check token → `GET /api/auth/me` → fail thì `POST /api/auth/refresh` → fail thì clear
  - `logout()`: clear localStorage
- `useApiAuth` hook (`hooks/use-api-auth.ts`): Authenticated fetch với auto-refresh 401 → retry 1 lần
- `apiFetchStandalone`: Cho Redux thunks (Cart/Wishlist sync)

**Đồng bộ:** ✅ HOÀN TOÀN — Token flow hoạt động end-to-end.

---

### Module 2: Products (Public API)

| # | BE Endpoint | Method | BE Query Params | FE Sử dụng | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | `/api/products` | `GET` | category, subcategory, badge, sort, limit | `server-fetchers.ts` + `useProducts()` SWR | ✅ |
| 2 | `/api/products/:id` | `GET` | — | `getProductById()` / `getProductWithRelated()` SSR | ✅ |

**BE Query Params (Public):**
```
category?     → Filter by category slug
subcategory?  → Filter by subcategory slug  
badge?        → new | sale | bestseller
sort?         → price_asc | price_desc | newest
limit?        → Limit results (no offset/page!)
```
⚠️ **BE GAP — Thiếu `search` và `page` params trên public endpoint.** Admin endpoint đã có đầy đủ search + pagination, nhưng public endpoint thì chưa.

**FE Data Fetching Strategy:**

| Layer | Công nghệ | Dùng cho |
| --- | --- | --- |
| SSR (Server) | `server-fetchers.ts` + `fetch({ next: { revalidate: 60 } })` | Shop, Category, Subcategory, PDP, Collections, New In |
| CSR (Client) | SWR hooks (`use-api.ts`) | Client-side fetch không auth |
| CSR (Auth) | `useApiAuth` hook | Protected pages: Cart, Orders, Checkout |

**FE Components dùng Products API:**

| Component | API Call | Output |
| --- | --- | --- |
| `ProductGrid` | `getProducts(cat, sub)` SSR | Grid sản phẩm |
| `ProductCard` | — | Card: ảnh, tên, giá, badge |
| `ProductDetailClient` | `getProductWithRelated(id)` SSR | PDP: carousel, info, related |
| `CategoryGrid` | `getCategories()` SSR | Grid 4 category cards |
| `SubcategoryChips` | Từ category data | Chips lọc subcategory |

**Đồng bộ:** ✅ HOÀN TOÀN cho những gì BE hỗ trợ. Nhưng BE còn thiếu search + page.

---

### Module 3: Categories & Collections (Public API)

| # | BE Endpoint | Method | BE Query Params | FE Sử dụng | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | `/api/categories` | `GET` | slug? (optional) | `getCategories()`, `getCategoryBySlug()` SSR | ✅ |
| 2 | `/api/collections` | `GET` | slug? (optional) | `getCollections()`, `getCollectionBySlug()` SSR | ✅ |

**BE Category Response:**
```json
{ "data": [{ id, slug, title, description, subcategories: [{id, slug, label, description, count}] }], "total": N }
```

**BE Collection Response (by slug):**
```json
{ "data": { id, slug, name, subtitle, image, season, description }, "products": [...] }
```

**FE Usage:**
- `CategoryGrid` → Shop main page hero cards
- `SubcategoryChips` → Filter chips trên category page
- `BreadcrumbNav` → Breadcrumb trail
- `CollectionsClient` → Editorial thumbnails grid
- `CollectionDetailClient` → Lookbook layout + products

**Đồng bộ:** ✅ HOÀN TOÀN

---

### Module 4: Reviews, Shipping, Size Guide (Public API)

| # | BE Endpoint | Method | BE Params | FE Sử dụng | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | `/api/reviews/:productId` | `GET` | — | `useReviews(productId)` SWR → ReviewsSection | ✅ |
| 2 | `/api/shipping` | `GET` | — | `useShipping()` SWR → Shipping Accordion trên PDP | ✅ |
| 3 | `/api/size-guides/:category` | `GET` | — | `useSizeGuide(category)` SWR → Size Guide Modal | ✅ |

**BE Implementation:**
- **Reviews:** Static seed data, `findByProductId()` — trả về `{ data: Review[], total }`
- **Shipping:** Hoàn toàn static — methods (3), return policy, free shipping threshold
- **Size Guide:** Static data cho 4 categories (tops, skirts, bags, jewelry)

**FE Usage:**
- `ReviewsSection` component trên PDP: Star ratings, review list, client-side average tính toán
- `ShippingAccordion` trên PDP: Expandable shipping info
- `SizeGuideModal` trên PDP: Per-category size chart table

**Đồng bộ:** ✅ HOÀN TOÀN

---

### Module 5: Cart (Authenticated API)

| # | BE Endpoint | Method | BE Behavior | FE Sử dụng | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | `GET /api/cart` | `GET` | Get or create cart → items + subtotal + itemCount | `fetchCart` thunk → Cart page | ✅ |
| 2 | `POST /api/cart/items` | `POST` | Add item hoặc tăng qty nếu same product+size+color | `syncAddToCartItem` thunk → PDP + QuickAddDrawer | ✅ |
| 3 | `PATCH /api/cart/items/:itemId` | `PATCH` | Update quantity | `syncUpdateCartItemQuantity` thunk → Cart page stepper | ✅ |
| 4 | `DELETE /api/cart/items/:itemId` | `DELETE` | Remove item | `syncRemoveCartItem` thunk → Cart page | ✅ |
| 5 | `DELETE /api/cart/clear` | `DELETE` | Clear all items | `clearCartOnServer` thunk → Cart page | ✅ |

**BE Validation:**
- Product must exist and be `active`
- Same product+size+color → tăng quantity thay vì tạo item mới
- Cart auto-create nếu chưa tồn tại

**FE Cart Architecture (Optimistic Update):**
```
User action → Redux reducer (instant local update) → Thunk (sync BE, background)
                                                    ↘ localStorage persist
```

| Layer | File | Trách nhiệm |
| --- | --- | --- |
| **Redux Store** | `cart/_common/moduleSlice.ts` | State: items[], isOpen, isSyncing. Actions: addItem, removeItem, updateQuantity, clearCart |
| **localStorage** | `ori-baebi-cart` key | Persist cart across sessions |
| **API Sync** | Thunks: `syncAddToCartItem`, `syncRemoveCartItem`, `syncUpdateCartItemQuantity`, `fetchCart`, `clearCartOnServer` | Sync với BE, map `serverItemId` |
| **Selectors** | `selectCartItems`, `selectTotalPrice`, `selectTotalItems` | Derived state |

**FE Cart UI:**
- `CartContent.tsx`: Items list, quantity stepper (debounced 500ms), free shipping progress bar ($150 threshold), order summary, clear all, empty state
- `QuickAddDrawer.tsx`: Bottom sheet (mobile) / Side panel (desktop), size/color/qty selectors, inline size guide, auto-close after add
- `CartFAB.tsx`: Floating button + item count badge → link `/cart`

**Đồng bộ:** ✅ HOÀN TOÀN — 5/5 endpoints matched, optimistic update pattern hoạt động tốt.

---

### Module 6: Checkout (Authenticated API)

| # | BE Endpoint | Method | BE Behavior | FE Sử dụng | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | `POST /api/addresses` | `POST` | Save new address → return addressId | Checkout Step 1 → Address form submission | ✅ |
| 2 | `POST /api/orders` | `POST` | Checkout: cart → order (transaction), validate product availability | Checkout Step 2 → Place order | ✅ |
| — | `PATCH /api/orders/:orderId/cancel` | `PATCH` | Cancel pending order | **FE chưa dùng** ⚠️ | 🔲 |

**BE Checkout Flow (Transaction):**
```
1. Load cart with items & product info
2. Validate products (all active, not deleted)
3. Load & validate address (exists, belongs to user)
4. Calculate subtotal, shipping (free if ≥$150), total
5. Create order (status: pending)
6. Create order items (snapshot product info: name, image, price)
7. Clear cart items
8. Return full order
→ All wrapped in DB transaction — any failure → rollback
```

**FE Checkout Flow:**
```
Step 1: Address Form (9 fields: fullName*, phone*, addressLine1*, city*, ...)
  → POST /api/addresses → get addressId
Step 2: Review (address summary + items list + totals)
  → POST /api/orders { addressId, shippingMethod, note }
  → dispatch(clearCart())
Step 3: Success (CheckCircle animation, Order ID, navigation links)
```

**FE Checkout UI:**
- `CheckoutContent.tsx`: 3-step flow với step indicator icons
- Form validation: Required fields + error messages + visual states (red border, AlertCircle)
- States: Loading skeleton, Unauthenticated, Empty cart, Submitting
- Payment model: COD (Payment will be arranged after order confirmation)

**GAP:**
- BE có `PATCH /api/orders/:orderId/cancel` nhưng FE chưa có UI nút "Cancel Order" trong trang Order Detail

**Đồng bộ:** ✅ 2/3 — Thiếu Cancel Order UI (API đã sẵn sàng).

---

### Module 7: Account & Orders (Authenticated API)

| # | BE Endpoint | Method | BE Query Params | FE Sử dụng | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | `GET /api/orders` | `GET` | — (trả về toàn bộ) | `OrdersContent.tsx` — `useApiAuth` fetch | ✅ |
| 2 | `GET /api/orders/:orderId` | `GET` | — | `OrderDetailContent.tsx` | ✅ |
| 3 | `GET /api/wishlist` | `GET` | — | `fetchWishlist` thunk → Wishlist page + Account preview | ✅ |
| 4 | `POST /api/wishlist/:productId` | `POST` | — | `syncAddToWishlist` thunk → PDP heart | ✅ |
| 5 | `DELETE /api/wishlist/:productId` | `DELETE` | — | `syncRemoveFromWishlist` thunk | ✅ |
| 6 | `GET /api/wishlist/check/:productId` | `GET` | — | **FE chưa dùng** (dùng Zustand localStorage check) | 🔲 |
| 7 | `GET /api/addresses` | `GET` | — | **FE chưa dùng** ⚠️ | 🔲 |
| 8 | `PATCH /api/addresses/:id` | `PATCH` | — | **FE chưa dùng** ⚠️ | 🔲 |
| 9 | `DELETE /api/addresses/:id` | `DELETE` | — | **FE chưa dùng** ⚠️ | 🔲 |

**BE Orders (Client):**
- `findAll(userId)`: Trả về toàn bộ orders của user (⚠️ không có pagination)
- `findOne(userId, orderId)`: Chi tiết order với items
- Status transition validation (giống admin)

**BE Address CRUD:**
- Full CRUD: List, Create, Update, Delete — mỗi user có thể quản lý nhiều địa chỉ
- FE chỉ dùng `POST /api/addresses` khi checkout, không có UI quản lý saved addresses

**FE Orders:**
- `OrdersContent.tsx`: Card list với status badge (icon + color), thumbnail preview, "No orders yet" empty state
- `OrderDetailContent.tsx`: `/orders/[orderId]` — Full items list, shipping address, payment breakdown, notes

**FE Wishlist (Optimistic Update giống Cart):**

| Layer | File | Trách nhiệm |
| --- | --- | --- |
| **Redux Store** | `wishlist/_common/moduleSlice.ts` | State: items[], isSyncing. Actions: toggle, remove, clear |
| **localStorage** | `ori-baebi-wishlist` key | Persist |
| **API Sync** | `syncAddToWishlist`, `syncRemoveFromWishlist`, `fetchWishlist` | Sync BE |
| **Selectors** | `selectIsWishlisted(productId)` | Dùng trên PDP heart |

**FE Account Page:**
- Profile Header: Avatar + name + email + "Member since" + Sparkles badge
- Wishlist Preview: Grid 4 items mới nhất + "View All" link
- Order History Preview: 3 orders gần nhất + "View All" link
- Sign Out button

**GAPs:**
- ⚠️ **Address Management UI chưa có** — BE có full CRUD nhưng FE chỉ tạo khi checkout, không hiển thị/update/delete saved addresses trong Account
- ⚠️ **FE không dùng `GET /api/wishlist/check/:productId`** — Kiểm tra wishlist status qua Zustand localStorage thay vì gọi BE
- ⚠️ **BE Orders API không có pagination** — Luôn trả về toàn bộ orders của user

**Đồng bộ:** 🟡 5/9 — BE Address CRUD còn nhiều endpoint FE chưa khai thác.

---

## 🗺️ BE↔FE PAGES MAP

```
Trang                          Route                       Data Source              BE Endpoint(s)
─────────────────────────────────────────────────────────────────────────────────────────────────
Landing Page                   /landing-page               Static + GSAP            (none)
Shop Main                      /shop                       SSR getProducts()        GET /api/products
Category Page                  /shop/[category]            SSR getProducts(cat)     GET /api/products?category=
Subcategory Page               /shop/[category]/[subcat]   SSR getProducts(c,s)     GET /api/products?category=&subcategory=
Product Detail                 /shop/.../[productId]       SSR getProductWithRelated GET /api/products/:id
Collections                    /collections                SSR getCollections()     GET /api/collections
Collection Detail             /collections/[slug]          SSR getCollectionBySlug  GET /api/collections?slug=
New In                         /new-in                     SSR getNewInProducts()   GET /api/products?badge=new
About                          /about                      Static                   (none)

Login                          /login                      CSR Google OAuth         POST /api/auth/google

🛡 Cart                        /cart                       CSR Redux + localStorage GET/POST/PATCH/DELETE /api/cart/*
🛡 Checkout                    /checkout                   CSR useApiAuth           POST /api/addresses → POST /api/orders
🛡 Account                     /account                    CSR useApiAuth           GET /api/auth/me + /api/wishlist + /api/orders
🛡 Wishlist                    /wishlist                   CSR Redux + localStorage GET/POST/DELETE /api/wishlist/*
🛡 Orders                      /orders                     CSR useApiAuth           GET /api/orders
🛡 Order Detail                /orders/[orderId]           CSR useApiAuth           GET /api/orders/:orderId
```

🛡 = Yêu cầu đăng nhập. SSR = Server-Side Rendering (ISR 60s). CSR = Client-Side Rendering.

---

## 🧱 KIẾN TRÚC KỸ THUẬT

### Backend (NestJS)

```
src/modules/
├── auth/           → Google OAuth, JWT issue/verify, token refresh
├── product/        → Public: findAll (filtered), findById (with related)
│                     Admin: full CRUD + pagination + search
├── category/       → Public: findAll, findBySlug
│                     Admin: full CRUD + pagination
├── collection/     → Public: findAll, findBySlug (with products)
│                     Admin: full CRUD + pagination
├── order/          → Client: findAll, findOne, checkout (transaction), cancel
│                     Admin: findAll(pagination), findOne, updateStatus
├── cart/           → getCart, addItem, updateItem, removeItem, clearCart
├── wishlist/       → findAll, add, remove, check
├── address/        → Full CRUD (per user)
├── review/         → findByProductId (static seed data)
├── shipping/       → Static shipping methods + return policy
└── size-guide/     → Static size charts (4 categories)
```

### Frontend (Next.js)

```
Data Fetching Layers:
├── SSR (Server Components)
│   └── shop/_lib/server-fetchers.ts    → 13 functions, ISR revalidate:60
├── CSR Public (Client Components, no auth)
│   └── hooks/use-api.ts                → SWR hooks: useProducts, useReviews, useSizeGuide, useShipping...
├── CSR Authenticated (Client Components, with auth)
│   └── hooks/use-api-auth.ts           → useApiAuth().apiFetch() + auto-refresh
│   └── contexts/auth-context.tsx        → AuthProvider: user, login, logout, refresh
└── Redux Thunks (standalone fetch)
    └── cart/_common/moduleSlice.ts      → Cart sync thunks (apiFetchStandalone)
    └── wishlist/_common/moduleSlice.ts  → Wishlist sync thunks
```

---

## 🔍 GAPS & RECOMMENDATIONS

### 🔴 CRITICAL — BE chưa hỗ trợ, FE không thể làm

| # | Vấn đề | Root Cause | Đề xuất |
| --- | --- | --- | --- |
| 1 | **Không có Search** | BE `GET /api/products` (public) không có `search` param. Admin endpoint đã có. | Thêm `search` param vào public endpoint, dùng ILIKE như admin |
| 2 | **Không có Pagination (Shop)** | BE public endpoint chỉ có `limit`, không có `page`/`offset`. Admin đã có. | Thêm `page` param vào public endpoint |
| 3 | **Không có Filter/Sort UI** | FE chưa có UI component. BE đã hỗ trợ filter (category, badge) + sort. | Xây dựng FilterBar + SortSelect component trên shop page |

### 🟡 HIGH — BE có nhưng FE chưa dùng

| # | Vấn đề | BE Endpoint | Đề xuất FE |
| --- | --- | --- | --- |
| 4 | **Address Management** | `GET/PATCH/DELETE /api/addresses` | Thêm Address Book section trong Account page |
| 5 | **Cancel Order** | `PATCH /api/orders/:orderId/cancel` | Thêm nút "Cancel Order" trong Order Detail (chỉ khi status=pending) |
| 6 | **Orders Pagination** | BE trả về toàn bộ (chưa có BE pagination cho client orders) | Thêm `page`/`limit` vào client order endpoint |

### 🟡 MEDIUM — Nên bổ sung

| # | Vấn đề | Priority | Đề xuất |
| --- | --- | --- | --- |
| 7 | **SEO** | 🟡 Medium | JSON-LD Product schema, dynamic sitemap.xml, robots.txt |
| 8 | **Error Boundary** | 🟡 Medium | React Error Boundary cho PDP, Cart, Checkout |
| 9 | **Loading Skeleton** | 🟡 Medium | Shimmer skeleton cho ProductGrid, Cart items (đang có 1 phần) |
| 10 | **Page Transition** | 🟢 Low | RouteTransition component có nhưng chưa áp dụng rộng |

### 🔮 FUTURE — Phase 2+

| # | Feature | Priority |
| --- | --- | --- |
| 1 | Announcement Bar | 🟢 Low |
| 2 | Recently Viewed | 🟢 Low |
| 3 | Newsletter Signup | 🟡 Medium |
| 4 | Product Image Zoom | 🟡 Medium |
| 5 | Stock/Inventory UI | 🟡 Medium |
| 6 | Promo/Discount Codes | 🟢 Low |
| 7 | Multi-currency | 🟢 Low |
| 8 | Privacy Policy / Terms / Shipping & Returns | 🟡 Medium |
| 9 | FAQ | 🟢 Low |

---

## 📁 SOURCE CODE MAP (BE + FE Client)

```
BE: clothes-shop-api/src/modules/
├── auth/           auth.controller.ts          POST /api/auth/google, GET /api/auth/me, POST /api/auth/refresh
├── product/        product.controller.ts       GET /api/products (filtered), GET /api/products/:id
├── category/       category.controller.ts      GET /api/categories, ?slug=
├── collection/     collection.controller.ts    GET /api/collections, ?slug=
├── order/          order.controller.ts         GET /api/orders, GET /api/orders/:orderId, POST /api/orders, PATCH cancel
├── cart/           cart.controller.ts          GET /api/cart, POST/DELETE items, PATCH quantity, DELETE clear
├── wishlist/       wishlist.controller.ts      GET /api/wishlist, POST/DELETE /:productId, GET /check/:productId
├── address/        address.controller.ts       Full CRUD /api/addresses
├── review/         review.controller.ts        GET /api/reviews/:productId
├── shipping/       shipping.controller.ts      GET /api/shipping (static)
└── size-guide/     size-guide.controller.ts    GET /api/size-guides/:category (static)

FE: clothes-shop/src/
├── app/
│   ├── (public)/
│   │   ├── landing-page/                        → GSAP scroll animations (no API)
│   │   ├── shop/
│   │   │   ├── _components/                     → ShopHero, CategoryGrid, ProductGrid, ProductCard, SubcategoryChips, BreadcrumbNav
│   │   │   ├── _lib/server-fetchers.ts          → 13 SSR functions (ISR 60s)
│   │   │   └── [category]/[subcategory]/[productId]/_components/
│   │   │       ├── ProductDetailClient.tsx       → PDP: carousel, selectors, add-to-cart, wishlist, reviews, share
│   │   │       └── ReviewsSection.tsx            → Star ratings + review list
│   │   ├── collections/                         → Collections list + detail (SSR)
│   │   ├── new-in/                              → New arrivals (SSR)
│   │   └── about/                               → Brand story (static)
│   ├── (private)/
│   │   ├── cart/
│   │   │   ├── CartContent.tsx                  → Items list, stepper, shipping progress, order summary
│   │   │   └── _common/moduleSlice.ts           → Cart Zustand store (optimistic + localStorage + API sync)
│   │   ├── checkout/CheckoutContent.tsx         → 3-step: Address → Review → Success
│   │   ├── wishlist/
│   │   │   ├── WishlistContent.tsx              → Grid cards, remove, empty state
│   │   │   └── _common/moduleSlice.ts           → Wishlist Zustand store
│   │   ├── orders/
│   │   │   ├── OrdersContent.tsx                → Card list + status badges
│   │   │   └── [orderId]/OrderDetailContent.tsx → Full order detail
│   │   └── account/AccountContent.tsx           → Profile + wishlist preview + order preview
│   ├── (auth)/login/                            → Google Sign-In page
│   └── _components/
│       ├── SiteHeader.tsx, HeaderNav.tsx, HamburgerMenu.tsx, SiteFooter.tsx, Logo.tsx
│       ├── CartFAB.tsx                          → Floating cart button + badge
│       ├── QuickAddDrawer.tsx                   → Bottom sheet / Side panel add-to-cart
│       ├── LoginPromptModal.tsx, UnauthenticatedState.tsx, UserMenu.tsx
│       └── Providers.tsx, Toast.tsx, RouteTransition.tsx
├── contexts/auth-context.tsx                    → AuthProvider: Google OAuth + JWT token management
├── hooks/
│   ├── use-api.ts                               → SWR public hooks (useProducts, useReviews, useSizeGuide, useShipping...)
│   ├── use-api-auth.ts                          → Authenticated fetch + auto-refresh 401
│   └── use-debounce.ts                          → Debounce hook
└── styles/                                      → CSS custom properties (design tokens)
```
