# Returns admin (trả hàng) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [admin/returns](../../docs/admin/returns.md) · **Test:** `tests/admin/returns/`

## 1. Bối cảnh & mục tiêu

Khách xin trả hàng sau khi nhận; nhân viên duyệt, nhận hàng về, chốt số lượng chấp nhận để BE tính khoản hoàn. Sai ở đây là duyệt nhầm, nhận thiếu hàng nhưng hoàn đủ tiền, hoặc khách không biết lý do bị từ chối. Module gồm `ReturnsContent.tsx` (hàng đợi theo tab, mở chi tiết theo địa chỉ), `_components/{ReturnDetailPanel,ApproveReturnModal,RejectReturnModal,ReceiveReturnModal,ReturnBadge}.tsx`, `_common/{moduleSlice,types,constants}.ts` và `page.tsx`. Khoản hoàn sinh ra ở đây được xử lý ở [refunds](./refunds.md).

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Hàng đợi bảy tab, tìm kiếm, sắp xếp, khung "cần xử lý", lọc theo đơn, mở chi tiết theo `?returnId=` | Chuyển tiền cho khách: thuộc [refunds](./refunds.md) |
| Panel chi tiết, ba form duyệt, từ chối, nhận hàng, huy hiệu, kho Redux | Chặn người không phải admin: thuộc [admin-shell](./admin-shell.md); ở đây chỉ kiểm BE từ chối thì không lộ gì |
| Quyền `RETURN_ADMIN_PROCESS` trên nút, `PAYMENT_ADMIN_VIEW` trên link sang hoàn tiền | Bảng, hộp thoại: thuộc [ui-kit](../platform/ui-kit.md) |

## 3. Hợp đồng

- **Hàng đợi.** `GET /api/admin/returns?search&status&orderId&sort&page&limit` (mới nhất trước; bốn cách sắp xếp). Tab `?status=`: vắng hoặc không hợp lệ = `REQUESTED` (kèm `counts.returns`), sáu trạng thái còn lại và `all` (không gửi `status`); đổi tab giữ các tham số khác và tạo mới bảng. `?orderId=` lọc theo đơn và hiện chip. Mỗi dòng: mã, đơn với trạng thái thanh toán và khách (hoặc `—`), lý do (ẩn dưới `md`), trạng thái, ngày (ẩn dưới `sm`), nút Xem. Bảng trống nói theo bộ lọc; BE lỗi nói "không tải được" kèm "Thử lại".
- **Mở chi tiết.** Bấm Xem: panel hiện ngay bằng dữ liệu của dòng, địa chỉ nhận `?returnId=`, rồi gọi `GET /api/admin/returns/:id` lấy dữ liệu đầy đủ; gọi lỗi thì giữ dữ liệu dòng. Vào thẳng bằng `?returnId=` thì mở đúng một lần từ cuộc gọi chi tiết; không tìm thấy thì không hiện panel; địa chỉ mất `returnId` thì đóng panel.
- **Nút theo trạng thái** (chỉ với `RETURN_ADMIN_PROCESS`): `REQUESTED` = Duyệt + Từ chối; `APPROVED` = Đã nhận hàng + Từ chối; các trạng thái khác không có nút và không có thanh nút. Link sang `/admin/refunds?orderId=…` cần `PAYMENT_ADMIN_VIEW`, id được mã hóa.
- **Duyệt** (`POST …/approve`): ghi chú hướng dẫn gửi hàng tùy chọn (≤ 500), cắt khoảng trắng; trống thì gửi `{}`.
- **Từ chối** (`POST …/reject`): lý do bắt buộc (≤ 500), cắt khoảng trắng, khách thấy.
- **Đã nhận hàng** (`POST …/receive`): mỗi dòng một số lượng chấp nhận, mặc định bằng số khách trả, phải là số nguyên từ 0 đến số đó; có dòng sai hoặc tất cả bằng 0 thì báo dưới form và không gửi; "hoàn cả phí ship" chỉ gửi khi được tick; ghi chú tùy chọn cắt khoảng trắng. Thành công: toast (kèm số tiền hoàn nếu BE tạo khoản hoàn), panel thay bằng yêu cầu mới, bảng làm mới.
- **Lỗi.** Mã 1801, 1803, 1804 có bản dịch; mã khác hiện lời BE; không có lời thì dùng lời mặc định. Form giữ nguyên khi lỗi.

