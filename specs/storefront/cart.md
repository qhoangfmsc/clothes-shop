# Cart (giỏ hàng, thêm nhanh) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-22 · **Trạng thái:** Implemented
> **Doc:** [storefront/cart](../../docs/storefront/cart.md) · **Test:** `tests/storefront/cart/`

## 1. Bối cảnh & mục tiêu

Giỏ hàng là nơi tiền và tồn kho gặp nhau: dòng sai số lượng, thành tiền sai hoặc dòng "ma" (có ở máy, không có ở BE) làm mất đơn hoặc đặt nhầm. Module gồm slice Redux (`_common/moduleSlice.ts`, 420 dòng), đồng bộ nền (`CartSync`), trang giỏ (`CartContent.tsx`, 570 dòng) và ngăn kéo thêm nhanh (`QuickAddDrawer.tsx`, 470 dòng). Chưa có spec và test nào.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho cả đường đúng và đường lỗi, theo khách và người đã đăng nhập; kèm kiểm thử đột biến; ghi các điểm đáng ngờ vào mục 7 và hỏi chủ dự án trước khi đổi. Không đổi code của module trong lượt này.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Test slice (reducer, selector, nạp lại từ `localStorage`, thunk với MSW), `CartSync`, `CartContent`, `QuickAddDrawer` | Sửa lỗi hoặc tách `CartContent`: các điểm ở mục 7 chờ chủ dự án, tách component là phần "component quá lớn" |
| Ghi giỏ lên `localStorage` | Đã phủ ở [data-layer](./../platform/data-layer.md) (flow STO-1) |
| Báo giá `subtotal` hiển thị ở chân trang giỏ | Hook `useOrderQuote` và tính tiền: thuộc [checkout](./checkout.md) |
| Nút giỏ nổi `CartFAB` | Thuộc [site-chrome](../platform/site-chrome.md) |

## 3. Hợp đồng

**Khóa dòng.** `cartItemKey = productId|size|color`: cùng sản phẩm khác size hoặc màu là dòng khác. `serverItemId` có sau khi BE xác nhận dòng.

**Reducer.** `addItem(item, quantity = 1)` gộp số lượng nếu trùng khóa, ngược lại thêm dòng mới; dòng mới và dòng vừa đổi số lượng có `lineTotalVnd/Usd = null` (FE không tự nhân giá). `updateQuantity` với số lượng ≤ 0 xóa dòng, > 0 đặt số lượng; dòng không tồn tại thì bỏ qua. `removeItem`, `removeItems(keys)` và `updateQuantity` về 0 dọn `deselectedKeys` của dòng đã xóa. `clearCart` xóa dòng và `deselectedKeys`. `toggleItemSelected(key)` bật/tắt dòng bị bỏ tick; `setAllSelected(true)` xóa danh sách bỏ tick, `false` bỏ tick mọi dòng. `toggleDrawer/openDrawer/closeDrawer` đổi `isOpen`.

**Selector.** `selectTotalItems` = tổng số lượng mọi dòng; `selectPurchasableCartItems` bỏ dòng `sold_out`/`custom_order`; `selectSelectedCartItems` = mua được và không bị bỏ tick; `selectSelectedTotalItems` = tổng số lượng của chúng. `selectCartPendingSync` là số lệnh ghi BE chưa trả lời.

**Nạp khi khởi tạo.** Slice đọc `doovan-cart` (chấp nhận `{state:{items}}` và `{items}`), bỏ dòng không có `priceVnd` kiểu số, và `doovan-cart-selection` (chỉ giữ chuỗi). JSON hỏng hoặc không có `window` → rỗng.

