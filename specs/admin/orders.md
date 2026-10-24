# Orders admin (quản lý đơn hàng) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-23 · **Trạng thái:** Implemented
> **Doc:** [admin/orders](../../docs/admin/orders.md) · **Test:** `tests/admin/orders/`

## 1. Bối cảnh & mục tiêu

Trang này là nơi nhân viên đẩy đơn qua các bước xử lý: xác nhận, giao, hoàn tất, hủy. Đổi nhầm trạng thái làm khách nhận thông báo sai, hủy một đơn đã trả tiền mở ra một khoản phải hoàn, và một bảng nói "chưa có dữ liệu" khi BE lỗi làm nhân viên tưởng hết việc. Module gồm `OrdersContent.tsx`, `_common/{moduleSlice,types,constants}.ts` và `page.tsx`; panel chi tiết dùng `OrderDetailPanel` của [ui-kit](../platform/ui-kit.md), tab thanh toán của [payments](./payments.md) và cảnh báo hoàn tiền của refunds.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin chỉ có quyền xem, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Bảng, bộ lọc, khung "đơn cần xử lý", đổi trạng thái một và nhiều, panel chi tiết theo địa chỉ, kho Redux | Nội dung tab thanh toán và cảnh báo hoàn tiền: thuộc [payments](./payments.md) và refunds, ở đây thay bằng bản giả có cùng props |
| Quyền `ORDER_ADMIN_UPDATE_STATUS` và `PAYMENT_ADMIN_VIEW` trên từng nút | Chặn người không phải admin: thuộc [admin-shell](./admin-shell.md); ở đây chỉ kiểm BE từ chối thì bảng không lộ gì |
| Panel chi tiết dùng `OrderDetailPanel` thật | Hiển thị bên trong panel: thuộc [ui-kit](../platform/ui-kit.md) |

## 3. Hợp đồng

- **Danh sách.** `GET /api/admin/orders?search&status&paymentStatus&needsAction&sort&page&limit` (`sort` mặc định `-createdAt`, 25 một trang; bộ lọc chỉ gửi khi có; `needsAction=true` chỉ khi khung "cần xử lý" đang bật). Cột: mã đơn, khách (`shippingAddress.fullName` hoặc `userId`), số món, tổng theo ngôn ngữ, trạng thái, thanh toán (ẩn dưới `sm`), ngày, nút "Xem". Tiêu đề đếm `total` do kho giữ. Bốn cách sắp xếp: mới nhất, cũ nhất, tổng giảm, tổng tăng. BE lỗi → bảng hiện "không tải được dữ liệu" kèm "Thử lại" (ui-kit).
- **Quyền.** Có `ORDER_ADMIN_UPDATE_STATUS`: menu trạng thái ở mỗi dòng và cột chọn nhiều; thiếu: chỉ nhãn trạng thái. Tab thanh toán và cảnh báo hoàn tiền cần `PAYMENT_ADMIN_VIEW`.
- **Đổi một trạng thái.** Menu chỉ gồm trạng thái hiện tại và các bước tiếp theo (`ORDER_STATUS_TRANSITIONS`; `completed` và `cancelled` là cuối). `PATCH /api/admin/orders/:id/status` → toast có mã đơn và trạng thái mới, panel đang mở của đúng đơn đó đổi theo, bảng hỏi lại. Lỗi → toast lời BE (mã lỗi dịch) hoặc lời mặc định, không làm mới. Menu bị khóa khi một thay đổi đang chạy. Hủy đơn **đã thanh toán** hỏi trước (hộp nguy hiểm, nhắc việc hoàn tiền); từ chối thì không gửi gì.
- **Đổi nhiều trạng thái.** Thanh có các bước mà ít nhất một đơn đang chọn đi được; khóa khi không có. Chọn một bước → luôn hỏi: số đơn sẽ đổi, số bị bỏ qua, số đơn đã trả sẽ mở hoàn tiền (khi đích là hủy; nguy hiểm chỉ khi đích là hủy). Mỗi đơn một PATCH (BE chưa có lệnh hàng loạt) chạy song song; toast số thành công và số thất bại (có thể cùng hiện); panel đang mở đổi theo nếu đơn đó thành công; bỏ chọn; bảng hỏi lại.
- **Chi tiết.** "Xem" mở panel ngay bằng dữ liệu dòng, đặt `?orderId=` vào địa chỉ (giữ bộ lọc khác), rồi thay bằng bản mới nhất (`GET /api/admin/orders/:id`, lỗi thì giữ dữ liệu dòng). Địa chỉ có sẵn `?orderId=` thì tải một lần khi vào; không tìm thấy → panel "không tìm thấy". Đóng → bỏ `orderId` khỏi địa chỉ; địa chỉ mất `orderId` thì panel đóng. Tab "Thanh toán" làm mới đơn đang mở và bảng khi nó báo có thay đổi. Cảnh báo hoàn tiền hiện cho đơn `cancelled` mà `paid`; tạo yêu cầu hoàn thì làm mới bảng.
- **Khung "cần xử lý".** Dùng `counts.orders` của [admin-shell](./admin-shell.md); bật/tắt `?needsAction=true` bằng `router.replace` (giữ bộ lọc khác) và bảng được tạo mới với câu hỏi mới.

