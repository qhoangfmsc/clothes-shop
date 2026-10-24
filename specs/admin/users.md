# Users admin (quản lý người dùng) — Tech spec — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-24 · **Trạng thái:** Implemented
> **Doc:** [admin/users](../../docs/admin/users.md) · **Test:** `tests/admin/users/`

## 1. Bối cảnh & mục tiêu

Danh sách tài khoản đăng nhập bằng Google, cho admin tra cứu khách, xem lịch sử mua và cấp hoặc thu hồi vai trò quản trị. Sai ở đây là một người lạ được cấp quyền admin, hoặc admin xem nhầm đơn của người khác. Module gồm `UsersContent.tsx` (bảng, cửa sổ người dùng với hai tab, đơn hàng chồng lên), `_common/{moduleSlice,types,constants}.ts` và `page.tsx`; dùng chung `OrderDetailPanel` và `SystemPasswordPrompt` của [ui-kit](../platform/ui-kit.md) và [auth](../platform/auth.md).

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Bảng người dùng: tìm, lọc vai trò và trạng thái, sắp xếp sáu cách | Đổi trạng thái hay quyền chi tiết: kiểu dữ liệu đã có nhưng màn hình chưa có điều khiển |
| Cửa sổ người dùng: tab đơn hàng (5 đơn mỗi trang, mở một đơn chồng lên), tab vai trò | Hiển thị đơn: thuộc [orders](./orders.md) và [ui-kit](../platform/ui-kit.md) |
| Câu hỏi mật khẩu hệ thống trước khi mở, quyền `USER_ADMIN_UPDATE` trên nút Xem | Chặn người không phải admin: thuộc [admin-shell](./admin-shell.md); ở đây chỉ kiểm BE từ chối thì không lộ gì |

## 3. Hợp đồng

- **Bảng.** `GET /api/admin/users?search&role&status&sort&page&limit` (mới nhất trước; sáu cách sắp xếp). Mỗi dòng: ảnh hoặc chữ cái đầu viết hoa của tên (không có tên thì của email), tên hoặc `—`, email, vai trò (vàng cho admin, xanh cho khách), trạng thái (xanh khi `active`, hồng khi khác; trạng thái lạ giữ nguyên chữ), ngày tham gia. Lọc vai trò và trạng thái. Nút Xem chỉ có với `USER_ADMIN_UPDATE`. Bảng trống nói "chưa có dữ liệu" hoặc "không phù hợp"; BE lỗi nói "không tải được" kèm "Thử lại".
- **Mở cửa sổ.** Bấm Xem luôn hỏi mật khẩu hệ thống, kể cả khi phiên admin vừa được mở khóa; chưa đúng hoặc đóng hộp hỏi thì không mở gì và không hỏi BE đơn hàng. Đúng thì mở khóa phiên 15 phút (dùng chung với cổng admin) và mở cửa sổ ở tab đơn hàng với vai trò hiện tại đã chọn. Kiểm quyền được làm lại trước khi hỏi (đọc người dùng hiện tại qua `ref` vì cột được ghi nhớ).
- **Tab đơn hàng.** `GET /api/admin/orders?userId=…&limit=5&page`; hiện số đơn, mỗi đơn có mã, số món (đơn không có dòng tính 0), ngày (ẩn dưới `sm`), trạng thái có màu riêng, tổng tiền theo ngôn ngữ. Trên 5 đơn thì có "Trang x / y" và nút trước/sau (trước tắt ở trang 1, sau tắt ở trang cuối, cả hai tắt khi đang tải). Lỗi tải = danh sách rỗng ("chưa có đơn"). Mở lại cửa sổ cho người khác thì quay về trang 1.
- **Đơn chồng lên.** Bấm một đơn: hiện ngay bằng dữ liệu của dòng rồi `GET /api/admin/orders/:id?userId=…` lấy đủ; lỗi thì giữ dữ liệu dòng. Đóng bằng nút X hoặc bấm vùng tối; bấm bên trong không đóng.
- **Tab vai trò.** Chọn `user` hoặc `admin`; Lưu chỉ bật khi vai trò khác hiện tại và không đang lưu (đang lưu hiện "Đang lưu…"). `PATCH /api/admin/users/:id {role}`; thành công: toast, vai trò mới ở lại trong cửa sổ, bảng tải lại. Lỗi: toast lời BE hoặc lời mặc định, Lưu vẫn bật.

## 4. Thiết kế

