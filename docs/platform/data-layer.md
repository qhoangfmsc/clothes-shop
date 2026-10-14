# Data layer (API client, SWR, Redux, media proxy)

> **Nhóm:** Platform · **Cập nhật:** 2026-10-14
> **Code:** `src/lib/api.ts` · `src/lib/auth-api.ts` · `src/lib/list-query.ts` · `src/lib/media-url.ts` · `src/hooks/use-api.ts` · `src/hooks/use-admin-api.ts` · `src/hooks/use-api-auth.ts` · `src/hooks/use-media-upload.ts` · `src/store/` · `src/app/media/[...path]/route.ts` · `src/app/[locale]/(public)/shop/_lib/server-fetchers.ts` · `src/types/`

## 1. Tóm tắt module

Tầng truy cập dữ liệu dùng chung của FE. FE không có database riêng: mọi dữ liệu đến từ backend `clothes-shop-api` tại `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:7001`). Module gồm: các HTTP client, hợp đồng query cho danh sách, các hook SWR đọc dữ liệu, Redux store (admin + giỏ hàng + wishlist), và proxy ảnh `/media/*`.

## 2. Phục vụ gì / việc cần làm

- Cho Server Component lấy dữ liệu công khai để render SSR/ISR và sinh sitemap.
- Cho Client Component lấy dữ liệu công khai bằng SWR (autocomplete, mega menu, banner, review, size guide…).
- Cho khu admin gọi API có token, phân trang/lọc/sắp xếp theo đúng một hợp đồng.
- Giữ giỏ hàng và wishlist đồng bộ giữa Redux, `localStorage` và BE.
- Giấu địa chỉ Supabase Storage khỏi trình duyệt bằng proxy `/media/*`.

## 3. Submodule & chức năng hiện có

| Submodule | Chức năng | File |
|---|---|---|
| Public client | `api.get/post/patch/delete`, class `ApiError` | `src/lib/api.ts` |
| Auth client | `authApi.get/post/put/patch/delete` + refresh token | `src/lib/auth-api.ts` (xem [auth](./auth.md)) |
| List query | `buildListQuery`, `clampLimit`, hằng limit | `src/lib/list-query.ts` |
| Server fetchers | Hàm fetch cho Server Component (ISR 60 s) | `shop/_lib/server-fetchers.ts` |
| Public SWR hooks | Sản phẩm, danh mục, bộ sưu tập, review, size guide, shipping, banner, autocomplete | `src/hooks/use-api.ts` |
| Admin SWR hooks | Sản phẩm, danh mục, bộ sưu tập, đơn hàng, người dùng (có CRUD) | `src/hooks/use-admin-api.ts` |
| Redux store | Cấu hình store, slice nền `baseSlice`, đồng bộ `localStorage` | `src/store/` |
| Media | Đổi URL Supabase → `/media/<key>`, proxy, upload | `media-url.ts`, `app/media/[...path]/route.ts`, `use-media-upload.ts` |
| Entity types | `Product`, `Category`, `Collection`, `Review`, `ShippingInfo`, `SizeGuide`, `SiteConfig`, enums | `src/types/` |

## 4. Chi tiết

### 4.1 Hai HTTP client + `ApiError`

- `api` (public): `fetch` JSON, ném `ApiError(message, status, errorCode)` khi `!res.ok`. `message` lấy từ `body.message`, thiếu thì `API error: <status>`.
- `ApiError` có `status`, `errorCode` (số, BE gửi kèm) và `code` (cùng giá trị dạng chuỗi — vì serializer của Redux giữ `code`, nên lỗi từ thunk vẫn mang mã). `useErrorMessage()` dựa vào các mã này để dịch lỗi (xem [i18n](./i18n.md)).
- `authApi`: xem [auth](./auth.md) mục 4.3.

### 4.2 Hợp đồng danh sách (`src/lib/list-query.ts`)

Mọi endpoint danh sách của BE dùng chung:

- Query: `?search=&sort=&page=&limit=` + filter riêng của module.
- `sort` là **một** trường: `field` (tăng) hoặc `-field` (giảm). Kiểu cũ (`newest`, `price_asc`, `sorts=`) bị BE trả 400.
- `limit` mặc định `LIST_DEFAULT_LIMIT = 25`, tối đa `LIST_MAX_LIMIT = 200`; `clampLimit` ép vào khoảng `1..200`.
- Phản hồi: `{ data, total, page, limit, totalPages? }`.
- `buildListQuery(params, filters)`: bỏ giá trị rỗng/undefined, bỏ `page` khi là trang 1, kẹp `limit`. Mọi thunk và hook SWR đều dựng URL qua hàm này (được `conventions:check` kiểm tra — xem [dev-tooling](./dev-tooling.md)).
- `PUBLIC_CATEGORIES_QUERY` (`src/lib/category-display.ts`) = `sort=priority&limit=200`; `MAX_INLINE_CATEGORIES = 4`.

