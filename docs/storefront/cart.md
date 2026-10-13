# Cart (giỏ hàng, thêm nhanh, giỏ nổi)

> **Nhóm:** Storefront (private) · **Route:** `/[locale]/cart` · **Cập nhật:** 2026-10-13
> **Code:** `(private)/cart/` — `page.tsx`, `layout.tsx`, `CartContent.tsx`, `_common/{moduleSlice,types}.ts`, `_components/CartSync.tsx` · `_components/QuickAddDrawer.tsx`, `_components/CartFAB.tsx` (dùng chung) · `src/store/index.ts` (lưu `localStorage`)
> **i18n:** `private.cart`, `shared.cart` (`fab`, `quickAdd`, `productAction`)
> **Redux slice:** `state.cart`

## 1. Tóm tắt module

Giỏ hàng nhiều dòng: dữ liệu giữ ở Redux (hiện ngay), lưu `localStorage`, và đồng bộ nền với giỏ trên BE theo tài khoản. Khách chọn các dòng muốn thanh toán (tick), thấy tạm tính của các dòng đã chọn rồi sang `/checkout` (tiền, vận chuyển và tiến độ miễn phí vận chuyển nằm ở trang đó).

## 2. Phục vụ gì / việc cần làm

Gom sản phẩm khách định mua (size, màu, số lượng), cho phép sửa/bớt/chuyển sang yêu thích, và chỉ đưa các dòng đã chọn sang bước thanh toán. Sản phẩm hết hàng hoặc đặt may nằm trong giỏ nhưng không thể thanh toán.

## 3. Submodule & chức năng hiện có

| Submodule | Chức năng |
|---|---|
| Slice cart | State dòng hàng, danh sách dòng bị bỏ chọn, thunk đồng bộ BE, selector tổng |
| `CartSync` | Đồng bộ giỏ khi đăng nhập/đổi tài khoản/đăng xuất |
| `CartContent` | Trang giỏ: danh sách dòng, chọn tất cả, thao tác hàng loạt, nút thanh toán |
| `QuickAddDrawer` | Ngăn kéo thêm nhanh từ thẻ sản phẩm / bộ sưu tập |
| `CartFAB` | Nút giỏ nổi với số lượng, ẩn ở `/cart` và `/checkout*` (xem [site-chrome](../platform/site-chrome.md)) |

## 4. Chi tiết

### 4.1 Dữ liệu (`CartItem`)

`{ serverItemId?, productId, name, price, image, size, color, colorHex, quantity, category, subcategory, badge? }`. Khóa của một dòng = `productId|size|color` (`cartItemKey`) — cùng sản phẩm khác size/màu là dòng khác. `serverItemId` có sau khi BE xác nhận dòng.

State: `items`, `deselectedKeys` (lưu các dòng **bị bỏ tick**, nên mặc định mọi dòng, kể cả dòng thêm sau, đều được chọn), `pendingAddKeys` (dòng đang chờ BE, không lưu), `isOpen`, `isSyncing`.

### 4.2 Reducer & selector

- Reducer: `addItem(item, quantity)` (gộp số lượng nếu trùng khóa), `removeItem`, `removeItems(keys)`, `updateQuantity` (≤ 0 thì xóa dòng), `clearCart`, `toggleItemSelected(key)`, `setAllSelected(bool)`, `toggleDrawer/openDrawer/closeDrawer`. Khi xóa dòng, `deselectedKeys` được dọn để thêm lại dòng đó sẽ mặc định được chọn.
- Selector: `selectCartItems`, `selectTotalItems`, `selectTotalPrice`, `selectPurchasableCartItems` (lọc `isPurchasable(badge)`), `selectSelectedCartItems` (mua được **và** không bị bỏ tick), `selectSelectedTotalItems`, `selectSelectedTotalPrice`, `selectDeselectedKeys`, `selectCartIsOpen`, `selectCartIsSyncing`.
- Lưu trữ: `src/store/index.ts` ghi `doovan-cart` (items) và `doovan-cart-selection` (deselectedKeys) mỗi khi đổi; slice nạp lại khi khởi tạo (chấp nhận cả dạng `{state:{items}}` cũ và `{items}`).

### 4.3 Đồng bộ với BE (`apiFetchStandalone`, không refresh token)

| Thunk | API |
|---|---|
| `fetchCart` | `GET /api/cart` — map `data.items[]` sang `CartItem` (`colorHex` tra theo tên màu, `category/subcategory` lấy `slug`) |
| `syncAddToCartItem({productId,size,color,quantity})` | `POST /api/cart/items`; tìm id dòng trong giỏ trả về theo sản phẩm+size+màu (vì `data.id` là id giỏ, không phải id dòng) và gán `serverItemId` |
| `syncUpdateCartItemQuantity` | `PATCH /api/cart/items/:serverItemId` `{quantity}` |
| `syncRemoveCartItem` | `DELETE /api/cart/items/:serverItemId` |
| `clearCartOnServer` | `DELETE /api/cart/clear` |

