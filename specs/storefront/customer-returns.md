# Customer returns (trả hàng của khách) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-22 · **Trạng thái:** Implemented
> **Doc:** [storefront/customer-returns](../../docs/storefront/customer-returns.md) · **Test:** `tests/storefront/customer-returns/`

## 1. Bối cảnh & mục tiêu

Khách xin trả hàng cho đơn đã giao, theo dõi yêu cầu và có thể hủy khi chưa gửi hàng về. Module gồm biểu mẫu `/returns/new` (`NewReturnContent.tsx`, 360 dòng), danh sách `/returns` (`ReturnsContent.tsx`, 208), chi tiết `/returns/:id` (`ReturnDetailContent.tsx`, 282), thẻ trả hàng trong trang đơn (`OrderReturnCard.tsx`), thanh tiến trình và nhãn trạng thái. Trả sai (quá số lượng, quá hạn, trả hai lần) làm mất tiền hoặc gây tranh chấp; hiển thị sai khoản hoàn làm khách mất tin. Chưa có spec và test nào.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho cả đường đúng và đường lỗi, theo khách và người đã đăng nhập; kèm kiểm thử đột biến; ghi các điểm đáng ngờ vào mục 7. Chỉ sửa lỗi rõ ràng dưới test đỏ.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Test ba trang, thẻ trả hàng của đơn, thanh tiến trình, nhãn trạng thái và hook `useReturnEligibility` | Duyệt, nhận hàng và hoàn tiền phía admin: [admin/returns](../admin/returns.md), [admin/refunds](../admin/refunds.md) |
| Chính sách đổi trả hiển thị ở biểu mẫu (từ `GET /api/shipping`) | Cấu hình chính sách: [site-config](../admin/site-config.md) |
| Cách thẻ trả hàng hiện trong trang đơn | Phần còn lại của trang đơn: [customer-orders](./customer-orders.md) (ORD-12) |
| `OptionList` dùng cho chọn lý do | Thuộc [checkout](./checkout.md) |

## 3. Hợp đồng

**Điều kiện trả** (`useReturnEligibility(orderId, enabled)`). `enabled = false` hoặc không có `orderId` → không gọi BE; ngược lại `GET /api/returns/eligibility/:orderId` → `{ eligible, reason, deadline, returnWindowDays, items[{ orderItemId, quantity, returnableQuantity }] }`. Trả `{ eligibility, isLoading, error, reload }`; lỗi giữ trong `error`, `eligibility` giữ giá trị cũ.

**Thẻ trả hàng** (`OrderReturnCard`, trong chi tiết đơn). Chỉ với đơn `delivered`/`completed` mới gọi BE (điều kiện và `GET /api/returns?orderId=`). Không hiện khi đang tải điều kiện, hoặc khi vừa không có điều kiện vừa không có yêu cầu nào. Điều kiện `eligible` có hạn → "Còn hạn đến {ngày giờ}" kèm nút "Yêu cầu trả hàng" tới `/returns/new?orderId=<id>`; không đủ điều kiện → câu theo `reason` (`ORDER_NOT_PAID`, `ORDER_NOT_DELIVERED`, `RETURN_WINDOW_EXPIRED`, `NOTHING_TO_RETURN`), không có nút. Các yêu cầu đã gửi hiện thành danh sách link tới `/returns/<id>` với nhãn trạng thái và ngày.

**Nhãn và thanh tiến trình.** `ReturnStatusBadge`: màu và biểu tượng theo trạng thái, nhãn dịch; trạng thái lạ hiện nguyên giá trị với kiểu của `REQUESTED`. `ReturnProgress`: bốn bước `REQUESTED → APPROVED → RECEIVED → REFUNDED`; các bước trước hiện tại đã xong, bước hiện tại được đánh dấu (`aria-current="step"`), `REFUNDED` xong cả bốn; `REJECTED` và `CANCELLED` không có thanh.

**Danh sách `/returns`.** Đang tải phiên → khung chờ; chưa đăng nhập → màn chặn, **không gọi BE**; `GET /api/returns?sort=-createdAt&limit=25` (thêm `orderId` khi URL có `?orderId=`, trang kế thêm `page`). Link về: tới đơn khi có `orderId`, ngược lại tới danh sách đơn. Mỗi yêu cầu là một thẻ bấm được tới `/returns/<id>`: nhãn trạng thái, ngày, tối đa **2** dòng ("tên · size · màu · SL n") rồi "+n sản phẩm khác", mã đơn và lý do, số tiền hoàn nếu có. Trống: thông báo và nút về đơn hàng. Lỗi tải: toast, danh sách giữ như cũ. "Xem thêm" như danh sách đơn.

