# Checkout (thanh toán / đặt hàng)

> **Nhóm:** Storefront (private) · **Route:** `/[locale]/checkout`, `/[locale]/checkout/payment/[orderId]` · **Cập nhật:** 2026-10-18
> **Code:** `(private)/checkout/` — `page.tsx`, `layout.tsx`, `CheckoutContent.tsx`, `_common/{checkout.ts,payment.ts,use-payment-session.ts,use-order-quote.ts}`, `_components/{OptionList,ShippingMethodSection,ShippingForm,PaymentMethodSection,OrderSummary,DetailRow,PaymentAmountBlock,PaymentCountdown}.tsx`, `payment/[orderId]/{page.tsx,PaymentContent.tsx}`
> **i18n:** `private.checkout` (`page`, `delivery`, `form`, `method`, `note`, `summary`, `toast`, `empty`, `payment`), `common.addressField` (nhãn trường địa chỉ)

## 1. Tóm tắt module

Trang đặt hàng **một khung hình** (`/checkout`): bên trái ba thẻ: người nhận/địa chỉ, phương thức vận chuyển, phương thức thanh toán; bên phải các dòng đã chọn trong giỏ, tổng tiền và nút đặt hàng. Kèm trang thanh toán chuyển khoản **VietQR** riêng (`/checkout/payment/[orderId]`) cho đơn chọn VietQR. Chỉ các dòng đã tick trong giỏ (và mua được) được đặt; các dòng còn lại ở lại giỏ.

## 2. Phục vụ gì / việc cần làm

Thu thông tin giao hàng và phương thức thanh toán trong một lần nhìn, tạo đơn trên BE từ chính các dòng giỏ hàng đã chọn, rồi chuyển khách tới nơi tiếp theo (mã QR hoặc chi tiết đơn). Gửi sự kiện phễu `begin_checkout` (khi có báo giá đầu tiên, giá trị là `subtotal` của báo giá) và `purchase` (giá trị là `total` của đơn BE trả về) cho Analytics, theo tiền tệ của ngôn ngữ (xem [analytics](../admin/analytics.md)).

## 3. Submodule & chức năng hiện có

| Thành phần | Nội dung |
|---|---|
| Điều kiện vào | Đang tải phiên (hoặc đang chuyển trang sau khi đặt) → skeleton; chưa đăng nhập → `UnauthenticatedState`; không có dòng nào được chọn → trạng thái giỏ trống + nút tới `/shop` |
| `OptionList` | Danh sách lựa chọn dọc (radio): mỗi dòng là một ô có viền riêng, cao ≥ 48 px, gồm chấm chọn, icon, tên, chi tiết phụ và giá; ô đang chọn viền vàng (không có khung chung nên viền không bị cắt). Dùng cho vận chuyển và thanh toán |
| `ShippingMethodSection` | Thẻ "Phương thức vận chuyển" (3 dòng từ `GET /api/shipping`) |
| `ShippingForm` | Thẻ "Thông tin giao hàng": 5 trường cốt lõi (nhãn nổi), mục gập "Thêm căn hộ, mã bưu chính, ghi chú"; với nhận tại cửa hàng thẻ là "Người nhận tại cửa hàng" (chỉ họ tên + điện thoại); kiểm tra trường bắt buộc |
| `PaymentMethodSection` | Thẻ "Phương thức thanh toán" (2 dòng) |
| `OrderSummary` | Các dòng đã chọn (chỉ đọc), tạm tính, phí vận chuyển và tổng do BE báo giá, nút đặt hàng, link điều khoản |
| Payment `/checkout/payment/[orderId]` | Mã VietQR, số tiền, ngân hàng, chủ tài khoản, số tài khoản + nút Copy, nội dung chuyển khoản + nút Copy, trạng thái chờ, hướng dẫn; màn thành công / hết hạn / hủy / lỗi |

## 4. Chi tiết

### 4.1 Form giao hàng (`ShippingForm`, trạng thái ở `CheckoutContent`)

Ba thẻ riêng xếp dọc ở cột trái theo thứ tự khách điền: người nhận/địa chỉ → vận chuyển → thanh toán (`SECTION_CARD_CLASS`, đệm gọn hơn thẻ tóm tắt). Nhãn mỗi trường là **nhãn nổi**: nằm trong ô như placeholder (input có `placeholder=" "`) và thu nhỏ lên góc trên khi ô có focus hoặc có giá trị (`peer-focus`, `peer-not-placeholder-shown`); ô cao 52 px. Khi tải trang chỉ hiện 5 trường cốt lõi (`fullName`, `phone`, `addressLine1`, `city`, `province`); `EXTRA_FIELDS` (`addressLine2`, `postalCode`, `country`) và ô ghi chú đơn hàng (`notes`, textarea có `aria-label` và placeholder `note.*`) nằm trong mục gập `form.moreDetails` (nút có `aria-expanded`), giữ nguyên giá trị khi gập lại.

