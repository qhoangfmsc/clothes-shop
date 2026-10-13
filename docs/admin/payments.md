# Payments (đối soát thanh toán chuyển khoản)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/payments` · **Cập nhật:** 2026-10-13
> **Code:** `(admin)/admin/payments/` — `page.tsx`, `PaymentsContent.tsx`, `_common/{moduleSlice,types,constants}.ts`, `_components/{AttemptsTable,AttemptBadge,ConfirmPaymentModal,OrderPicker,OrderPaymentTab,VerificationBadge}.tsx` · `src/app/[locale]/_components/OrderPaymentBadge.tsx`
> **i18n:** `admin.payments`, `common.orderPaymentStatus`, `shared.errors.byCode` (1702, 1703, 1707–1709)
> **Redux slice:** `state.payments`

## 1. Tóm tắt module

Trang đối soát các giao dịch ngân hàng SePay báo về, và các công cụ để admin xác nhận thủ công một đơn đã thanh toán khi hệ thống không tự khớp được. Cũng cung cấp tab "Thanh toán" trong panel chi tiết đơn ([orders](./orders.md)).

## 2. Phục vụ gì / việc cần làm

BE tự đánh dấu đơn `paid` khi webhook khớp đơn, đúng số tiền, còn hạn. Mọi trường hợp khác (không nhận ra mã đơn, sai số tiền, đến trễ, đơn đã hủy, webhook không tới) cần người xem lại: trang này liệt kê giao dịch, cho gắn giao dịch vào đúng đơn chưa trả và cho nhập giao dịch bằng tay.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Tra nội dung chuyển khoản (tab mặc định) | `AttemptsTable`: mọi mã chuyển khoản từng cấp (kể cả hết hạn), tìm theo nội dung chuyển khoản / mã đơn / SĐT / tên khách, lọc trạng thái mã, hiện đơn + khách, các giao dịch ngân hàng đã gắn; nút "Xác nhận đã thanh toán" ở từng dòng (chỉ khi đơn `unpaid` và chưa `cancelled`) |
| Bảng giao dịch (tab thứ hai) | Search (nội dung chuyển khoản, mã giao dịch), lọc theo kết quả đối soát (`verificationStatus`), sort, phân trang |
| Gắn vào đơn | Nút ở dòng có kết quả `UNMATCHED`, `AMOUNT_MISMATCH`, `LATE` hoặc `NOT_PAYABLE` (và đơn của phiên khớp chưa `paid`): chọn đơn chưa trả, nhập lý do, xác nhận |
| Nhập giao dịch thủ công | Nút ở đầu trang: `reference`, số tiền VND, nguồn (`sepay` / `manual`), đơn, lý do — cho trường hợp webhook không tới |
| Tab thanh toán của đơn | `OrderPaymentTab`: trạng thái thanh toán, các phiên QR, các giao dịch của đơn; nút "Xác nhận đã thanh toán" và "Gắn vào đơn này" |
| Quyền | Vào trang và xem cần `PAYMENT_ADMIN_VIEW`; mọi nút xác nhận cần `PAYMENT_ADMIN_CONFIRM` (`RoleGuard`) |

## 4. Chi tiết

### 4.1 API (qua `authApi`, đều bọc `{ data }`)

| Thunk | API | Ghi chú |
|---|---|---|
| `fetchPaymentTransactions` | `GET /api/admin/payments/transactions?search&verificationStatus&orderId&sort&page&limit` | Sort BE chỉ nhận `receivedAt`, `amount` (`PAYMENT_SORT_OPTIONS`: `-receivedAt` mặc định, truyền vào `DataTable` qua `defaultSort` vì mặc định chung của `DataTable` là `-createdAt` và BE trả 400 với giá trị đó; `receivedAt`, `-amount`, `amount`). Mỗi phần tử kèm `paymentAttempt` (`null` nếu không khớp phiên nào; có phiên thì kèm `order` tóm tắt `{ id, status, paymentStatus, total, userId }`) |
| `fetchPaymentAttempts` | `GET /api/admin/payments/attempts?search&status&orderId&sort&page&limit` | `search` không phân biệt hoa/thường, khớp một phần. Sort BE: `createdAt`, `expiresAt`, `amount` (`ATTEMPT_SORT_OPTIONS`, mặc định `-createdAt`). Mỗi dòng: `{ id, transferCode, amount (VND), status (trạng thái thật), createdAt, expiresAt, paidAt, order { id, status, paymentStatus, total, userId, customer { fullName, phone } (mỗi trường có thể `null`) }, transactions[] }` |
| `fetchOrderPayment` | `GET /api/admin/payments/orders/:orderId` | `{ order, attempts, transactions }`, mới nhất trước |
| `confirmOrderPayment` | `POST /api/admin/payments/orders/:orderId/confirm` (HTTP 201) | Body: đúng một trong `{ transactionId }` (gắn giao dịch có sẵn) hoặc `{ transferCode, amount }` (ghi giao dịch mới, kèm tùy chọn `reference`, `provider`, `transferContent`), cộng `note` (bắt buộc, ≤ 500) và `acceptAmountMismatch?` |
| `searchUnpaidOrders` | `GET /api/admin/orders?paymentStatus=unpaid&search&sort=-createdAt&limit=10` | Cho `OrderPicker` |

