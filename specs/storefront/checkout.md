# Checkout (thanh toán, đặt hàng, VietQR) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-22 · **Trạng thái:** Implemented
> **Doc:** [storefront/checkout](../../docs/storefront/checkout.md) · **Test:** `tests/storefront/checkout/`

## 1. Bối cảnh & mục tiêu

Checkout biến các dòng đã chọn trong giỏ thành đơn thật và dẫn khách tới nơi trả tiền. Sai ở đây là mất đơn hoặc mất tiền: tạo đơn từ dòng đã cũ, hiện sai phí, báo "đã thanh toán" khi chưa, hoặc để khách chuyển tiền vào mã đã hết hạn. Module gồm trang đặt hàng (`CheckoutContent.tsx` 270 dòng, `OrderSummary` 218, `ShippingForm` 151, hai khối chọn phương thức), hai hook (`use-order-quote`, `use-payment-session` 200 dòng, có hẹn giờ và polling) và trang VietQR (`PaymentContent.tsx` 327 dòng). Chưa có spec và test nào.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho cả đường đúng và đường lỗi, theo khách và người đã đăng nhập; kèm kiểm thử đột biến; ghi các điểm đáng ngờ vào mục 7. Không đổi code của module trong lượt này.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Test hàm thuần (`checkout.ts`, `payment.ts`), hai hook, trang đặt hàng, trang VietQR | Sửa các điểm ở mục 7: cần quyết định sản phẩm |
| Báo giá `POST /api/orders/quote` | Dùng ở giỏ hàng (tạm tính): [cart](./cart.md) CART-16 |
| Sao chép nội dung chuyển khoản | Thành phần `CopyButton` dùng chung: [ui-kit](../platform/ui-kit.md) (batch sau) |
| Tên và phí phương thức vận chuyển đến từ `GET /api/shipping` | Cấu hình admin của phương thức: [site-config](../admin/site-config.md) |

## 3. Hợp đồng

**Địa chỉ** (`checkout.ts`). `validateAddress(address, pickup)`: giao hàng bắt buộc `fullName`, `phone`, `addressLine1`, `city`; nhận tại cửa hàng chỉ `fullName`, `phone`; chuỗi chỉ có khoảng trắng coi là trống. Trả `{ <trường>: true }` cho từng trường thiếu. `resolveCartItemIds(serverCart, reviewed)` trả id dòng của BE khớp (`cartItemKey`) với các dòng đã xem, theo thứ tự của giỏ BE; thiếu một dòng thì `null`.

**Thanh toán** (`payment.ts`). `normalizePaymentStatus(raw)`: không phân biệt hoa thường, giá trị lạ hoặc không phải chuỗi → `PENDING` (chỉ `PAID` tường minh từ BE mới ra thành công). `isSafeQrUrl(url)`: chỉ `https://…` hoặc `data:image/(png|jpeg|jpg|svg+xml|webp);…`. `PAYMENT_POLL_INTERVAL_MS` = 3000.

**`useOrderQuote(items, method, enabled)`.** Khi `enabled` và có dòng: `POST /api/orders/quote` `{ cartItemIds, shippingMethod }`; nếu mọi dòng có `serverItemId` thì dùng id ở máy, một lỗi 400 (id cũ) hoặc có dòng thiếu id thì đọc giỏ BE (`fetchCart`) rồi hỏi lại với id mới (thiếu dòng ở BE → lỗi). Hỏi lại khi đổi phương thức hoặc dòng (khóa `cartItemKey:quantity:serverItemId`); kết quả của lượt cũ bị bỏ. Trả `{ quote, error, isLoading }`.

