# Customer orders (đơn hàng của tôi)

> **Nhóm:** Storefront (private) · **Route:** `/[locale]/orders`, `/[locale]/orders/[orderId]` · **Cập nhật:** 2026-10-18
> **Code:** `(private)/orders/` — `page.tsx`, `layout.tsx`, `OrdersContent.tsx`, `[orderId]/{page.tsx,OrderDetailContent.tsx}`, `_common/{constants,types}.ts`, `_components/{OrderStatusBadge,OrderThumb}.tsx`, dùng `returns/_components/OrderReturnCard.tsx`, `reviews/_components/ReviewFormModal.tsx`, `reviews/_common/{use-pending-reviews,use-deadline-label}.ts`
> **i18n:** `private.orders` (`meta`, `list`, `detail`; `list.reviewsLink`, `detail.review`), `common.orderStatus`

## 1. Tóm tắt module

Khách xem lại đơn của mình: danh sách đơn (mới nhất theo BE) và trang chi tiết từng đơn. Chỉ hiện thông tin khách cần (trạng thái, sản phẩm, tiền, nơi giao); mã đơn hiển thị rất nhỏ, nhạt.

## 2. Phục vụ gì / việc cần làm

Cho khách nhìn là biết đơn đang ở đâu (chờ xử lý → xác nhận → đang giao → đã giao → hoàn tất / hủy), món nào, bao nhiêu tiền, giao đến đâu, và quay lại thanh toán nếu đơn còn chờ trả tiền.

## 3. Submodule & chức năng hiện có

| Thành phần | Chức năng |
|---|---|
| Danh sách `/orders` | Mỗi đơn là một thẻ bấm được cả khối → `/orders/<id>`: badge trạng thái + ngày, tối đa 2 sản phẩm (ảnh, tên, size · màu, số lượng nếu > 1) + "+n sản phẩm khác", dòng cuối: mã đơn (11 px, nhạt) và tổng tiền kèm mũi tên |
| Chi tiết `/orders/[orderId]` | Thẻ trạng thái (icon màu, nhãn, câu giải thích theo trạng thái, ngày giờ + mã đơn 11 px), thẻ thanh toán (có điều kiện), thẻ "Giao đến" (người nhận · điện thoại, địa chỉ, ghi chú), thẻ sản phẩm + tiền |
| Đánh giá sản phẩm | Đầu trang danh sách có link "Đánh giá sản phẩm" sang `/reviews` kèm số dòng đang chờ đánh giá; ở chi tiết đơn `delivered` / `completed`, dòng hàng có trong danh sách chờ hiện nút "Viết đánh giá" và "còn N ngày" (xem 4.4) |
| `OrderStatusBadge` | Pill màu + icon + nhãn theo trạng thái (dùng ở danh sách) |
| `OrderThumb` | Ảnh sản phẩm của một dòng, icon thay thế khi không có ảnh |
| Trạng thái | Skeleton khi tải phiên/đơn, `UnauthenticatedState` khi chưa đăng nhập, trạng thái trống có CTA mua sắm |

## 4. Chi tiết

### 4.1 Dữ liệu

- Danh sách: `GET /api/orders?sort=-createdAt&page&limit=25` (`useApiAuth().apiFetch`) → `{ data: Order[], total }`; trang đầu tải khi vào trang, nút "Xem thêm đơn hàng" (ẩn khi đã đủ `total`) tải trang kế và nối vào cuối danh sách. Lỗi tải → toast `toast.loadFailed` qua `useErrorMessage`.
- Chi tiết: `GET /api/orders/:orderId` (id lấy từ `useParams`). Lỗi → toast; không có đơn → thông báo `notFound`.
- `Order` (`_common/types.ts`): `id, status, subtotalVnd/Usd, shippingFeeVnd/Usd, totalVnd/Usd, shippingMethod, shippingAddress: Record<string,string>, note, createdAt, updatedAt, items[{ id, productId | null, productName, productImage, quantity, priceVnd, priceUsd, size, color, createdAt }]`.
- Thanh toán: lấy từ chính đơn (`Order.paymentStatus` `unpaid` | `paid` | `refunded`, `paidAt`, `paymentAttempts[]`, `refunds[]`; `deliveredAt` là lúc đơn giao tới khách, mở đầu thời hạn trả hàng), không gọi thêm API. `OrderPaymentAttempt { transferCode, amountVnd, amountUsd, status (PENDING|PAID|EXPIRED|CANCELLED, trạng thái thật), createdAt, expiresAt, paidAt, transactionRef | null }`, mới nhất trước; `transferCode` là duy nhất nên dùng làm key.

