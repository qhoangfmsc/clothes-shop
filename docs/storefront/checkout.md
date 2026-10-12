# Checkout (thanh toán / đặt hàng)

> **Nhóm:** Storefront (private) · **Route:** `/[locale]/checkout` · **Cập nhật:** 2026-10-12
> **Code:** `(private)/checkout/` — `page.tsx`, `layout.tsx`, `CheckoutContent.tsx`
> **i18n:** `private.checkout`

## 1. Tóm tắt module

Luồng đặt hàng 3 bước trong một trang: **Địa chỉ → Xem lại & đặt hàng → Thành công**. Chỉ các dòng đã tick trong giỏ (và mua được) được đặt; các dòng còn lại ở lại giỏ.

## 2. Phục vụ gì / việc cần làm

Thu thông tin giao hàng, cho khách rà lại đơn, rồi tạo đơn trên BE từ chính các dòng giỏ hàng đã xem lại. Gửi sự kiện phễu `begin_checkout` và `purchase` cho Analytics.

## 3. Submodule & chức năng hiện có

| Bước | Nội dung |
|---|---|
| Điều kiện vào | Đang tải phiên → skeleton; chưa đăng nhập → `UnauthenticatedState`; không có dòng nào được chọn (và chưa ở bước thành công) → trạng thái giỏ trống + nút tới `/shop` |
| 1. Address | Form địa chỉ + ghi chú, kiểm tra trường bắt buộc |
| 2. Review | Địa chỉ, danh sách món, tổng, ghi chú thanh toán, nút đặt hàng, link điều khoản |
| 3. Success | Thông báo + link tới `/orders` và `/shop` |

## 4. Chi tiết

### 4.1 Form địa chỉ (`AddressForm`)

`fullName*` (mặc định `user.name` tại thời điểm khởi tạo), `phone*`, `addressLine1*`, `addressLine2`, `city*`, `province`, `postalCode`, `country` (mặc định `"Vietnam"`), `notes`. Dấu `*` là bắt buộc phía FE (`address.errors.fullName|phone|street|city`); lỗi biến mất khi sửa trường đó. Điều kiện này chỉ gồm các trường BE yêu cầu.

### 4.2 Chuyển bước

- Address → Review: `validateAddress()` đạt thì `trackEvent("begin_checkout", { items, value })` rồi `setStep("review")`. Link "Back" ở bước Review quay về Address (không rời trang); ở bước Address trỏ về `/cart`.
- Chỉ báo bước hiển thị Address / Review (ẩn ở Success).

### 4.3 Đặt hàng (`handlePlaceOrder`)

1. `dispatch(fetchCart()).unwrap()` — lấy giỏ BE hiện tại vì `serverItemId` lưu cục bộ có thể cũ (đã đặt/đã xóa/tài khoản khác).
2. Lọc các dòng BE khớp (`cartItemKey`) với các dòng đã xem lại → `cartItemIds`. Nếu số id ≠ số dòng đã xem lại → toast `itemsNotSynced`, dừng.
3. `POST /api/addresses` (qua `useApiAuth().apiFetch`, có refresh token) với các trường địa chỉ (trường rỗng tùy chọn → `undefined`) → lấy `addressId`; thiếu id → lỗi `addressFailed`.
4. `POST /api/orders` với `{ addressId, shippingMethod: "standard", note?, cartItemIds }`.
5. Thành công: lưu `orderId`, `trackEvent("purchase", { orderId, value })`, `removeItems` các dòng đã đặt khỏi giỏ cục bộ, `setStep("success")`, toast `placed`. Lỗi: toast qua `useErrorMessage` (fallback `toast.failed`; ví dụ mã `1303` cho sản phẩm hết hàng/đặt may).
- Nút đặt hàng khóa khi `isSubmitting`.
- Phương thức vận chuyển luôn là `standard` (không có lựa chọn trên giao diện); giá/miễn phí vận chuyển do BE tính, trang chỉ hiện tổng của các dòng.

### 4.4 Bước Review

Hiện địa chỉ nhận (`review.shippingTo`) và ghi chú nếu có, danh sách món (ảnh, tên, size/màu/số lượng, thành tiền), tổng (`review.total`), `review.paymentNote`, nút "Đặt hàng"/"Đang đặt…", và dòng đồng ý với Điều khoản, Chính sách bảo mật, Vận chuyển & đổi trả (3 link mở tab mới để không mất form).

### 4.5 Metadata & layout

Layout riêng: `private.checkout.meta`, chỉ có `SiteHeader` (không có footer). `noindex` qua layout `(private)`.

### 4.6 Liên quan

Giỏ: [cart](./cart.md). Đơn sau khi tạo: [customer-orders](./customer-orders.md), quản trị: [admin/orders](../admin/orders.md). Sự kiện: [analytics](../admin/analytics.md).
