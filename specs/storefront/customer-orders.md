# Customer orders (đơn hàng của tôi) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-22 · **Trạng thái:** Implemented
> **Doc:** [storefront/customer-orders](../../docs/storefront/customer-orders.md) · **Test:** `tests/storefront/customer-orders/`

## 1. Bối cảnh & mục tiêu

Khách xem lại đơn của mình: danh sách (`OrdersContent.tsx`, 236 dòng) và chi tiết từng đơn (`OrderDetailContent.tsx`, 487 dòng, gồm thanh toán, giao hàng, hoàn tiền, trả hàng, hủy đơn và nút đánh giá). Đây là nơi khách tìm lại mã chuyển khoản, hủy đơn chưa trả và biết tiền hoàn đã về chưa; hiển thị sai trạng thái, sai số tiền hoặc cho hủy nhầm đơn đã trả đều gây mất tiền hoặc mất tin. Chưa có spec và test nào.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho cả đường đúng và đường lỗi, theo khách và người đã đăng nhập; kèm kiểm thử đột biến; ghi các điểm đáng ngờ vào mục 7. Chỉ sửa lỗi rõ ràng (khách thấy khung chờ mãi) dưới test đỏ.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Test hai trang và hai thành phần nhỏ (`OrderStatusBadge`, `OrderThumb`) qua các trang | Sửa các điểm ở mục 7: cần quyết định sản phẩm |
| Thẻ "Trả hàng" chỉ ở mức: có hiện đúng trạng thái đơn và dẫn đúng link | Hành vi của thẻ và trang trả hàng: [customer-returns](./customer-returns.md) |
| Nút "Viết đánh giá" chỉ ở mức: hiện đúng dòng, đúng trạng thái đơn, mở hộp đánh giá | Nội dung và luồng của hộp đánh giá: module `customer-reviews` (batch sau) |
| Tên phương thức vận chuyển lấy từ `GET /api/shipping` | Cấu hình admin: [site-config](../admin/site-config.md) |

## 3. Hợp đồng

**Danh sách `/orders`.** Đang tải phiên → khung chờ; chưa đăng nhập → `UnauthenticatedState` và **không gọi BE**; đã đăng nhập → `GET /api/orders?sort=-createdAt&limit=25` (trang kế thêm `page=2`…). Đầu trang: link về tài khoản, tiêu đề, link "Đánh giá sản phẩm" kèm số dòng đang chờ đánh giá (nếu > 0) và link "Yêu cầu trả hàng".
- Mỗi đơn là một thẻ bấm được cả khối tới `/orders/<id>`: nhãn trạng thái xử lý và nhãn thanh toán, ngày (`short`), tối đa **2** dòng hàng (ảnh, tên, `size · màu`, `SL n` khi n > 1) rồi "+n sản phẩm khác", mã đơn nhỏ và tổng tiền theo ngôn ngữ (VND ở `vi`, USD ở ngôn ngữ khác).
- Trống: thông báo và nút tới `/shop`. Lỗi tải: toast (mã BE → text BE → `toast.loadFailed`), danh sách ở lại như cũ (rỗng thì hiện màn trống).
- "Xem thêm đơn hàng" chỉ hiện khi số đơn đã tải < `total`; bấm tải trang kế và nối vào cuối; đang tải thì khóa và đổi nhãn; lỗi thì toast và giữ danh sách.