### 4.2 Hiển thị

- Trạng thái → màu/icon (`STATUS_CONFIG`): `pending` vàng/đồng hồ, `confirmed` xanh/tick, `shipping` sage/xe tải, `delivered` & `completed` sage/tick, `cancelled` hồng đậm/X; nhãn từ `common.orderStatus` (giá trị lạ hiện nguyên giá trị, mặc định style `pending`). Câu giải thích: `detail.statusHint.<status>`.
- Thẻ thanh toán còn liệt kê **mọi nội dung chuyển khoản đã cấp** (kể cả mã hết hạn): mỗi mã có nút sao chép (`CopyButton`), nhãn trạng thái (hết hạn màu hồng, đã trả màu xanh), số tiền của mã (`amountVnd`/`amountUsd` theo ngôn ngữ), hạn hoặc ngày trả, và `transactionRef` (kèm nút sao chép) khi tiền đã khớp; đơn chưa trả có dòng nhắc liên hệ cửa hàng kèm nội dung chuyển khoản đã dùng. Thẻ hiện khi đơn có ít nhất một mã, hoặc khi đơn `unpaid` và chưa `cancelled` (câu "đang chờ thanh toán" + nút "Thanh toán ngay" → `/checkout/payment/<orderId>`) hoặc `paid` (dòng "Đã thanh toán").
- Địa chỉ: `fullName` (đậm) · `phone`, rồi `addressLine1`, `addressLine2`, `city[, province] [postalCode]` — mỗi dòng chỉ hiện khi có giá trị — và `country` chỉ khi khác `"Vietnam"`; ghi chú đơn nằm cuối thẻ. Đơn nhận tại cửa hàng (`shippingMethod = store-pickup`): tiêu đề thẻ là "Người nhận tại cửa hàng", snapshot chỉ có `fullName`/`phone` và có thêm dòng `pickupAtStore` kèm địa chỉ `CONTACT_ADDRESS` (link `CONTACT_MAPS_URL`).
- Tiền: `useMoney().fmt(x, "total" | "subtotal" | "shippingFee" | "price" | "amount")` (VND ở `vi`, USD ở ngôn ngữ khác, nửa cặp do BE trả; xem [currency](../platform/currency.md)); dòng hàng hiện đơn giá × số lượng vì BE không trả thành tiền dòng của đơn; ngày: `short` ở danh sách, `dateTime` ở chi tiết. Phí vận chuyển `shippingFeeVnd` = 0 hiện "Miễn phí"; tên phương thức lấy từ cấu hình admin qua `useShippingMethodName()` (cùng tên khách thấy ở checkout); chưa tải xong hoặc phương thức đã bị bỏ thì dùng nhãn dịch `shippingMethod.<id>` cho `standard` / `express` / `store-pickup`, giá trị lạ hiện nguyên chuỗi.
- Bố cục: danh sách `max-w-[720px]`; chi tiết `max-w-[1080px]`, một cột trên điện thoại/tablet (trạng thái → thanh toán → giao đến → sản phẩm & tiền), từ `lg` hai cột `minmax(0,1fr) / 400px` với thẻ sản phẩm & tiền `sticky`. Toàn bộ style bằng Tailwind.

