# Payments admin (đối soát thanh toán) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-24 · **Trạng thái:** Implemented
> **Doc:** [admin/payments](../../docs/admin/payments.md) · **Test:** `tests/admin/payments/`

## 1. Bối cảnh & mục tiêu

Khách chuyển khoản ngân hàng theo mã QR; hệ thống tự khớp giao dịch với đơn, nhưng có những trường hợp tiền đã vào mà không khớp (sai số tiền, đến trễ, không tìm thấy mã). Trang này là nơi nhân viên tìm mã, gắn giao dịch vào đơn, nhập tay giao dịch webhook không gửi, và tạo mã QR mới cho khách đứng tại quầy. Sai ở đây là đơn chưa trả được đánh dấu đã trả, hoặc tiền của khách nằm đó mà đơn không được giao. Module gồm `PaymentsContent.tsx` (hai tab), `_components/` (bảng mã, form xác nhận, chọn đơn, tab thanh toán của đơn, QR và màn hình cho khách, hai huy hiệu), `_common/{moduleSlice,types,constants}.ts` và `page.tsx`. Tab thanh toán được [orders](./orders.md) nhúng vào panel chi tiết đơn.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Hai tab, form xác nhận, chọn đơn, tab thanh toán của đơn, QR, màn hình cho khách, kho Redux | Webhook SePay và việc BE tự khớp: thuộc BE |
| Quyền `PAYMENT_ADMIN_CONFIRM`, `PAYMENT_ADMIN_CREATE_QR` trên từng nút | Chặn người không phải admin: thuộc [admin-shell](./admin-shell.md); ở đây chỉ kiểm BE từ chối thì không lộ gì |
| Bảng, hộp xác nhận, nút chép, khung "cần xử lý" dùng thật | Chi tiết của các thành phần đó: thuộc [ui-kit](../platform/ui-kit.md) |
| Màn hình QR cho khách bằng API toàn màn hình giả | Toàn màn hình thật của trình duyệt: do Playwright |

## 3. Hợp đồng

- **Tab "mã chuyển khoản"** (mặc định): `GET /api/admin/payments/attempts?search&status&sort&page&limit` (mới nhất trước; sáu cách sắp xếp). Mỗi mã: nội dung kèm nút chép, thời điểm tạo, số tiền (`MoneyText`), người tạo (admin hoặc khách), trạng thái (`PENDING|PAID|EXPIRED|CANCELLED`) kèm hạn hoặc ngày trả, đơn (link `/admin/orders?orderId=…` và trạng thái thanh toán) kèm khách, các giao dịch ngân hàng đã gắn. Nút "Xác nhận đã thanh toán" chỉ khi đơn `unpaid` và chưa `cancelled`, và chỉ với `PAYMENT_ADMIN_CONFIRM`.
- **Tab "giao dịch ngân hàng"**: `GET /api/admin/payments/transactions?search&verificationStatus&needsReview&sort&page&limit` (mặc định `-receivedAt`; chỉ sắp xếp theo `receivedAt` hoặc `amount`). Nút "Gắn vào đơn" chỉ khi kết quả đối soát là `UNMATCHED`, `AMOUNT_MISMATCH`, `LATE` hoặc `NOT_PAYABLE`, đơn của phiên (nếu có) chưa trả, và có quyền xác nhận.
- **Cần đối soát.** Khung dùng `counts.payments` của [admin-shell](./admin-shell.md); bật thì mở tab giao dịch, đặt `?needsReview=true` và bảng được tạo mới; rời tab giao dịch thì bỏ bộ lọc khỏi địa chỉ.
- **Form xác nhận** (`POST /api/admin/payments/orders/:id/confirm`): gắn giao dịch có sẵn (`transactionId`) hoặc nhập tay (`transferCode` viết hoa, `amountVnd` nguyên đồng lớn hơn 0, tùy chọn `reference` ≤ 64, `provider` `sepay|manual`, `transferContent` ≤ 500); luôn có `note` (bắt buộc, ≤ 500, cắt khoảng trắng) và đơn (chọn từ mười đơn chưa trả mới nhất, bỏ đơn đã hủy, hoặc biết trước). Thiếu thì báo dưới ô và không gửi. Số tiền lệch (mã 1710) → hỏi lại bằng chính lời BE (hộp nguy hiểm); đồng ý thì gửi lại với `acceptAmountMismatch`. Lỗi khác → toast lời BE (mã dịch) hoặc "Không thể xác nhận thanh toán". Thành công → toast, báo cha.
- **Tab thanh toán của đơn** (`GET /api/admin/payments/orders/:id`): trạng thái, thời điểm trả, tổng, khách; danh sách mã và giao dịch; nút "Tạo mã QR" (đơn `unpaid`, chưa hủy, `PAYMENT_ADMIN_CREATE_QR`), "Xác nhận đã thanh toán", "Xác nhận mã này" (mã chưa `PAID`), "Gắn vào đơn này" (giao dịch gắn được), cùng điều kiện đơn và quyền. Tạo QR (`POST …/qr`) khi đã có mã `PENDING` thì hỏi trước (mã cũ hết hạn ngay); thành công thì hiện bảng QR và tải lại đơn; mỗi 4 giây hỏi lại đơn cho tới khi đã trả (báo cha, hiện "đã nhận tiền"), tới khi mã hết hạn hoặc tab đóng; một vòng lỗi không dừng vòng sau.
- **Bảng QR và màn hình cho khách.** Ảnh QR chỉ vẽ khi địa chỉ là `https://` hoặc ảnh nhúng; có số tiền, ngân hàng, chủ tài khoản, số tài khoản và nội dung (chép được), hạn hoặc "đã hết hạn", mã cũ bị thay. Màn hình cho khách phủ kín trang, xin toàn màn hình nếu trình duyệt cho, đóng bằng nút, Escape hoặc khi trình duyệt thoát toàn màn hình, và ở lại qua trạng thái đã trả để khách thấy lời cảm ơn.