`AddressForm` (`_common/checkout.ts`): `fullName*` (điền sẵn `user.name` khi ô còn trống, kể cả khi phiên xong sau lần render đầu), `phone*`, `addressLine1*`, `addressLine2`, `city*`, `province`, `postalCode`, `country` (mặc định `"Vietnam"`), `notes`. Dấu `*` là bắt buộc phía FE (`REQUIRED_FIELDS`, chỉ gồm các trường BE yêu cầu). Nhãn lấy từ `common.addressField`, lỗi `form.errors.*`. Mỗi trường có `autoComplete` tương ứng, `aria-invalid`, lưới 1 cột, 2 cột từ 480 px (địa chỉ chiếm cả hàng). Lỗi của trường biến mất khi sửa trường đó.

Khi chọn nhận tại cửa hàng (`store-pickup`) form chỉ hiện `fullName` và `phone` (`PICKUP_FIELDS`, cùng bắt buộc); các giá trị địa chỉ đã nhập vẫn được giữ trong state nếu khách đổi lại phương thức khác. Thẻ còn hiện dòng "Nhận hàng tại: `CONTACT_ADDRESS`" (`form.pickupAt`) là link `CONTACT_MAPS_URL` mở Google Maps.

### 4.2 Phương thức vận chuyển & thanh toán

**Vận chuyển (`ShippingMethodSection`, state `shippingMethod`, mặc định `standard`):** ô chọn theo `useShipping().methods` — mỗi dòng hiện biểu tượng (`icon`), `name`, `estimatedDays` (cạnh tên từ `sm`, dưới tên trên điện thoại) và phí; `description` của phương thức không hiển thị. Các chữ này là nội dung admin cấu hình ở [site-config](../admin/site-config.md) 4.5 nên hiện nguyên văn, không qua i18n. Phí hiện theo ngôn ngữ (`fmt(method, "price")` từ `priceVnd`/`priceUsd`), "Miễn phí" khi `priceVnd` = 0 hoặc khi báo giá cho biết đã đạt ngưỡng miễn phí (áp cho mọi phương thức). Chưa tải được danh sách → thông báo `delivery.loading` / `delivery.loadFailed`.

**Thanh toán (`PaymentMethodSection`):** 2 dòng, chỉ có tên (không có mô tả), `PaymentMethod`: `vietqr` (mặc định, "Chuyển khoản ngân hàng (VietQR)") hoặc `later` ("Thanh toán sau"). Phương thức chỉ quyết định bước tiếp theo ở FE; request tạo đơn không mang phương thức thanh toán.

### 4.3 Đặt hàng (`handlePlaceOrder`)

0. `validateAddress(address, pickup)`: thiếu trường bắt buộc (giao hàng: họ tên, điện thoại, địa chỉ, thành phố; nhận tại cửa hàng: họ tên, điện thoại) → hiện lỗi từng trường, focus vào trường đầu tiên lỗi, dừng (không gọi API).
1. `dispatch(fetchCart()).unwrap()` — lấy giỏ BE hiện tại vì `serverItemId` lưu cục bộ có thể cũ (đã đặt/đã xóa/tài khoản khác).
2. `resolveCartItemIds(serverCart, items)`: lọc các dòng BE khớp (`cartItemKey`) với các dòng đã chọn → `cartItemIds`. Thiếu dòng → toast `itemsNotSynced`, dừng.
3. Người nhận: giao hàng (`standard`/`express`) → `POST /api/addresses` (qua `useApiAuth().apiFetch`, có refresh token; trường rỗng tùy chọn → `undefined`) lấy `addressId` (thiếu id → lỗi `addressFailed`); nhận tại cửa hàng → không tạo địa chỉ, dùng `pickupContact: { fullName, phone }` (đã trim). BE chỉ nhận một trong hai, và snapshot đơn nhận tại cửa hàng chỉ có `fullName`, `phone`.
4. `POST /api/orders` với `{ addressId | pickupContact, shippingMethod, note?, cartItemIds }`.
5. Thành công: `trackEvent("purchase", { orderId, vnd | usd })`, `setIsRedirecting(true)` (hiện skeleton, tránh nháy trạng thái giỏ trống), `removeItems` các dòng đã đặt khỏi giỏ cục bộ, toast `placed`, rồi `router.replace`: `vietqr` → `/checkout/payment/<orderId>`; `later` → `/orders/<orderId>`; BE không trả id → `/orders`. Lỗi: toast qua `useErrorMessage` (fallback `toast.failed`; ví dụ mã `1303` cho sản phẩm hết hàng/đặt may).
- Nút đặt hàng khóa khi `isSubmitting`, nhãn "Đặt hàng & thanh toán" (vietqr) / "Đặt hàng" (later) / "Đang đặt…".
- `begin_checkout` gửi một lần khi trang có dòng, đã đăng nhập và đã có báo giá (`beginTrackedRef`).
- Phí vận chuyển do BE tính khi tạo đơn; trang hiển thị đúng con số BE báo giá (4.4). Mã lỗi BE `1304`–`1306` (thiếu địa chỉ / thiếu hoặc sai `pickupContact`) chỉ xảy ra nếu FE gửi sai tổ hợp nên chưa có bản dịch riêng.