- **Hai nhãn tách riêng**: trạng thái xử lý của đơn (`OrderStatusBadge` ở danh sách, tiêu đề thẻ trạng thái ở chi tiết) và trạng thái thanh toán (`OrderPaymentBadge`: Đã thanh toán / Chưa thanh toán) cạnh nhau ở cả danh sách và chi tiết; [account](./account.md) cũng hiện nhãn thanh toán dưới trạng thái. Thanh toán thành công khiến BE tự chuyển đơn `pending` sang `confirmed`.
- **Hủy đơn** (chi tiết): nút "Hủy đơn" chỉ hiện khi `unpaid` **và** `pending` → `useConfirm` (`danger`) → `PATCH /api/orders/:id/cancel`; response cùng shape chi tiết đơn nên thay thẳng vào màn hình (các mã chờ bị BE hủy theo), toast `cancel.done`. Mọi đơn còn mở khác (`pending`/`confirmed`/`shipping`, gồm cả đơn đã thanh toán) ẩn nút và hiện dòng "Liên hệ cửa hàng để hủy đơn"; cửa hàng hủy đơn đã trả thì BE tự tạo khoản hoàn. Lỗi `1307` (đã trả, không hủy trực tuyến được) hiện nguyên message của BE (không có bản dịch theo mã).
- **Hoàn tiền**: khi `refunds[]` (mới nhất trước, `[]` nếu chưa có) có phần tử, thẻ "Hoàn tiền" liệt kê từng khoản (`reason` chỉ còn `ADMIN_CANCELLED` ghi "Cửa hàng hủy đơn" và `RETURN` ghi "Hoàn tiền do trả hàng"): `REQUESTED` "Đã ghi nhận yêu cầu hoàn tiền, cửa hàng sẽ chuyển khoản lại cho bạn" (kèm số tiền VND và thời điểm yêu cầu), `COMPLETED` "Đã hoàn X VNĐ" kèm `bankReference` (có `CopyButton`) và thời điểm xử lý, `REJECTED` "Cửa hàng không hoàn tiền, vui lòng liên hệ cửa hàng". Không hứa thời gian hay tài khoản nhận; BE không trả `note` hay tên admin. `paymentStatus = refunded` hiện qua `OrderPaymentBadge` "Đã hoàn tiền". Khoản hoàn có `reason = RETURN` (kèm `returnId`) ghi "Hoàn tiền do trả hàng" và link sang yêu cầu trả hàng tương ứng.
- **Trả hàng**: với đơn `delivered` / `completed`, thẻ "Trả hàng" (`OrderReturnCard`, xem [customer-returns](./customer-returns.md)) cho biết còn hạn đến khi nào và có nút "Yêu cầu trả hàng", hoặc nhãn lý do không trả được, kèm danh sách yêu cầu đã gửi của đơn. Đầu trang danh sách đơn có liên kết "Yêu cầu trả hàng" sang `/returns`.

### 4.3 Phạm vi

Ngoài đường dẫn sang thanh toán và hủy đơn chưa trả, trang chỉ đọc: không có theo dõi vận đơn trên giao diện khách. Việc đổi trạng thái do admin thực hiện ([admin/orders](../admin/orders.md)).

### 4.4 Đánh giá từ đơn hàng

Danh sách dòng còn đánh giá được lấy từ `usePendingReviews()` (`GET /api/my-reviews/pending`, SWR khóa `reviews:pending`), đối chiếu `orderItemId` với `OrderItem.id`; trạng thái đơn không được dùng để suy ra dòng nào đánh giá được (API đơn không cho biết dòng đã đánh giá chưa). Nút chỉ hiện khi `order.status` là `delivered` hoặc `completed` và dòng nằm trong danh sách chờ; bấm mở `ReviewFormModal` (module [customer-reviews](./customer-reviews.md)). Lưu xong: làm mới danh sách chờ (nút biến mất) và tổng hợp ở trang sản phẩm; `1903` đưa sang `/reviews?tab=mine`; `1902` làm mới danh sách chờ. Danh sách chờ lỗi (kể cả thiếu quyền) thì không có nút nào, không báo lỗi. Danh sách đơn không có nút trên từng dòng vì cả thẻ là một link.

### 4.5 Liên quan

Đơn được tạo ở [checkout](./checkout.md) (sau khi đặt, `/checkout` chuyển sang trang thanh toán VietQR hoặc `/orders/<id>`); [account](./account.md) hiện tóm tắt 3 đơn gần nhất.

- **Đơn vị kích thước:** các số px trong doc này là giá trị ở gốc 16 px; trong code, chiều dài và cỡ chữ của module viết bằng `rem` (class `…-[…rem]`, token `--text-*` / `--space-*`, style inline `"…rem"`) nên lớn dần từ 1536 px tới 1920 px theo thang gốc `html` ([design-system](../platform/design-system.md) 4.3).
