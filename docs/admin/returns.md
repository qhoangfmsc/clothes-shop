# Returns (trả hàng)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/returns` (`?returnId=<id>` mở chi tiết, `?orderId=<id>` lọc theo đơn) · **Cập nhật:** 2026-10-17
> **Code:** `(admin)/admin/returns/` — `page.tsx`, `ReturnsContent.tsx`, `_common/{moduleSlice,types,constants}.ts`, `_components/{ReturnBadge,ReturnDetailPanel,ApproveReturnModal,RejectReturnModal,ReceiveReturnModal}.tsx`
> **i18n:** `admin.returns`, `shared.errors.byCode` (1801, 1803, 1804), `admin.components.crud.sort` (`updatedDesc`, `updatedAsc`)
> **Redux slice:** `state.returns`

## 1. Tóm tắt module

Hàng đợi yêu cầu trả hàng của khách: xem chi tiết, duyệt hoặc từ chối, xác nhận đã nhận hàng (chốt số lượng chấp nhận) để BE tạo khoản hoàn.

## 2. Phục vụ gì / việc cần làm

Khách xin trả hàng sau khi nhận; admin quyết định, nhận và kiểm hàng, rồi chuyển khoản hoàn bên ngoài hệ thống. Khoản hoàn nằm ở [refunds](./refunds.md): khi admin hoàn xong ở đó, yêu cầu trả hàng tự thành `REFUNDED`; nếu từ chối khoản hoàn, yêu cầu quay về `APPROVED` và có thể nhận hàng lại.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Khung việc cần xử lý | `PendingActionNotice` ở đầu trang: "N yêu cầu chờ duyệt" (không gồm yêu cầu đã duyệt đang chờ hàng về), cách xử lý, nút "Xem yêu cầu chờ duyệt" = tab `REQUESTED` ("Xem tất cả" khi đang ở tab đó) và một dòng phụ không kèm số "Yêu cầu đã duyệt, chờ hàng về" với nút lọc `APPROVED` |
| Tab trạng thái | `REQUESTED` (mặc định, kèm số `counts.returns` từ `usePendingCounts()`), `APPROVED`, `RECEIVED`, `REFUNDED`, `REJECTED`, `CANCELLED`, "Tất cả"; tab nằm trong URL `?status=` (vắng = `REQUESTED`), đổi tab dựng lại bảng (`key`) |
| Bảng | Search (mã yêu cầu, mã đơn, SĐT, tên khách), sort (`createdAt`, `updatedAt`), phân trang 25/trang; cột: mã, đơn + badge thanh toán + khách, lý do (ẩn dưới `md`), trạng thái, ngày tạo (ẩn dưới `sm`), "Xem" |
| Chi tiết (`ReturnDetailPanel`) | Modal: khối khoản hoàn nổi bật khi đã có (số tiền `MoneyText`, trạng thái, `bankReference`, "đã gồm phí vận chuyển", link sang Hoàn tiền `?orderId=`), yêu cầu (trạng thái, ngày, lý do, ghi chú khách, phản hồi cho khách), đơn (mã, khách, tổng và phí ship bằng `MoneyText`, `deliveredAt`, thanh toán), từng dòng (khách trả / shop nhận, đơn giá theo ngôn ngữ) |
| Nút theo trạng thái | `REQUESTED`: "Duyệt" + "Từ chối"; `APPROVED`: "Đã nhận hàng" + "Từ chối"; `RECEIVED`, `REFUNDED`, `REJECTED`, `CANCELLED`: không có nút |
| "Duyệt" (`ApproveReturnModal`) | Ô `note` tùy chọn (≤ 500) là hướng dẫn gửi hàng, khách thấy |
| "Từ chối" (`RejectReturnModal`) | `note` bắt buộc (≤ 500), khách thấy lý do |
| "Đã nhận hàng" (`ReceiveReturnModal`) | Mỗi dòng một ô số lượng chấp nhận (mặc định = số khách trả, từ 0 đến số đó); tất cả bằng 0 thì chặn và gợi ý dùng "Từ chối"; checkbox "Hoàn cả phí ship" (mặc định tắt, chú thích mỗi đơn chỉ hoàn một lần); ghi chú tùy chọn (thay phản hồi trước đó). Gửi xong: toast kèm số tiền hoàn `refund.amountVnd/amountUsd` (VND kèm USD) và khối khoản hoàn trong panel |
| Quyền | Vào trang và xem cần `RETURN_ADMIN_VIEW` (16000); duyệt, từ chối, nhận hàng cần `RETURN_ADMIN_PROCESS` (16001), `RoleGuard` ẩn nút khi thiếu quyền; link sang Hoàn tiền cần thêm `PAYMENT_ADMIN_VIEW` |

## 4. Chi tiết

### 4.1 API (qua `authApi`, bọc `{ data }`)

| Thunk | API | Ghi chú |
|---|---|---|
| `fetchReturns` | `GET /api/admin/returns?search&status&orderId&sort&page&limit` | Mỗi dòng cùng shape chi tiết admin (có `order.customer`, `refund.id`) |
| `fetchReturnDetail` | `GET /api/admin/returns/:returnId` | Dùng khi mở panel (cả từ URL `?returnId=`) |
| `approveReturn` | `POST .../approve` `{ note? }` | |
| `rejectReturn` | `POST .../reject` `{ note }` | |
| `receiveReturn` | `POST .../receive` `{ items[{ returnItemId, acceptedQuantity }], refundShipping?, note? }` | Response là yêu cầu đã cập nhật, `refund.amountVnd/amountUsd` là số tiền hoàn do BE tính |

Cả ba thao tác trả về yêu cầu đã cập nhật nên panel thay thẳng, bảng và số đếm làm mới. Lỗi: 1801, 1803, 1804 có bản dịch; 1802, 1805 (dữ liệu nhận hàng sai, hoặc phí ship đã hoàn trước đó) và 1712 (đơn đang có khoản hoàn chờ khác) hiện message của BE; 1804 thường do thao tác trùng nên đóng modal và tải lại để thấy trạng thái thật.

`ReturnRequest` admin: `{ id, orderId, status, reason, note, adminNote, createdAt, updatedAt, approvedAt, receivedAt, shippingRefunded, items[{ id, orderItemId, productName, productImage, size, color, priceVnd | null, priceUsd | null, quantity, acceptedQuantity | null }], refund { id, amountVnd, amountUsd, status, bankReference, processedAt } | null, order { id, status, paymentStatus, totalVnd, totalUsd, shippingFeeVnd, shippingFeeUsd, deliveredAt, userId, customer { fullName, phone } } | null }`.

### 4.2 Liên quan

Khách tạo và theo dõi yêu cầu ở [customer-returns](../storefront/customer-returns.md). Khoản hoàn ở [refunds](./refunds.md) (cột lý do của khoản `RETURN` link về `?returnId=`). Menu: [admin-shell](./admin-shell.md). Quyền: [auth](../platform/auth.md).