```
page.tsx ──► UsersContent ──► DataTable ──► fetchUserList (thunk) ──► authApi
UsersContent ──► useSystemPasswordPrompt (auth) ──► cửa sổ người dùng ──► authApi (đơn hàng) · updateUser (thunk) ──► authApi
cửa sổ người dùng ──► OrderDetailPanel (ui-kit) · RoleGuard (USER_ADMIN_UPDATE)
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Quyền trước, mật khẩu sau** | Không bao giờ hỏi mật khẩu cho một việc không được phép làm | Hỏi trước rồi mới kiểm quyền |
| **Mật khẩu hệ thống hỏi lại mỗi lần mở hồ sơ** | Mở hồ sơ để đổi vai trò là việc nhạy cảm; hộp hỏi dùng chung với cổng admin (một nơi, một TTL) | Tin phiên đã mở khóa |
| **Hiện ngay dữ liệu của dòng, tải đầy đủ sau** (đơn chồng lên) | Admin không phải chờ; lỗi tải thêm không làm mất đơn | Chờ rồi mới mở |
| **Đọc người dùng hiện tại qua ref** | Cột được ghi nhớ nên hàm chạy từ lần vẽ cũ | Bỏ ghi nhớ cột |
| **Lỗi tải đơn thành danh sách rỗng** | Cửa sổ vẫn dùng được để đổi vai trò khi BE đơn hàng lỗi | Báo lỗi và chặn cửa sổ |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit, auth (quyền, mật khẩu hệ thống), data layer (`authApi`). Không module nào phụ thuộc ngược vào đây. Danh sách đơn của một người lấy thẳng bằng `authApi` trong thành phần, không qua kho. Kho `users` giữ danh sách, tổng, cờ đang tải và đang cập nhật.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Một thành phần giữ cả bảng và cửa sổ: chấp nhận được vì cửa sổ chỉ có hai tab nhỏ; tách khi thêm điều khiển trạng thái hay quyền |
| O | Thêm cách sắp xếp hay bộ lọc = thêm vào hằng số và bản dịch |
| L | `OrderDetailPanel` dùng được ở đây và ở trang đơn hàng |
| I | Kho chỉ lộ danh sách và `updateUser` |
| D | Thành phần phụ thuộc thunk, hook và `authApi`, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `admin.users`; vai trò và trạng thái qua `common`; lỗi qua `useErrorMessage`; toast qua `useToast`. Test dùng `renderApp` với danh tính thật, `adminWith(...)` cho một quyền và `usersApi` (BE giả: danh sách, đơn của người, đổi vai trò) trong `users-kit.tsx`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì không lộ ai; việc chặn trang thuộc admin-shell) · permission = có (nút Xem cần `USER_ADMIN_UPDATE`)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| AUS-1 | Bảng: mở mới nhất trước kèm tổng; mỗi dòng có ảnh hoặc chữ cái đầu, tên, email, vai trò, trạng thái, ngày; tìm, sắp xếp sáu cách, lọc vai trò và trạng thái, tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/users/users-list.test.tsx` |
| AUS-2 | Nút Xem chỉ cho admin có quyền cập nhật người dùng | đúng | admin thiếu quyền | component | `tests/admin/users/users-list.test.tsx` |
| AUS-3E | Bảng trống nói theo bộ lọc; BE lỗi báo không tải được; BE từ chối khách (401) | lỗi | khách | component | `tests/admin/users/users-list.test.tsx` |
| AUS-3U | BE từ chối người mua đã đăng nhập (403): không lộ ai | lỗi | user | component | `tests/admin/users/users-list.test.tsx` |
| AUS-4 | Hỏi mật khẩu hệ thống trước khi mở: chưa đúng thì không mở và không hỏi đơn; sai thì hỏi tiếp; đúng thì mở và mở khóa phiên; luôn hỏi lại kể cả khi vừa mở khóa; đóng hộp hỏi thì không mở | đúng | admin đủ quyền | component | `tests/admin/users/user-modal.test.tsx` |
| AUS-5 | Cửa sổ: đề email, mở ở tab đơn hàng, đóng bằng X hoặc vùng tối (bấm trong thì không), mở cho người khác thì bắt đầu lại | đúng | admin đủ quyền | component | `tests/admin/users/user-modal.test.tsx` |
| AUS-6 | Tab đơn hàng: hỏi đúng người, 5 đơn mỗi trang, số đơn, số món, trạng thái có màu, tổng tiền theo ngôn ngữ, phân trang với nút tắt đúng lúc, dòng đang tải | đúng | admin đủ quyền | component | `tests/admin/users/user-modal.test.tsx` |
| AUS-6E | Tab đơn hàng khi không có đơn hoặc BE lỗi: hiện "chưa có đơn", số 0 | lỗi | admin đủ quyền | component | `tests/admin/users/user-modal.test.tsx` |
| AUS-7 | Đơn chồng lên: hiện ngay rồi dữ liệu đầy đủ hỏi kèm người dùng; lỗi tải thêm giữ dữ liệu dòng; bấm trong không đóng; đóng bằng X hoặc vùng tối | đúng | admin đủ quyền | component | `tests/admin/users/user-modal.test.tsx` |
| AUS-8 | Tab vai trò: hai lựa chọn với vai trò hiện tại; Lưu chỉ bật khi đổi; gửi đúng vai trò, toast, vai trò mới ở lại, bảng tải lại; nhãn đang lưu | đúng | admin đủ quyền | component | `tests/admin/users/user-modal.test.tsx` |
| AUS-8E | Đổi vai trò bị từ chối: lời BE hoặc lời mặc định, Lưu vẫn bật | lỗi | admin đủ quyền | component | `tests/admin/users/user-modal.test.tsx` |
| AUS-9 | Kho Redux và hằng số: tham số hỏi, danh sách và tổng, thân gửi đi, cờ đang tải và đang cập nhật, lỗi, sáu cách sắp xếp, hai vai trò và hai trạng thái | đúng | — | unit | `tests/admin/users/users-slice.test.ts` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Cấp nhầm quyền admin | Phải qua mật khẩu hệ thống và quyền `USER_ADMIN_UPDATE`; BE vẫn là chốt chặn thật (AUS-4, AUS-2) |
| Đổi trang đơn hàng nhanh có thể hiện kết quả cũ | Chưa có chặn cuộc gọi cũ; nút trước/sau tắt khi đang tải nên khó xảy ra (AUS-6) |
| Mã đơn không được mã hóa trong địa chỉ chi tiết | Mã đơn do BE sinh, không có ký tự đặc biệt; nếu đổi cách sinh mã phải mã hóa (AUS-7) |
| Cửa sổ chưa có vai trò hộp thoại, chưa đóng bằng Escape | Ghi nhận; thuộc việc làm lại cửa sổ bằng `ModalShell` |

Thay đổi nhìn thấy được: không (không đổi hành vi nhìn thấy).

## 8. Lịch sử thay đổi

- 2026-10-24 · Viết spec và test cho toàn module (batch 4), kiểm thử đột biến. Không đổi code của module.