## 4. Thiết kế

```
page.tsx ──► ReturnsContent ──► FormTabs · PendingActionNotice · DataTable ──► fetchReturns (thunk) ──► authApi
ReturnsContent ──► ReturnDetailPanel ──► ApproveReturnModal / RejectReturnModal / ReceiveReturnModal ──► approveReturn / rejectReturn / receiveReturn ──► authApi
ReturnDetailPanel ──► RoleGuard (RETURN_ADMIN_PROCESS, PAYMENT_ADMIN_VIEW)
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Tab và yêu cầu đang mở nằm trong địa chỉ** (`?status=`, `?returnId=`) | Gửi link cho đồng nghiệp mở đúng hàng đợi hoặc đúng yêu cầu; Back đóng panel | State cục bộ |
| **Hiện ngay dữ liệu của dòng, tải đầy đủ sau** | Admin không phải chờ; lỗi tải thêm không làm mất panel | Chờ rồi mới mở |
| **Ba thao tác trả về yêu cầu đã cập nhật** | Panel thay thẳng, không cần tải lại từng phần | Tải lại chi tiết |
| **Kiểm form trước khi gửi, hàm thuần `parsed`** | Số lượng sai không bao giờ tới BE | Để BE từ chối |
| **Quyền riêng cho nút và link** (`RoleGuard`) | Người chỉ xem trả hàng không được xử lý; người không xem thanh toán không thấy link | Một quyền chung |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit, auth (quyền), admin-shell (số đếm), data layer (`authApi`). Không module nào phụ thuộc ngược vào đây. Kho `returns` giữ danh sách, tổng và cờ đang tải, đang cập nhật; ba lệnh ghi dùng chung một nhánh trạng thái.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi thành phần một việc: hàng đợi, panel, ba form, huy hiệu |
| O | Thêm trạng thái hay tab = thêm vào hằng số, kiểu và bản dịch |
| L | Ba form có cùng hợp đồng `request`, `onClose`, `onDone` |
| I | Form chỉ nhận yêu cầu cần xử lý, không nhận cả kho |
| D | Thành phần phụ thuộc thunk và hook, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `admin.returns`; tiền qua `MoneyText`/`useMoney`; lỗi qua `useErrorMessage`; toast qua `useToast`. Test dùng `renderApp` với danh tính thật, `adminWith(...)` cho một quyền và `returnsApi` (BE giả) trong `returns-kit.tsx`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì không lộ yêu cầu nào; việc chặn trang thuộc admin-shell) · permission = có (xử lý cần `RETURN_ADMIN_PROCESS`, link hoàn tiền cần `PAYMENT_ADMIN_VIEW`)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ARR-1 | Hàng đợi: mở ở tab chờ duyệt, hỏi mới nhất trước, mỗi dòng có mã, đơn, khách, lý do, trạng thái, ngày; tìm, sắp xếp, cột ẩn trên điện thoại, tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/returns/returns-list.test.tsx` |
| ARR-2 | Tab: đổi tab bằng địa chỉ giữ tham số khác, tab chờ bỏ `status`, tab lạ về hàng đợi, tab tất cả không gửi `status`, bảng dựng lại khi tab đổi, chip lọc theo đơn | đúng | admin đủ quyền | component | `tests/admin/returns/returns-list.test.tsx` |
| ARR-2N | Khung cần xử lý: số, giải thích, bật tắt giữa tab chờ và tất cả, dòng phụ cho yêu cầu đã duyệt | đúng | admin đủ quyền | component | `tests/admin/returns/returns-list.test.tsx` |
| ARR-3 | Mở yêu cầu: hiện ngay bằng dữ liệu dòng, ghi vào địa chỉ, rồi dữ liệu đầy đủ; lỗi tải thêm giữ dữ liệu dòng; đóng bỏ khỏi địa chỉ; vào bằng `?returnId=` mở một lần; không tìm thấy thì không có panel; địa chỉ mất id thì đóng; làm xong một thao tác thì bảng tải lại | đúng | admin đủ quyền | component | `tests/admin/returns/returns-list.test.tsx` |
| ARR-4E | Bảng trống nói theo bộ lọc; tìm không ra; BE lỗi báo không tải được; BE từ chối khách (401) | lỗi | khách | component | `tests/admin/returns/returns-list.test.tsx` |
| ARR-4U | BE từ chối người mua đã đăng nhập (403): không lộ yêu cầu nào | lỗi | user | component | `tests/admin/returns/returns-list.test.tsx` |
| ARR-5 | Panel: yêu cầu (trạng thái, thời điểm, lý do, ghi chú khách, phản hồi), đơn (link, khách, tổng, phí ship, giao, thanh toán), từng dòng, khối khoản hoàn và link sang hoàn tiền; phần thiếu bị bỏ; tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/returns/return-detail.test.tsx` |
| ARR-6 | Nút theo trạng thái: chờ duyệt = duyệt + từ chối, đã duyệt = nhận hàng + từ chối, còn lại không nút và không thanh nút; mở đúng form, Hủy đóng | đúng | admin đủ quyền | component | `tests/admin/returns/return-detail.test.tsx` |
| ARR-6P | Admin chỉ xem không có nút; viết lẫn quyền xem trả hàng với quyền xem thanh toán không mở link hoàn tiền | đúng | admin thiếu quyền | component | `tests/admin/returns/return-detail.test.tsx` |
| ARR-6B | Huy hiệu trạng thái, kể cả trạng thái lạ | đúng | — | component | `tests/admin/returns/return-detail.test.tsx` |
| ARR-7 | Duyệt: cảnh báo, ghi chú tùy chọn cắt khoảng trắng, trống thì gửi `{}`, toast, báo cha | đúng | admin đủ quyền | component | `tests/admin/returns/return-forms.test.tsx` |
| ARR-7E | Duyệt bị từ chối: lời BE (mã 1804 dịch) hoặc mặc định, form giữ nguyên | lỗi | admin đủ quyền | component | `tests/admin/returns/return-forms.test.tsx` |
| ARR-8 | Từ chối: lý do bắt buộc và cắt khoảng trắng, báo lỗi dưới ô, toast, báo cha | đúng | admin đủ quyền | component | `tests/admin/returns/return-forms.test.tsx` |
| ARR-8E | Từ chối bị BE từ chối: lời BE hoặc mặc định, form giữ nguyên | lỗi | admin đủ quyền | component | `tests/admin/returns/return-forms.test.tsx` |
| ARR-9 | Nhận hàng: số lượng mặc định, chỉ số nguyên 0..số khách trả, tất cả 0 bị chặn, phí ship chỉ gửi khi tick, ghi chú, toast kèm số tiền hoàn, báo cha | đúng | admin đủ quyền | component | `tests/admin/returns/return-forms.test.tsx` |
| ARR-9E | Nhận hàng bị BE từ chối: lời BE hoặc mặc định, form giữ nguyên | lỗi | admin đủ quyền | component | `tests/admin/returns/return-forms.test.tsx` |
| ARR-9P | Panel sau một thao tác: đóng form, thay bằng yêu cầu mới, nút đổi theo trạng thái mới | đúng | admin đủ quyền | component | `tests/admin/returns/return-forms.test.tsx` |
| ARR-10 | Kho Redux và hằng số: tham số hỏi, danh sách và tổng, id được mã hóa, cờ đang tải và đang cập nhật, lỗi, bốn cách sắp xếp, trạng thái từ chối được | đúng | — | unit | `tests/admin/returns/returns-slice.test.ts` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Nhận hàng với số lượng sai làm hoàn quá tiền | Form chặn trước khi gửi, BE kiểm lại (1802, 1805); test ARR-9 |
| Hai admin cùng xử lý một yêu cầu | BE trả 1804; FE báo và giữ form (ARR-7) |
| Mở link `?returnId=` của yêu cầu không còn | Không hiện panel, không báo lỗi; admin thấy hàng đợi (ARR-3) |
| BE lỗi cho ra bảng "không có yêu cầu" | Đã sửa: "không tải được dữ liệu" kèm "Thử lại" (ARR-4E) |

Thay đổi nhìn thấy được: không (không đổi hành vi nhìn thấy).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 4), kiểm thử đột biến. Không đổi code của module.
