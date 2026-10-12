# Account (tài khoản)

> **Nhóm:** Storefront (private) · **Route:** `/[locale]/account` · **Cập nhật:** 2026-10-12
> **Code:** `(private)/account/` — `page.tsx`, `layout.tsx`, `AccountContent.tsx` · dùng `UserAvatar` từ `_components/UserMenu.tsx`
> **i18n:** `private.account`

## 1. Tóm tắt module

Trang tổng quan tài khoản của khách: hồ sơ (lấy từ Google), vài sản phẩm yêu thích gần đây, vài đơn hàng gần nhất và nút đăng xuất. Không có form chỉnh sửa hồ sơ.

## 2. Phục vụ gì / việc cần làm

Là điểm vào của khu "của tôi": từ đây khách nhảy sang Wishlist và Orders, hoặc đăng xuất.

## 3. Submodule & chức năng hiện có

| Khối | Chức năng |
|---|---|
| `ProfileHeader` | Avatar (`UserAvatar` 80 px), tên (hoặc lời chào mặc định), email, "Thành viên từ <ngày dạng long>" |
| `WishlistSection` | 4 sản phẩm yêu thích mới nhất (`items.slice(-4).reverse()`), link "Xem tất cả" → `/wishlist`; trống → gợi ý duyệt shop |
| `OrdersSection` | 3 đơn đầu của `GET /api/orders` (card tóm tắt: mã, ngày, số món, tổng, badge trạng thái, link `/orders/<id>`); link "Xem tất cả" → `/orders`; trống → gợi ý mua sắm |
| `SignOutSection` | Nút Đăng xuất → `logout()` |
| Trạng thái | `AccountSkeleton` khi tải phiên; chưa đăng nhập → `UnauthenticatedState` |

## 4. Chi tiết

- `WishlistSection` đọc trực tiếp store (`selectWishlistItems`), không gọi API; dữ liệu có thể là bản cục bộ (xem [wishlist](./wishlist.md)). Mỗi thẻ link tới `/shop/<category>/<subcategory>/<productId>`.
- `OrdersSection` dùng `useApiAuth().apiFetch("/api/orders")` rồi cắt 3 đơn; lỗi được bỏ qua âm thầm (hiện như chưa có đơn). Màu trạng thái được khai báo riêng trong component (`STATUS_COLORS`), nhãn qua `useOrderStatusLabel`.
- Đăng xuất chỉ xóa token và `user` phía FE (`logout()` của `AuthProvider`), không điều hướng; khi `isAuthenticated` thành `false` trang chuyển sang `UnauthenticatedState`, và `CartSync` xóa giỏ cục bộ.
- Metadata `private.account.meta`; layout có header + footer; `noindex`.
- Là nơi đích của link "Back" ở các trang Wishlist và Orders.
- Mục wishlist trong tài khoản ẩn giá của sản phẩm `custom_order` (hiện `common.priceOnRequest`) theo `WishlistItem.badge`.
