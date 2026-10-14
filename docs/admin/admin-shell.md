# Admin shell (layout, sidebar, cổng vào)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/*` · **Cập nhật:** 2026-10-14
> **Code:** `src/app/[locale]/(admin)/layout.tsx` · `(admin)/AdminLayoutClient.tsx` · `(admin)/admin/page.tsx` · `src/app/[locale]/_components/PendingCountsProvider.tsx`

## 1. Tóm tắt module

Khung chung của toàn bộ khu quản trị: kiểm tra quyền vào khu admin, mật khẩu hệ thống, sidebar điều hướng theo quyền, thanh breadcrumb và vùng nội dung cuộn riêng. Mọi module admin (`dashboard`, `products`, `categories`, `collections`, `orders`, `users`, `reviews`, `analytics`, `site-config`, `media`) render bên trong khung này.

## 2. Phục vụ gì / việc cần làm

- Chỉ người có quyền mới vào được `/admin`; người dùng thường thấy màn "cần quyền admin".
- Một người dùng có quyền hạn chế chỉ thấy các mục mình được phép, và bị chặn nếu gõ thẳng URL của mục khác.
- Chặn thêm một lớp bằng mật khẩu hệ thống (15 phút).
- Cho admin điều hướng nhanh giữa các module, biết mình đang ở đâu, và đăng xuất.

## 3. Submodule & chức năng hiện có

| Submodule | Chức năng |
|---|---|
| Layout server | Kiểm tra locale, `ScopedMessages scope="admin"`, metadata `admin.shell.meta` (`noindex`) |
| `AdminGuard` | Chặn người không có quyền vào admin |
| Kiểm tra quyền theo route | So khớp `pathname` với mục sidebar → yêu cầu permission tương ứng |
| `AdminPasswordGate` | Nhập mật khẩu hệ thống, TTL 15 phút |
| Sidebar | Logo, Dashboard, bốn nhóm điều hướng, thông tin người dùng, đăng xuất; cột cố định từ `lg`, drawer trượt ra dưới `lg` |
| Badge "việc cần xử lý" | `PendingCountsProvider` (trong `AdminPasswordGate`, nên chưa hỏi BE trước khi nhập mật khẩu hệ thống) gọi `GET /api/admin/pending-counts` và chia sẻ số qua `usePendingCounts()`; menu hiện badge ở Orders, Payments, Refunds, Returns, Reviews |
| Breadcrumb | Dựng từ các segment của URL |
| Màn từ chối | `AccessDeniedScreen` (thiếu quyền admin hoặc thiếu quyền route) |

## 4. Chi tiết

### 4.1 Thứ tự chặn trong `AdminLayoutClient`

1. `AdminGuard`: `canAccessAdmin(user)` (role `admin` hoặc có permission) — sai → `AccessDeniedScreen` (`denied.adminRequired`).
2. `routeAllowed`: tìm mục sidebar khớp `pathname` (bằng hoặc bắt đầu bằng `href/`); nếu mục có `permission` mà user thiếu → `AccessDeniedScreen` (`denied.route`).
3. `AdminPasswordGate` bọc nội dung. Thứ tự này đảm bảo người không đủ quyền không bị hỏi mật khẩu (xem [auth](../platform/auth.md) mục 4.7).

`AccessDeniedScreen` có nút "Quay lại cửa hàng" (`/`).

### 4.2 Sidebar (nền `--color-obsidian`, cuộn riêng)

- **Từ `lg` (≥ 1024)**: cột cố định rộng 240 px (`z-20`). **Dưới `lg`**: drawer off-canvas rộng `min(280px, 85vw)` (`z-40`), trượt từ trái 300 ms (`translate-x`, bỏ chuyển động khi `prefers-reduced-motion`); khi đóng có `invisible` nên không focus được bằng bàn phím. Mở bằng nút `menu` ở thanh trên; đóng bằng nút X trong drawer (`closeMenu`), bấm nền tối (`z-30`), phím Esc, hoặc khi chuyển trang. Trạng thái mở lưu dạng `menuPath` (pathname lúc mở) nên đổi `pathname` tự đóng, không cần effect. Mở thì focus vào nút X; đóng bằng nút/Esc trả focus về nút `menu`. Chiều cao `h-dvh`, chân drawer chừa `env(safe-area-inset-bottom)`; link và nút đăng xuất cao tối thiểu 44 px trên thiết bị cảm ứng (`pointer-coarse:min-h-11`).

- Đầu: link `/` với logo "✦ DOOVAN" và nhãn `ADMIN` (`badge`).
- **Dashboard** (`/admin`) luôn hiện.
- Bốn nhóm theo thứ tự trên xuống; mục chỉ hiện khi user có permission (nhóm rỗng ẩn):