### 4.3 Server fetchers (`shop/_lib/server-fetchers.ts`)

Dùng trong `page.tsx` (Server Component). `fetch` với `next.revalidate = 60` giây, kết quả đi qua `mapMediaUrls`. Hàm có sẵn: `getProducts`, `getProductsWithParams`, `getAllProducts`, `getNewInProducts`, `getProductById`, `getProductWithRelated`, `getCategories`, `getCategoryBySlug`, `getSubcategory`, `getCollections`, `getCollectionBySlug`, `getCollectionProducts`, `getBannerConfig(key)`, `getShippingInfo()` (cấu hình vận chuyển & đổi trả, `null` khi API lỗi), `getReviews`. Các hàm "lấy một" trả `undefined` khi lỗi (để trang gọi `notFound()`); `getBannerConfig` luôn trả `[]` khi lỗi để banner không làm hỏng trang. Cũng export các kiểu `ProductListParams`, `ProductListResponse`, `CategoryListResponse`, `CollectionListResponse`, `ReviewListResponse`.

`ProductListParams`: `search, category, subcategory, badge, sort (price|-price|name|-name|createdAt|-createdAt), minPrice, maxPrice, sizes ("S,M,L"), colors ("Red,Blue"), page, limit`.

### 4.4 Hook SWR công khai (`src/hooks/use-api.ts`)

`fetcher` ném `Error("API error: <status>")` khi lỗi và map URL media. Cấu hình mặc định: `revalidateOnFocus: false`, `dedupingInterval: 30 s`.

| Hook | Endpoint |
|---|---|
| `useProducts(params)` | `GET /api/products?…` |
| `useProduct(id)` | `GET /api/products/:id` (trả `product` + `related`) |
| `useNewInProducts()` | `GET /api/products?badge=new` |
| `useCategories()` | `GET /api/categories?sort=priority&limit=200` |
| `useCategory(slug)` | `GET /api/categories?slug=` |
| `useCollections()` / `useCollection(slug)` | `GET /api/collections[?slug=]` |
| `useReviews(productId, page, limit)` | `GET /api/reviews/:productId` (trung bình sao tính ở client) |
| `useSizeGuide(category)` | `GET /api/size-guides/:category` |
| `useShipping()` | `GET /api/shipping` (dedupe 5 phút): `methods[]` + `freeShippingThreshold` (`number \| null`, `null` = không có miễn phí vận chuyển) — cấu hình ở site config `SHIPPING_CONFIG` |
| `useShippingMethodName()` | Trả hàm `(id) => tên phương thức do admin cấu hình` (`undefined` khi chưa tải hoặc id lạ); đơn chỉ lưu id nên mọi màn đặt tên phương thức đều đọc qua đây |
| `useRefreshShipping()` | Trả hàm làm mới cache của `useShipping` (admin gọi sau khi lưu/xóa `SHIPPING_CONFIG`) |
| `useBannerConfig(key)` | `GET /api/site-config?key=` — luôn không lỗi: thất bại/rỗng → `banners = []` |
| `useAutocomplete(limit)` | `GET /api/products/autocomplete?q=&limit=` — `limit` 1–10 (BE trả 400 nếu ngoài khoảng), debounce 300 ms, tối thiểu 2 ký tự, hủy request cũ bằng `AbortController` |
| `getProductUrl(id)` | Hàm thường: tra sản phẩm theo id để dựng `/shop/<cat>/<sub>/<id>` |

### 4.5 Hook SWR admin (`src/hooks/use-admin-api.ts`)

`useAdminProducts`, `useAdminCategories`, `useAdminCollections`, `useAdminOrders`, `useAdminUsers`. Gọi `authApi`, cấu hình `revalidateOnFocus: false`, `dedupingInterval: 10 s`, `keepPreviousData: true`. Mỗi hook trả `{ <items>, total, page, limit, isLoading, isValidating, isError, mutate, … }` kèm hàm ghi (`createX/updateX/deleteX`; orders: `getOrderDetail`, `updateOrderStatus`; users: `getUserDetail`, `updateUser`) — các hàm ghi tự `mutate()` sau khi xong. Export thêm kiểu `AdminOrder`, `AdminOrderItem`, `AdminUser`, `AdminUserUpdate`, `ProductFormData`, và các `…Filters`. Các màn danh sách admin dùng Redux thunk; SWR hook chủ yếu dùng để lấy dữ liệu tham chiếu (danh mục, sản phẩm cho dropdown) và cho Dashboard.

