# Customer orders (đơn hàng của tôi)

> **Nhóm:** Storefront (private) · **Route:** `/[locale]/orders`, `/[locale]/orders/[orderId]` · **Cập nhật:** 2026-10-12
> **Code:** `(private)/orders/` — `page.tsx`, `layout.tsx`, `OrdersContent.tsx`, `[orderId]/{page.tsx,OrderDetailContent.tsx}`, `_common/constants.ts`, `_components/OrderStatusBadge.tsx`
> **i18n:** `private.orders` (`meta`, `list`, `detail`), `common.orderStatus`

## 1. Tóm tắt module

Khách xem lịch sử đơn của mình: danh sách các đơn (mới nhất theo BE) và trang chi tiết từng đơn.

## 2. Phục vụ gì / việc cần làm

Cho khách theo dõi trạng thái đơn sau khi đặt (chờ xử lý → xác nhận → đang giao → đã giao → hoàn tất / hủy), xem lại địa chỉ, món hàng và tiền.

## 3. Submodule & chức năng hiện có

| Thành phần | Chức năng |
|---|---|
| Danh sách `/orders` | Thẻ mỗi đơn: ngày, tổng tiền, badge trạng thái, món đầu tiên (ảnh, tên, size/màu, số lượng) + "và n món khác", mã đơn, link "Xem chi tiết" |
| Chi tiết `/orders/[orderId]` | Tiêu đề kèm mã, badge trạng thái, địa chỉ giao, ghi chú, tạm tính, phí vận chuyển (kèm phương thức), tổng, danh sách món |
| `OrderStatusBadge` | Pill màu + icon + nhãn theo trạng thái (dùng ở cả hai trang) |
| Trạng thái | Skeleton khi tải phiên, `UnauthenticatedState` khi chưa đăng nhập, trạng thái trống có CTA mua sắm |

## 4. Chi tiết

### 4.1 Dữ liệu

- Danh sách: `GET /api/orders` (`useApiAuth().apiFetch`, không phân trang/limit ở FE) → `{ data: Order[] }`. Lỗi tải → toast `toast.loadFailed` qua `useErrorMessage`.
- Chi tiết: `GET /api/orders/:orderId` (id lấy từ `useParams`). Lỗi → toast; không có đơn → thông báo `notFound`.
- `Order`: `id, status, subtotal, shippingFee, total, shippingMethod, shippingAddress: Record<string,string>, note, createdAt, updatedAt, items[{ id, productId | null, productName, productImage, quantity, price, size, color, createdAt }]`.

### 4.2 Hiển thị

- Trạng thái → màu/icon (`STATUS_CONFIG`): `pending` vàng/đồng hồ, `confirmed` xanh/tick, `shipping` sage/xe tải, `delivered` & `completed` sage/tick, `cancelled` hồng đậm/X; nhãn từ `common.orderStatus` (giá trị lạ hiện nguyên giá trị, mặc định style `pending`).
- Địa chỉ: hiển thị theo thứ tự cố định `fullName` (đậm), `phone`, `addressLine1`, `addressLine2` (nếu có), `city[, province] [postalCode]`, và `country` chỉ khi khác `"Vietnam"` (không dùng nhãn trường như `OrderDetailPanel` của admin).
- Phí vận chuyển: `0` hiện "Miễn phí"; phương thức `express` / còn lại → nhãn `shippingMethod.express` / `shippingMethod.standard`.
- Tiền: `format.number(Number(x), "price")`; ngày: `short`.
- Style của hai trang viết trong thẻ `<style>` riêng (class `orders-*`, `order-detail-*`, `.order-status-badge`).

### 4.3 Phạm vi

Trang chỉ đọc: không có hủy đơn, thanh toán lại hay theo dõi vận đơn trên giao diện khách. Việc đổi trạng thái do admin thực hiện ([admin/orders](../admin/orders.md)).

### 4.4 Liên quan

Đơn được tạo ở [checkout](./checkout.md); [account](./account.md) hiện tóm tắt 3 đơn gần nhất.