Số tiền của phiên và giao dịch là **VND** (hiện bằng định dạng `vnd`); tổng đơn là đơn vị cửa hàng (`priceFixed`).

### 4.2 Bảng

Cột: **Thời gian** (`dateTime`), **Số tiền** (VND), **Nội dung** (nội dung chuyển khoản + mã giao dịch; ẩn dưới `md`), **Kết quả đối soát** (`VerificationBadge`), **Đơn hàng** (link `/admin/orders?orderId=<id>` + `OrderPaymentBadge`; ẩn dưới `sm`; `—` nếu không khớp phiên), **Thao tác**. Kết quả: `MATCHED` Đã khớp, `UNMATCHED` Chưa khớp đơn, `ACCOUNT_MISMATCH` Sai tài khoản, `AMOUNT_MISMATCH` Sai số tiền, `LATE` Đến trễ, `NOT_PAYABLE` Đơn không còn thanh toán, `DUPLICATE_PAYMENT` Trả trùng, `IGNORED` Bỏ qua, `MANUALLY_CONFIRMED` Xác nhận thủ công.

### 4.3 Xác nhận (`ConfirmPaymentModal`)

- Hai chế độ: có `transaction` → gắn giao dịch đó (cách A: `transactionId` + `note`; hiện tóm tắt số tiền, nội dung, mã, kết quả); không có → ghi giao dịch mới (cách B: `transferCode` + `amount` + `note`). Cách B nhanh nhất khi mở từ một dòng của tab tra cứu hoặc từ một phiên trong tab thanh toán của đơn: mã được điền sẵn (`lockedTransferCode`, không sửa) cùng số tiền của phiên (`defaultAmount`); mã được gửi dạng chữ hoa, BE đánh dấu đúng phiên mang mã đó là đã trả kể cả khi đã hết hạn. Mục gập "Thêm thông tin sao kê" chứa `reference`, `provider` (mặc định để BE chọn: `sepay` khi có `reference`, `manual` khi chỉ có mã) và `transferContent`; chỉ gửi những ô có điền. Đơn: `OrderPicker` (tìm theo mã đơn / tên / điện thoại khách / nội dung chuyển khoản trong các đơn chưa trả, bỏ đơn `cancelled`; debounce 300 ms) hoặc `fixedOrderId` khi mở từ một đơn.
- Kiểm tra trước khi gửi: phải chọn đơn, `note` bắt buộc; nhập tay thì cần `transferCode` và số tiền nguyên VND ≥ 1. Lỗi hiện dưới từng trường.
- **Lệch số tiền (mã 1710)**: BE từ chối vì số tiền nhận khác số tiền phiên, message nêu số nhận và số cần. FE mở hộp xác nhận (`useConfirm`, `danger`) hiện nguyên message của BE; chọn "Vẫn xác nhận" thì gửi lại với `acceptAmountMismatch: true`, hủy thì giữ nguyên form.
- Lỗi khác qua `useErrorMessage` (có bản dịch cho 1702, 1703 "mã không thuộc đơn này", 1707, 1708; 1709 và các mã khác hiện nguyên message của BE vì nó nêu rõ lý do; nút xác nhận ẩn khi đơn đã trả/đã hủy nên 1702 hiếm gặp). Thành công: toast, `onConfirmed` (làm mới bảng hoặc tab).

### 4.4 Tab thanh toán của đơn (`OrderPaymentTab`)

Tải `fetchOrderPayment(orderId)`. Hiển thị: trạng thái thanh toán (`OrderPaymentBadge`), thời điểm trả, tổng đơn, khách (tên · điện thoại từ snapshot địa chỉ; có thể `null`, hiện `—`); danh sách **phiên thanh toán** — mọi mã đã cấp, kể cả hết hạn (mã chuyển khoản kèm `CopyButton`, số tiền VND, `AttemptBadge` với trạng thái thật `PENDING | PAID | EXPIRED | CANCELLED`, hạn, ngày tạo, ngày trả; mã chưa trả có nút "Xác nhận mã này"); danh sách **giao dịch** (số tiền, `VerificationBadge`, nội dung, mã giao dịch kèm `CopyButton`, thời gian, ghi chú xác nhận nếu có). Khi đơn `unpaid` và user có `PAYMENT_ADMIN_CONFIRM`: nút "Xác nhận đã thanh toán" (nhập giao dịch thủ công cho đúng đơn) và, ở giao dịch có kết quả có thể gắn, nút "Gắn vào đơn này".

### 4.5 Liên quan

Khách tạo QR và theo dõi trạng thái ở [checkout](../storefront/checkout.md) 4.6. Danh sách và panel đơn: [orders](./orders.md). Quyền và mã: [auth](../platform/auth.md). Menu: [admin-shell](./admin-shell.md).
