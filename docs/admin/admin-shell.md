# Admin shell (layout, sidebar, cổng vào)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/*` · **Cập nhật:** 2026-10-12
> **Code:** `src/app/[locale]/(admin)/layout.tsx` · `(admin)/AdminLayoutClient.tsx` · `(admin)/admin/page.tsx`

## 1. Tóm tắt module

Khung chung của toàn bộ khu quản trị: kiểm tra quyền vào khu admin, mật khẩu hệ thống, sidebar điều hướng theo quyền, thanh breadcrumb và vùng nội dung cuộn riêng. Mọi module admin (`dashboard`, `products`, `categories`, `collections`, `orders`, `users`, `analytics`, `site-config`, `media`) render bên trong khung này.

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
| Sidebar | Logo, Dashboard, ba nhóm điều hướng, thông tin người dùng, đăng xuất |
| Breadcrumb | Dựng từ các segment của URL |
| Màn từ chối | `AccessDeniedScreen` (thiếu quyền admin hoặc thiếu quyền route) |

## 4. Chi tiết

### 4.1 Thứ tự chặn trong `AdminLayoutClient`

1. `AdminGuard`: `canAccessAdmin(user)` (role `admin` hoặc có permission) — sai → `AccessDeniedScreen` (`denied.adminRequired`).
2. `routeAllowed`: tìm mục sidebar khớp `pathname` (bằng hoặc bắt đầu bằng `href/`); nếu mục có `permission` mà user thiếu → `AccessDeniedScreen` (`denied.route`).
3. `AdminPasswordGate` bọc nội dung. Thứ tự này đảm bảo người không đủ quyền không bị hỏi mật khẩu (xem [auth](../platform/auth.md) mục 4.7).

`AccessDeniedScreen` có nút "Quay lại cửa hàng" (`/`).

### 4.2 Sidebar (240 px, cố định, cuộn riêng, nền `--color-obsidian`)

- Đầu: link `/` với logo "✦ DOOVAN" và nhãn `ADMIN` (`badge`).
- **Dashboard** (`/admin`) luôn hiện.
- Ba nhóm; mục chỉ hiện khi user có permission (nhóm rỗng ẩn):

| Nhóm (`nav.groups.*`) | Mục | Route | Permission cần |
|---|---|---|---|
| `catalog` | Products | `/admin/products` | `PRODUCT_VIEW` |
| | Categories | `/admin/categories` | `CATEGORY_VIEW` |
| | Collections | `/admin/collections` | `COLLECTION_VIEW` |
| `management` | Orders | `/admin/orders` | `ORDER_ADMIN_VIEW` |
| | Users | `/admin/users` | `USER_ADMIN_VIEW` |
| | Analytics | `/admin/analytics` | không yêu cầu |
| `system` | Site config | `/admin/site-config` | `SITE_CONFIG_VIEW` |
| | Media | `/admin/media` | không yêu cầu |

- Mục đang chọn: `pathname === href` hoặc `pathname.startsWith(href)` (chữ vàng + vạch trái).
- Cuối: tên (hoặc email), email, nhãn role (`useRoleLabel`), nút Đăng xuất → `logout()` rồi `router.replace("/login")`.

### 4.3 Vùng chính

`ml-[240px]`, `h-screen`, không cuộn ở ngoài; thanh breadcrumb cố định ở trên (mỗi segment URL, ưu tiên nhãn `admin.shell.breadcrumb.<segment>`, không có thì hiện nguyên segment); nội dung cuộn trong `p-[var(--space-8)]`. Có nút menu (`menu`) ẩn (`hidden`) — chưa có sidebar responsive: bố cục admin dành cho màn hình lớn.

### 4.4 Ghi chú hiện trạng

- Quyền cho mục Products/Categories/Collections của sidebar là quyền **xem** (`*_VIEW`); nút Thêm/Sửa/Xóa trong từng trang vẫn bọc `RoleGuard` theo `*_CREATE/UPDATE/DELETE`. Nhân viên không phải admin cần được cấp `*_VIEW` (qua `PATCH /api/admin/users/:id`) mới thấy mục và vào được route.
- Analytics và Media không gắn permission riêng ở sidebar; bảo vệ nằm ở phía BE/route handler (Analytics tự kiểm tra role admin ở `/api/analytics`).
- Trang `admin/page.tsx` render `DashboardContent` — xem [dashboard](./dashboard.md).

### 4.5 i18n

`admin.shell` (`meta`, `nav`, `badge`, `logout`, `menu`, `denied`, `breadcrumb`), `admin.components.guards`, `common.role`.