### 4.4 Cột tóm tắt (`OrderSummary`)

Tiêu đề "Đơn hàng của bạn". Danh sách dòng chỉ đọc (ảnh 56 px kèm huy hiệu số lượng, tên, size · màu, thành tiền dòng `lineTotal` của BE, "…" khi BE chưa tính): số lượng được sửa ở giỏ vì đơn được dựng từ giỏ đã đồng bộ với BE. Phí và tổng lấy từ **báo giá của BE**: `useOrderQuote(items, shippingMethod, isAuthenticated)` (`_common/use-order-quote.ts`) gọi `POST /api/orders/quote` (HTTP 200, không tạo gì) với `{ cartItemIds, shippingMethod }` → `{ shippingMethod, subtotalVnd/Usd, shippingFeeVnd/Usd, totalVnd/Usd, freeShipping, freeShippingThresholdVnd/Usd }` (`OrderQuote`; mỗi số tiền là cặp `...Vnd`/`...Usd` do BE tính, ngưỡng miễn phí ship là `null` ở cả hai nửa khi tắt miễn phí ship). Gọi lại mỗi khi đổi phương thức vận chuyển hoặc đổi các dòng đã chọn (khóa theo `cartItemKey:quantity:serverItemId`, bỏ kết quả của lượt cũ). Dùng id dòng lưu cục bộ; thiếu id hoặc BE trả 400 (id cũ) thì `fetchCart()` rồi hỏi lại bằng id mới. Báo giá của phương thức khác không được dùng (`currentQuote`). Dòng vận chuyển (`shipping.label` · tên phương thức): số tiền, "Miễn phí" khi phí 0, "…" khi đang hỏi, `shipping.unavailable` khi lỗi (tạm tính và tổng hiện "…"; đặt đơn vẫn chạy vì BE tự tính); tạm tính và tổng thanh toán là `quote.subtotal*` / `quote.total*` — FE không tự cộng hay nhân. Thanh tiến độ miễn phí vận chuyển (dưới ngưỡng "mua thêm …", từ ngưỡng "đã được miễn phí") chỉ hiện khi `freeShippingThresholdVnd/Usd` không `null` và phí gốc của phương thức (`priceVnd`) > 0; chữ "mua đủ {ngưỡng} để được miễn phí" ghi chính ngưỡng của BE (không tính số còn thiếu, vì phép trừ USD sẽ lệch vài cent), thanh chạy theo tỉ lệ `subtotalVnd / freeShippingThresholdVnd` (nhận tại cửa hàng vốn miễn phí nên ẩn); ghi chú miễn phí vận chuyển ẩn khi ngưỡng `null`. Phí và ngưỡng do admin cấu hình ở [site-config](../admin/site-config.md) 4.5. Không có khối riêng cho số tiền chuyển khoản hay tỷ giá: tổng thanh toán là con số duy nhất, theo ngôn ngữ; số tiền QR chốt khi QR được tạo ở trang thanh toán. Khối cũng có tạm tính (kèm số sản phẩm), nút đặt hàng; dòng đồng ý Điều khoản, Chính sách bảo mật, Vận chuyển & đổi trả (3 link mở tab mới để không mất form).

### 4.5 Bố cục, metadata & layout