**Chi tiết `/returns/:id`.** Chưa đăng nhập → màn chặn (không gọi BE); đang tải → khung chờ; lỗi hoặc không có → "không tìm thấy" kèm link về danh sách (lỗi còn kèm toast). Thẻ trạng thái: nhãn, câu giải thích theo trạng thái, ngày giờ, mã yêu cầu và link tới đơn, thanh tiến trình. Phản hồi của shop (`adminNote`) có tiêu đề theo trạng thái (`APPROVED` hướng dẫn gửi hàng, `REJECTED` lý do từ chối, còn lại tiêu đề chung); không có ghi chú thì không có thẻ. Dòng hàng: tên, size · màu, số lượng trả, và số lượng shop nhận chỉ khi `RECEIVED`/`REFUNDED` và đã có; lý do và ghi chú của khách. Khoản hoàn: `REQUESTED` (kèm số tiền), `COMPLETED` (số tiền, mã tham chiếu có nút sao chép, thời điểm), `REJECTED`.
- Hủy: nút chỉ khi `REQUESTED` hoặc `APPROVED`; xác nhận (`danger`) → `PATCH /api/returns/:id/cancel`; yêu cầu trả về thay thẳng vào màn hình, toast `cancel.done`. Lỗi → toast theo mã BE (1804 có bản dịch) hoặc text BE, rồi **tải lại** yêu cầu để thấy trạng thái thật. Nút khóa khi đang hủy.

**Biểu mẫu `/returns/new?orderId=`.** Cần đăng nhập (khách thấy màn chặn); chờ phiên, điều kiện trả và đơn xong mới hiện. Không có `orderId`, đơn không tải được, không có điều kiện hoặc không đủ điều kiện → trang "không thể trả" nêu lý do (câu theo `reason`, hoặc lỗi của điều kiện, hoặc câu mặc định) kèm link quay lại đơn.
- Dòng hàng: ô chọn và ảnh, tên, `size · màu`, "tối đa {max}/{tổng}" (`max` = `returnableQuantity`) hoặc "đã gửi yêu cầu" khi `max = 0` (ô chọn khóa). Chọn dòng → số lượng 1; nút giảm/tăng; về 0 thì bỏ chọn; không vượt `max`.
- Lý do: năm lựa chọn (`WRONG_SIZE`, `CHANGED_MIND`, `DEFECTIVE`, `WRONG_ITEM`, `OTHER`), không chọn sẵn. Ghi chú tối đa 500 ký tự, có bộ đếm.
- Thẻ chính sách: hạn "còn hạn đến …", mô tả và điều kiện từ `GET /api/shipping` (chưa tải được thì chỉ số ngày của điều kiện), gợi ý đổi size.
- Gửi: thiếu dòng hoặc thiếu lý do → lỗi từng ô (`role="alert"`), không gọi BE; sửa ô thì lỗi của ô mất. Hợp lệ → `POST /api/returns` `{ orderId, reason, note?, items[{ orderItemId, quantity }] }` (ghi chú đã trim và bỏ khi trống; chỉ dòng có số lượng > 0), toast `created`, `router.replace` tới `/returns/<id>` (không có id → `/returns`). Lỗi → toast (mã BE, text BE, mặc định); mã `1802`/`1803` còn xóa lựa chọn và tải lại điều kiện để thấy số liệu thật. Nút khóa khi đang gửi.

## 4. Thiết kế

```
/orders/:id ─► OrderReturnCard ─► useReturnEligibility ─► GET /api/returns/eligibility/:id,  GET /api/returns?orderId=
/returns/new ─► NewReturnContent ─► useReturnEligibility, GET /api/orders/:id, useShipping ─► POST /api/returns
/returns ─► ReturnsContent ─► GET /api/returns?…            /returns/:id ─► ReturnDetailContent ─► GET, PATCH …/cancel
```

Hướng phụ thuộc: component → hook → `useApiAuth` (có refresh token) → `session`. Biểu mẫu import `OptionList` và lớp CSS của checkout, kiểu `Order` và `OrderThumb` của đơn hàng.

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **BE quyết định điều kiện trả và số lượng còn trả được** (`eligibility`) | FE không biết đơn đã trả một phần hay hết hạn chưa | Tính hạn trả ở FE |
| **Dòng đã gửi yêu cầu bị khóa** (`returnableQuantity = 0`) | Tránh trả hai lần cùng một sản phẩm | Để BE từ chối khi gửi |
| **Sau lỗi 1802/1803 xóa lựa chọn và tải lại điều kiện** | Số lượng có thể đã đổi; khách thấy số liệu thật | Giữ lựa chọn cũ |
| **Sau lỗi hủy tải lại yêu cầu** | Shop có thể đã duyệt hoặc nhận hàng trong lúc khách đang xem | Chỉ báo lỗi |
| **Thanh tiến trình suy từ trạng thái** (không lưu bước) | Một nguồn sự thật | Lưu bước riêng |
| **Kiểu dữ liệu phản chiếu BE** (`ReturnRequest`, `ReturnEligibility`) | Một chỗ khớp với hợp đồng API | Kiểu lẻ ở từng trang |

