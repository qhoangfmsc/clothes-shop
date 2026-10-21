# Data layer — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-21 · **Trạng thái:** Implemented
> **Doc:** [platform/data-layer](../../docs/platform/data-layer.md) · **Test:** `tests/platform/data-layer/`

## 1. Bối cảnh & mục tiêu

Mọi dữ liệu của FE đi qua module này: client HTTP, hợp đồng danh sách, hook SWR công khai và admin, fetcher cho server, upload, proxy `/media`, Redux store và vài kiểu có logic (`enums`, `site-config`). Lớp phiên đã được phủ ở [auth](./auth.md). Phần còn lại chưa có test.

**Mục tiêu.** Phủ toàn module theo ma trận (đúng/lỗi × khách/user/admin đủ quyền/admin thiếu quyền), khóa hành vi hiện tại, sửa nợ phụ thuộc nhỏ có test bảo vệ, và ghi các điểm đáng ngờ ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Test cho `list-query`, `category-display`, `media-url`, `product-url`, `api`, `useDebounce` | Logic của slice giỏ hàng và wishlist: thuộc [cart](../storefront/cart.md), [wishlist](../storefront/wishlist.md) (batch 2). Store chỉ được test ở mức cấu hình và lưu `localStorage` |
| Test hook SWR công khai (`use-api.ts`) và admin (`use-admin-api.ts`) qua MSW | Thunk của từng slice admin: thuộc module admin tương ứng |
| Test `uploadMediaFile`, proxy `/media`, fetcher cho server, store, `baseSlice` | Gộp ba nhóm hook admin lặp lại (create/update/delete ×5) thành một hook chung: nợ ghi ở mục 5, làm ở phần "nợ thiết kế" khi đã có test |
| Chuyển `ProductListParams`, `ProductListResponse`, `buildProductQS` vào `src/lib/product-list.ts` (hook không còn import từ `src/app`, hết hàm trùng) | Đổi nơi import của các trang shop: `server-fetchers.ts` vẫn export lại các kiểu đó |

## 3. Hợp đồng

**Danh sách (`list-query`).** `buildListQuery(params, filters)` dựng query theo thứ tự: `search`, các filter, `sort`, `page`, `limit`. Giá trị `undefined`, `null`, `""` bị bỏ (số `0` và `false` được giữ); `page` bị bỏ khi ≤ 1; `limit` được kẹp bởi `clampLimit`: thiếu hoặc < 1 → 25, > 200 → 200, số lẻ → làm tròn xuống. `PUBLIC_CATEGORIES_QUERY` là `sort=priority&limit=200`.

**URL media.** `toMediaUrl` đổi URL Supabase `https?://<host>/storage/v1/object/public/<bucket>/<key>` thành `/media/<key>`; mọi giá trị khác (kể cả `null`, `undefined`, URL khác, `data:`) giữ nguyên. `mapMediaUrls` áp dụng đệ quy cho chuỗi trong mảng và object, không đổi kiểu dữ liệu khác.

**URL sản phẩm.** `buildProductPath(id, cat, sub)` → `/shop/<cat>/<sub>/<id>` hoặc `null` khi thiếu một slug; `productPath(product)` đọc slug từ `category`/`subcategory` (cho phép `null`).

**Hook công khai (`use-api.ts`).** `fetcher`: lỗi HTTP → `Error("API error: <status>")`, thành công → JSON qua `mapMediaUrls`. `useProducts` trả `products`, `total`, `page`, `limit` (mặc định `[]`, 0, 1, 24), `isLoading`, `isError`; các hook còn lại trả giá trị mặc định rỗng khi chưa có dữ liệu hoặc lỗi. `useBannerConfig` không bao giờ báo lỗi: lỗi, JSON hỏng hoặc không phải mảng → `banners = []`. `useShippingMethodName()(id)` → tên phương thức hoặc `undefined`. `useRefreshShipping()` làm mới cache của `useShipping`. `useAutocomplete(limit)`: bỏ qua truy vấn ngắn hơn 2 ký tự (sau `trim`), chờ 300 ms, gửi `q` đã `trim` và `limit`, hủy request cũ, lỗi → kết quả rỗng. `getProductUrl(id)` → đường dẫn hoặc `null` (lỗi, thiếu slug). `useProductLink()` → `{ href, onClick? }`: đủ hai slug thì `href` là đường dẫn, không có `onClick`; thiếu thì `href = "/shop"` và `onClick` tra URL thật rồi điều hướng (không tra được thì `/shop`).

