# Users (quản lý người dùng)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/users` · **Cập nhật:** 2026-10-18
> **Code:** `(admin)/admin/users/` — `UsersContent.tsx`, `_common/{moduleSlice,types,constants}.ts` · dùng `_components/OrderDetailPanel.tsx`, `SystemPasswordPrompt.tsx`
> **i18n:** `admin.users`, `common.role`, `common.status`
> **Redux slice:** `state.users`

## 1. Tóm tắt module

Danh sách tài khoản (đăng nhập bằng Google) với modal xem đơn hàng của từng người và đổi role (`user` ↔ `admin`).

## 2. Phục vụ gì / việc cần làm

Cho admin tra cứu khách hàng, xem lịch sử mua và cấp/thu hồi quyền admin. Thao tác nhạy cảm (mở hồ sơ để đổi role) được chặn thêm bằng mật khẩu hệ thống.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Danh sách | Search, lọc role/status, sort, phân trang 25/trang |
| Modal người dùng | Tab **Orders** (đơn của user, 5 đơn/trang) và tab **Role** |
| Chi tiết đơn lồng | Bấm một đơn mở `OrderDetailPanel` xếp chồng trên modal (`z-110`) |
| Đổi role | Chọn role, lưu |
| Nhắc mật khẩu hệ thống | Nút "View" yêu cầu nhập mật khẩu hệ thống (dùng chung TTL 15 phút) |

## 4. Chi tiết

### 4.1 Bảng

- Cột: **User** (avatar ảnh Google hoặc chữ cái đầu + tên), **Email**, **Role** (badge vàng cho admin / xanh cho user; nhãn `useRoleLabel`), **Status** (sage `active` / hồng khác), **Joined** (`short`), **Actions** (nút "View", bọc `RoleGuard USER_ADMIN_UPDATE`).
- Lọc `role` (`USER_ROLES`) và `status` (`USER_STATUSES`). Sort (`USER_SORT_OPTIONS`): `-createdAt` (mặc định), `createdAt`, `name`, `-name`, `email`, `-email`.
- `fetchUserList` → `GET /api/admin/users?search&role&status&sort&page&limit`.

### 4.2 Mở modal ("View")

`handleView(user)`: (1) kiểm tra `hasPermission(currentUser, USER_ADMIN_UPDATE)` — không đủ quyền thì thoát, **không** hỏi mật khẩu; (2) `await requestPassword()` (xem [auth](../platform/auth.md) 4.7); (3) `openEdit(user)`. Người dùng hiện tại được đọc qua `ref` vì `columns` được memo hóa nên callback chạy từ một lần render cũ.

### 4.3 Tab Orders

- Tải `GET /api/admin/orders?userId=<id>&page&limit=5` (dựng bằng `buildListQuery({ page, limit: 5 }, { userId })`), phân trang trước/sau, hiển thị "trang x/y" khi > 5 đơn.
- Mỗi đơn: mã, số món, ngày (ẩn trên màn nhỏ), badge trạng thái (`useOrderStatusLabel`), tổng tiền (`MoneyText`, theo ngôn ngữ). Bấm → `GET /api/admin/orders/:id?userId=<id>` (giữ dữ liệu cũ nếu lỗi) → `OrderDetailPanel` chồng lên.
- Lỗi tải danh sách đơn bị nuốt thành danh sách rỗng (hiện trạng thái "không có đơn").

### 4.4 Tab Role

Select `USER_ROLES`; nút "Lưu" chỉ bật khi role đã đổi và không đang cập nhật. `updateUser` → `PATCH /api/admin/users/:id` với `{ role }`. Thành công: toast `roleUpdated`, cập nhật role trong modal và refresh bảng; lỗi: toast `roleFailed` qua `useErrorMessage`.

### 4.5 Kiểu dữ liệu

`AdminUser { id, email, name | null, image | null, provider | null, role, status, permissions?: number[], createdAt, updatedAt }`, `AdminUserUpdate { role?, status?, permissions?: number[] }` (trong `use-admin-api.ts`). Module: `UserListParams extends ListParams { role?, status? }`, `UserUpdateData`, `UserListResult`.

### 4.6 Hiện trạng

- UI hiện chỉ đổi **role**. Kiểu `UserUpdateData` đã có `status` và `permissions` (mã số) nhưng chưa có điều khiển trên màn hình.
- Danh sách đơn của user lấy trực tiếp bằng `authApi` trong component (không qua slice).
- Hai khung modal (sửa user `z-100`, chi tiết đơn `z-110`) tự dựng, không dùng `ModalShell`: overlay `p-3` → `sm:p-6`, chiều cao tối đa `calc(100dvh - 1.5rem)` (từ `sm`: `85dvh`).

- **Đơn vị kích thước:** các số px trong doc này là giá trị ở gốc 16 px; trong code, chiều dài và cỡ chữ của module viết bằng `rem` (class `…-[…rem]`, token `--text-*` / `--space-*`, style inline `"…rem"`) nên lớn dần từ 1536 px tới 1920 px theo thang gốc `html` ([design-system](../platform/design-system.md) 4.3).