**Chi tiết `/orders/:orderId`.** `GET /api/orders/:orderId` khi đã đăng nhập; đang tải → khung chờ; chưa đăng nhập → màn chặn (không gọi BE); lỗi hoặc không có đơn → "Không tìm thấy đơn hàng" (lỗi còn kèm toast).
- Thẻ trạng thái: nhãn trạng thái, nhãn thanh toán, câu giải thích theo trạng thái, ngày giờ và mã đơn. Trạng thái lạ hiện theo kiểu và câu của `pending`.
- Thẻ thanh toán: hiện khi `canPay` (đơn `unpaid` và chưa `cancelled`: câu "đang chờ" và nút "Thanh toán ngay" → `/checkout/payment/<id>`), hoặc đơn `paid` ("Đã thanh toán"), hoặc có ít nhất một mã chuyển khoản. Mỗi mã (mới nhất trước): mã và nút sao chép, trạng thái thật (đã hết hạn màu hồng, đã trả màu xanh), số tiền, ngày trả hoặc hạn, `transactionRef` kèm nút sao chép; dòng nhắc liên hệ cửa hàng khi đơn chưa trả.
- Thẻ giao hàng (chỉ khi `shippingAddress` có giá trị): họ tên đậm · điện thoại; địa chỉ từng dòng khi có; `city[, province] [postalCode]`; quốc gia chỉ khi khác `Vietnam`; ghi chú đơn. Nhận tại cửa hàng (`store-pickup`): tiêu đề "Người nhận tại cửa hàng", dòng "bạn sẽ nhận trực tiếp" và link bản đồ tới địa chỉ cửa hàng.
- Thẻ hoàn tiền (khi `refunds` có phần tử): lý do (`RETURN` là link tới `/returns/:returnId` khi có `returnId`; `ADMIN_CANCELLED` là chữ), trạng thái `REQUESTED` / `COMPLETED` (kèm số tiền và `bankReference` có nút sao chép) / `REJECTED`, thời điểm xử lý hoặc yêu cầu, số tiền khi còn `REQUESTED`.
- Thẻ trả hàng (`OrderReturnCard`): chỉ với đơn `delivered`/`completed`.
- Hủy đơn: nút "Hủy đơn" chỉ khi **`unpaid` và `pending`**; xác nhận (`danger`) → `PATCH /api/orders/:id/cancel`; đơn trả về thay thẳng vào màn hình, toast `cancel.done`; lỗi → toast theo mã BE hoặc text BE (ví dụ `1307`). Đơn còn mở khác (`pending` đã trả, `confirmed`, `shipping`) ẩn nút và hiện "liên hệ cửa hàng để hủy". Đơn `delivered`/`completed`/`cancelled` không có thẻ này.
- Dòng hàng và tiền: ảnh, tên (link tới sản phẩm khi còn slug), `size · màu`, `SL n`, đơn giá × số lượng (BE không gửi thành tiền dòng của đơn); tạm tính, phí vận chuyển (0 → "Miễn phí") kèm tên phương thức (tên admin cấu hình, hoặc nhãn dịch trong lúc chưa tải, hoặc nguyên giá trị lạ), tổng.
- Nút "Viết đánh giá": chỉ khi đơn `delivered`/`completed` **và** dòng nằm trong `GET /api/my-reviews/pending` (đối chiếu `orderItemId`); kèm "còn n ngày"; bấm mở hộp đánh giá. Danh sách chờ lỗi → không có nút nào.

## 4. Thiết kế

```
/orders ─► OrdersContent ─► useApiAuth.apiFetch ─► GET /api/orders?…        (+ usePendingReviews ─► số đánh giá chờ)
/orders/:id ─► OrderDetailContent ─► GET /api/orders/:id, PATCH …/cancel
                 ├─ OrderReturnCard (returns)      ├─ ReviewFormModal (reviews)
                 └─ useShippingMethodName ─► GET /api/shipping
```

Hướng phụ thuộc: component → `useApiAuth` (có refresh token) → `session`; trang chi tiết import hai thành phần của module khác (`returns`, `reviews`).

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Đơn do BE là nguồn sự thật**; trang không tính lại tiền | Không lệch với số trong đơn thật | Tính lại tổng ở FE |
| **Quyền hủy đơn suy ra từ đơn** (`unpaid` và `pending`) | Đơn đã trả phải qua cửa hàng để được hoàn tiền | Cho hủy mọi đơn đang mở |
| **Dòng đánh giá được hỏi BE** (`pending`), không suy từ trạng thái đơn | API đơn không cho biết dòng đã đánh giá chưa | Suy từ `delivered` |
| **Thay đơn bằng phản hồi của lệnh hủy** | Các mã chuyển khoản chờ cũng bị BE hủy; màn hình thấy ngay | Tải lại đơn |
| **Phân trang bằng "xem thêm" nối cuối** | Danh sách ngắn, không cần nhảy trang | Phân trang số |

### Kiến trúc

State của hai trang là **UI state cục bộ** (`useState`) với dữ liệu **server state** đọc qua `apiFetch` (không lưu); danh sách đánh giá chờ dùng SWR chung (`reviews:pending`). Không dùng Redux.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `OrderStatusBadge` và `OrderThumb` mỗi cái một việc; `OrderDetailContent` ghép sáu thẻ và gánh lệnh hủy (nợ ở mục 7) |
| O | Thêm trạng thái = thêm một dòng vào `STATUS_CONFIG` và khóa dịch `statusHint` |
| L | Các thẻ phụ (`OrderReturnCard`) nhận `className` và `titleClassName` nên thay vào được |
| I | `OrderStatusBadge` chỉ nhận `status`; `OrderThumb` chỉ nhận `src` và `alt` |
| D | Trang phụ thuộc hook và `useApiAuth`, không gọi `fetch` trực tiếp |