**Hook admin (`use-admin-api.ts`).** Gọi `authApi` (có token, refresh khi 401). Trả danh sách rỗng và `isError` khi lỗi; các hàm ghi gọi API rồi `mutate()`; lỗi từ API (401 sau refresh thất bại, 403 thiếu quyền) làm `isError = true`. 401 xóa phiên và phát sự kiện hết phiên; 403 giữ nguyên phiên. FE không tự kiểm quyền: BE quyết định.

**Upload.** `uploadMediaFile(file)` → `POST /api/admin/media` multipart (trường `file`), header `Authorization` chỉ khi có token, không refresh; lỗi → `ApiError(message ?? "", status, errorCode)`; thành công → `body.data`.

**Proxy `/media/<key>`.** Thiếu `MEDIA_STORAGE_ORIGIN` → 503. Segment `.`, `..` hoặc chứa `/` → 404. Chuyển tiếp `Range`; upstream 200/206 → trả nội dung với chỉ bốn header `content-type`, `content-length`, `etag`, `last-modified` cộng `cache-control: public, max-age=259200`; upstream 404/400 → 404; lỗi khác → 502.

**Fetcher cho server (`server-fetchers.ts`).** `fetch` với `next.revalidate = 60`, kết quả qua `mapMediaUrls`; lỗi HTTP → `Error("API <path> failed: <status>")`. Các hàm "lấy một" (`getProductById`, `getCategoryBySlug`, `getSubcategory`, `getCollectionBySlug`) trả `undefined` khi lỗi hoặc không thấy; `getProductWithRelated` thử lại không kèm `relatedLimit` nếu lần đầu lỗi; `getBannerConfig` luôn trả mảng; `getShippingInfo` trả `null` khi lỗi; `getProducts`, `getAllProducts`, `getCategories`, `getCollections`, `getCollectionProducts` ném lỗi.

**Store.** Có đủ 13 reducer (admin: `products`, `categories`, `collections`, `users`, `orders`, `media`, `siteConfig`, `payments`, `refunds`, `returns`, `reviews`; client: `cart`, `wishlist`). Mỗi lần `cart.items`, `cart.deselectedKeys` hoặc `wishlist.items` đổi tham chiếu thì ghi `localStorage` (`doovan-cart` và `doovan-wishlist` dạng `{ state: { items }, version: 0 }`, `doovan-cart-selection` dạng `{ deselectedKeys }`); lỗi ghi bị nuốt. `baseCrudReducers` cập nhật cờ `isCreating`/`isUpdating`/`isDeleting` và `error`.

**Kiểu có logic.** `ORDER_STATUS_TRANSITIONS`: `pending → confirmed|cancelled`, `confirmed → shipping|cancelled`, `shipping → delivered`, `delivered → completed`, `completed` và `cancelled` là cuối. `getSelectableOrderStatuses(current)` = trạng thái hiện tại + các trạng thái kế tiếp (lạ thì chỉ chính nó). `resolveBannerImage(banner, breakpoint)`: desktop luôn `image`; mobile dùng ảnh mobile, rồi tablet, rồi `image`; tablet dùng ảnh tablet rồi `image`.

## 4. Thiết kế

