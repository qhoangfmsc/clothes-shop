# Wishlist (sản phẩm yêu thích) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-23 · **Trạng thái:** Implemented
> **Doc:** [storefront/wishlist](../../docs/storefront/wishlist.md) · **Test:** `tests/storefront/wishlist/`

## 1. Bối cảnh & mục tiêu

Wishlist là danh sách sản phẩm khách "thả tim" từ thẻ sản phẩm, trang chi tiết và giỏ hàng; trang `/wishlist` xem và bỏ chúng. Slice (`_common/moduleSlice.ts`, 165 dòng) và trang (`WishlistContent.tsx`, 590 dòng, kể cả khối `<style>` riêng) chưa có spec và test. Sai ở đây không mất tiền nhưng làm khách mất tin: tim sáng mà BE không có, hoặc danh sách của người trước hiện ra với người sau.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho cả đường đúng và đường lỗi, theo khách và người đã đăng nhập; kèm kiểm thử đột biến; ghi các điểm đáng ngờ vào mục 7 để chủ dự án quyết định. Không đổi code trong lượt này.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Test slice (reducer, selector, nạp lại từ `localStorage`, thunk với MSW) và trang `WishlistContent` | Sửa các điểm ở mục 7: cần quyết định sản phẩm |
| Ghi `localStorage` | Đã phủ ở [data-layer](../platform/data-layer.md) (STO-1) |
| Thả tim ở giỏ hàng | Thuộc [cart](./cart.md) (CART-15) |
| Thả tim ở thẻ sản phẩm và trang chi tiết | Thuộc module chứa thẻ đó (batch sau) |

## 3. Hợp đồng

**Reducer.** `toggleWishlistItem(item)` thêm mục kèm `addedAt` (ISO, lúc bấm) nếu `productId` chưa có, ngược lại xóa mục đó. `removeWishlistItem(productId)` xóa theo `productId` (không có thì không đổi). `clearWishlist` xóa hết.

**Selector.** `selectWishlistItems`, `selectIsWishlisted(productId)`, `selectWishlistTotal`, `selectWishlistIsSyncing`.

**Nạp khi khởi tạo.** Đọc `doovan-wishlist` (chấp nhận `{state:{items}}` và `{items}`), bỏ mục không có `priceVnd` kiểu số; JSON hỏng, không phải mảng hoặc không có `window` → rỗng.

**Thunk** (`apiFetchStandalone`: Bearer từ token đã lưu; 401 → refresh một lần rồi thử lại): `syncAddToWishlist(productId)` `POST /api/wishlist/:productId`; `syncRemoveFromWishlist(productId)` `DELETE /api/wishlist/:productId`; `fetchWishlist` `GET /api/wishlist`. Hai thunk ghi không đổi state khi thành công. Khi lỗi: `syncAdd` bị từ chối thì mục vừa thêm bị gỡ khỏi danh sách ở máy; `syncRemove` bị từ chối thì danh sách được đọc lại từ BE (thunk gọi `fetchWishlist` rồi ném lại lỗi). `fetchWishlist`: pending → `isSyncing`; fulfilled → **thay toàn bộ** `items` bằng bản BE (map: `name` rỗng và giá 0 nếu thiếu `product`, ảnh đầu tiên, `badge` hoặc `null`, `category/subcategory` lấy `slug` hoặc rỗng, `addedAt` = `createdAt` hoặc lúc nhận nếu thiếu; `data` thiếu → danh sách rỗng); rejected → `isSyncing = false`, giữ nguyên danh sách.

**Trang `WishlistContent`.** Đang tải phiên → khung chờ; chưa đăng nhập → `UnauthenticatedState` và **không gọi BE**; đã đăng nhập → `fetchWishlist()` một lần khi mở. Có mục: tiêu đề, số mục, nút "Xóa tất cả", lưới thẻ **mới nhất trước**, link "Tiếp tục mua sắm". Trống: thông báo, nút tới `/shop`, hai dòng mô tả (lưu món yêu thích, truy cập nhanh).
- Thẻ: ảnh và tên là link tới `/shop/<category>/<subcategory>/<productId>` (thiếu slug → `/shop`, bấm thì tra `GET /api/products/:id` rồi chuyển trang, không tra được thì về `/shop`), giá theo ngôn ngữ (`custom_order` hiện "giá theo yêu cầu"), ngày thêm theo định dạng `short` và múi giờ của site, nút xóa.
- Bỏ một mục: `removeWishlistItem` (đổi ngay) + `DELETE` + toast `removed`; BE từ chối thì toast `syncFailed` và danh sách được đọc lại từ BE.
- "Xóa tất cả": `clearWishlist()` (đổi ngay) rồi `DELETE` từng mục (BE chưa có endpoint xóa hết); có mục nào bị từ chối thì một toast `syncFailed` và danh sách được đọc lại từ BE.
- Theo phiên (làm bởi `CartSync`, xem [cart](./cart.md)): đã đăng nhập → `fetchWishlist()` khi có phiên và khi đổi tài khoản, nên tim hiện đúng ở mọi trang; chưa đăng nhập hoặc đăng xuất → `clearWishlist()`, để người dùng sau trên cùng trình duyệt không thấy danh sách của người trước.