### Conventions

Chữ giao diện ở `private.orders` và `common.orderStatus`; tiền qua `useMoney`; ngày qua `useFormatter`; lỗi qua `useErrorMessage`; xác nhận qua `useConfirm`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (cả hai trang chỉ dành cho người đã đăng nhập; khách thấy màn chặn) · permission = không (trang của khách hàng, không có quyền riêng)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ORD-1 | Khách thấy màn chặn đăng nhập ở danh sách, không gọi BE | đúng | khách | component | `tests/storefront/customer-orders/orders-list.test.tsx` |
| ORD-1E | Đang xác định phiên chỉ có khung chờ | lỗi | khách | component | `tests/storefront/customer-orders/orders-list.test.tsx` |
| ORD-2 | Danh sách: yêu cầu đúng, mỗi đơn có trạng thái, thanh toán, ngày, tối đa hai dòng và "+n", mã đơn, tổng theo ngôn ngữ, link tới chi tiết; link đánh giá kèm số chờ và link trả hàng | đúng | user | component | `tests/storefront/customer-orders/orders-list.test.tsx` |
| ORD-2E | Danh sách trống có nút mua sắm; tải lỗi báo toast và giữ màn trống | lỗi | user | component | `tests/storefront/customer-orders/orders-list.test.tsx` |
| ORD-3 | "Xem thêm" nối trang kế, ẩn khi đủ, khóa khi đang tải | đúng | user | component | `tests/storefront/customer-orders/orders-list.test.tsx` |
| ORD-3E | "Xem thêm" lỗi báo toast và giữ danh sách | lỗi | user | component | `tests/storefront/customer-orders/orders-list.test.tsx` |
| ORD-4 | Khách thấy màn chặn ở chi tiết, không gọi BE; đang tải chỉ có khung chờ | đúng | khách | component | `tests/storefront/customer-orders/order-detail.test.tsx` |
| ORD-4E | Đơn không tải được hoặc không có: "không tìm thấy", lỗi còn kèm toast | lỗi | user | component | `tests/storefront/customer-orders/order-detail.test.tsx` |
| ORD-5 | Thẻ trạng thái: nhãn, câu giải thích theo trạng thái, nhãn thanh toán, ngày và mã đơn; tiếng Anh | đúng | user | component | `tests/storefront/customer-orders/order-detail.test.tsx` |
| ORD-5E | Trạng thái lạ hiện như đang chờ | lỗi | user | component | `tests/storefront/customer-orders/order-detail.test.tsx` |
| ORD-6 | Thanh toán: đơn chưa trả có nút trả tiền; đơn đã trả báo đã trả; liệt kê mọi mã chuyển khoản (trạng thái, số tiền, hạn hoặc ngày trả, mã giao dịch, sao chép) | đúng | user | component | `tests/storefront/customer-orders/order-detail.test.tsx` |
| ORD-6E | Đơn hủy chưa trả không có nút trả tiền; không có thẻ khi chẳng có gì để nói; lời nhắc mã chỉ khi chưa trả | lỗi | user | component | `tests/storefront/customer-orders/order-detail.test.tsx` |
| ORD-7 | Giao hàng: người nhận, địa chỉ từng dòng, tỉnh và mã bưu chính, quốc gia khác Việt Nam, ghi chú; nhận tại cửa hàng đổi tiêu đề, có link bản đồ | đúng | user | component | `tests/storefront/customer-orders/order-detail.test.tsx` |
| ORD-7E | Không có địa chỉ thì không có thẻ; dòng trống không hiện; quốc gia Vietnam không hiện | lỗi | user | component | `tests/storefront/customer-orders/order-detail.test.tsx` |
| ORD-8 | Dòng hàng và tiền: tên (link khi còn sản phẩm), size, màu, số lượng, đơn giá × số lượng, tạm tính, phí kèm tên phương thức, tổng; tiếng Anh dùng USD | đúng | user | component | `tests/storefront/customer-orders/order-detail.test.tsx` |
| ORD-8E | Miễn phí khi phí 0; tên phương thức dùng nhãn dịch khi chưa tải, nguyên giá trị khi lạ; sản phẩm đã xóa không có link | lỗi | user | component | `tests/storefront/customer-orders/order-detail.test.tsx` |
| ORD-9 | Hủy đơn chưa trả đang chờ: hỏi, gửi lệnh, thay đơn bằng phản hồi, toast | đúng | user | component | `tests/storefront/customer-orders/order-cancel.test.tsx` |
| ORD-9E | Từ chối xác nhận không gửi gì; lệnh hủy lỗi báo toast (mã BE, text BE) và đơn giữ nguyên; nút khóa khi đang hủy | lỗi | user | component | `tests/storefront/customer-orders/order-cancel.test.tsx` |
| ORD-10 | Đơn đã trả hoặc đang giao không có nút hủy mà có lời dặn liên hệ cửa hàng; đơn đã giao, hoàn tất, đã hủy không có thẻ hủy | lỗi | user | component | `tests/storefront/customer-orders/order-cancel.test.tsx` |
| ORD-11 | Hoàn tiền: từng khoản với lý do, trạng thái, số tiền, mã tham chiếu, thời điểm; khoản do trả hàng dẫn tới yêu cầu trả hàng | đúng | user | component | `tests/storefront/customer-orders/order-extras.test.tsx` |
| ORD-11E | Không có khoản hoàn thì không có thẻ; khoản bị từ chối; lý do lạ không hiện nhãn | lỗi | user | component | `tests/storefront/customer-orders/order-extras.test.tsx` |
| ORD-12 | Thẻ trả hàng chỉ với đơn đã giao hoặc hoàn tất | đúng | user | component | `tests/storefront/customer-orders/order-extras.test.tsx` |
| ORD-12E | Đơn đang giao không có thẻ trả hàng và không gọi BE về trả hàng | lỗi | user | component | `tests/storefront/customer-orders/order-extras.test.tsx` |
| ORD-13 | Nút "Viết đánh giá" ở đúng dòng của đơn đã giao hoặc hoàn tất, kèm hạn; bấm mở hộp đánh giá | đúng | user | component | `tests/storefront/customer-orders/order-extras.test.tsx` |
| ORD-13E | Không có nút khi đơn chưa giao, dòng không nằm trong danh sách chờ, hoặc danh sách chờ lỗi | lỗi | user | component | `tests/storefront/customer-orders/order-extras.test.tsx` |