Cập nhật lạc quan: UI đổi ngay, rồi gọi API. `fetchCart.fulfilled` coi giỏ BE là nguồn sự thật nhưng **giữ** các dòng đang chờ thêm (`pendingAddKeys`) chưa có trên BE. Số lượng đổi được debounce 500 ms trước khi gọi API và chỉ khi dòng đã có `serverItemId`.

### 4.4 `CartSync`

Mount trong `Providers`. Khi phiên đã xác định (`!isLoading`): đã đăng nhập → `fetchCart()`; chưa → `clearCart()` (xóa bản địa phương để người dùng sau trên cùng trình duyệt không thấy giỏ của người trước). Chạy lại khi đổi `userId`.

### 4.5 Trang giỏ (`CartContent`)

- Chưa đăng nhập → `UnauthenticatedState`; đang tải phiên → skeleton.
- Header: link "Tiếp tục mua sắm", tiêu đề, tổng số lượng (`selectTotalItems`). Giỏ trống: thông báo + nút tới `/shop`.
- Thanh chọn: checkbox "Chọn tất cả" (3 trạng thái, chỉ tính dòng mua được), đếm đã chọn/tổng, hai nút icon: **thêm vào wishlist** (các dòng đã chọn; toast số lượng thêm hoặc "đã có") và **xóa** (xác nhận `danger`, toast `removed`, xóa local rồi `syncRemoveCartItem` từng dòng).
- Mỗi dòng (`CartItemRow`, `<li>`): checkbox (khóa nếu không mua được), ảnh 80×107 px (104×139 từ `sm`, mờ đi khi không mua được), tên (link sản phẩm) và thành tiền dòng cùng hàng, chip size + chip màu + đơn giá, hàng cuối: `QuantityControl` (1–10) bên trái, nút tim (wishlist + sync) và nút xóa (xác nhận) bên phải (viền chỉ hiện khi hover/được bật). Dòng `sold_out`/`custom_order` hiện cảnh báo; riêng `custom_order` có link "Đặt may" tới `/contact?product=…`.
- Bố cục một cột `max-w-[820px]`: header, rồi **một thẻ duy nhất** gồm ba phần liền nhau: thanh chọn (nền champagne: "Chọn tất cả" + đếm, icon yêu thích / xóa hàng loạt), danh sách dòng (`<ul>` ngăn bằng đường kẻ mảnh, không có khung riêng cho từng dòng) và chân thẻ thanh toán (`sticky bottom-0`, luôn ghim cuối màn hình khi danh sách dài, chừa `safe-area-inset-bottom`). Chân thẻ hiện "Tạm tính (n sản phẩm)" + số tiền của các dòng **đã chọn** (`selectSelectedTotalPrice` / `selectSelectedTotalItems`) và nút **Tiến hành thanh toán** → `/checkout`; chưa chọn dòng nào thì thay số tiền bằng gợi ý `checkout.selectToCheckout` và khóa nút. Không có khối tóm tắt, vận chuyển hay thanh miễn phí vận chuyển: các thông tin đó nằm ở [checkout](./checkout.md) 4.4.
- Metadata: `private.cart.meta`; layout có header + footer; `robots noindex` (từ layout `(private)`).

### 4.6 `QuickAddDrawer` (`QuickAddProvider` ở root, hook `useQuickAdd().openQuickAdd(product)`)

- Ngăn kéo từ dưới (mobile, vuốt xuống > 80 px để đóng) hoặc từ phải (≥ 640 px) qua portal; Esc đóng; khóa scroll.
- Không mở nếu `!isPurchasable(product.badge)`.
- Chọn size, màu và số lượng 1–10; nút thêm chỉ bật khi đã chọn **cả size lẫn màu** (khối chọn màu ẩn khi sản phẩm không có màu, nên sản phẩm như vậy không thêm được từ drawer; trang chi tiết có cùng điều kiện), bảng size thu gọn (`useSizeGuide` chỉ gọi khi bấm "Bảng size").
- Thêm: `addItem` + `syncAddToCartItem` + `trackEvent("add_to_cart")` + toast có link `/cart`, nút đổi thành "Đã thêm" rồi đóng sau 0.8 s. Gợi ý còn thiếu size/màu.
- Được mở từ `ProductCard` (sau `requireAuth`) và từ lưới sản phẩm ở [collections](./collections.md) (không qua `requireAuth`).

### 4.7 Liên quan

Luồng tiếp theo: [checkout](./checkout.md). Quy tắc mua theo badge: [ui-kit](../platform/ui-kit.md) 4.8. Wishlist: [wishlist](./wishlist.md).

- Dòng giỏ có `badge` `custom_order` (chỉ còn khi giỏ cũ chứa sản phẩm này) không hiện đơn giá và thành tiền dòng, thay bằng `common.priceOnRequest`; dòng này vốn không được tính vào tổng và checkout.