### Kiến trúc

State của các trang là **UI state cục bộ** (`useState`) với **server state** đọc qua `apiFetch`; điều kiện trả có hook riêng. Không dùng Redux, không có SWR ở module này.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Hook lo điều kiện; `ReturnProgress` và `ReturnStatusBadge` mỗi cái một việc; `NewReturnContent` còn gánh cả chọn dòng, lý do, chính sách và gửi (nợ ở mục 7) |
| O | Thêm lý do hoặc trạng thái = thêm vào hằng và khóa dịch |
| L | `OrderReturnCard` nhận `className` nên thay vào các khung khác nhau |
| I | Nhãn và thanh tiến trình chỉ nhận `status` |
| D | Trang phụ thuộc hook và `useApiAuth`, không gọi `fetch` trực tiếp |

### Conventions

Chữ giao diện ở `private.returns`; tiền qua `useMoney`; ngày qua `useFormatter`; lỗi qua `useErrorMessage`; xác nhận qua `useConfirm`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (ba trang chỉ dành cho người đã đăng nhập; khách thấy màn chặn) · permission = không (trang của khách hàng, không có quyền riêng)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| RET-1 | Khách thấy màn chặn ở danh sách, không gọi BE | đúng | khách | component | `tests/storefront/customer-returns/returns-list.test.tsx` |
| RET-1E | Đang xác định phiên chỉ có khung chờ | lỗi | khách | component | `tests/storefront/customer-returns/returns-list.test.tsx` |
| RET-2 | Danh sách: yêu cầu đúng (lọc theo đơn khi có), thẻ có trạng thái, ngày, hai dòng và "+n", đơn và lý do, số tiền hoàn, link; tiếng Anh | đúng | user | component | `tests/storefront/customer-returns/returns-list.test.tsx` |
| RET-2E | Danh sách trống có nút về đơn hàng; tải lỗi báo toast | lỗi | user | component | `tests/storefront/customer-returns/returns-list.test.tsx` |
| RET-3 | "Xem thêm" nối trang kế, ẩn khi đủ, khóa khi đang tải | đúng | user | component | `tests/storefront/customer-returns/returns-list.test.tsx` |
| RET-3E | "Xem thêm" lỗi báo toast và giữ danh sách | lỗi | user | component | `tests/storefront/customer-returns/returns-list.test.tsx` |
| RET-4 | Chi tiết: khách thấy màn chặn (không gọi BE), đang tải có khung chờ | đúng | khách | component | `tests/storefront/customer-returns/return-detail.test.tsx` |
| RET-4E | Chi tiết không tải được hoặc không có: "không tìm thấy" và link về danh sách, lỗi kèm toast | lỗi | user | component | `tests/storefront/customer-returns/return-detail.test.tsx` |
| RET-5 | Chi tiết: trạng thái và câu giải thích, thanh tiến trình theo trạng thái, tiêu đề phản hồi của shop theo trạng thái, dòng hàng và số lượng nhận, lý do, ghi chú, ba dạng khoản hoàn | đúng | user | component | `tests/storefront/customer-returns/return-detail.test.tsx` |
| RET-5E | Bị từ chối hoặc đã hủy không có thanh; không có phản hồi thì không có thẻ; số lượng nhận chỉ khi đã nhận; khoản hoàn xong không có mã thì không hiện mã | lỗi | user | component | `tests/storefront/customer-returns/return-detail.test.tsx` |
| RET-6 | Hủy yêu cầu đang chờ hoặc đã duyệt: hỏi, gửi, thay yêu cầu bằng phản hồi, toast | đúng | user | component | `tests/storefront/customer-returns/return-detail.test.tsx` |
| RET-6E | Từ chối xác nhận không gửi gì; hủy lỗi báo toast và tải lại yêu cầu; không có nút khi đã nhận, hoàn tiền, từ chối, hủy; nút khóa khi đang hủy | lỗi | user | component | `tests/storefront/customer-returns/return-detail.test.tsx` |
| RET-7 | Biểu mẫu: khách thấy màn chặn; chờ phiên, điều kiện và đơn mới hiện | đúng | khách | component | `tests/storefront/customer-returns/new-return.test.tsx` |
| RET-7E | Trang "không thể trả": không có mã đơn, đơn không tải được, hết hạn hoặc không đủ điều kiện (từng lý do), điều kiện lỗi | lỗi | user | component | `tests/storefront/customer-returns/new-return.test.tsx` |
| RET-8 | Biểu mẫu: dòng hàng, tối đa, chọn và đổi số lượng trong giới hạn, lý do, ghi chú có bộ đếm, chính sách và hạn | đúng | user | component | `tests/storefront/customer-returns/new-return.test.tsx` |
| RET-8E | Dòng đã gửi yêu cầu bị khóa; số lượng không vượt tối đa và về 0 thì bỏ chọn; gửi thiếu dòng hoặc lý do báo lỗi từng ô và không gọi BE; sửa thì lỗi mất; chính sách chưa tải dùng số ngày | lỗi | user | component | `tests/storefront/customer-returns/new-return.test.tsx` |
| RET-9 | Gửi yêu cầu: nội dung đúng (ghi chú trim và bỏ khi trống, chỉ dòng được chọn), toast, chuyển tới yêu cầu mới (hoặc danh sách khi thiếu id) | đúng | user | component | `tests/storefront/customer-returns/new-return.test.tsx` |
| RET-9E | Gửi lỗi: toast theo mã hoặc text BE, giữ lựa chọn; 1802/1803 xóa lựa chọn và tải lại điều kiện; nút khóa khi đang gửi | lỗi | user | component | `tests/storefront/customer-returns/new-return.test.tsx` |
| RET-10 | Thẻ trả hàng của đơn: còn hạn kèm nút, danh sách yêu cầu đã gửi, ẩn khi chưa có gì để nói | đúng | user | component | `tests/storefront/customer-returns/order-return-card.test.tsx` |
| RET-10E | Thẻ trả hàng: từng lý do không trả được, đơn chưa giao không gọi BE, điều kiện lỗi, danh sách yêu cầu lỗi | lỗi | user | component | `tests/storefront/customer-returns/order-return-card.test.tsx` |
| RET-11 | Nhãn và thanh tiến trình: bốn bước xong/đang theo từng trạng thái, màu và nhãn | đúng | — | component | `tests/storefront/customer-returns/order-return-card.test.tsx` |
| RET-11E | Trạng thái lạ hiện như đang chờ; từ chối và hủy không có thanh | lỗi | — | component | `tests/storefront/customer-returns/order-return-card.test.tsx` |
| RET-12 | Hook điều kiện: gọi đúng địa chỉ, chỉ khi bật và có mã đơn, tải lại | đúng | user | component | `tests/storefront/customer-returns/order-return-card.test.tsx` |
| RET-12E | Hook điều kiện: lỗi được giữ, tắt thì không gọi và không đang tải | lỗi | user | component | `tests/storefront/customer-returns/order-return-card.test.tsx` |

