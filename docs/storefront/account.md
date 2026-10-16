# Account (tài khoản)

> **Nhóm:** Storefront (private) · **Route:** `/[locale]/account` · **Cập nhật:** 2026-10-15
> **Code:** `(private)/account/` — `page.tsx`, `layout.tsx`, `AccountContent.tsx` · dùng `UserAvatar` từ `_components/UserMenu.tsx`
> **i18n:** `private.account`

## 1. Tóm tắt module

Trang tổng quan tài khoản của khách: hồ sơ (lấy từ Google) kèm nút đăng xuất, vài đơn hàng gần nhất và vài sản phẩm yêu thích gần đây. Không có form chỉnh sửa hồ sơ.

## 2. Phục vụ gì / việc cần làm

Là điểm vào của khu "của tôi": từ đây khách nhảy sang Wishlist và Orders, hoặc đăng xuất.

## 3. Submodule & chức năng hiện có

| Khối | Chức năng |
|---|---|
| `ProfileHeader` | Avatar (`UserAvatar` 64 px), tên (hoặc lời chào mặc định), email, "Thành viên từ <ngày dạng long>" và nút Đăng xuất (`logout()`): dưới `lg` là một hàng gọn với nút icon tròn 44 px bên phải, từ `lg` là thẻ ở cột phải (căn giữa, nút chữ đầy chiều ngang) |
| `WishlistSection` | 4 sản phẩm yêu thích mới nhất (`items.slice(-4).reverse()`) trong `Carousel` dùng chung (2,5 thẻ/khung dưới 640 px để thẻ kế lộ ra và vuốt ngang; 4 thẻ từ `sm`, nên không cuộn); thẻ gồm ảnh 3:4, tên, giá; không mũi tên, chấm, tự chạy hay lặp vòng; link "Xem tất cả" → `/wishlist`; trống → gợi ý duyệt shop |
| `OrdersSection` | 3 đơn đầu của `GET /api/orders` (card tóm tắt, link `/orders/<id>`: ngày đặt (`short`) + số món (`itemCount`), nhãn trạng thái và tổng — không hiện mã đơn, mã chỉ nằm trong link; mỗi thẻ có một ảnh vuông 48 px của sản phẩm đầu có ảnh (không có ảnh → icon gói hàng); nhãn thanh toán nếu có `paymentStatus` chỉ hiện từ `sm` (≥ 640 px)); link "Xem tất cả" → `/orders`; trống → gợi ý mua sắm |
| Trạng thái | `AccountSkeleton` khi tải phiên; chưa đăng nhập → `UnauthenticatedState` |

## 4. Chi tiết

- **Bố cục** (`AccountContent`): dưới `lg` một cột rộng tối đa 720 px theo thứ tự hồ sơ → `OrdersSection` → `WishlistSection`; từ `lg` khung rộng tối đa 1080 px, lưới `minmax(0,1fr) 300px` giống trang chi tiết đơn: đơn hàng rồi yêu thích ở cột trái, thẻ hồ sơ + đăng xuất ở cột phải (`sticky`, `top-[104px]`). `AccountSkeleton` dùng cùng lưới.

- `WishlistSection` đọc trực tiếp store (`selectWishlistItems`), không gọi API; dữ liệu có thể là bản cục bộ (xem [wishlist](./wishlist.md)). Mỗi thẻ link tới `/shop/<category>/<subcategory>/<productId>`.
- `OrdersSection` dùng `useApiAuth().apiFetch("/api/orders")` rồi cắt 3 đơn; lỗi được bỏ qua âm thầm (hiện như chưa có đơn). Màu trạng thái được khai báo riêng trong component (`STATUS_COLORS`), nhãn qua `useOrderStatusLabel`.
- Đăng xuất chỉ xóa token và `user` phía FE (`logout()` của `AuthProvider`), không điều hướng; khi `isAuthenticated` thành `false` trang chuyển sang `UnauthenticatedState`, và `CartSync` xóa giỏ cục bộ.
- Metadata `private.account.meta`; layout có header + footer; `noindex`.
- Là nơi đích của link "Back" ở các trang Wishlist và Orders.
- Mục wishlist trong tài khoản ẩn giá của sản phẩm `custom_order` (hiện `common.priceOnRequest`) theo `WishlistItem.badge`.