**Trang đặt hàng.** Đang tải phiên hoặc đang chuyển trang → khung chờ; chưa đăng nhập → `UnauthenticatedState`; không có dòng nào được chọn và mua được → trạng thái trống và nút tới `/shop`.
- Biểu mẫu: `fullName` điền sẵn `user.name` khi còn trống (kể cả khi phiên xong sau lần render đầu); 5 trường cốt lõi (`fullName`, `phone`, `addressLine1`, `city`, `province`), mục gập chứa `addressLine2`, `postalCode`, `country` (mặc định `Vietnam`) và ghi chú đơn; trường bắt buộc có `*`. Nhận tại cửa hàng: chỉ `fullName` và `phone`, thẻ đổi tiêu đề, có dòng "Nhận hàng tại" là link bản đồ; giá trị đã nhập ở các trường ẩn được giữ.
- Phương thức vận chuyển: danh sách từ `GET /api/shipping` (tên, thời gian, phí; "Miễn phí" khi phí 0 hoặc báo giá cho biết đã đạt ngưỡng), mặc định `standard`; đang tải hoặc lỗi thì có dòng thông báo. Phương thức thanh toán: `vietqr` (mặc định) hoặc `later`.
- Tóm tắt: các dòng đã chọn (ảnh, tên, size · màu, thành tiền dòng của BE hoặc "…"), tạm tính, phí, tổng của **báo giá BE cho đúng phương thức đang chọn** ("…" khi chưa có hoặc đang hỏi; phí "không tải được" khi lỗi), thanh tiến độ miễn phí vận chuyển khi phương thức có phí và ngưỡng bật. Nhãn nút: "Đặt hàng & thanh toán" (`vietqr`), "Đặt hàng" (`later`), "Đang đặt…" khi gửi.
- `begin_checkout` được gửi một lần, khi đã đăng nhập, có dòng và có báo giá đầu tiên (giá trị = `subtotal` theo tiền tệ ngôn ngữ).
- Đặt hàng: kiểm tra biểu mẫu (lỗi từng trường, focus trường lỗi đầu tiên, không gọi API; sửa trường thì lỗi của trường đó mất) → `fetchCart` → `resolveCartItemIds` (thiếu thì toast `itemsNotSynced`, dừng) → giao hàng: `POST /api/addresses` (trường tùy chọn trống → bỏ; `country` trống → `Vietnam`; không thiếu id) lấy `addressId`; nhận tại cửa hàng: `pickupContact { fullName, phone }` đã trim, không tạo địa chỉ → `POST /api/orders` `{ addressId | pickupContact, shippingMethod, note?, cartItemIds }` → `purchase` (giá trị = `total` của đơn BE trả), khung chờ, xóa các dòng đã đặt khỏi giỏ ở máy, toast `placed` → `router.replace`: `vietqr` → `/checkout/payment/<id>`, `later` → `/orders/<id>`, không có id → `/orders`. Lỗi: toast theo mã BE đã dịch, rồi text BE, và khi lỗi không có text (BE không gửi `message`, mất mạng) thì `toast.failed`; trang ở lại và nút mở lại. Nút bị khóa khi đang gửi.

**`usePaymentSession(orderId, enabled)`.** Khi `enabled`: `POST /api/payments/qr` `{ orderId }` → vào phase theo `status` của phiên (`pending` thường lệ). Nếu `POST` lỗi, thử `GET /api/payments/:orderId/status`: `PAID`/`CANCELLED` → phase đó, còn lại → `error` kèm lỗi của `POST`. Khi `pending`: polling `GET status` mỗi 3000 ms nối tiếp (lượt sau bắt đầu khi lượt trước xong); tab ẩn thì bỏ lượt và kiểm tra ngay khi tab hiện lại; `PAID`/`EXPIRED`/`CANCELLED` → phase tương ứng và dừng; còn `PENDING` mà `expiresAt` đã qua → `expired` (kiểm tra status trước nên tiền về sát giờ vẫn thắng), lượt kiểm tra được đặt ngay sau `expiresAt + 200 ms`; lỗi mạng hoặc 5xx → giữ polling và `connectionLost`, tự tắt khi lần sau thành công; 401/403/404 → `error` và dừng. `recreate()` (chỉ từ màn hết hạn) lấy phiên mới, ghi mã cũ vào `previousCodes` nếu khác, quay về `pending`; lỗi ném cho nơi gọi. `retry()` chạy lại từ đầu. Số tiền (`amount`) cập nhật từ cả phiên và mỗi lần polling. Unmount hoặc lần chạy mới làm phản hồi muộn bị bỏ.

