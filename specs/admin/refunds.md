# Refunds admin (hoàn tiền) — Tech spec — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-24 · **Trạng thái:** Implemented
> **Doc:** [admin/refunds](../../docs/admin/refunds.md) · **Test:** `tests/admin/refunds/`

## 1. Bối cảnh & mục tiêu

Hệ thống không tự chuyển tiền: khi một đơn đã trả bị hủy hoặc khách trả hàng, BE mở một yêu cầu hoàn tiền, nhân viên chuyển khoản trả khách bằng app ngân hàng rồi ghi mã giao dịch vào đây. Sai ở đây là khách không nhận lại tiền hoặc một khoản bị ghi "đã hoàn" khi chưa chuyển. Module gồm `RefundsContent.tsx` (hàng đợi theo tab), `_components/{CompleteRefundModal,RejectRefundModal,OrderRefundBanner,RefundPaymentSource,RefundBadge}.tsx`, `_common/{moduleSlice,types,constants}.ts` và `page.tsx`. Cảnh báo `OrderRefundBanner` được [orders](./orders.md) nhúng vào panel chi tiết đơn.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Hàng đợi bốn tab, tìm kiếm, sắp xếp, khung "cần xử lý", lọc theo đơn | Gửi tiền: hệ thống không chuyển tiền, chỉ ghi nhận |
| Form "đã chuyển khoản", form từ chối, cảnh báo trên đơn đã hủy, kho Redux | Chặn người không phải admin: thuộc [admin-shell](./admin-shell.md); ở đây chỉ kiểm BE từ chối thì không lộ gì |
| Quyền `PAYMENT_ADMIN_REFUND` trên từng nút | Bảng, hộp thoại, nút chép: thuộc [ui-kit](../platform/ui-kit.md) |

## 3. Hợp đồng

- **Hàng đợi.** `GET /api/admin/refunds?search&status&orderId&sort&page&limit` (mới nhất trước; sáu cách sắp xếp). Tab `?status=`: vắng hoặc không hợp lệ = `REQUESTED` (chờ hoàn, kèm `counts.refunds`), `COMPLETED`, `REJECTED`, `all` (không gửi `status`); đổi tab giữ các tham số khác và tạo mới bảng. `?orderId=` lọc theo đơn và hiện chip có đường xóa lọc. Mỗi dòng: thời điểm và lý do (`RETURN` có link tới `/admin/returns?returnId=…`, lý do lạ giữ nguyên), số tiền, đơn (link) với trạng thái thanh toán và khách (hoặc `—`), khoản đã nhận (mã, mã giao dịch, nội dung, nguồn · số tiền · ngày; ẩn dưới `lg`), trạng thái kèm thời điểm xử lý, mã giao dịch hoàn (chép được) và ghi chú. Bảng trống nói theo tab; tìm không ra nói "không phù hợp"; BE lỗi nói "không tải được" kèm "Thử lại".
- **Quyền.** Hai nút "Đã chuyển khoản" và "Từ chối" chỉ ở dòng `REQUESTED` và chỉ với `PAYMENT_ADMIN_REFUND`.
- **Đã chuyển khoản** (`POST /api/admin/refunds/:id/complete`): cảnh báo chuyển trước; bắt buộc mã giao dịch (≤ 64) và ghi chú (≤ 500), cắt khoảng trắng; thiếu thì báo dưới ô và không gửi. Thành công: toast, đóng form, làm mới bảng. Lỗi: toast lời BE (mã 1713, 1714 có bản dịch) hoặc lời mặc định, form giữ nguyên.
- **Từ chối** (`POST …/reject`): bắt buộc lý do (≤ 500), lưu để kiểm tra sau, khách không thấy.
- **Cảnh báo trên đơn đã hủy** (`OrderRefundBanner`): hỏi `GET /api/admin/refunds?limit=1&status=REQUESTED&orderId=…` lấy tổng; có yêu cầu đang chờ thì nói vậy, không thì nói chưa có và, với `PAYMENT_ADMIN_REFUND`, hiện nút "Tạo yêu cầu hoàn" (`POST /api/admin/refunds {orderId}`); tạo xong thì toast, đếm lại và báo cha. Link sang hàng đợi của đơn đó.
- **Khung "cần xử lý"**: số `counts.refunds`, bật/tắt giữa tab chờ và tab tất cả.