Ngưỡng coverage riêng của module (dòng/nhánh/hàm): `OrdersContent.tsx` 90/80/90, `OrderDetailContent.tsx` 90/85/70 (T1: khách xem tiền của mình; các hàm gọi lại của hộp đánh giá thuộc `customer-reviews`), `OrderStatusBadge.tsx`, `OrderThumb.tsx` 90/90/90.

## 7. Rủi ro & triển khai

| Rủi ro | Phát hiện | Quay lui |
|---|---|---|
| Tải danh sách lỗi (mạng, 500) cho ra màn "Chưa có đơn hàng" kèm toast: khách thấy lời nói sai | Test ORD-2E | Hiện trạng thái lỗi riêng và nút thử lại |
| Tải chi tiết lỗi (mạng, 500) cho ra "Không tìm thấy đơn hàng" kèm toast | Test ORD-4E | Phân biệt không có đơn (404) với lỗi tạm |
| Lệnh hủy lỗi hiện nguyên text kỹ thuật khi BE không gửi nội dung (`API error: 500`) | Test ORD-9E | Dùng chữ dịch khi không có mã BE được dịch |
| Hủy đơn dựa vào `paymentStatus` ở máy; đơn vừa được trả ở tab khác vẫn có nút hủy tới lần tải sau (BE từ chối bằng `1307`) | Test ORD-9E | Tải lại đơn trước khi cho hủy |
| `OrderDetailContent` gánh sáu thẻ, lệnh hủy, đánh giá | Đọc code | Tách từng thẻ thành thành phần sau khi có test |
| Chi tiết đơn import thẻ của `returns` và hộp của `reviews` | Đọc code | Giữ: đây là điểm ghép màn hình, không phải vòng phụ thuộc |

Thay đổi hành vi nhìn thấy được: khách chưa đăng nhập mở chi tiết đơn giờ thấy màn chặn (trước đó chỉ thấy khung chờ mãi mãi).

## 8. Lịch sử thay đổi

- 2026-10-22 · Viết spec và test cho toàn module (batch 2), kiểm thử đột biến.
- 2026-10-22 · Sửa lỗi: khách chưa đăng nhập mở `/orders/:id` chỉ thấy khung chờ mãi mãi vì `isLoading` chỉ tắt sau khi gọi BE (mà khách không gọi); kiểm tra "chưa đăng nhập" nay đứng trước kiểm tra "đang tải đơn". Test ORD-4 tái hiện lỗi trước khi sửa.