**Trang VietQR.** Đang tải phiên hoặc phase `loading` → khung chờ; chưa đăng nhập → màn chặn. `pending`: ảnh QR chỉ khi `isSafeQrUrl`, số tiền theo ngôn ngữ, đồng hồ đếm ngược (`expiresAt`), ngân hàng, chủ tài khoản, số tài khoản và nội dung chuyển khoản (hai dòng sau có nút sao chép), hướng dẫn, cảnh báo `connectionLost` (`role="alert"`), danh sách mã cũ. `paid`: thông báo, số tiền đã trả, mã chuyển khoản của phiên, nút xem đơn. `expired`: thông báo, số tiền, mã vừa hết hạn kèm lời nhắc liên hệ cửa hàng, nút tạo QR mới (khóa khi đang tạo; lỗi → toast `recreateFailed`). `cancelled`: thông báo, số tiền, link xem đơn và mua sắm. `error` (hoặc không có phiên): tiêu đề lỗi, mô tả theo mã BE → text BE → mô tả mặc định, nút thử lại, link xem đơn.

## 4. Thiết kế

```
CartContent ─► /checkout ─► CheckoutContent ─► useOrderQuote ─► POST /api/orders/quote (đọc lại giỏ BE khi id cũ)
                │                └► useShipping ─► GET /api/shipping
                └► handlePlaceOrder ─► fetchCart ─► POST /api/addresses ─► POST /api/orders ─► router.replace
/checkout/payment/[orderId] ─► PaymentContent ─► usePaymentSession ─► POST /api/payments/qr, GET /api/payments/:id/status (polling)
```

Hướng phụ thuộc: component → hook → `useApiAuth` (có refresh token) → `session`. Module import slice giỏ (`cartItemKey`, `fetchCart`, `removeItems`, `selectSelectedCartItems`); giỏ import `useOrderQuote` của module này (vòng phụ thuộc giữa hai module, nợ ở mục 7).

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **BE là nguồn sự thật của tiền**: phí, tổng, số tiền chuyển khoản, nội dung chuyển khoản và hạn đều lấy từ BE; FE chỉ định dạng | Không thể lệch giá giữa màn hình và đơn | Tính phí ở FE từ bảng phí |
| **Đọc lại giỏ BE ngay trước khi đặt** (`fetchCart` + `resolveCartItemIds`) | Id lưu ở máy có thể cũ (đã đặt, đã xóa, tài khoản khác) | Tin id ở máy |
| **Bỏ kết quả lượt cũ** (cờ `stale`, `runRef`) | Đổi phương thức hoặc rời trang giữa chừng không được ghi đè trạng thái mới | Hủy request bằng `AbortController` |
| **Polling nối tiếp bằng `setTimeout`** (lượt sau chờ lượt trước) | Mạng chậm không làm chồng request | `setInterval` |
| **Máy trạng thái bằng `phase`** (`loading/pending/paid/expired/cancelled/error`) | Mỗi màn hình ứng với một giá trị, không có tổ hợp cờ vô nghĩa | Nhiều cờ boolean |
| **Chuẩn hóa trạng thái an toàn** (giá trị lạ = `PENDING`) | Chỉ `PAID` tường minh mới hiện thành công | Tin chuỗi BE gửi |
| **Chỉ nhận URL QR an toàn** (`isSafeQrUrl`) | Ảnh QR là `<img>` từ BE, chặn `javascript:`/`http:` | Hiển thị mọi URL |

### Kiến trúc