**Thunk** (`apiFetchStandalone`: Bearer từ token đã lưu, **không refresh khi 401**): `fetchCart` `GET /api/cart`; `syncAddToCartItem` `POST /api/cart/items`; `syncUpdateCartItemQuantity` `PATCH /api/cart/items/:id` `{quantity}`; `syncRemoveCartItem` `DELETE /api/cart/items/:id`; `clearCartOnServer` `DELETE /api/cart/clear`. Ba lệnh ghi đều trả cả giỏ.
- `fetchCart`: pending → `isSyncing`; fulfilled → `items` = giỏ BE + các dòng đang chờ thêm (`pendingAddKeys`) chưa có trên BE, dọn `deselectedKeys`; rejected → `isSyncing = false`, giữ nguyên dòng.
- Map dòng BE: `colorHex` tra theo tên màu (không thấy thì dùng chính tên màu), `category/subcategory` lấy `slug`, `name` rỗng và giá 0 nếu thiếu `product`, `lineTotal*` `null` nếu BE không gửi.
- `syncAdd`: pending thêm khóa vào `pendingAddKeys` và `pendingSync++`; fulfilled/rejected bỏ khóa và `pendingSync--`; fulfilled gán `serverItemId` bằng cách tìm theo khóa trong giỏ trả về (vì `data.id` là id giỏ). Thất bại **không** gỡ dòng ở máy.
- `applyServerPricing` (sau mỗi lệnh ghi thành công, chỉ khi `pendingSync = 0`): lấy `priceVnd/Usd` của BE cho mọi dòng cùng khóa; `lineTotal*` chỉ nhận khi `quantity` của BE bằng của máy, ngược lại `null`.

**`CartSync`** (mount trong `Providers`): chờ phiên xác định; đã đăng nhập → `fetchCart()`; chưa → `clearCart()`; chạy lại khi đổi `userId`.

**`CartContent`.** Đang tải phiên → khung chờ; chưa đăng nhập → `UnauthenticatedState`; giỏ trống → thông báo trống và nút tới `/shop`; có dòng → tiêu đề, tổng số lượng, thanh chọn, danh sách, chân trang thanh toán.
- Thanh chọn: "Chọn tất cả" (ba trạng thái, chỉ tính dòng mua được, khóa khi không có dòng mua được), đếm `đã chọn/mua được`, nút thêm yêu thích và nút xóa (khóa khi chưa chọn dòng nào).
- Dòng: checkbox (khóa nếu không mua được), ảnh và tên là link, thành tiền dòng (`"…"` khi `null`, rỗng với `custom_order`), chip size và màu, đơn giá (hoặc "giá theo yêu cầu" với `custom_order`), cảnh báo `sold_out`/`custom_order` (kèm link "Đặt hàng" tới `/contact?product=` cho `custom_order`), bộ chỉnh số lượng 1–10, nút tim, nút xóa.
- Số lượng: bấm đổi ngay ở máy; sau 500 ms không bấm nữa mới gọi `PATCH` (chỉ khi dòng đã có `serverItemId`).
- Xóa một dòng: xác nhận → `removeItem` rồi `DELETE` nếu có `serverItemId`. Xóa hàng loạt: xác nhận → `removeItems` rồi `DELETE` từng dòng có `serverItemId`, toast `removed`.
- Yêu thích: tim ở dòng bật/tắt theo trạng thái trước khi bấm (toast, `POST`/`DELETE` wishlist); nút hàng loạt chỉ thêm sản phẩm chưa có và mỗi sản phẩm một lần dù nhiều size (toast `addedToWishlist` hoặc `alreadyInWishlist`), không bao giờ gỡ khỏi giỏ.
- Chân trang: có dòng được chọn → "Tạm tính (n sản phẩm)", số tiền là `subtotal` của báo giá BE (chỉ hỏi khi đã đăng nhập và `pendingSync = 0`; `"…"` khi chưa có hoặc đang hỏi hoặc báo giá lỗi) và link tới `/checkout`; không dòng nào → gợi ý chọn và nút khóa.

**`QuickAddDrawer`** (`useQuickAdd().openQuickAdd(product)`; ném lỗi nếu dùng ngoài provider): không mở với sản phẩm không mua được. Ngăn kéo hiện tên, giá (và giá gốc nếu có); chọn size, màu, số lượng 1–10. Nút thêm chỉ bật khi đã chọn cả size lẫn màu, kèm gợi ý còn thiếu gì; sản phẩm không có màu thì không thêm được. Thêm: `addItem` (màu theo tên tìm từ mã hex) + `syncAddToCartItem` + `trackEvent("add_to_cart")`, toast có link `/cart`, nút thành "Đã thêm" (bấm tiếp bị bỏ qua), tự đóng sau 800 ms. Đóng bằng nút X, bấm nền, Esc hoặc vuốt xuống hơn 80 px; khóa cuộn trang khi mở và trả lại khi đóng. Bảng size chỉ được tải khi bấm "Bảng size".