## 4. Thiết kế

```
ProductCard / trang chi tiết / CartContent ─► toggleWishlistItem + syncAdd|syncRemove ─► state.wishlist ─► store.subscribe ─► localStorage
WishlistContent ─► fetchWishlist ─► GET /api/wishlist ─► thay toàn bộ items
                └► removeWishlistItem + syncRemove | clearWishlist (chỉ ở máy)
```

Hướng phụ thuộc: component → slice → `apiFetchStandalone` → `session`.

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Cập nhật lạc quan**: reducer đổi state ngay, thunk gọi BE sau | Tim phản hồi tức thì kể cả khi mạng chậm | Chờ BE rồi mới đổi tim |
| **Toggle** theo `productId` (một reducer cho thêm và bỏ) | Nút tim ở nhiều nơi dùng cùng một lệnh | Hai reducer; mỗi nơi tự kiểm tra |
| **BE là nguồn sự thật khi tải trang**: `fetchWishlist` thay toàn bộ | Đồng bộ giữa thiết bị | Gộp hai danh sách (cần quy tắc xử lý xung đột) |
| **Lưu `localStorage`** qua subscriber của store | Mục hiện ngay khi mở lại trình duyệt | Chỉ lấy từ BE (nhấp nháy rỗng) |

### Kiến trúc

State là **client state được lưu** cộng **server state** (danh sách trên BE, nguồn sự thật khi mở trang). Slice nằm trong `_common/` của module (module-first); thunk dùng `apiFetchStandalone` (không refresh token) vì chạy ngoài React.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Slice giữ danh sách; trang chỉ hiển thị và gọi lệnh; việc đổi tiền, ngày, link nằm ở hook dùng chung |
| O | Thêm thao tác BE = thêm một thunk; selector mới không đổi reducer |
| L | Hai thunk ghi cùng kiểu (`void`, không đổi state) |
| I | Component chỉ lấy selector nó dùng |
| D | Trang phụ thuộc hook (`useMoney`, `useToast`, `useProductLink`) và slice, không phụ thuộc `fetch` |

### Conventions