State biểu mẫu và lựa chọn là **UI state cục bộ** của `CheckoutContent`; dòng đặt lấy từ **client state được lưu** (Redux giỏ); phí, tổng và phiên thanh toán là **server state** đọc qua hook (không lưu). Trang thanh toán giữ `orderId` trên URL nên tải lại vẫn khôi phục.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `checkout.ts` và `payment.ts` là luật thuần; hai hook lo dữ liệu; component lo hiển thị. `CheckoutContent` còn gánh cả luồng đặt hàng (nợ nhẹ ở mục 7) |
| O | Thêm phương thức thanh toán hoặc vận chuyển = thêm một hàng cho `OptionList`; thêm trạng thái = thêm vào `PHASE_BY_STATUS` |
| L | Hai khối chọn dùng chung `OptionList` với cùng hợp đồng `OptionRow` |
| I | `OrderSummary` nhận đúng các giá trị nó vẽ (không nhận store); `PaymentAmountBlock` chỉ nhận `{ amountVnd, amountUsd }` |
| D | Component phụ thuộc hook và `useApiAuth`, không gọi `fetch` trực tiếp; hook nhận `apiFetch` qua `useApiAuth` |

### Conventions

Chữ giao diện ở `private.checkout` và `common.addressField`; tiền qua `useMoney`; toast qua `useToast`; lỗi qua `useErrorMessage`. Tên, mô tả và thời gian của phương thức vận chuyển là nội dung admin cấu hình nên hiện nguyên văn (ngoại lệ có chủ đích).

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (cả hai trang chỉ dành cho người đã đăng nhập; khách thấy màn chặn) · permission = không (trang của khách hàng, không có quyền riêng)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| CHK-1 | Kiểm tra địa chỉ: giao hàng cần họ tên, điện thoại, địa chỉ, thành phố; nhận tại cửa hàng chỉ cần họ tên và điện thoại | đúng | — | unit | `tests/storefront/checkout/checkout-lib.test.ts` |
| CHK-1E | Trường trống hoặc chỉ khoảng trắng bị báo đúng từng trường; `resolveCartItemIds` trả `null` khi giỏ BE thiếu dòng | lỗi | — | unit | `tests/storefront/checkout/checkout-lib.test.ts` |
| CHK-2 | Trạng thái thanh toán chuẩn hóa (hoa/thường, giá trị lạ = chờ); chỉ nhận URL QR https hoặc ảnh `data:image` | đúng | — | unit | `tests/storefront/checkout/checkout-lib.test.ts` |
| CHK-2E | URL QR nguy hiểm (`http:`, `javascript:`, `data:text/html`, rỗng) bị từ chối | lỗi | — | unit | `tests/storefront/checkout/checkout-lib.test.ts` |
| CHK-3 | Báo giá: hỏi BE với id dòng ở máy và phương thức, hỏi lại khi đổi phương thức hoặc dòng, bỏ kết quả lượt cũ | đúng | user | integration | `tests/storefront/checkout/use-order-quote.test.tsx` |
| CHK-3E | Báo giá: id cũ (400) hoặc dòng chưa có id thì đọc giỏ BE rồi hỏi lại; giỏ BE thiếu dòng, lỗi khác, tắt hoặc giỏ trống thì không có báo giá | lỗi | user | integration | `tests/storefront/checkout/use-order-quote.test.tsx` |
| CHK-4 | Khách thấy màn chặn đăng nhập, không gọi BE | đúng | khách | component | `tests/storefront/checkout/checkout-page.test.tsx` |
| CHK-4E | Đang xác định phiên chỉ có khung chờ; người đã đăng nhập chưa chọn dòng nào thấy trạng thái trống và nút tới cửa hàng; dòng hết hàng hoặc đặt may không đặt được | lỗi | user | component | `tests/storefront/checkout/checkout-page.test.tsx` |
| CHK-5 | Biểu mẫu: điền sẵn tên (kể cả khi phiên xong muộn), nhãn có `*`, mục gập (địa chỉ phụ, mã bưu chính, quốc gia, ghi chú), giữ giá trị khi gập | đúng | user | component | `tests/storefront/checkout/checkout-page.test.tsx` |
| CHK-5E | Gửi khi thiếu trường: lỗi từng trường, focus trường lỗi đầu tiên, không gọi BE; sửa trường thì lỗi của nó mất | lỗi | user | component | `tests/storefront/checkout/checkout-page.test.tsx` |
| CHK-6 | Nhận tại cửa hàng: chỉ họ tên và điện thoại, tiêu đề và link bản đồ đổi, giá trị ở trường ẩn được giữ khi đổi lại | đúng | user | component | `tests/storefront/checkout/checkout-page.test.tsx` |
| CHK-6E | Nhận tại cửa hàng thiếu họ tên hoặc điện thoại bị chặn, các trường địa chỉ không bị đòi | lỗi | user | component | `tests/storefront/checkout/checkout-page.test.tsx` |
| CHK-7 | Phương thức vận chuyển từ BE (tên, thời gian, phí, "Miễn phí"), mặc định chuẩn; phương thức thanh toán mặc định VietQR và nhãn nút đổi theo lựa chọn | đúng | user | component | `tests/storefront/checkout/checkout-page.test.tsx` |
| CHK-7E | Danh sách vận chuyển đang tải hoặc lỗi có thông báo; đổi phương thức không hiện giá của phương thức cũ | lỗi | user | component | `tests/storefront/checkout/checkout-page.test.tsx` |
| CHK-8 | Tóm tắt: dòng đã chọn, tạm tính, phí, tổng do BE báo, thanh tiến độ và dòng "đã miễn phí" theo ngưỡng, USD ở tiếng Anh | đúng | user | component | `tests/storefront/checkout/checkout-page.test.tsx` |
| CHK-8E | Tóm tắt: "…" khi chưa có báo giá, "không tải được phí" khi lỗi, không có thanh tiến độ khi phương thức miễn phí hoặc ngưỡng tắt | lỗi | user | component | `tests/storefront/checkout/checkout-page.test.tsx` |
| CHK-9 | Đặt hàng giao tận nơi trả bằng VietQR: đọc lại giỏ, tạo địa chỉ, tạo đơn đúng nội dung, xóa dòng đã đặt, toast, ghi nhận `purchase`, chuyển sang trang VietQR | đúng | user | component | `tests/storefront/checkout/checkout-order.test.tsx` |
| CHK-9E | Thanh toán sau chuyển sang trang đơn; không có id đơn chuyển sang danh sách đơn; nhận tại cửa hàng không tạo địa chỉ và gửi liên hệ đã trim | đúng | user | component | `tests/storefront/checkout/checkout-order.test.tsx` |
| CHK-10 | `begin_checkout` gửi một lần với tạm tính của báo giá đầu tiên | đúng | user | component | `tests/storefront/checkout/checkout-order.test.tsx` |
| CHK-10E | Đặt hàng thất bại: giỏ BE thiếu dòng (không gửi gì), lưu địa chỉ lỗi hoặc thiếu id, tạo đơn bị từ chối (mã BE được dịch, text BE, mặc định); trang ở lại, nút mở lại, giỏ còn nguyên; bấm đúp chỉ gửi một đơn | lỗi | user | component | `tests/storefront/checkout/checkout-order.test.tsx` |
| CHK-11 | Phiên thanh toán: tạo QR rồi chờ, polling 3 giây nối tiếp, `PAID`/`EXPIRED`/`CANCELLED` dừng và đổi màn, số tiền cập nhật | đúng | user | integration | `tests/storefront/checkout/use-payment-session.test.tsx` |
| CHK-11E | Phiên thanh toán: tạo QR lỗi mà đơn đã trả hoặc đã hủy; lỗi mạng giữ polling và báo mất kết nối; 401/403/404 dừng; tab ẩn không hỏi; quá hạn mà chưa trả thì hết hạn nhưng tiền về sát giờ vẫn thắng; trạng thái lạ coi là chờ | lỗi | user | integration | `tests/storefront/checkout/use-payment-session.test.tsx` |
| CHK-12 | Tạo lại QR khi hết hạn lấy phiên mới, giữ mã cũ để nhắc, quay về chờ; thử lại chạy từ đầu; rời trang dừng polling | đúng | user | integration | `tests/storefront/checkout/use-payment-session.test.tsx` |
| CHK-12E | Tạo lại QR lỗi để nguyên màn hết hạn; phản hồi muộn của lượt cũ bị bỏ | lỗi | user | integration | `tests/storefront/checkout/use-payment-session.test.tsx` |
| CHK-13 | Trang VietQR đang chờ: QR, số tiền theo ngôn ngữ, đồng hồ đếm ngược, chi tiết chuyển khoản và sao chép, hướng dẫn | đúng | user | component | `tests/storefront/checkout/payment-page.test.tsx` |
| CHK-13E | Trang VietQR: khách thấy màn chặn; đang tải có khung chờ; URL QR không an toàn không hiện ảnh; mất kết nối hiện cảnh báo; sao chép lỗi báo toast | lỗi | khách | component | `tests/storefront/checkout/payment-page.test.tsx` |
| CHK-14 | Màn thành công, hết hạn (tạo mã mới), hủy và lỗi (thử lại) của trang VietQR | đúng | user | component | `tests/storefront/checkout/payment-page.test.tsx` |
| CHK-14E | Màn hết hạn: tạo mã mới lỗi báo toast; màn lỗi dùng thông điệp của BE | lỗi | user | component | `tests/storefront/checkout/payment-page.test.tsx` |