## 4. Thiết kế

```
ProductCard / CollectionsClient ─► useQuickAdd().openQuickAdd ─► QuickAddContent ─┐
CartContent ─► dispatch(reducer) ─► state.cart (Redux) ─► store.subscribe ─► localStorage
                └► dispatch(thunk) ─► apiFetchStandalone ─► BE /api/cart*  ──► applyServerPricing
Providers ─► CartSync ─► fetchCart | clearCart (theo phiên)
CartContent ─► useOrderQuote (checkout) ─► BE /api/orders/quote ─► subtotal
```

Hướng phụ thuộc: component → slice → `apiFetchStandalone` → `session`. Slice không import component; `CartContent` import slice của wishlist và `useOrderQuote` của checkout (nợ ghi ở mục 7).

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Cập nhật lạc quan**: reducer đổi state ngay, thunk gọi BE sau | Giỏ phản hồi tức thì kể cả khi mạng chậm | Chờ BE rồi mới đổi (giật) |
| **Lưu dòng bị bỏ tick** (`deselectedKeys`) thay vì dòng được chọn | Mặc định mọi dòng, kể cả dòng thêm sau, được chọn mà không cần reducer nào nhớ thêm | Lưu dòng được chọn (dòng mới mặc định không chọn) |
| **Selector có nhớ** (`createSelector`) cho dòng mua được và dòng đã chọn | Component không render lại khi mảng mới có cùng nội dung | Lọc trong component |
| **Đếm lệnh đang bay** (`pendingSync`, `pendingAddKeys`) | Thành tiền của BE chỉ đúng khi không còn lệnh nào chờ; `fetchCart` không được làm mất dòng đang thêm | Khóa toàn giỏ khi có lệnh chờ |
| **Debounce 500 ms** cho số lượng | Bấm liên tiếp chỉ gửi một `PATCH` | Gửi mỗi lần bấm |
| **Provider + portal** cho ngăn kéo thêm nhanh | Mở được từ bất kỳ thẻ sản phẩm nào, không bị cắt bởi container cha | Mỗi thẻ có ngăn kéo riêng |

### Kiến trúc

State thuộc loại **client state được lưu** (Redux + `localStorage`) cộng **server state** (giỏ trên BE, nguồn sự thật khi tải). Thunk dùng `apiFetchStandalone` (không refresh token) vì chạy ngoài React; quyết định này thuộc [data-layer](../platform/data-layer.md)/[auth](../platform/auth.md). Slice nằm trong `_common/` của module (module-first).

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Slice giữ trạng thái giỏ; `CartSync` chỉ đồng bộ theo phiên; `QuickAddDrawer` chỉ chọn biến thể; `CartContent` ghép màn hình (đang gánh cả danh sách, chọn, yêu thích và thanh toán: nợ ở mục 7) |
| O | Thêm thao tác ghi BE = thêm một thunk và một `extraReducers`; bốn thunk đếm `pendingSync` dùng chung một vòng lặp |
| L | Mọi thunk ghi trả `CartItem[]` nên `applyServerPricing` xử lý như nhau |
| I | Component chỉ dùng selector nó cần; `QuickAddContext` chỉ lộ `openQuickAdd` |
| D | Component phụ thuộc hook (`useMoney`, `useConfirm`, `useToast`, `useProductLink`) và slice, không phụ thuộc `fetch`; thunk phụ thuộc `apiFetchStandalone` |

### Conventions

