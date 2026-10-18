# Customer returns (trả hàng của khách)

> **Nhóm:** Storefront (private) · **Route:** `/[locale]/returns`, `/[locale]/returns/[returnId]`, `/[locale]/returns/new?orderId=` · **Cập nhật:** 2026-10-17
> **Code:** `(private)/returns/` — `layout.tsx`, `page.tsx`, `ReturnsContent.tsx`, `[returnId]/{page.tsx,ReturnDetailContent.tsx}`, `new/{page.tsx,NewReturnContent.tsx}`, `_common/{types,constants,use-return-eligibility}.ts`, `_components/{ReturnStatusBadge,ReturnProgress,OrderReturnCard}.tsx`
> **i18n:** `private.returns` (`meta`, `status`, `reason`, `ineligible`, `orderCard`, `list`, `detail`, `form`), `shared.errors.byCode` (1801, 1803, 1804)

## 1. Tóm tắt module

Khách xin trả hàng cho một đơn đã giao: chọn dòng hàng và số lượng, lý do, gửi yêu cầu; sau đó theo dõi yêu cầu qua các bước duyệt → gửi hàng về → shop nhận → hoàn tiền, và có thể hủy khi chưa gửi hàng tới.

## 2. Phục vụ gì / việc cần làm

Cho khách biết đơn nào còn trả được (và đến hạn nào), trả đúng phần còn trả được, rồi nhìn là biết yêu cầu đang ở đâu, shop dặn gì, và tiền hoàn bao nhiêu. Việc duyệt, nhận hàng và chuyển khoản hoàn do admin làm ([admin/returns](../admin/returns.md), [admin/refunds](../admin/refunds.md)).

## 3. Submodule & chức năng hiện có

| Thành phần | Chức năng |
|---|---|
| `OrderReturnCard` (trong chi tiết đơn, [customer-orders](./customer-orders.md)) | Chỉ với đơn `delivered` / `completed`: gọi `GET /api/returns/eligibility/:orderId`. `eligible` → "Còn hạn đến {deadline}" + nút "Yêu cầu trả hàng" → `/returns/new?orderId=`; không → nhãn theo `reason` (`ORDER_NOT_PAID` Đơn chưa thanh toán, `ORDER_NOT_DELIVERED` Đơn chưa giao, `RETURN_WINDOW_EXPIRED` Đã hết hạn đổi trả, `NOTHING_TO_RETURN` Đã gửi yêu cầu cho toàn bộ sản phẩm), không có nút. Liệt kê các yêu cầu đã gửi của đơn (`GET /api/returns?orderId=`) kèm badge, bấm vào xem chi tiết |
| Form `/returns/new` | Một màn hình: chọn từng dòng hàng (checkbox + số lượng 1…`returnableQuantity`, dòng hết số lượng bị khóa "đã gửi yêu cầu"), lý do (`WRONG_SIZE` Sai size, `CHANGED_MIND` Đổi ý, `DEFECTIVE` Hàng lỗi, `WRONG_ITEM` Giao sai hàng, `OTHER` Lý do khác; danh sách `OptionList`), ghi chú ≤ 500 ký tự; thẻ bên phải: chính sách đổi trả từ `GET /api/shipping` (`returnPolicy.description`, `conditions[]`), hạn "Còn hạn đến …", gợi ý "Muốn đổi size? Hãy trả hàng rồi đặt đơn mới.", nút gửi |
| Danh sách `/returns` | Thẻ mỗi yêu cầu (badge, ngày, tối đa 2 sản phẩm, mã đơn + lý do, số tiền hoàn nếu có); `?orderId=` lọc theo đơn; "Xem thêm" phân trang 25/trang |
| Chi tiết `/returns/[returnId]` | Trạng thái + câu giải thích, thanh tiến trình (`ReturnProgress`: Chờ duyệt → Đã duyệt, gửi hàng về → Shop đã nhận hàng → Đã hoàn tiền; `REJECTED` / `CANCELLED` không có thanh), phản hồi của shop (`adminNote`: tiêu đề "Hướng dẫn gửi hàng" khi `APPROVED`, "Lý do từ chối" khi `REJECTED`), từng dòng (tên, size, màu, số lượng trả, số lượng nhận khi đã `RECEIVED`/`REFUNDED`), lý do và ghi chú của khách, khoản hoàn, nút "Hủy yêu cầu" |

## 4. Chi tiết

### 4.1 API (qua `useApiAuth().apiFetch`, bọc `{ data }`)

| API | Dùng ở | Ghi chú |
|---|---|---|
| `GET /api/returns/eligibility/:orderId` | `useReturnEligibility` | `{ orderId, eligible, reason, deadline, returnWindowDays, items[{ orderItemId, quantity, returnableQuantity }] }`; `enabled = false` thì không gọi |
| `POST /api/returns` | form | `{ orderId, reason, note?, items[{ orderItemId, quantity }] }`; thành công → toast, `router.replace` sang `/returns/<id>`. Lỗi 1802 / 1803: toast, xóa lựa chọn và tải lại eligibility để thấy số lượng thật |
| `GET /api/returns?sort=-createdAt&page&limit&orderId` | danh sách, `OrderReturnCard` | Lọc `status` có ở BE nhưng giao diện khách không có bộ lọc |
| `GET /api/returns/:returnId` | chi tiết | Lỗi → toast + trạng thái "không tìm thấy" (1801) |
| `PATCH /api/returns/:returnId/cancel` | chi tiết | Nút chỉ hiện khi `REQUESTED` hoặc `APPROVED` (`CUSTOMER_CANCELLABLE_STATUSES`), qua `useConfirm`; response là yêu cầu đã cập nhật. Lỗi (1804: trạng thái vừa đổi) → toast và tải lại |

`ReturnRequest { id, orderId, status (REQUESTED | APPROVED | RECEIVED | REFUNDED | REJECTED | CANCELLED), reason, note, adminNote, createdAt, approvedAt, receivedAt, items[{ id, orderItemId, productName, productImage, size, color, priceVnd | null, priceUsd | null, quantity, acceptedQuantity | null }], refund { amountVnd, amountUsd, status, bankReference, processedAt } | null }`. Không có tên hay id của admin.

### 4.2 Hiển thị

- Chính sách đổi trả lấy từ cấu hình (`returnPolicy` của `GET /api/shipping`), không hardcode; khi chưa tải được thì chỉ hiện số ngày `returnWindowDays` của eligibility.
- Số tiền hoàn hiện theo ngôn ngữ (`fmt(refund, "amount")`: VND ở `vi`, USD ở ngôn ngữ khác, nửa cặp do BE trả). Khoản hoàn ở chi tiết: `REQUESTED` "Cửa hàng sẽ chuyển khoản lại {số tiền}", `COMPLETED` "Đã hoàn {số tiền}" kèm `bankReference` (có `CopyButton`), `REJECTED` "Cửa hàng không hoàn tiền, vui lòng liên hệ cửa hàng".
- Lỗi: 1801, 1803, 1804 có bản dịch; 1802 (đơn không trả được) và 1805 hiện message của BE (`useErrorMessage`).
- `/returns` nằm trong `PRIVATE_PATHS` của `robots.ts`; liên kết "Yêu cầu trả hàng" ở đầu trang [customer-orders](./customer-orders.md).

### 4.3 Liên quan

Đơn giao xong mới trả được; admin xử lý ở [admin/returns](../admin/returns.md); khoản hoàn hiện cả ở thẻ "Hoàn tiền" của chi tiết đơn (`reason = RETURN` ghi "Hoàn tiền do trả hàng", có link sang yêu cầu).