Ngưỡng coverage riêng của module (dòng/nhánh/hàm): `checkout.ts`, `payment.ts` 95/90/95; `use-order-quote.ts` 95/85/95; `use-payment-session.ts` 95/80/95 (T0: tiền và trạng thái thanh toán); `CheckoutContent.tsx`, `PaymentContent.tsx`, `OrderSummary.tsx`, `ShippingForm.tsx` 90/85/90; `PaymentCountdown.tsx` 90/75/90.

## 7. Rủi ro & triển khai

| Rủi ro | Phát hiện | Quay lui |
|---|---|---|
| Lưu địa chỉ xong mà tạo đơn lỗi (hết hàng, đặt may): địa chỉ đã tạo ở BE, mỗi lần thử lại tạo thêm một địa chỉ | Test CHK-10E | Tạo địa chỉ cùng lúc với đơn, hoặc dùng lại `addressId` ở lần thử kế |
| Địa chỉ giao hàng gửi nguyên văn (có khoảng trắng đầu/cuối) trong khi liên hệ nhận tại cửa hàng được trim | Test CHK-9 | Trim cả hai |
| Nút đặt hàng vẫn bật khi báo giá lỗi: khách không thấy phí và tổng trước khi đặt | Test CHK-8E | Khóa nút hoặc báo rõ |
| Báo giá hỏi lại cho cùng phương thức mà lỗi (ví dụ sau khi đổi dòng): dòng phí báo "không tải được" nhưng tổng cũ vẫn hiện bên cạnh | Test CHK-8E | Xóa báo giá cũ khi hỏi lại lỗi |
| Số điện thoại chỉ cần không trống, không kiểm định dạng | Test CHK-1 | Kiểm định dạng theo quốc gia |
| `useOrderQuote` hỏi báo giá hai lần liên tiếp khi dòng chưa có id (lần đọc giỏ BE đổi danh sách dòng) | Test CHK-3E | Khóa theo các id đã xác nhận |
| Giỏ import hook của checkout và checkout import slice của giỏ (vòng phụ thuộc giữa hai module) | Đọc code | Đưa `useOrderQuote` và `OrderQuote` về một nơi dùng chung |
| `begin_checkout` chỉ gửi một lần cho mỗi lần mở trang, kể cả khi đổi dòng đã chọn | Test CHK-10 | Ghi nhận theo thay đổi nếu cần |
| `CheckoutContent` gánh cả biểu mẫu, đặt hàng và theo dõi sự kiện | Đọc code | Tách luồng đặt hàng thành hook sau khi có test |

Không có thay đổi hành vi nhìn thấy được trong lượt này.

## 8. Lịch sử thay đổi

- 2026-10-22 · Viết spec và test cho toàn module (batch 2), kiểm thử đột biến; không đổi code của module.
