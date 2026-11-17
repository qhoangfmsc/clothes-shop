# Luồng sống còn của toàn dự án

Danh sách những luồng mà nếu hỏng thì cửa hàng ngừng bán được hoặc người dùng mất dữ liệu/tiền. Mỗi module có spec riêng liệt kê luồng của nó (mục 6); file này là **bản đồ chung** để biết luồng nào đã có test bảo vệ và luồng nào còn trống. `—` ở cột Test nghĩa là chưa có test; đường dẫn đã ghi thì phải tồn tại (gate kiểm tra).

- **P0**: hỏng là mất doanh thu, tiền, phiên đăng nhập hoặc quyền truy cập. Phải có test tự động trước khi sửa module liên quan.
- **P1**: hỏng thì gây phiền nhưng có cách khác để hoàn thành việc.

| ID | Luồng | Tier | Module | Test |
|---|---|---|---|---|
| F-01 | Đăng nhập Google và khôi phục phiên khi tải trang | P0 | platform/auth | `tests/platform/auth/auth-context.test.tsx` |
| F-02 | Request có phiên tự làm mới token khi 401, các request đồng thời chỉ làm mới một lần | P0 | platform/auth | `tests/platform/auth/auth-api.test.ts` `tests/platform/auth/session-dedupe.test.ts` |
| F-03 | Hết phiên đưa giao diện về trạng thái chưa đăng nhập | P0 | platform/auth | `tests/platform/auth/auth-context.test.tsx` |
| F-04 | Trang đăng nhập hiển thị và chặn nút Google cho tới khi đồng ý điều khoản | P1 | platform/auth | `tests/platform/auth/login.e2e.ts` |
| F-05 | Lỗi từ BE thành `ApiError` với thông điệp và mã đúng | P1 | platform/data-layer | `tests/platform/data-layer/api-error.test.ts` |
| F-06 | Duyệt danh mục và xem sản phẩm | P0 | storefront/shop | — |
| F-07 | Thêm sản phẩm vào giỏ (khách và đã đăng nhập), giỏ giữ qua lần tải lại | P0 | storefront/cart | `tests/storefront/cart/quick-add.test.tsx` `tests/storefront/cart/cart-slice.test.ts` |
| F-08 | Checkout tạo đơn và hiển thị thanh toán | P0 | storefront/checkout | `tests/storefront/checkout/checkout-order.test.tsx` `tests/storefront/checkout/use-payment-session.test.tsx` `tests/storefront/checkout/payment-page.test.tsx` |
| F-09 | Số tiền hiển thị đúng tiền tệ theo ngôn ngữ, không tự quy đổi ở FE | P0 | platform/currency | `tests/platform/currency/money.test.ts` `tests/platform/currency/use-money.test.tsx` |
| F-10 | Đổi ngôn ngữ vi/en giữ nguyên trang đang xem | P1 | platform/i18n | — |
| F-11 | Xem đơn hàng của tôi và chi tiết đơn | P1 | storefront/customer-orders | `tests/storefront/customer-orders/orders-list.test.tsx` `tests/storefront/customer-orders/order-detail.test.tsx` `tests/storefront/customer-orders/order-cancel.test.tsx` |
| F-12 | Yêu cầu trả hàng cho đơn đủ điều kiện | P1 | storefront/customer-returns | `tests/storefront/customer-returns/new-return.test.tsx` `tests/storefront/customer-returns/order-return-card.test.tsx` |
| F-13 | Admin tạo/sửa/xóa sản phẩm và danh sách làm mới | P0 | admin/products | — |
| F-14 | Admin đổi trạng thái đơn hàng | P0 | admin/orders | — |
| F-15 | Admin xác nhận thanh toán và hoàn tiền | P0 | admin/payments | — |
| F-16 | Người không đủ quyền không vào được `/admin` | P0 | platform/auth | — |
| F-17 | Khách chưa đăng nhập vào trang riêng (tài khoản, giỏ, đơn, yêu thích) thì thấy màn chặn đăng nhập, không thấy nội dung | P0 | platform/auth | `tests/e2e/private-pages.e2e.ts` |
| F-18 | Tài khoản test đã đăng nhập vào được trang riêng, giữ phiên sau khi tải lại, access token cũ tự làm mới | P0 | platform/auth | `tests/e2e/signed-in.auth.e2e.ts` |
| F-19 | Giỏ hàng: đổi số lượng, xóa dòng, chọn dòng để mua và thấy tạm tính do BE báo giá; khách chỉ thấy màn chặn | P0 | storefront/cart | `tests/storefront/cart/cart-page.test.tsx` `tests/storefront/cart/cart-thunks.test.ts` `tests/storefront/cart/cart-sync.test.tsx` |
| F-20 | Yêu thích: thả tim, xem và bỏ khỏi danh sách; khách chỉ thấy màn chặn | P1 | storefront/wishlist | `tests/storefront/wishlist/wishlist-page.test.tsx` `tests/storefront/wishlist/wishlist-thunks.test.ts` |