## 4. Thiết kế

```
page.tsx ──► RefundsContent ──► FormTabs · PendingActionNotice · DataTable ──► fetchRefunds (thunk) ──► authApi
RefundsContent ──► CompleteRefundModal / RejectRefundModal ──► completeRefund / rejectRefund ──► authApi
OrdersContent (orders) ──► OrderRefundBanner ──► fetchOrderOpenRefunds · createRefund
RefundPaymentSource ◄── RefundsContent · CompleteRefundModal
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Tab nằm trong địa chỉ** (`?status=`) | Gửi link cho đồng nghiệp mở đúng hàng đợi; Back đổi tab; tab lạ về hàng đợi chính | State cục bộ |
| **Ghi nhận sau, không tự chuyển tiền** | Tiền ra khỏi ngân hàng là việc của người; hệ thống chỉ ghi để khớp sổ và không trùng mã giao dịch | Gọi API ngân hàng |
| **Lý do và mã bắt buộc, cắt khoảng trắng** | Mỗi khoản hoàn có dấu vết kiểm tra sau; mã giao dịch không trùng giữa các khoản | Cho để trống |
| **Hỏi tổng một dòng cho cảnh báo** (`limit=1`) | Chỉ cần biết còn yêu cầu chờ hay không | Tải cả danh sách |
| **Quyền riêng cho nút** (`RoleGuard`) | Người chỉ xem thanh toán không được xử lý hoàn tiền | Một quyền chung |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit, auth (quyền), admin-shell (số đếm), data layer (`authApi`). [orders](./orders.md) phụ thuộc vào `OrderRefundBanner`; ngược lại không. Kho `refunds` giữ danh sách, tổng và cờ đang cập nhật; ba lệnh ghi dùng chung một nhánh trạng thái.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi thành phần một việc: hàng đợi, form hoàn, form từ chối, cảnh báo, nguồn tiền, huy hiệu |
| O | Thêm tab hay lý do = thêm vào hằng số và bản dịch |
| L | `RefundPaymentSource` dùng được ở bảng và ở form |
| I | Form nhận đúng `refund`, `onClose`, `onDone` |
| D | Thành phần phụ thuộc thunk và hook, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `admin.refunds`; tiền qua `MoneyText`/`useMoney`; lỗi qua `useErrorMessage`; toast qua `useToast`. Test dùng `renderApp` với danh tính thật, `adminWith(...)` cho một quyền và `refundsApi` (BE giả) trong `refunds-kit.tsx`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì không lộ khoản nào; việc chặn trang thuộc admin-shell) · permission = có (xử lý hoàn tiền cần `PAYMENT_ADMIN_REFUND`)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ARF-1 | Hàng đợi: mở ở tab chờ hoàn, hỏi mới nhất trước, tổng ở tiêu đề; mỗi dòng có thời điểm, lý do (link tới trả hàng), số tiền, đơn và khách, khoản đã nhận, trạng thái, mã hoàn và ghi chú; tìm, sắp xếp sáu cách, cột nguồn ẩn trên điện thoại, tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/refunds/refunds-list.test.tsx` |
| ARF-2 | Tab: đổi tab bằng địa chỉ giữ tham số khác, tab chờ bỏ `status`, tab lạ về hàng đợi, tab tất cả không gửi `status`, bảng dựng lại khi tab đổi, chip lọc theo đơn, số chờ trên tab | đúng | admin đủ quyền | component | `tests/admin/refunds/refunds-list.test.tsx` |
| ARF-2N | Khung cần xử lý: số, giải thích, bật tắt giữa tab chờ và tất cả; ẩn khi 0 | đúng | admin đủ quyền | component | `tests/admin/refunds/refunds-list.test.tsx` |
| ARF-3 | Nút Đã chuyển khoản và Từ chối cho admin có quyền hoàn tiền ở dòng chờ, mở đúng form; xử lý xong đóng form và làm mới bảng; dòng đã xử lý không có nút | đúng | admin đủ quyền | component | `tests/admin/refunds/refunds-list.test.tsx` |
| ARF-3P | Admin chỉ xem đơn hoặc chỉ xem thanh toán không có nút xử lý | đúng | admin thiếu quyền | component | `tests/admin/refunds/refunds-list.test.tsx` |
| ARF-4E | Bảng trống nói theo tab; tìm không ra; BE lỗi báo không tải được; BE từ chối khách (401) | lỗi | khách | component | `tests/admin/refunds/refunds-list.test.tsx` |
| ARF-4U | BE từ chối người mua đã đăng nhập (403): không lộ khoản nào | lỗi | user | component | `tests/admin/refunds/refunds-list.test.tsx` |
| ARF-5 | Form đã chuyển khoản: cảnh báo chuyển trước, hiện số tiền, đơn, khách, nguồn tiền; bắt buộc mã và ghi chú; gửi đã cắt khoảng trắng; toast; giới hạn độ dài | đúng | admin đủ quyền | component | `tests/admin/refunds/refund-forms.test.tsx` |
| ARF-5E | Form đã chuyển khoản bị từ chối: lời BE (mã 1713, 1714 dịch) hoặc lời mặc định, form giữ nguyên; nút khóa khi đang gửi | lỗi | admin đủ quyền | component | `tests/admin/refunds/refund-forms.test.tsx` |
| ARF-6 | Form từ chối: nêu hậu quả và số tiền, bắt buộc lý do, gửi đã cắt khoảng trắng, toast; lỗi dùng lời BE hoặc lời mặc định | đúng | admin đủ quyền | component | `tests/admin/refunds/refund-forms.test.tsx` |
| ARF-7 | Cảnh báo đơn đã hủy: nói chưa có hoặc đang có yêu cầu chờ, link sang hàng đợi của đơn, nút tạo yêu cầu chỉ khi đếm được 0 và có quyền hoàn, tạo xong thì toast, đếm lại và báo cha | đúng | admin đủ quyền | component | `tests/admin/refunds/refund-forms.test.tsx` |
| ARF-7P | Admin không có quyền hoàn tiền không thấy nút tạo yêu cầu; đếm lỗi thì không có nút | đúng | admin thiếu quyền | component | `tests/admin/refunds/refund-forms.test.tsx` |
| ARF-8 | Huy hiệu trạng thái (kể cả trạng thái lạ) và khối nguồn tiền (mã, tham chiếu, nội dung, nguồn · số tiền · ngày, phần thiếu bị bỏ) | đúng | — | component | `tests/admin/refunds/refund-forms.test.tsx` |
| ARF-9 | Kho Redux và hằng số: tham số hỏi, danh sách và tổng, đếm khoản chờ của một đơn, id được mã hóa, cờ đang tải và đang cập nhật, lỗi, sáu cách sắp xếp, giới hạn BE | đúng | — | unit | `tests/admin/refunds/refunds-slice.test.ts` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| BE lỗi cho ra bảng "không có khoản nào đang chờ hoàn" | Đã sửa trong ui-kit: "không tải được dữ liệu" kèm "Thử lại" (ARF-4E) |
| Cảnh báo trên đơn không có nút tạo khi đếm lỗi | Admin không biết đếm lỗi, thấy "chưa có yêu cầu" mà không có nút (ARF-7) |
| Hai admin cùng xử lý một khoản | BE trả 1713; FE báo và giữ form, không tự tải lại bảng (ARF-5E) |
| Mã giao dịch hoàn phải không trùng giữa các khoản | BE kiểm (1714); FE không kiểm trước (ARF-5E) |

Thay đổi nhìn thấy được: bảng báo lỗi tải thay cho "không có khoản nào".

## 8. Lịch sử thay đổi

- 2026-10-24 · Viết spec và test cho toàn module (batch 4), kiểm thử đột biến. Không đổi code của module (chỉ đổi `DataTable` ở ui-kit).
