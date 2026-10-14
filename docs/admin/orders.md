# Orders (quản lý đơn hàng)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/orders` (`?orderId=<id>` mở chi tiết) · **Cập nhật:** 2026-10-14
> **Code:** `(admin)/admin/orders/` — `OrdersContent.tsx`, `_common/{moduleSlice,types,constants}.ts`, `page.tsx` · dùng `_components/OrderDetailPanel.tsx`, `_components/OrderPaymentBadge.tsx`, `admin/payments/_components/OrderPaymentTab.tsx`, `admin/refunds/_components/OrderRefundBanner.tsx`
> **i18n:** `admin.orders`, `admin.components.orderDetailPanel`, `common.orderStatus`, `common.orderPaymentStatus`
> **Redux slice:** `state.orders`

## 1. Tóm tắt module

Danh sách đơn hàng của toàn cửa hàng với việc đổi trạng thái ngay trong bảng và panel chi tiết có thể chia sẻ bằng URL.

## 2. Phục vụ gì / việc cần làm

Cho nhân viên theo dõi đơn, xem nội dung một đơn (sản phẩm, địa chỉ giao, thanh toán, ghi chú) và đẩy đơn qua các bước xử lý đúng quy trình.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Danh sách | Search, lọc theo trạng thái và trạng thái thanh toán, sort, phân trang 25/trang, cột "Thanh toán" |
| Đổi trạng thái | Dropdown trong ô trạng thái, chỉ hiện các bước hợp lệ tiếp theo |
| Chi tiết đơn | Panel modal; URL `?orderId=` mở thẳng; lỗi không tìm thấy có panel riêng; tab "Thanh toán" (cần `PAYMENT_ADMIN_VIEW`) xem [payments](./payments.md) |
| Quyền | Đổi trạng thái cần `ORDER_ADMIN_UPDATE_STATUS`, ngược lại hiện badge chỉ đọc |

## 4. Chi tiết

### 4.1 Bảng

- Cột: **Order ID** (`#id`), **Customer** (`shippingAddress.fullName` hoặc `userId`), **Items** (số món), **Total** (`priceFixed`), **Status**, **Payment** (`OrderPaymentBadge`, ẩn dưới `sm`), **Date** (`short`), **Actions** (nút "View").
- Lọc `status` (`ORDER_STATUSES`) và `paymentStatus` (`ORDER_PAYMENT_STATUSES`: `unpaid`, `paid`, `refunded`). Sort (`ORDER_SORT_OPTIONS`): `-createdAt` (mặc định), `createdAt`, `-total`, `total`.
- Ô tìm kiếm (placeholder: mã đơn, SĐT, tên, nội dung chuyển khoản) cũng khớp nội dung chuyển khoản của mọi phiên thanh toán, kể cả đã hết hạn.
- `fetchOrderList` → `GET /api/admin/orders?search&status&paymentStatus&sort&page&limit`.

- **Việc cần xử lý** (`needsAction`): khung `PendingActionNotice` ở đầu trang với số `counts.orders` từ `usePendingCounts()` ([admin-shell](./admin-shell.md)): "N đơn cần xử lý" gồm đơn mới chờ xác nhận mà khách chưa có mã QR còn hạn, và đơn đã xác nhận/đã thanh toán chờ chuyển sang giao hàng; không gồm đơn khách đang chuyển khoản (QR còn hạn), đang giao, đã giao, hoàn tất, đã hủy (nên tổng đơn đang chờ có thể lớn hơn số này). Nút "Xem đơn cần xử lý" bật `?needsAction=true` (đồng bộ lên URL, giữ các tham số khác như `orderId`) và gửi `needsAction=true` tới `GET /api/admin/orders` (BE chỉ nhận `true`/`false`; FE chỉ gửi `true`); bật rồi thì nút thành "Xem tất cả"; bảng dựng lại (`key`).

### 4.2 Đổi trạng thái

