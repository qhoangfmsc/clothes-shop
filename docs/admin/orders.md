# Orders (quản lý đơn hàng)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/orders` (`?orderId=<id>` mở chi tiết) · **Cập nhật:** 2026-10-12
> **Code:** `(admin)/admin/orders/` — `OrdersContent.tsx`, `_common/{moduleSlice,types,constants}.ts`, `page.tsx` · dùng `_components/OrderDetailPanel.tsx`
> **i18n:** `admin.orders`, `admin.components.orderDetailPanel`, `common.orderStatus`
> **Redux slice:** `state.orders`

## 1. Tóm tắt module

Danh sách đơn hàng của toàn cửa hàng với việc đổi trạng thái ngay trong bảng và panel chi tiết có thể chia sẻ bằng URL.

## 2. Phục vụ gì / việc cần làm

Cho nhân viên theo dõi đơn, xem nội dung một đơn (sản phẩm, địa chỉ giao, thanh toán, ghi chú) và đẩy đơn qua các bước xử lý đúng quy trình.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Danh sách | Search, lọc theo trạng thái, sort, phân trang 25/trang |
| Đổi trạng thái | Dropdown trong ô trạng thái, chỉ hiện các bước hợp lệ tiếp theo |
| Chi tiết đơn | Panel modal; URL `?orderId=` mở thẳng; lỗi không tìm thấy có panel riêng |
| Quyền | Đổi trạng thái cần `ORDER_ADMIN_UPDATE_STATUS`, ngược lại hiện badge chỉ đọc |

## 4. Chi tiết

### 4.1 Bảng

- Cột: **Order ID** (`#id`), **Customer** (`shippingAddress.fullName` hoặc `userId`), **Items** (số món), **Total** (`priceFixed`), **Status**, **Date** (`short`), **Actions** (nút "View").
- Lọc `status` (`ORDER_STATUSES`). Sort (`ORDER_SORT_OPTIONS`): `-createdAt` (mặc định), `createdAt`, `-total`, `total`.
- `fetchOrderList` → `GET /api/admin/orders?search&status&sort&page&limit`.

### 4.2 Đổi trạng thái

- Quy trình (`ORDER_STATUS_TRANSITIONS`): `pending → confirmed | cancelled`; `confirmed → shipping | cancelled`; `shipping → delivered`; `delivered → completed`; `completed` và `cancelled` là trạng thái cuối. `getSelectableOrderStatuses(current)` trả trạng thái hiện tại + các bước tiếp theo — chính là danh sách trong dropdown.
- `updateOrderStatus` → `PATCH /api/admin/orders/:id/status` với `{ status }`. Thành công: toast `statusChanged` (mã đơn + nhãn trạng thái mới), cập nhật panel đang mở, refresh bảng. Lỗi: toast `statusFailed` qua `useErrorMessage`.
- Dropdown bị khóa khi `isUpdating`.

### 4.3 Chi tiết đơn (URL-driven)

- Bấm "View": `router.push("/admin/orders?orderId=<id>", { scroll: false })`, hiện ngay dữ liệu dòng đang có rồi tải bản mới nhất (`GET /api/admin/orders/:id`, giữ dữ liệu cũ nếu lỗi).
- Mở trang với `?orderId=` sẵn: `useEffect` tự tải chi tiết (một lần, chống chạy lại bằng `hasAutoOpened`); lỗi → panel "không tìm thấy" (`detail.notFoundTitle/notFoundMessage` kèm mã).
- Đóng: bỏ query khỏi URL. `page.tsx` bọc `OrdersContent` bằng `<Suspense>` vì dùng `useSearchParams`.
- Nội dung panel (`OrderDetailPanel`): trạng thái, ngày giờ, danh sách món (ảnh, tên, size/màu, số lượng, thành tiền), vận chuyển (phương thức, phí, từng trường địa chỉ với nhãn qua `useAddressFieldLabel`), thanh toán (tạm tính, phí ship, tổng), ghi chú.

### 4.4 Kiểu dữ liệu

`AdminOrder { id, userId, status, subtotal, shippingFee, total, shippingMethod, shippingAddress: Record<string, unknown>, note, items: AdminOrderItem[], createdAt, updatedAt }`, `AdminOrderItem { id, productId | null, productName, productImage, price, quantity, size, color }` (định nghĩa trong `src/hooks/use-admin-api.ts`). Module: `OrderListParams extends ListParams { status? }`, `OrderListResult`. Giá trị tiền do BE trả có thể là chuỗi nên luôn ép `Number(...)` khi hiển thị.

### 4.5 Liên quan

- Đơn do khách tạo ở [checkout](../storefront/checkout.md); khách xem lại ở [customer-orders](../storefront/customer-orders.md).
- `OrderDetailPanel` cũng được dùng trong [users](./users.md).
- Khung modal chi tiết đơn tự dựng (không dùng `ModalShell`): overlay `p-3` → `sm:p-6`, chiều cao tối đa `calc(100dvh - 1.5rem)` (từ `sm`: `85dvh`), cuộn trong khung.