| Nhóm (`nav.groups.*`) | Mục | Route | Permission cần |
|---|---|---|---|
| `orders` "Quản lý đơn hàng" | Orders | `/admin/orders` | `ORDER_ADMIN_VIEW` |
| | Payments | `/admin/payments` | `PAYMENT_ADMIN_VIEW` |
| | Returns | `/admin/returns` | `RETURN_ADMIN_VIEW` |
| | Refunds | `/admin/refunds` | `PAYMENT_ADMIN_VIEW` |
| `audience` "Khách hàng & Thống kê" | Users | `/admin/users` | `USER_ADMIN_VIEW` |
| | Reviews | `/admin/reviews` | `REVIEW_ADMIN_VIEW` |
| | Analytics | `/admin/analytics` | không yêu cầu |
| `catalog` "Danh mục sản phẩm" | Products | `/admin/products` | `PRODUCT_VIEW` |
| | Categories | `/admin/categories` | `CATEGORY_VIEW` |
| | Collections | `/admin/collections` | `COLLECTION_VIEW` |
| `system` "Cấu hình hệ thống" | Site config | `/admin/site-config` | `SITE_CONFIG_VIEW` |
| | Media | `/admin/media` | không yêu cầu |

- **Badge việc cần xử lý** (`PendingBadge`): ở cuối mục Orders (`orders`), Payments (`payments`), Refunds (`refunds`), Returns (`returns`), Reviews (`reviews`: đánh giá đang hiển thị chưa có phản hồi) — pill vàng nhạt (không dùng màu cảnh báo), ẩn khi giá trị là 0 **hoặc thiếu key** (key vắng = tài khoản không có quyền xem mục đó, khác với 0), `99+` khi lớn hơn 99. Chú thích dạng "3 đơn cần xử lý" nằm ở `title` (rê chuột) và ở chữ ẩn `sr-only` cho trình đọc màn hình; trên cảm ứng sidebar luôn hiện chữ của mục nên không cần nhấn giữ. Nút menu ở thanh trên (dưới `lg`) có một chấm vàng (`PendingMenuDot`) khi có mục nào đang có việc, vì drawer đóng thì không thấy badge.
- **Nguồn số** (`PendingCountsProvider`, SWR): `GET /api/admin/pending-counts` → `{ data: { orders?, payments?, refunds?, returns?, reviews? } }`. Chỉ nhận số hữu hạn ≥ 0 cho đúng năm key. Gọi khi vào admin, làm mới mỗi 60 giây chỉ khi tab hiển thị (`refreshWhenHidden: false`), khi tab/cửa sổ trở lại foreground hoặc có mạng lại, và sau mỗi thao tác ghi thành công vào `/api/admin/*` (`authApi` phát `notifyAdminMutation()`, provider gộp các lần phát trong 300 ms thành một lần gọi). Lỗi mạng hoặc 5xx: giữ số cũ, không toast, không tự thử lại; 403: coi như không có key nào (ẩn mọi badge, không báo lỗi); 401 theo luồng đăng nhập lại của `authApi`. Các trang dùng cùng một nguồn này cho khung giải thích và số trên tab (xem [orders](./orders.md), [payments](./payments.md), [refunds](./refunds.md), [returns](./returns.md), [reviews](./reviews.md)).
- Mục đang chọn: `pathname === href` hoặc `pathname.startsWith(href)` (chữ vàng + vạch trái).
- Cuối: tên (hoặc email), email, nhãn role (`useRoleLabel`), nút Đăng xuất → `logout()` rồi `router.replace("/login")`.

### 4.3 Vùng chính

`lg:ml-[240px]` (dưới `lg` nội dung chiếm toàn chiều rộng), `h-dvh`, không cuộn ở ngoài; thanh breadcrumb cố định ở trên (mỗi segment URL, ưu tiên nhãn `admin.shell.breadcrumb.<segment>`, không có thì hiện nguyên segment; không xuống dòng, cuộn ngang trong thanh khi dài) với nút `menu` (`lg:hidden`, 44 × 44 px, `aria-expanded`, `aria-controls="admin-sidebar"`); nội dung cuộn trong khung đệm `p-4` → `sm:p-6` → `lg:p-[var(--space-8)]`. Thanh trên đệm `px-4` → `sm:px-6` → `lg:px-[var(--space-8)]`. `AccessDeniedScreen` dùng `min-h-dvh` và đệm nhỏ hơn dưới `sm`.

### 4.4 Ghi chú hiện trạng

- Quyền cho mục Products/Categories/Collections của sidebar là quyền **xem** (`*_VIEW`); nút Thêm/Sửa/Xóa trong từng trang vẫn bọc `RoleGuard` theo `*_CREATE/UPDATE/DELETE`. Nhân viên không phải admin cần được cấp `*_VIEW` (qua `PATCH /api/admin/users/:id`) mới thấy mục và vào được route.
- Analytics và Media không gắn permission riêng ở sidebar; bảo vệ nằm ở phía BE/route handler (Analytics tự kiểm tra role admin ở `/api/analytics`).
- Trang `admin/page.tsx` render `DashboardContent` — xem [dashboard](./dashboard.md).

### 4.5 i18n

`admin.shell` (`meta`, `nav`, `badge`, `logout`, `menu`, `closeMenu`, `denied`, `breadcrumb`), `admin.components.guards`, `common.role`.
