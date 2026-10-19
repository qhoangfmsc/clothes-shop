# Refunds (hoàn tiền)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/refunds` (`?orderId=<id>` lọc theo đơn) · **Cập nhật:** 2026-10-18
> **Code:** `(admin)/admin/refunds/` — `page.tsx`, `RefundsContent.tsx`, `_common/{moduleSlice,types,constants}.ts`, `_components/{RefundBadge,RefundPaymentSource,CompleteRefundModal,RejectRefundModal,OrderRefundBanner}.tsx`
> **i18n:** `admin.refunds`, `shared.errors.byCode` (1711, 1713, 1714), `admin.components.crud.sort` (`processedDesc`, `processedAsc`)
> **Redux slice:** `state.refunds`

## 1. Tóm tắt module

Hàng đợi các khoản tiền cần trả lại khách sau khi một đơn đã thanh toán bị hủy, và chỗ admin ghi nhận đã chuyển khoản trả hoặc từ chối.

## 2. Phục vụ gì / việc cần làm

Hệ thống **không tự chuyển tiền**. Hủy đơn đã trả (khách hoặc admin) khiến BE tạo một yêu cầu hoàn `REQUESTED`; admin chuyển khoản cho khách bằng app ngân hàng, rồi bấm xác nhận kèm mã giao dịch để đơn sang `refunded` và khách thấy kết quả. Trang cho biết hoàn về đâu (mã chuyển khoản, mã giao dịch, nội dung đã nhận).

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Tab trạng thái | `REQUESTED` (mặc định, kèm số `counts.refunds` từ `usePendingCounts()`), `COMPLETED`, `REJECTED`, "Tất cả"; tab nằm trong URL `?status=` (vắng = `REQUESTED`), đổi tab dựng lại bảng (`key`) |
| Khung việc cần xử lý | `PendingActionNotice` ở đầu trang: "N khoản chờ chuyển trả khách", cách xử lý (chuyển khoản rồi "Đã chuyển khoản", hoặc "Từ chối" kèm lý do); nút "Xem khoản chờ hoàn" = tab `REQUESTED`, đang ở tab đó thì nhãn là "Xem tất cả" |
| Bảng | Search (mã đơn, mã giao dịch hoàn, nội dung chuyển khoản, SĐT, tên khách), sort, phân trang 25/trang; cột: yêu cầu lúc + lý do, số tiền hoàn (`MoneyText`), đơn + badge thanh toán + khách, khoản đã nhận (`RefundPaymentSource`, ẩn dưới `lg`), trạng thái (+ `processedAt`, `bankReference` kèm `CopyButton`, `note`), thao tác |
| Lọc theo đơn | `?orderId=` (từ banner của panel đơn) hiện chip "Đơn #id" có nút bỏ lọc |
| "Đã chuyển khoản" (`CompleteRefundModal`) | Chỉ ở dòng `REQUESTED`: nhắc chuyển khoản trước rồi mới xác nhận, hiện số tiền, đơn, khách, khoản đã nhận; hai ô bắt buộc `reference` (≤ 64) và `note` (≤ 500) |
| "Từ chối" (`RejectRefundModal`) | Chỉ ở dòng `REQUESTED`: `note` bắt buộc (≤ 500), lưu để kiểm tra, khách không thấy |
| Banner trên panel đơn (`OrderRefundBanner`) | Đơn `cancelled` mà `paymentStatus = paid` → "Đơn đã hủy nhưng chưa hoàn tiền", link sang trang này (`?orderId=`), và nút "Tạo yêu cầu hoàn" khi chưa có yêu cầu `REQUESTED` |
| Quyền | Vào trang và xem cần `PAYMENT_ADMIN_VIEW`; tạo, hoàn xong, từ chối cần `PAYMENT_ADMIN_REFUND` (14002, `RoleGuard` ẩn nút khi thiếu quyền) |

## 4. Chi tiết

### 4.1 API (qua `authApi`, bọc `{ data }`)

| Thunk | API | Ghi chú |
|---|---|---|
| `fetchRefunds` | `GET /api/admin/refunds?search&status&orderId&sort&page&limit` | Sort BE: `createdAt`, `processedAt`, `amount` (sắp theo VND; `REFUND_SORT_OPTIONS`, mặc định `-createdAt` trùng mặc định của `DataTable`) |
| `fetchOrderOpenRefunds` | cùng API, `status=REQUESTED&orderId&limit=1` | Cho banner: `total = 0` mới hiện nút "Tạo yêu cầu hoàn" |
| `completeRefund` | `POST /api/admin/refunds/:refundId/complete` `{ reference, note }` | Lỗi 1713 (đã xử lý), 1714 (mã giao dịch đã dùng cho khoản hoàn khác), 1711 (không thấy) có bản dịch; 1712 hiện message của BE |
| `rejectRefund` | `POST /api/admin/refunds/:refundId/reject` `{ note }` | |
| `createRefund` | `POST /api/admin/refunds` `{ orderId }` | Cho đơn đã hủy + đã trả mà chưa có khoản hoàn (hủy trước khi có luồng hoàn, hoặc yêu cầu cũ bị từ chối); 1712 nếu không hoàn được |

`Refund { id, orderId, status (REQUESTED | COMPLETED | REJECTED), reason (ADMIN_CANCELLED | RETURN), amountVnd, amountUsd, createdAt, processedAt, bankReference, note, order { id, status, paymentStatus, totalVnd, totalUsd, userId, customer { fullName, phone } (mỗi trường có thể null) }, payment { transferCode, paidAmountVnd, paidAmountUsd, paidAt, provider, transactionRef, transferContent } }`. Số tiền là **VND** (định dạng `vnd`).

### 4.2 Liên quan

Khoản hoàn do trả hàng (`reason = RETURN`) có `returnRequestId` nên cột lý do link sang [returns](./returns.md) (`?returnId=`); khi hoàn xong ở đây BE tự đưa yêu cầu trả hàng sang `REFUNDED`. Khách thấy khoản hoàn ở [customer-orders](../storefront/customer-orders.md) 4.2; panel đơn và bộ lọc `refunded`: [orders](./orders.md); khoản tiền gốc và xác nhận thanh toán: [payments](./payments.md). Menu: [admin-shell](./admin-shell.md). Quyền: [auth](../platform/auth.md).

- **Đơn vị kích thước:** các số px trong doc này là giá trị ở gốc 16 px; trong code, chiều dài và cỡ chữ của module viết bằng `rem` (class `…-[…rem]`, token `--text-*` / `--space-*`, style inline `"…rem"`) nên lớn dần từ 1536 px tới 1920 px theo thang gốc `html` ([design-system](../platform/design-system.md) 4.3).
