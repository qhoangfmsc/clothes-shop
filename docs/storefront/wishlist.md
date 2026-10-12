# Wishlist (sản phẩm yêu thích)

> **Nhóm:** Storefront (private) · **Route:** `/[locale]/wishlist` · **Cập nhật:** 2026-10-12
> **Code:** `(private)/wishlist/` — `page.tsx`, `layout.tsx`, `WishlistContent.tsx`, `_common/{moduleSlice,types}.ts`
> **i18n:** `private.wishlist`
> **Redux slice:** `state.wishlist`

## 1. Tóm tắt module

Danh sách sản phẩm khách đã "thả tim". Lưu cục bộ (`localStorage`) để hiện tức thì và đồng bộ lên BE theo tài khoản.

## 2. Phục vụ gì / việc cần làm

Cho khách đánh dấu sản phẩm quan tâm từ thẻ sản phẩm, trang chi tiết hoặc giỏ hàng, rồi xem/bỏ chúng ở một nơi.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Thả/bỏ tim | `toggleWishlistItem` + sync BE; có ở `ProductCard`, trang chi tiết, dòng trong giỏ |
| Trang wishlist | Lưới 2/3/4 cột: ảnh, tên, ngày thêm, nút bỏ; "Xóa tất cả"; "Tiếp tục mua sắm" |
| Trạng thái | Skeleton khi tải phiên; `UnauthenticatedState` khi chưa đăng nhập; trạng thái trống có 3 ưu điểm gợi ý |

## 4. Chi tiết

### 4.1 Dữ liệu

`WishlistItem { productId, name, price, image, category, subcategory, addedAt }`. State: `items`, `isSyncing`. Lưu ở `localStorage` khóa `doovan-wishlist` (qua subscriber ở `src/store/index.ts`; nạp lại khi khởi tạo, chấp nhận cả dạng `{state:{items}}` và `{items}`).

### 4.2 Reducer, thunk, selector

- Reducer: `toggleWishlistItem(item)` (thêm kèm `addedAt = now`, hoặc xóa nếu đã có), `removeWishlistItem(productId)`, `clearWishlist()`.
- Thunk (`apiFetchStandalone`): `syncAddToWishlist` = `POST /api/wishlist/:productId`, `syncRemoveFromWishlist` = `DELETE /api/wishlist/:productId`, `fetchWishlist` = `GET /api/wishlist` (map `product` → `WishlistItem`; `category/subcategory` lấy `slug` nếu là object, ngược lại giữ nguyên).
- Selector: `selectWishlistItems`, `selectIsWishlisted(productId)`, `selectWishlistTotal`, `selectWishlistIsSyncing`.
- Quy ước thao tác từ UI: gọi reducer cục bộ trước, rồi `syncAdd/Remove` (lạc quan, lỗi mạng không được báo).

### 4.3 Trang

- `useEffect` gọi `fetchWishlist()` khi đã đăng nhập (chỉ tại trang này; `fetchWishlist.fulfilled` thay toàn bộ `items` bằng bản BE).
- Bỏ một sản phẩm: `removeWishlistItem` + `syncRemoveFromWishlist` + toast `info`.
- "Xóa tất cả": chỉ dispatch `clearWishlist()` (xóa local, **không** gọi BE).
- Mỗi thẻ link tới `/shop/<category>/<subcategory>/<productId>`; ngày thêm định dạng `short`.
- Style của trang viết trong thẻ `<style>` riêng (class `wishlist-*`) thay vì Tailwind.
- Metadata `private.wishlist.meta`; layout có header + footer.

### 4.4 Khác với giỏ hàng

Wishlist **không** được xóa khi đăng xuất (giỏ hàng thì có, qua `CartSync`); bản địa phương chỉ được thay bằng bản BE khi mở trang wishlist lúc đã đăng nhập.

- `WishlistItem.badge` (lấy từ sản phẩm khi thêm, và từ `product.badge` khi `fetchWishlist`) quyết định có hiện giá: `custom_order` hiện `common.priceOnRequest`. Mục lưu trước khi có trường này chưa có `badge` nên vẫn hiện giá đến lần đồng bộ kế tiếp.