Ngưỡng coverage riêng của module (dòng/nhánh/hàm): `NewReturnContent.tsx` 90/85/90, `ReturnDetailContent.tsx`, `ReturnsContent.tsx` 90/80/90, `OrderReturnCard.tsx` 90/85/75, `use-return-eligibility.ts` 90/70/90 (T1: tiền hoàn của khách); `ReturnProgress.tsx`, `ReturnStatusBadge.tsx` 90/90/90.

## 7. Rủi ro & triển khai

| Rủi ro | Phát hiện | Quay lui |
|---|---|---|
| Tải danh sách lỗi cho ra màn "chưa có yêu cầu" kèm toast | Test RET-2E | Hiện trạng thái lỗi riêng và nút thử lại |
| Tải chi tiết lỗi (mạng, 500) cho ra "không tìm thấy" kèm toast | Test RET-4E | Phân biệt không có (404) với lỗi tạm |
| Hủy lỗi tải lại yêu cầu, nên khách thấy trạng thái thật nhưng toast lỗi và dữ liệu mới xuất hiện cách nhau | Test RET-6E | Gộp thành một bước |
| Biểu mẫu đọc cả đơn (`GET /api/orders/:id`) chỉ để lấy danh sách dòng, trong khi `eligibility` đã có `items` | Đọc code | Dùng dữ liệu của điều kiện |
| `NewReturnContent` gánh chọn dòng, lý do, chính sách và gửi | Đọc code | Tách khối chọn dòng sau khi có test |
| Biểu mẫu import lớp CSS và `OptionList` của checkout | Đọc code | Đưa phần dùng chung về `ui-kit` |

Thay đổi hành vi nhìn thấy được: khách chưa đăng nhập mở chi tiết yêu cầu giờ thấy màn chặn (trước đó chỉ thấy khung chờ mãi mãi).

## 8. Lịch sử thay đổi

- 2026-10-22 · Viết spec và test cho toàn module (batch 2), kiểm thử đột biến.
- 2026-10-22 · Sửa lỗi: khách chưa đăng nhập mở `/returns/:id` chỉ thấy khung chờ mãi mãi vì `isLoading` chỉ tắt sau khi gọi BE (mà khách không gọi); kiểm tra "chưa đăng nhập" nay đứng trước kiểm tra "đang tải". Test RET-4 tái hiện lỗi trước khi sửa (cùng lỗi và cùng cách sửa với chi tiết đơn, xem [customer-orders](./customer-orders.md)).