Đầu trang giống trang giỏ ([cart](./cart.md)): link "Quay lại giỏ hàng" (`page.back` → `/cart`) rồi `h1` có icon (`page.title`). Wrapper `max-w-[1080px]`; một cột trên điện thoại/máy tính bảng dọc (ba thẻ rồi tóm tắt/nút đặt hàng), từ `lg` hai cột `minmax(0,1fr) / 380px` với cột tóm tắt `sticky top-[96px]`; mục tiêu là toàn bộ nội dung vừa một màn hình máy tính. Dưới `lg` danh sách sản phẩm trong tóm tắt gập sẵn (nút `summary.showItems` có `aria-expanded`); từ `lg` luôn hiện, cao tối đa 200 px rồi cuộn trong khối (có đệm trên/phải để huy hiệu số lượng không bị cắt). Layout riêng: `private.checkout.meta`, chỉ có `SiteHeader` (không có footer). `noindex` qua layout `(private)`.

### 4.6 Thanh toán VietQR (`/checkout/payment/[orderId]`)

Trang client (`PaymentContent`) trong layout checkout (có `SiteHeader`, `noindex`). Cần đăng nhập (skeleton khi tải phiên, `UnauthenticatedState` khi chưa đăng nhập). `orderId` lấy từ URL nên tải lại trang vẫn khôi phục được phiên.

**API (qua `useApiAuth().apiFetch`, bọc `{ data }` như các endpoint khác):**

- `GET /api/payments/:orderId/status` → `{ orderId, status, amountVnd, amountUsd }`, `status` ∈ `PENDING | PAID | EXPIRED | CANCELLED` (`normalizePaymentStatus`: viết hoa; giá trị lạ coi là `PENDING`, chỉ `PAID` từ BE mới hiện thành công).
- `POST /api/payments/qr` body `{ orderId }` → `PaymentSession`: `orderId, paymentId, qrUrl, amountVnd, amountUsd, bankName, accountNumber, accountName, transferContent, status, expiresAt`. FE không tự tạo mã giao dịch, số tiền hay nội dung chuyển khoản; mọi giá trị hiển thị lấy từ BE. Chỉ gửi `orderId` (gửi thêm trường khác như `amount` bị BE trả 400). Gọi lại cho cùng một đơn trả đúng phiên cũ khi chưa hết hạn, hết hạn thì BE cấp mã chuyển khoản, QR và `expiresAt` mới — nên cũng là lệnh khôi phục (tải lại trang) và tạo lại phiên.

**`usePaymentSession(orderId, enabled)`** (`_common/use-payment-session.ts`) trả `{ phase, session, error, connectionLost, isCreating, retry, recreate }`, `phase` ∈ `loading | pending | paid | expired | cancelled | error`:

1. Khi mount (và đã đăng nhập): `POST /api/payments/qr` rồi vào phase theo `status` của phiên trả về (thường `pending`). Nếu `POST` lỗi, thử `GET status`: `PAID` / `CANCELLED` → phase tương ứng (đơn đã trả hoặc đã hủy có thể không cấp QR mới); còn lại → `error` với lỗi của `POST`.
2. Khi `pending` (sau khi đã có phiên): polling `GET status` mỗi `PAYMENT_POLL_INTERVAL_MS` = 3000 ms bằng `setTimeout` nối tiếp (request sau chỉ bắt đầu khi request trước xong). Tab ẩn thì không gọi, quay lại tab thì kiểm tra ngay (`visibilitychange`). `PAID` → phase `paid`, `EXPIRED` → `expired`, `CANCELLED` → `cancelled`, đều dừng polling. Khi `expiresAt` đã qua mà status vẫn `PENDING` (kiểm tra status trước, nên khoản chuyển tới sát giờ vẫn thắng) → phase `expired`, dừng polling; lượt kiểm tra được đặt ngay sau `expiresAt` thay vì chờ hết chu kỳ. Dừng khi unmount; response muộn của lượt cũ bị bỏ qua (`runRef`).
3. Lỗi mạng/5xx khi polling: giữ polling, bật `connectionLost` (dòng cảnh báo), tự xóa khi lần sau thành công. `401/403/404` → dừng, phase `error`.
4. `recreate()` (chỉ từ màn hết hạn): `POST /api/payments/qr` lấy phiên mới (QR + `expiresAt` mới) rồi quay lại bước 2; ném lỗi cho nơi gọi toast (`toast.recreateFailed`).

**Màn hình:**