### 4.6 Redux store (`src/store/`)

- `store/index.ts` gộp reducer của từng module: admin (`products`, `categories`, `collections`, `users`, `orders`, `media`, `siteConfig`, `payments`, `refunds`, `returns`) và client (`cart`, `wishlist`). Slice nằm trong `_common/moduleSlice.ts` của từng module (quy tắc module-first).
- `baseSlice.ts`: `BaseCrudState` (`isCreating`, `isUpdating`, `isDeleting`, `error`) + `baseCrudReducers` (`create/update/deleteStart|Success|Error`, `clearError`). Slice admin spread vào, thêm `items/total/page/limit/isListLoading` và các `extraReducers` cho thunk.
- Hooks có kiểu: `useAppDispatch`, `useAppSelector` (`store/hooks.ts`). `StoreProvider` bọc app trong `Providers`.
- Persist: `store.subscribe` ghi `localStorage` mỗi khi đổi `cart.items` (`doovan-cart`, dạng `{state:{items},version:0}`), `cart.deselectedKeys` (`doovan-cart-selection`) và `wishlist.items` (`doovan-wishlist`). Lỗi quota bị nuốt.
- Quy ước thunk admin: `createAsyncThunk`, UI gọi `dispatch(thunk(...)).unwrap()` rồi `toast` — xem [ui-kit](./ui-kit.md).

### 4.7 Media: URL, proxy, upload

- Ảnh lưu ở Supabase Storage. `toMediaUrl(url)` đổi `https://<host>/storage/v1/object/public/<bucket>/<key>` thành `/media/<key>`; URL khác giữ nguyên. `mapMediaUrls(data)` làm đệ quy trên mọi chuỗi của payload — áp dụng cho các fetch **chỉ đọc** (storefront/tài khoản). Fetch admin **không** map để form giữ URL gốc (khi hiển thị ảnh trong admin thì gọi `toMediaUrl`).
- `GET /media/[...path]` (route handler): proxy tới `MEDIA_STORAGE_ORIGIN/<key>`; từ chối segment `.`/`..`/chứa `/`; chuyển tiếp `Range`; chỉ trả các header `content-type, content-length, etag, last-modified` và `cache-control: public, max-age=259200` (3 ngày). Thiếu `MEDIA_STORAGE_ORIGIN` → 503; upstream 404/400 → 404, lỗi khác → 502.
- `uploadMediaFile(file)`: `POST ${API_URL}/api/admin/media` (multipart), trả `UploadedMedia {id,name,mimeType,sizeOriginal,url}`; lỗi → `ApiError`. Dùng chung bởi Media, `ImageUrlField`, `ImageListField`.
- `next.config.ts` cho phép `next/image` tải từ `images.higgs.ai`, `lh3.googleusercontent.com`, `d8j0ntlcm91z4.cloudfront.net`; ảnh `/media/*` cùng origin.

### 4.8 Kiểu dữ liệu dùng chung (`src/types/`)

`product.ts` (`Product`, `ProductColor`, `ProductCategory`, `ProductSubCategory`), `category.ts` (`Category`, `SubCategory`; `priority` duy nhất, 1 = hiển thị đầu), `collection.ts`, `review.ts`, `shipping.ts` (`SHIPPING_METHOD_IDS` / `ShippingMethodId`, `SHIPPING_ICONS` / `ShippingIcon`, `ShippingMethod`, `ShippingInfo`), `size-guide.ts`, `site-config.ts` (khóa, loại, banner, `resolveBannerImage`), `enums.ts` (`PRODUCT_BADGES`, `PRODUCT_STATUSES`, `USER_ROLES`, `USER_STATUSES`, `ORDER_STATUSES`, `ORDER_STATUS_TRANSITIONS`, `getSelectableOrderStatuses`), `analytics.ts`. Giá trị enum khớp chính xác (phân biệt hoa thường) với BE.

### 4.9 Hook tiện ích liên quan

`useDebounce(value, delay=300)`, `useBreakpoint()` (`isMobile <640`, `isTablet 640–1023`, `isDesktop ≥1024`), `useSortOptions(defs)` (xem [ui-kit](./ui-kit.md)), `useAutoAdvance`, `useBannerRotation`.

### 4.10 Biến môi trường

`NEXT_PUBLIC_API_URL`, `MEDIA_STORAGE_ORIGIN` (chỉ server). Xem thêm [dev-tooling](./dev-tooling.md).