## 4. Thiết kế

```
page.tsx (Suspense) ──► OrdersContent ──► DataTable (ui-kit) ──► fetchOrderList (thunk) ──► authApi
OrdersContent ──► updateOrderStatus / updateOrderStatuses (thunk) ──► authApi
OrdersContent ──► OrderDetailPanel (ui-kit) ──► OrderPaymentTab (payments) · OrderRefundBanner (refunds)
OrdersContent ──► usePendingCounts (admin-shell) · RoleGuard/hasPermission (auth)
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Địa chỉ là nguồn sự thật của panel mở** (`?orderId=`) | Gửi link cho đồng nghiệp mở đúng đơn; nút Back đóng panel | State cục bộ |
| **Updater form khi cập nhật panel** (`setDetailOrder(p => …)`) | Cột của bảng được ghi nhớ nên hàm đổi trạng thái giữ giá trị cũ của `detailOrder`; đọc nó trực tiếp làm panel không đổi (lỗi đã sửa) | Thêm `detailOrder` vào deps của cột (tạo lại cột và bảng mỗi lần) |
| **Một PATCH mỗi đơn, `Promise.allSettled`** | BE không có lệnh hàng loạt; một đơn lỗi không dừng các đơn khác, và kết quả nói rõ từng loại | Gửi lần lượt và dừng khi lỗi |
| **Xác nhận bằng lời của người dùng với số liệu thật** | Admin thấy bao nhiêu đơn đổi, bỏ qua, hoàn tiền trước khi bấm | Chỉ hỏi "chắc chứ?" |
| **Tạo mới bảng khi đổi bộ lọc `needsAction`** (`key`) | Bảng bắt đầu từ trang 1 với câu hỏi mới, không giữ tìm kiếm và trang cũ | Gọi `reset()` |
| **Quyền bằng `RoleGuard` và `hasPermission`** trên từng nút | Nút không đúng quyền không hiện, thay vì hiện rồi báo lỗi | Ẩn cả trang |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit (bảng, panel, hộp xác nhận, toast), auth (quyền), admin-shell (số đếm), payments và refunds (hai thành phần nhúng trong panel), data layer (`authApi`). Không module nào phụ thuộc ngược vào đây. Kho `orders` giữ danh sách, tổng, cờ đang tải và đang cập nhật.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Kho lo gọi BE và trạng thái; `OrdersContent` lo ghép màn hình; `DataTable` lo bảng |
| O | Thêm một bước vào quy trình = sửa `ORDER_STATUS_TRANSITIONS`; menu và hộp xác nhận tự theo |
| L | Cột và hành động hàng loạt nhận dòng `AdminOrder`, như mọi bảng admin |
| I | Panel nhận `paymentTab` và `notice` là `ReactNode` tùy chọn, không biết payments hay refunds |
| D | Trang phụ thuộc thunk và `useConfirm`, không phụ thuộc `fetch` hay cách dựng hộp thoại |

### Conventions

Chuỗi qua `admin.orders` và `common.orderStatus`; mọi tiền qua `MoneyText`; lỗi qua `useErrorMessage`; toast qua `useToast`; xác nhận qua `useConfirm`. Test dùng `renderApp` với danh tính thật, `ordersApi` (BE giả) trong `orders-kit.tsx`, và bản giả của tab thanh toán và cảnh báo hoàn tiền.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì bảng không lộ gì; việc chặn trang thuộc admin-shell) · permission = có (đổi trạng thái cần `ORDER_ADMIN_UPDATE_STATUS`; tab thanh toán và cảnh báo hoàn tiền cần `PAYMENT_ADMIN_VIEW`)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| AOR-1 | Bảng: hỏi mới nhất trước, 25 một trang; mỗi dòng có mã, khách (tên hoặc mã tài khoản), số món, tổng theo ngôn ngữ, trạng thái, thanh toán, ngày; tiêu đề đếm tổng; lọc, tìm, sắp xếp; cột thanh toán ẩn trên điện thoại | đúng | admin đủ quyền | component | `tests/admin/orders/orders-list.test.tsx` |
| AOR-1P | Admin chỉ có quyền xem đơn đọc được bảng | đúng | admin thiếu quyền | component | `tests/admin/orders/orders-list.test.tsx` |
| AOR-1E | Không tải được danh sách: báo "không tải được" thay cho "chưa có dữ liệu"; danh sách rỗng báo chưa có dữ liệu | lỗi | admin đủ quyền | component | `tests/admin/orders/orders-list.test.tsx` |
| AOR-2 | Khung "đơn cần xử lý": số, giải thích, bật/tắt bộ lọc `needsAction` qua địa chỉ, giữ bộ lọc khác, bảng hỏi lại, "đã xử lý hết" khi bật mà hết việc, ẩn khi 0 hoặc không có số | đúng | admin đủ quyền | component | `tests/admin/orders/orders-list.test.tsx` |
| AOR-3E | BE từ chối khách (401): chỉ báo không tải được dữ liệu, không lộ đơn nào | lỗi | khách | component | `tests/admin/orders/orders-list.test.tsx` |
| AOR-3U | BE từ chối người mua đã đăng nhập (403): như khách | lỗi | user | component | `tests/admin/orders/orders-list.test.tsx` |
| AOR-4 | Admin đủ quyền có menu trạng thái ở mỗi dòng với đúng các bước tiếp theo và cột chọn | đúng | admin đủ quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-4P | Admin chỉ xem chỉ thấy nhãn trạng thái, không menu, không cột chọn | đúng | admin thiếu quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-5 | Đổi một trạng thái: gửi PATCH, toast có mã đơn và trạng thái mới, hỏi lại bảng, khóa các menu khi đang gửi, cập nhật panel đang mở chứ không panel khác | đúng | admin đủ quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-5E | BE từ chối đổi trạng thái: toast lời BE hoặc lời mặc định, không làm mới bảng | lỗi | admin đủ quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-6 | Hủy đơn đã thanh toán hỏi trước (kiểu nguy hiểm, nhắc việc hoàn tiền); đồng ý thì gửi; đơn chưa trả hoặc đổi sang bước khác không hỏi | đúng | admin đủ quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-6E | Từ chối ở hộp hủy đơn đã thanh toán không gửi gì | lỗi | admin đủ quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-7 | Đổi nhiều trạng thái: thanh chỉ có các bước ít nhất một đơn đi được, khóa khi không đơn nào đi được, hộp xác nhận nêu số đơn đổi, số bị bỏ qua và số hoàn tiền, mỗi đơn một PATCH, toast kết quả, bỏ chọn | đúng | admin đủ quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-7E | Đổi nhiều trạng thái: từ chối xác nhận không gửi gì; một phần lỗi báo cả thành công lẫn thất bại; tất cả lỗi chỉ báo thất bại | lỗi | admin đủ quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-8 | Chi tiết một đơn: "Xem" mở panel ngay bằng dữ liệu dòng, đặt mã đơn vào địa chỉ, rồi thay bằng bản mới nhất; mở thẳng bằng địa chỉ; đóng bằng nút hoặc vùng tối và bỏ mã khỏi địa chỉ nhưng giữ bộ lọc | đúng | admin đủ quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-8E | Chi tiết một đơn: không tải được bản mới thì giữ dữ liệu dòng; địa chỉ nêu đơn không có thì hiện panel "không tìm thấy"; địa chỉ mất mã đơn thì đóng panel | lỗi | admin đủ quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-9 | Tab thanh toán cho admin có quyền xem thanh toán; làm mới đơn mở và bảng khi tab báo đổi; cảnh báo chưa hoàn tiền cho đơn đã hủy mà đã trả; tạo yêu cầu hoàn thì làm mới bảng | đúng | admin đủ quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-9P | Admin không có quyền xem thanh toán không thấy tab thanh toán và cảnh báo hoàn tiền; đơn chưa hủy hoặc chưa trả không có cảnh báo | đúng | admin thiếu quyền | component | `tests/admin/orders/orders-actions.test.tsx` |
| AOR-10 | Kho Redux: tham số hỏi (bộ lọc chỉ gửi khi có, `needsAction` chỉ khi bật), lưu danh sách và tổng, cờ đang tải và đang cập nhật, lỗi, đổi nhiều trạng thái trả đơn thành công và số lỗi, bốn cách sắp xếp | đúng | — | unit | `tests/admin/orders/orders-slice.test.ts` |

Coverage: ngưỡng riêng cho `OrdersContent.tsx` và `moduleSlice.ts` trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Đổi trạng thái ở dòng không cập nhật panel đang mở (hàm giữ `detailOrder` cũ vì cột được ghi nhớ) | Đã sửa bằng updater form (AOR-5) |
| BE lỗi cho ra bảng "chưa có dữ liệu" | Đã sửa trong ui-kit: "không tải được dữ liệu" kèm "Thử lại" (AOR-1E) |
| `page.tsx` bọc `Suspense` vì dùng `useSearchParams` | Giữ nguyên |
| Đổi trạng thái hàng loạt là nhiều PATCH song song | Nhiều đơn cùng lúc làm BE nhận một loạt yêu cầu; chấp nhận được với 25 đơn một trang |
| Thông báo "đã chuyển sang" dùng nhãn của `statusLabel` ở thời điểm bấm | Đúng ngôn ngữ đang xem |

Thay đổi nhìn thấy được: đổi trạng thái ở bảng cập nhật luôn panel đang mở; bảng báo lỗi tải thay cho "chưa có dữ liệu".

## 8. Lịch sử thay đổi

- 2026-10-23 · Viết spec và test cho toàn module (batch 3), kiểm thử đột biến.
- 2026-10-23 · Sửa: đổi trạng thái ở dòng cập nhật panel đang mở (trước đây không, vì hàm giữ `detailOrder` cũ); test AOR-8 tái hiện lỗi trước khi sửa.