- Quy trình (`ORDER_STATUS_TRANSITIONS`): `pending → confirmed | cancelled`; `confirmed → shipping | cancelled`; `shipping → delivered`; `delivered → completed`; `completed` và `cancelled` là trạng thái cuối. `getSelectableOrderStatuses(current)` trả trạng thái hiện tại + các bước tiếp theo — chính là danh sách trong dropdown.
- `updateOrderStatus` → `PATCH /api/admin/orders/:id/status` với `{ status }`. Thành công: toast `statusChanged` (mã đơn + nhãn trạng thái mới), cập nhật panel đang mở, refresh bảng. Lỗi: toast `statusFailed` qua `useErrorMessage`.
- Dropdown bị khóa khi `isUpdating`.
- Chuyển đơn **đã thanh toán** (`paymentStatus = paid`) sang `cancelled` hỏi xác nhận trước (`useConfirm`, `danger`, `confirmCancelPaid.*`): BE sẽ tạo yêu cầu hoàn tiền, admin chuyển khoản trả khách ở [refunds](./refunds.md). Đơn `pending` chuyển sang `confirmed` tự động khi thanh toán thành công (BE), nên đơn đã trả thường đã ở `confirmed`.

### 4.3 Chi tiết đơn (URL-driven)

- Bấm "View": `router.push("/admin/orders?orderId=<id>", { scroll: false })`, hiện ngay dữ liệu dòng đang có rồi tải bản mới nhất (`GET /api/admin/orders/:id`, giữ dữ liệu cũ nếu lỗi).
- Mở trang với `?orderId=` sẵn: `useEffect` tự tải chi tiết (một lần, chống chạy lại bằng `hasAutoOpened`); lỗi → panel "không tìm thấy" (`detail.notFoundTitle/notFoundMessage` kèm mã).
- Đóng: bỏ query khỏi URL. `page.tsx` bọc `OrdersContent` bằng `<Suspense>` vì dùng `useSearchParams`.
- Nội dung panel (`OrderDetailPanel`): trạng thái, trạng thái thanh toán (`paymentStatus`), ngày giờ (phương thức vận chuyển hiện tên cấu hình qua `useShippingMethodName()`, chưa có thì hiện mã), danh sách món (ảnh, tên, size/màu, số lượng, thành tiền), vận chuyển (phương thức, phí, từng trường địa chỉ với nhãn qua `useAddressFieldLabel`), thanh toán (tạm tính, phí ship, tổng), ghi chú.

- **Banner hoàn tiền**: đơn `cancelled` mà `paymentStatus = paid` (và user có `PAYMENT_ADMIN_VIEW`) hiện `OrderRefundBanner` qua prop `notice` của panel: "Đơn đã hủy nhưng chưa hoàn tiền", link sang [refunds](./refunds.md) và nút "Tạo yêu cầu hoàn" (cần `PAYMENT_ADMIN_REFUND`) khi chưa có khoản `REQUESTED`.
- Tab **Thanh toán**: chỉ hiện khi user có `PAYMENT_ADMIN_VIEW` (`hasPermission`); nội dung là `OrderPaymentTab` của module payments. Khi admin xác nhận thanh toán trong tab, `refreshAfterPayment` tải lại đơn đang mở (`fetchOrderDetail`) và làm mới bảng.

### 4.4 Kiểu dữ liệu

`AdminOrder { id, userId, status, paymentStatus (`unpaid` | `paid` | `refunded`), paidAt, subtotal, shippingFee, total, shippingMethod, shippingAddress: Record<string, unknown>, note, items: AdminOrderItem[], createdAt, updatedAt }`, `AdminOrderItem { id, productId | null, productName, productImage, price, quantity, size, color }` (định nghĩa trong `src/hooks/use-admin-api.ts`). Module: `OrderListParams extends ListParams { status? }`, `OrderListResult`. Giá trị tiền do BE trả có thể là chuỗi nên luôn ép `Number(...)` khi hiển thị.

### 4.5 Liên quan

- Đơn do khách tạo ở [checkout](../storefront/checkout.md); khách xem lại ở [customer-orders](../storefront/customer-orders.md).
- `OrderDetailPanel` cũng được dùng trong [users](./users.md).
- Khung modal chi tiết đơn tự dựng (không dùng `ModalShell`): overlay `p-3` → `sm:p-6`, chiều cao tối đa `calc(100dvh - 1.5rem)` (từ `sm`: `85dvh`), cuộn trong khung.