| Phase | Hiển thị |
|---|---|
| `loading` | Skeleton |
| `pending` | Một thẻ hai cột từ `md` (cột trái 260 px: ảnh QR `<img src={qrUrl}>` chỉ khi `isSafeQrUrl` — `https:` hoặc `data:image/…` —, khối số tiền `PaymentAmountBlock` (một số theo ngôn ngữ: `amountVnd` ở `vi`, `amountUsd` ở ngôn ngữ khác), `PaymentCountdown` nếu có `expiresAt`; cột phải: tiêu đề + mã đơn 11 px + nhãn "Đang chờ thanh toán" (`role="status"`, spinner), ngân hàng, chủ tài khoản, số tài khoản + Copy, nội dung chuyển khoản + Copy, 3 bước hướng dẫn, cảnh báo `connectionLost`, dòng `previousCodes` liệt kê các mã cũ đã hết hạn và bị thay khi tạo lại QR (nằm trong state của lượt xem, mất khi tải lại trang), link xem đơn). Dưới `md` một cột, QR 200 px và chỉ giữ gợi ý một dòng cho điện thoại (`guide.mobileHint`) thay cho 3 bước |
| `paid` | Thông báo thành công, mã đơn, `PaymentAmountBlock` "Số tiền đã thanh toán", thẻ nhỏ "Nội dung chuyển khoản" (mã của phiên đã trả, kèm nút sao chép; chỉ khi phiên có trong lượt xem này), nút "Xem chi tiết đơn hàng" → `/orders/<orderId>`, link tiếp tục mua sắm |
| `expired` | Thông báo hết hạn, `PaymentAmountBlock`, thẻ nhỏ "Nội dung chuyển khoản" của phiên vừa hết hạn kèm dòng nhắc "nếu bạn đã chuyển khoản với nội dung này, hãy liên hệ cửa hàng kèm mã" (chỉ khi phiên có trong lượt xem này), nút "Tạo mã QR mới" (`recreate`, khóa khi `isCreating`), link xem đơn |
| `cancelled` | Thông báo hủy, `PaymentAmountBlock`, link xem đơn / mua sắm |
| `error` | Tiêu đề lỗi, mô tả từ `useErrorMessage` (mã BE → text BE → `error.description`), nút "Thử lại" (`retry`), link xem đơn |

`usePaymentSession` trả thêm `amount` (`amountVnd`, `amountUsd`): lấy từ phiên QR và cập nhật theo mỗi lần polling `GET status`, nên khối số tiền luôn có giá trị ở mọi phase (PENDING, PAID, EXPIRED, CANCELLED) kể cả khi `POST /api/payments/qr` lỗi mà `GET status` vẫn trả được. Các giá trị tiền do BE trả; không hiển thị tỷ giá. `qrUrl` (VietQR) chỉ mang số VND và được hiển thị nguyên.

`PaymentCountdown` chỉ hiển thị thời gian còn lại tính từ `expiresAt` (cập nhật mỗi giây, hết giờ hiện "đang kiểm tra lại"); việc coi phiên là hết hạn do BE quyết định qua `status`. `DetailRow` là một dòng thông tin chuyển khoản: nhãn bên trái, giá trị bên phải (4 dòng cùng kiểu: ngân hàng, chủ tài khoản, số tài khoản, nội dung chuyển khoản). Hai dòng cuối (`copyable`) có `CopyButton` (icon sao chép nhỏ dùng chung, xem [ui-kit](../platform/ui-kit.md)) cạnh giá trị.

Layout: màn `pending` rộng `max-w-[880px]` và gọn để vừa một màn hình (không cần cuộn trên máy tính); các màn kết quả (`paid`/`expired`/`cancelled`/`error`) dùng cột `max-w-[640px]`. i18n: `private.checkout.payment.*`.

### 4.7 Liên quan

Giỏ: [cart](./cart.md). Định dạng tiền `vnd`: [i18n](../platform/i18n.md). Đơn sau khi tạo: [customer-orders](./customer-orders.md), quản trị: [admin/orders](../admin/orders.md). Sự kiện: [analytics](../admin/analytics.md).

- **Đơn vị kích thước:** các số px trong doc này là giá trị ở gốc 16 px; trong code, chiều dài và cỡ chữ của module viết bằng `rem` (class `…-[…rem]`, token `--text-*` / `--space-*`, style inline `"…rem"`) nên lớn dần từ 1536 px tới 1920 px theo thang gốc `html` ([design-system](../platform/design-system.md) 4.3).