Chữ giao diện nằm ở `private.cart` và `shared.cart.quickAdd` (i18n); tiền qua `useMoney`; xác nhận qua `useConfirm`; toast qua `useToast`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (trang giỏ chỉ dành cho người đã đăng nhập; khách thấy màn chặn) · permission = không (trang của khách hàng, không có quyền riêng)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| CART-1 | Thêm dòng, gộp số lượng cùng khóa, size/màu khác là dòng khác, dòng mới chưa có thành tiền | đúng | — | unit | `tests/storefront/cart/cart-slice.test.ts` |
| CART-2 | Đổi số lượng (≤ 0 thì xóa, dòng lạ bị bỏ qua), xóa một và nhiều dòng, xóa hết; dọn danh sách bỏ tick | đúng | — | unit | `tests/storefront/cart/cart-slice.test.ts` |
| CART-3 | Chọn dòng: bật/tắt, chọn hết/bỏ hết, selector chỉ tính dòng mua được và đã chọn, tổng số lượng | đúng | — | unit | `tests/storefront/cart/cart-slice.test.ts` |
| CART-3E | Dòng hết hàng và đặt may không bao giờ được chọn để thanh toán; thao tác với khóa không tồn tại không làm hỏng state | lỗi | — | unit | `tests/storefront/cart/cart-slice.test.ts` |
| CART-4 | Nạp lại giỏ và danh sách bỏ tick từ `localStorage` (hai dạng cũ/mới) khi khởi tạo | đúng | — | unit | `tests/storefront/cart/cart-slice.test.ts` |
| CART-4E | Dữ liệu cũ không có giá VND, JSON hỏng, kiểu sai thì bỏ hoặc rỗng, không lỗi | lỗi | — | unit | `tests/storefront/cart/cart-slice.test.ts` |
| CART-5 | `fetchCart` thay giỏ bằng giỏ BE (map dòng, màu, slug), giữ dòng đang chờ thêm, dọn bỏ tick, cờ `isSyncing` | đúng | user | integration | `tests/storefront/cart/cart-thunks.test.ts` |
| CART-5E | `fetchCart` lỗi (401, 500, mạng) giữ nguyên giỏ ở máy và tắt cờ `isSyncing`; không refresh token | lỗi | user | integration | `tests/storefront/cart/cart-thunks.test.ts` |
| CART-6 | `syncAdd`: gán `serverItemId` theo khóa dòng, đếm lệnh chờ, lấy giá và thành tiền của BE khi hết lệnh chờ | đúng | user | integration | `tests/storefront/cart/cart-thunks.test.ts` |
| CART-6E | `syncAdd` lỗi để dòng ở lại máy và trả lại bộ đếm; hai lệnh chạy chồng chỉ nhận giá khi cả hai xong; thành tiền bỏ khi số lượng lệch | lỗi | user | integration | `tests/storefront/cart/cart-thunks.test.ts` |
| CART-7 | `syncUpdateQuantity`, `syncRemove`, `clearCartOnServer` gọi đúng endpoint, kèm Bearer, và áp giá BE | đúng | user | integration | `tests/storefront/cart/cart-thunks.test.ts` |
| CART-7E | Lệnh ghi lỗi trả lại bộ đếm, không đổi dòng; thiếu token vẫn gửi (BE từ chối) | lỗi | khách | integration | `tests/storefront/cart/cart-thunks.test.ts` |
| CART-8 | `CartSync`: người đã đăng nhập → tải giỏ một lần, đổi tài khoản → tải lại | đúng | user | component | `tests/storefront/cart/cart-sync.test.tsx` |
| CART-8E | `CartSync`: khách → xóa giỏ ở máy, không gọi BE; chưa biết phiên thì chưa làm gì | lỗi | khách | component | `tests/storefront/cart/cart-sync.test.tsx` |
| CART-9 | Trang giỏ: khách thấy màn chặn đăng nhập, không thấy giỏ | đúng | khách | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-9E | Trang giỏ: đang xác định phiên chỉ có khung chờ (không lộ nội dung, không màn chặn) | lỗi | khách | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-10 | Trang giỏ trống: thông báo, nút tới cửa hàng, không có thanh chọn | đúng | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-11 | Trang giỏ có dòng: tiêu đề, tổng số lượng, chip size/màu, đơn giá và thành tiền theo ngôn ngữ (VND/USD), "…" khi BE chưa tính | đúng | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-11E | Dòng hết hàng / đặt may: checkbox khóa, cảnh báo, link đặt hàng, "giá theo yêu cầu", không tính vào số có thể chọn | lỗi | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-12 | Chọn dòng và "Chọn tất cả" (ba trạng thái), đếm đã chọn | đúng | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-13 | Chỉnh số lượng: đổi ngay, biên 1 và 10, gộp nhiều lần bấm thành một `PATCH` sau 500 ms | đúng | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-13E | Dòng chưa có `serverItemId` đổi số lượng chỉ ở máy, không gọi BE (điểm đáng ngờ, mục 7); `PATCH` lỗi không làm hỏng giao diện | lỗi | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-14 | Xóa một dòng và xóa hàng loạt: xác nhận, xóa ở máy, `DELETE` theo `serverItemId`, toast | đúng | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-14E | Từ chối xác nhận thì không xóa; nút xóa hàng loạt khóa khi chưa chọn dòng; dòng chưa có `serverItemId` chỉ xóa ở máy | lỗi | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-15 | Yêu thích: tim ở dòng bật/tắt kèm toast và gọi BE; nút hàng loạt thêm mỗi sản phẩm một lần, không gỡ khỏi giỏ | đúng | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-15E | Nút hàng loạt khi tất cả đã có trong yêu thích báo "đã có" và không gọi BE | lỗi | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-16 | Chân trang: tạm tính là `subtotal` của BE cho đúng các dòng đã chọn, link thanh toán | đúng | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-16E | Chưa chọn dòng nào: gợi ý và nút khóa; báo giá lỗi hoặc còn lệnh chờ: "…" | lỗi | user | component | `tests/storefront/cart/cart-page.test.tsx` |
| CART-17 | Thêm nhanh: mở ngăn kéo, chọn size, màu, số lượng, thêm vào giỏ, báo giá/phân tích, toast, "Đã thêm" rồi tự đóng | đúng | user | component | `tests/storefront/cart/quick-add.test.tsx` |
| CART-17E | Thêm nhanh: sản phẩm không mua được không mở; nút khóa và gợi ý khi thiếu size/màu; sản phẩm không có màu không thêm được; bấm hai lần chỉ thêm một lần | lỗi | user | component | `tests/storefront/cart/quick-add.test.tsx` |
| CART-18 | Thêm nhanh: đóng bằng X, nền, Esc, vuốt xuống; khóa và trả lại cuộn trang; số lượng 1–10; bảng size chỉ tải khi bấm | đúng | user | component | `tests/storefront/cart/quick-add.test.tsx` |
| CART-18E | Thêm nhanh khi chưa đăng nhập (đường từ lưới bộ sưu tập): dòng vào giỏ ở máy, BE từ chối, dòng ở lại cho tới khi `CartSync` dọn; dùng ngoài provider thì ném lỗi | lỗi | khách | component | `tests/storefront/cart/quick-add.test.tsx` |