Chữ giao diện ở `private.wishlist` (i18n); tiền qua `useMoney`; toast qua `useToast`. Ngoại lệ có chủ đích: kiểu dáng của trang nằm trong thẻ `<style>` riêng (class `wishlist-*`) thay vì Tailwind (nợ ở mục 7).

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (trang chỉ dành cho người đã đăng nhập; khách thấy màn chặn) · permission = không (trang của khách hàng, không có quyền riêng)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| WL-1 | Thả tim rồi bỏ tim, bỏ theo `productId`, xóa hết; `addedAt` là lúc bấm; selector tim và tổng | đúng | — | unit | `tests/storefront/wishlist/wishlist-slice.test.ts` |
| WL-1E | Bỏ một sản phẩm không có trong danh sách và xóa danh sách rỗng không làm hỏng state | lỗi | — | unit | `tests/storefront/wishlist/wishlist-slice.test.ts` |
| WL-2 | Nạp lại danh sách từ `localStorage` (hai dạng cũ/mới) khi khởi tạo | đúng | — | unit | `tests/storefront/wishlist/wishlist-slice.test.ts` |
| WL-2E | Mục cũ không có giá VND, JSON hỏng, kiểu sai thì bỏ hoặc rỗng, không lỗi | lỗi | — | unit | `tests/storefront/wishlist/wishlist-slice.test.ts` |
| WL-3 | `fetchWishlist` thay danh sách bằng bản BE (map sản phẩm, slug, ảnh, badge, ngày), cờ `isSyncing`, kèm Bearer | đúng | user | integration | `tests/storefront/wishlist/wishlist-thunks.test.ts` |
| WL-3E | `fetchWishlist` lỗi (401, 500, mạng) giữ danh sách và tắt cờ; 401 thì refresh một lần rồi thử lại; dữ liệu thiếu trường vẫn map được | lỗi | user | integration | `tests/storefront/wishlist/wishlist-thunks.test.ts` |
| WL-4 | `syncAdd` và `syncRemove` gọi đúng `POST`/`DELETE /api/wishlist/:id` kèm Bearer và không đổi state | đúng | user | integration | `tests/storefront/wishlist/wishlist-thunks.test.ts` |
| WL-4E | `syncAdd` bị BE từ chối (401, 500) hoặc không có token: `rejected` và mục vừa thêm bị gỡ; `syncRemove` bị từ chối: `rejected` và danh sách được đọc lại từ BE | lỗi | khách | integration | `tests/storefront/wishlist/wishlist-thunks.test.ts` |
| WL-5 | Khách thấy màn chặn đăng nhập, không thấy danh sách và không gọi BE | đúng | khách | component | `tests/storefront/wishlist/wishlist-page.test.tsx` |
| WL-5E | Đang xác định phiên chỉ có khung chờ, chưa gọi BE | lỗi | khách | component | `tests/storefront/wishlist/wishlist-page.test.tsx` |
| WL-6 | Mở trang: tải danh sách BE thay bản ở máy; tiêu đề, số mục, mới nhất trước, giá, ngày, link, nút tiếp tục mua sắm; tiếng Anh dùng USD | đúng | user | component | `tests/storefront/wishlist/wishlist-page.test.tsx` |
| WL-6E | BE lỗi thì giữ danh sách ở máy; mục `custom_order` không hiện giá; mục thiếu slug tra URL khi bấm và về `/shop` nếu không tra được | lỗi | user | component | `tests/storefront/wishlist/wishlist-page.test.tsx` |
| WL-7 | Danh sách trống: thông báo, nút tới cửa hàng, hai dòng mô tả (không còn dòng "thông báo khi giảm giá"), không có "Xóa tất cả" | đúng | user | component | `tests/storefront/wishlist/wishlist-page.test.tsx` |
| WL-8 | Bỏ một mục: biến mất ngay, `DELETE` đúng sản phẩm, toast | đúng | user | component | `tests/storefront/wishlist/wishlist-page.test.tsx` |
| WL-8E | BE từ chối lệnh bỏ: toast lỗi và danh sách được đọc lại; "Xóa tất cả" gửi `DELETE` từng mục, mục bị từ chối thì toast lỗi và đọc lại danh sách | lỗi | user | component | `tests/storefront/wishlist/wishlist-page.test.tsx` |

| WL-9 | Theo phiên: đăng nhập thì tải danh sách, đổi tài khoản thì tải lại, đăng xuất hoặc khách thì xóa danh sách ở máy mà không gọi BE | đúng | user | component | `tests/storefront/cart/cart-sync.test.tsx` |

Ngưỡng coverage riêng của module: `moduleSlice.ts` 95/85/95 (T1: danh sách người dùng giữ), `WishlistContent.tsx` 75/65/75.

## 7. Rủi ro & triển khai

| Rủi ro | Phát hiện | Quay lui |
|---|---|---|
| Kiểu dáng bằng thẻ `<style>` riêng (khoảng 360 dòng CSS) thay vì Tailwind | Đọc code | Chuyển sang Tailwind sau khi có test (phần "component quá lớn và giao diện") |

Thay đổi hành vi nhìn thấy được: danh sách yêu thích bị xóa ở máy khi đăng xuất và được tải khi đăng nhập; "Xóa tất cả" xóa cả ở BE; lỗi đồng bộ có toast; trang trống không còn dòng "thông báo khi giảm giá".

## 8. Lịch sử thay đổi

- 2026-10-22 · Viết spec và test cho toàn module (batch 2), kiểm thử đột biến; không đổi code của module.
- 2026-10-22 · Sửa theo quyết định của chủ dự án (giao tôi chọn): xóa danh sách khi đăng xuất và tải khi đăng nhập (qua `CartSync`); "Xóa tất cả" gọi `DELETE` từng mục; lệnh ghi bị từ chối thì gỡ tim vừa thêm hoặc đọc lại danh sách, kèm toast; bỏ dòng "thông báo khi giảm giá" khỏi trang trống. Khóa `private.wishlist.toast.syncFailed` thêm ở cả hai ngôn ngữ; `empty.features.priceDrops` bị xóa.