```
Server Component ─► server-fetchers ──┐
Client (public)  ─► use-api (SWR) ─────┼─► fetch ─► BE        mapMediaUrls (đọc)   list-query (dựng URL)
Admin            ─► use-admin-api ─► authApi ─► requestWithSession (xem auth)
Upload           ─► uploadMediaFile ─► fetch(+token)
Ảnh              ─► /media/<key> (route handler) ─► MEDIA_STORAGE_ORIGIN
State            ─► store (13 reducer) ─► localStorage (cart, wishlist)
src/lib/product-list.ts: ProductListParams/Response + buildProductQS dùng chung cho hook và server fetcher
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Facade** `api`, `authApi`, `use-api` | Chỗ gọi không biết URL gốc, token, refresh | Mỗi trang tự `fetch` |
| **Adapter** `mapMediaUrls` ở biên đọc | Giấu địa chỉ Supabase khỏi trình duyệt mà không đụng từng component | Đổi URL trong từng component |
| **Config-driven hook**: URL dựng bằng `buildListQuery` | Một hợp đồng danh sách cho thunk, SWR và server | Mỗi hook tự ghép query |
| **Fallback an toàn cho nội dung trang trí** (`useBannerConfig`, `getBannerConfig`, `getShippingInfo`) | Banner lỗi không được làm hỏng trang | Ném lỗi lên trang |
| **Observer** (`store.subscribe`) để lưu `localStorage` | Cart và wishlist giữ qua lần tải lại mà reducer vẫn thuần | Ghi trong từng reducer |

### Kiến trúc

Tầng: component → hook (`use-api`, `use-admin-api`) hoặc thunk → client (`api`/`authApi`) → `fetch`; `lib/*` thuần (list-query, media-url, product-url, product-list) không import module nào. Server fetcher đặt trong module shop nhưng thuộc data layer. State: server state qua SWR (công khai, tham chiếu admin) và thunk (danh sách admin); client state trong Redux (cart, wishlist). `store/index.ts` import ngược vào slice của từng module (không tránh được với Redux, chỉ gom).

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi file lib một việc (dựng query, đổi URL ảnh, dựng đường dẫn); hook chỉ gắn dữ liệu với SWR |
| O | Thêm endpoint = thêm một hook theo mẫu; `buildListQuery` nhận filter tùy ý |
| L | Mọi lỗi HTTP có `status`; các hook báo `isError` đồng nhất |
| I | Hook trả đúng trường cần (`products`, `total`, …) |
| D | Hook và thunk phụ thuộc `api`/`authApi`, không gọi `fetch` trực tiếp (ngoại lệ có chủ ý: `use-api.ts`, `server-fetchers.ts`, `uploadMediaFile` dùng `fetch` vì không cần token hoặc cần cấu hình `next`) |

**Nợ đã biết (không làm trong đợt phủ test):** (1) năm hook admin lặp mẫu create/update/delete + `mutate`; (2) `baseCrudReducers` được trải vào 11 slice nhưng các action của nó không nơi nào dispatch; (3) hook công khai và server fetcher ném `Error` thuần, không phải `ApiError`; (4) hai kiểu lỗi và hai nơi dựng URL media/sản phẩm.

### Conventions

Tiếng Anh, không UI text. Mọi danh sách dựng bằng `buildListQuery` (rule `list-query` của `check-conventions`). `limit` không vượt 200 (rule `max-limit`). Test lấy dữ liệu qua MSW, không mock `fetch`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (hook admin và upload cần token; hook công khai thì không) · permission = có (BE trả 403 cho admin thiếu quyền; FE chỉ hiển thị lỗi và giữ phiên, không tự chặn)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ERR-1 | Body có `message`/`errorCode` → `ApiError` đủ trường; `code` là chuỗi | lỗi | — | unit | `tests/platform/data-layer/api-error.test.ts` |
| ERR-2 | Body không phải JSON hoặc thiếu `message` → `API error: <status>` | lỗi | — | unit | `tests/platform/data-layer/api-error.test.ts` |
| ERR-3 | `api` (công khai) không gửi token, gửi JSON, trả `res.json()` | đúng | khách | integration | `tests/platform/data-layer/api.test.ts` |
| ERR-4 | `api` không refresh khi 401: ném `ApiError` | lỗi | khách | integration | `tests/platform/data-layer/api.test.ts` |
| LQ-1 | `buildListQuery`: thứ tự, bỏ giá trị rỗng, bỏ `page` 1, kẹp `limit`, giữ `0` và `false`, mã hóa | đúng | — | unit | `tests/platform/data-layer/list-query.test.ts` |
| LQ-1E | `clampLimit` và `limit` bất thường (0, âm, lẻ, > 200, NaN) | lỗi | — | unit | `tests/platform/data-layer/list-query.test.ts` |
| MED-1 | `toMediaUrl`/`mapMediaUrls`: URL Supabase thành `/media/<key>`, đệ quy mảng và object | đúng | — | unit | `tests/platform/data-layer/media-url.test.ts` |
| MED-1E | Giá trị không phải URL Supabase, `null`, số, `data:` giữ nguyên | lỗi | — | unit | `tests/platform/data-layer/media-url.test.ts` |
| PRD-1 | `buildProductPath`/`productPath` dựng đường dẫn; `null` khi thiếu slug | đúng | — | unit | `tests/platform/data-layer/product-url.test.ts` |
| PRD-1E | Thiếu một slug, slug `null`, chuỗi rỗng → `null` | lỗi | — | unit | `tests/platform/data-layer/product-url.test.ts` |
| DEB-1 | `useDebounce` chỉ cập nhật sau khi giá trị đứng yên đủ lâu | đúng | — | component | `tests/platform/data-layer/use-debounce.test.tsx` |
| API-1 | Hook công khai: URL đúng, dữ liệu qua `mapMediaUrls`, giá trị mặc định khi chưa tải | đúng | khách | component | `tests/platform/data-layer/use-api.test.tsx` |
| API-1E | Hook công khai: 500 → `isError` và dữ liệu rỗng; banner nuốt lỗi và JSON hỏng; `getProductUrl` trả `null` | lỗi | khách | component | `tests/platform/data-layer/use-api.test.tsx` |
| API-2 | `useAutocomplete`: ngưỡng 2 ký tự, debounce, `trim`, `limit`, hủy request cũ | đúng | khách | component | `tests/platform/data-layer/use-autocomplete.test.tsx` |
| API-2E | `useAutocomplete`: lỗi → kết quả rỗng; `clear` hủy request đang chờ | lỗi | khách | component | `tests/platform/data-layer/use-autocomplete.test.tsx` |
| API-3 | `useProductLink`: đủ slug → `href`; thiếu → `/shop` và tra URL khi bấm | đúng | khách | component | `tests/platform/data-layer/use-api.test.tsx` |
| ADM-1 | Hook admin: danh sách, query đúng filter/sort/trang, hàm ghi gọi API rồi làm mới | đúng | admin đủ quyền | component | `tests/platform/data-layer/use-admin-api.test.tsx` |
| ADM-2 | Hook admin: chưa đăng nhập → 401, refresh thất bại, `isError`, phiên bị xóa | lỗi | khách | component | `tests/platform/data-layer/use-admin-api.test.tsx` |
| ADM-3 | Hook admin: tài khoản khách hàng bị 403 → `isError`, phiên giữ nguyên | lỗi | user | component | `tests/platform/data-layer/use-admin-api.test.tsx` |
| ADM-4 | Hook admin: admin thiếu quyền ghi bị 403 khi tạo/sửa/xóa; danh sách vẫn đọc được | lỗi | admin thiếu quyền | component | `tests/platform/data-layer/use-admin-api.test.tsx` |
| UPL-1 | `uploadMediaFile`: multipart, token, trả `data` | đúng | admin đủ quyền | integration | `tests/platform/data-layer/media-upload.test.ts` |
| UPL-1E | `uploadMediaFile`: lỗi BE, không token, 401 không refresh, 403 thiếu quyền | lỗi | admin thiếu quyền | integration | `tests/platform/data-layer/media-upload.test.ts` |
| PRX-1 | Proxy `/media`: stream, đúng bốn header, cache 3 ngày, chuyển `Range`, 206 | đúng | khách | integration | `tests/platform/data-layer/media-proxy.test.ts` |
| PRX-1E | Proxy `/media`: 503 khi thiếu cấu hình, 404 khi segment nguy hiểm, 404/400 → 404, lỗi khác → 502 | lỗi | khách | integration | `tests/platform/data-layer/media-proxy.test.ts` |
| SRV-1 | Fetcher server: URL, `next.revalidate = 60`, `mapMediaUrls`, thử lại không `relatedLimit` | đúng | khách | integration | `tests/platform/data-layer/server-fetchers.test.ts` |
| SRV-1E | Fetcher server: ném lỗi hoặc trả `undefined` / `[]` / `null` đúng từng hàm | lỗi | khách | integration | `tests/platform/data-layer/server-fetchers.test.ts` |
| STO-1 | Store có đủ 13 reducer; lưu `localStorage` đúng khóa và dạng khi cart/wishlist đổi | đúng | — | unit | `tests/platform/data-layer/store.test.tsx` |
| STO-1E | Không ghi khi tham chiếu không đổi; lỗi quota bị nuốt; `baseCrudReducers` giữ cờ và lỗi | lỗi | — | unit | `tests/platform/data-layer/store.test.tsx` |
| ENU-1 | `ORDER_STATUS_TRANSITIONS`, `getSelectableOrderStatuses`, `resolveBannerImage` | đúng | — | unit | `tests/platform/data-layer/types.test.ts` |
| ENU-1E | Trạng thái lạ, banner thiếu ảnh responsive | lỗi | — | unit | `tests/platform/data-layer/types.test.ts` |

Coverage: các file lib và hook của module có ngưỡng ≥ 90% dòng trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

Các điểm đáng ngờ (test khóa hành vi hiện tại, không đổi; chờ chủ dự án quyết định):

| Phát hiện | Hành vi hiện tại |
|---|---|
| `useProducts` mặc định `limit` là 24 trong khi `LIST_DEFAULT_LIMIT` là 25 | Giá trị 24 chỉ hiện trước khi dữ liệu về |
| Hook công khai và fetcher server ném `Error` thuần | Mất `status` và `errorCode`; không dịch được lỗi theo mã |
| `baseCrudReducers` không nơi nào dispatch | Chết nhưng được trải vào 11 slice |
| Proxy `/media` chỉ chuyển `Range`, đọc `MEDIA_STORAGE_ORIGIN` lúc nạp module | Upstream trả 304 thì thành 502 (hiện không xảy ra vì không chuyển `If-None-Match`); đổi biến môi trường cần khởi động lại |
| Proxy `/media` không chuyển `Content-Range` và `Accept-Ranges` | Một phản hồi 206 thiếu `Content-Range`: ổn với ảnh, nhưng client cần tua (video) sẽ không dùng được |
| Vế `status !== 206` trong proxy thừa | `fetch` coi 206 là `ok`; đột biến bỏ vế này là đột biến tương đương |
| `AdminUser.permissions` là `number[]` còn `AuthUser.permissions` là `string[]` | Hai kiểu khác nhau cho cùng khái niệm |
| `uploadMediaFile` không refresh khi 401 và có message mặc định rỗng | Phiên hết hạn giữa chừng làm upload lỗi mà không tự làm mới |

Thay đổi nhìn thấy được: không. Thay đổi nội bộ: các kiểu và `buildProductQS` chuyển sang `src/lib/product-list.ts`.

## 8. Lịch sử thay đổi

- 2026-10-21 · Viết lại spec cho toàn module (batch 1); thêm test cho mọi submodule; chuyển kiểu danh sách sản phẩm và `buildProductQS` sang `src/lib/product-list.ts`.
- 2026-10-21 · Phủ test toàn module (204 test, 14 file) và kiểm thử đột biến 46/46 (2 đột biến tương đương đã loại: `getProductUrl` bắt `TypeError` nên `||`/`&&` cho cùng kết quả; `fetch` coi 206 là `ok`). Chuyển `ProductListParams`, `ProductListResponse`, `buildProductQS` sang `src/lib/product-list.ts` (hook không còn import từ `src/app`, hết hàm chép đôi); `server-fetchers.ts` export lại các kiểu.