## 4. Thiết kế

```
page.tsx ──► PaymentsContent ──► FormTabs · PendingActionNotice · DataTable ──► fetchPaymentTransactions
                              └► AttemptsTable ──► DataTable ──► fetchPaymentAttempts
PaymentsContent / AttemptsTable / OrderPaymentTab ──► ConfirmPaymentModal ──► confirmOrderPayment ──► OrderPicker ──► searchUnpaidOrders
OrderPaymentTab ──► fetchOrderPayment · createAdminQr ──► AdminQrPanel ──► QrPresentation
orders (OrdersContent) ──► OrderPaymentTab
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Một form cho ba lối vào** (giao dịch, tay, mã) qua props `transaction`, `fixedOrderId`, `lockedTransferCode`, `defaultAmountVnd` | Cùng kiểm tra, cùng thông điệp, cùng cách xử lý số tiền lệch | Ba form |
| **Hỏi lại bằng lời BE khi lệch tiền** | BE biết số nhận và số cần; FE không tự dựng câu và không tự tính | FE so số tiền |
| **Quyền riêng cho từng nút** (`RoleGuard`) | Người chỉ được tạo QR chưa chắc được xác nhận đã trả | Một quyền chung |
| **Hỏi lại có giãn cách** (`setTimeout` nối tiếp, mỗi lần một yêu cầu) khi chờ tiền | Không dồn yêu cầu khi mạng chậm; dừng dễ khi trả xong hoặc hết hạn | `setInterval` |
| **Bản chép `onChanged` trong ref** | Bộ hẹn giờ không khởi động lại mỗi lần cha vẽ lại | Đưa `onChanged` vào deps |
| **Cảnh báo trước khi tạo mã mới** | Mã cũ hết hạn ngay, mà khách có thể đã trả theo mã cũ | Tạo im lặng |
| **Chỉ vẽ ảnh QR khi địa chỉ an toàn** (`isSafeQrUrl`) | Ảnh đến từ BE nhưng là địa chỉ tùy ý; không để `javascript:` hay `http:` lọt | Tin BE |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit, auth (quyền), admin-shell (số đếm), data layer (`authApi`), checkout (`DetailRow` và `isSafeQrUrl` dùng lại của trang thanh toán khách). Module orders phụ thuộc vào `OrderPaymentTab`; ngược lại không. Kho `payments` giữ danh sách giao dịch, tổng hai tab và cờ đang cập nhật.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi thành phần một việc: bảng mã, bảng giao dịch, form xác nhận, chọn đơn, tab của đơn, QR, màn hình khách, huy hiệu |
| O | Thêm kết quả đối soát = thêm vào danh sách và kiểu màu, các bảng tự theo |
| L | `OrderPaymentTab` dùng được ở panel đơn và ở nơi khác chỉ cần `orderId` và `onChanged` |
| I | Form nhận đúng các props nó cần; tab của đơn chỉ biết `orderId` |
| D | Thành phần phụ thuộc thunk và hook, không phụ thuộc `fetch`; test thay BE bằng MSW |

### Conventions

Chuỗi qua `admin.payments`; tiền qua `MoneyText`; lỗi qua `useErrorMessage`; toast qua `useToast`; xác nhận qua `useConfirm`. Test dùng `renderApp` với danh tính thật, `adminWith(...)` cho từng quyền, và `paymentsApi` (BE giả) trong `payments-kit.tsx`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì không lộ mã hay đơn nào; việc chặn trang thuộc admin-shell) · permission = có (xác nhận cần `PAYMENT_ADMIN_CONFIRM`, tạo QR cần `PAYMENT_ADMIN_CREATE_QR`, mỗi nút độc lập)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| APY-1 | Tab mã chuyển khoản: hỏi mới nhất trước, tổng mã ở tiêu đề; mỗi mã có nội dung (kèm nút chép), số tiền, người tạo, trạng thái và hạn hoặc ngày trả, đơn và khách, giao dịch ngân hàng đã gắn; lọc, tìm, sắp xếp sáu cách; nút xác nhận chỉ cho đơn chưa trả và chưa hủy, chỉ với quyền xác nhận; mở form với mã và số tiền được điền và khóa | đúng | admin đủ quyền | component | `tests/admin/payments/payments-list.test.tsx` |
| APY-1P | Admin chỉ có quyền xem đơn không có nút xác nhận ở dòng mã | đúng | admin thiếu quyền | component | `tests/admin/payments/payments-list.test.tsx` |
| APY-1E | Không tải được mã, hoặc BE từ chối khách (401): báo không tải được, không lộ mã nào | lỗi | khách | component | `tests/admin/payments/payments-list.test.tsx` |
| APY-1U | BE từ chối người mua đã đăng nhập (403) | lỗi | user | component | `tests/admin/payments/payments-list.test.tsx` |
| APY-2 | Tab giao dịch ngân hàng: hỏi theo thời gian nhận mới nhất, tổng ở tiêu đề; mỗi dòng có thời gian, số tiền, nội dung và mã giao dịch, kết quả đối soát, đơn; lọc chín kết quả, tìm, sắp xếp bốn cách; "Gắn vào đơn" chỉ cho bốn kết quả có thể gắn, đơn chưa trả, đúng quyền; mở form gắn; lỗi tải báo không tải được | đúng | admin đủ quyền | component | `tests/admin/payments/payments-list.test.tsx` |
| APY-3 | Nút "Nhập giao dịch thủ công" cho admin có quyền xác nhận; xác nhận xong làm mới bảng | đúng | admin đủ quyền | component | `tests/admin/payments/payments-list.test.tsx` |
| APY-3P | Admin không có quyền xác nhận không thấy nút nhập thủ công | đúng | admin thiếu quyền | component | `tests/admin/payments/payments-list.test.tsx` |
| APY-4 | Giao dịch cần đối soát: khung có số, giải thích, ghi chú, nút bật mở tab giao dịch và đặt `needsReview`; bật thì chỉ hỏi những giao dịch đó; rời tab bỏ bộ lọc; hết việc báo xong; ẩn khi 0 hoặc không có số | đúng | admin đủ quyền | component | `tests/admin/payments/payments-list.test.tsx` |
| APY-5E | Tiếng Anh: tiền bằng đô la, nhãn dịch | đúng | admin đủ quyền | component | `tests/admin/payments/payments-list.test.tsx` |
| APY-6 | Gắn giao dịch ngân hàng vào đơn: hiện giao dịch, chọn đơn chưa trả, bắt buộc lý do, gửi `transactionId` và lý do đã cắt khoảng trắng, toast, báo cho cha | đúng | admin đủ quyền | component | `tests/admin/payments/confirm-modal.test.tsx` |
| APY-7 | Nhập giao dịch thủ công: bắt buộc đơn, mã, số tiền lớn hơn 0 và lý do; mã viết hoa; chỉ gửi trường tùy chọn đã điền; trường thêm được gập lại; giới hạn độ dài khớp BE; đơn hoặc mã biết trước thì không chọn lại và mã bị khóa | đúng | admin đủ quyền | component | `tests/admin/payments/confirm-modal.test.tsx` |
| APY-8E | Xác nhận không thành: số tiền lệch (mã 1710) hỏi lại bằng lời BE rồi gửi lại với chấp nhận lệch; từ chối thì dừng; lỗi khác báo lời BE (mã dịch) hoặc lời mặc định; form giữ nguyên | lỗi | admin đủ quyền | component | `tests/admin/payments/confirm-modal.test.tsx` |
| APY-9 | Chọn đơn: mười đơn chưa trả mới nhất, bỏ đơn đã hủy, tìm sau khi ngừng gõ, đánh dấu đơn đã chọn, báo khi trống hoặc lỗi hoặc đang tìm; huy hiệu trạng thái mã và kết quả đối soát, kể cả trạng thái lạ | đúng | admin đủ quyền | component | `tests/admin/payments/confirm-modal.test.tsx` |
| APY-10 | Tab thanh toán của đơn: trạng thái, thời điểm trả, tổng, khách; danh sách mã và giao dịch với nút chép, ghi chú; trống thì báo | đúng | admin đủ quyền | component | `tests/admin/payments/order-tab.test.tsx` |
| APY-10E | Tab không tải được: lời BE hoặc lời mặc định; khách và người mua không thấy gì của đơn | lỗi | khách | component | `tests/admin/payments/order-tab.test.tsx` |
| APY-11 | Nút trong tab: admin đủ quyền thấy tạo QR và xác nhận, xác nhận từng mã, gắn từng giao dịch; mỗi nút theo quyền riêng; đơn đã trả hoặc hoàn tiền không có nút; đơn hủy không có QR | đúng | admin đủ quyền | component | `tests/admin/payments/order-tab.test.tsx` |
| APY-11P | Admin chỉ có quyền xem thanh toán không thấy nút nào trong tab | đúng | admin thiếu quyền | component | `tests/admin/payments/order-tab.test.tsx` |
| APY-11C | Xác nhận từ tab: mở form cho đơn này (mã và số tiền của mã được điền), xác nhận xong tải lại đơn và báo cha | đúng | admin đủ quyền | component | `tests/admin/payments/order-tab.test.tsx` |
| APY-12 | Tạo QR cho khách tại cửa hàng: làm ngay khi chưa có mã đang chờ, cảnh báo trước khi có (mã cũ hết hạn ngay), khóa nút khi đang tạo, hiện mã và toast | đúng | admin đủ quyền | component | `tests/admin/payments/order-tab.test.tsx` |
| APY-12E | Tạo QR bị từ chối: lời BE (mã dịch) hoặc lời mặc định, không hiện QR | lỗi | admin đủ quyền | component | `tests/admin/payments/order-tab.test.tsx` |
| APY-13 | Chờ tiền: hỏi lại mỗi bốn giây, khi đơn đã trả thì báo cha và hiện "đã nhận tiền" rồi dừng; lỡ một vòng vẫn tiếp tục; dừng khi mã hết hạn hoặc tab đóng | đúng | admin đủ quyền | component | `tests/admin/payments/order-tab.test.tsx` |
| APY-14 | Bảng QR: ảnh (chỉ địa chỉ an toàn), số tiền, thông tin ngân hàng có nút chép, đang chờ hoặc hết hạn, mã cũ bị thay, "đã nhận tiền", mở màn hình cho khách | đúng | admin đủ quyền | component | `tests/admin/payments/qr-panel.test.tsx` |
| APY-15 | Màn hình cho khách: QR, số tiền lớn, thông tin chuyển khoản, hạn; chiếm toàn màn hình khi trình duyệt cho, đóng bằng nút, Escape hoặc khi trình duyệt thoát toàn màn hình; "đã nhận tiền" và lời cảm ơn khi đã trả | đúng | admin đủ quyền | component | `tests/admin/payments/qr-panel.test.tsx` |
| APY-15E | Màn hình cho khách khi trình duyệt từ chối toàn màn hình vẫn phủ kín trang; QR không an toàn không được vẽ | lỗi | admin đủ quyền | component | `tests/admin/payments/qr-panel.test.tsx` |
| APY-16 | Kho Redux và hằng số: tham số hỏi, danh sách và tổng, cờ đang tải và đang cập nhật, lỗi, id đơn được mã hóa, giới hạn BE, sắp xếp | đúng | — | unit | `tests/admin/payments/payments-slice.test.ts` |

Coverage: ngưỡng riêng cho từng file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| BE lỗi cho ra bảng "chưa có dữ liệu" | Đã sửa trong ui-kit: "không tải được dữ liệu" kèm "Thử lại" (APY-1E) |
| Hộp chọn đơn giữ tối đa mười đơn mới nhất | Đơn cũ hơn phải tìm bằng ô tìm kiếm (APY-9) |
| Chờ tiền hỏi mỗi 4 giây vô thời hạn đến khi mã hết hạn | Một tab mở lâu với mã không hạn (`expiresAt` rỗng) hỏi mãi (APY-13) |
| Lỗi mạng khi chờ tiền không báo gì | Vòng sau thử lại; admin không biết mạng đang lỗi |
| Hộp chọn đơn bỏ đơn đã hủy ở FE | BE vẫn có thể trả đơn hủy (đã lọc ở FE, APY-9) |
| Nút chép và màn hình cho khách dùng thành phần của trang thanh toán khách (`DetailRow`, `isSafeQrUrl`) | Phụ thuộc giữa hai module; đổi chúng cần chạy test cả hai |

Thay đổi nhìn thấy được: bảng báo lỗi tải thay cho "chưa có dữ liệu".

## 8. Lịch sử thay đổi

- 2026-10-24 · Viết spec và test cho toàn module (batch 3), kiểm thử đột biến. Không đổi code của module (chỉ đổi `DataTable` ở ui-kit).