Ngưỡng coverage riêng của module: `moduleSlice.ts` 95/85/95 (T0: tiền và tồn kho), `CartSync.tsx` 95/85/95, `CartContent.tsx` và `QuickAddDrawer.tsx` 75/65/75 (UI nhiều nhánh trình bày).

## 7. Rủi ro & triển khai

| Rủi ro | Phát hiện | Quay lui |
|---|---|---|
| Đổi số lượng hoặc xóa một dòng **trước khi** BE trả lời lệnh thêm: dòng chưa có `serverItemId` nên không gọi BE; `fetchCart` lần sau lấy lại số lượng/dòng cũ của BE | Test CART-13E, CART-14E khóa hành vi hiện tại | Chủ dự án quyết định: xếp hàng lệnh theo khóa dòng hoặc khóa nút khi `pendingAddKeys` có khóa đó |
| `syncAdd` lỗi (hết hạn phiên 401, 500) để dòng ở máy mà BE không có; người dùng thấy dòng như đã thêm | Test CART-6E, CART-18E | Hiện toast lỗi và gỡ dòng, hoặc thử lại sau khi refresh token |
| Thunk dùng `apiFetchStandalone` không refresh khi 401 | Test CART-5E | Quyết định chung với [auth](../platform/auth.md) (đã ghi ở lộ trình) |
| Báo giá `subtotal` lỗi chỉ hiện "…", không báo lỗi | Test CART-16E | Hiện thông báo và nút thử lại |
| Hẹn giờ 500 ms (số lượng) và 800 ms (đóng ngăn kéo) không bị hủy khi component bị gỡ | Đọc code | Dọn trong cleanup của effect |
| `CartContent` (570 dòng) gánh danh sách, chọn, yêu thích, thanh toán; import slice của module khác | Đọc code | Tách dòng giỏ và thanh chọn sau khi có test (phần "component quá lớn") |

Không có thay đổi hành vi nhìn thấy được trong lượt này.

## 8. Lịch sử thay đổi

- 2026-10-22 · Viết spec và test cho toàn module (batch 2), kiểm thử đột biến; không đổi code của module.
