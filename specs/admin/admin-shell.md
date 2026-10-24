# Admin shell (khung quản trị) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-23 · **Trạng thái:** Implemented
> **Doc:** [admin/admin-shell](../../docs/admin/admin-shell.md) · **Test:** `tests/admin/admin-shell/`

## 1. Bối cảnh & mục tiêu

Mọi trang quản trị chạy bên trong một khung: kiểm tra ai được vào, hỏi mật khẩu hệ thống, dựng thanh bên theo quyền, hiện số việc cần xử lý. Khung sai thì hoặc người không có quyền thấy được dữ liệu của cửa hàng, hoặc nhân viên bị chặn nhầm khỏi chính việc của họ. Module gồm `(admin)/layout.tsx` (máy chủ: ngôn ngữ, tiêu đề, không cho index), `(admin)/AdminLayoutClient.tsx` (thanh bên, ngăn kéo, breadcrumb, màn từ chối) và `PendingCountsProvider.tsx` (số việc cần xử lý).

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho bốn danh tính (khách, người mua, admin đủ quyền, admin thiếu quyền), kèm kiểm thử đột biến; ghi các điểm đáng ngờ ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Thứ tự chặn: đăng nhập và quyền admin → quyền của route → mật khẩu hệ thống | Logic của `AdminGuard`, `AdminPasswordGate`, `canAccessAdmin`: thuộc [auth](../platform/auth.md), ở đây chỉ kiểm cách khung ghép chúng |
| Thanh bên theo quyền, ngăn kéo điện thoại, breadcrumb, màn từ chối | Nội dung từng trang admin: thuộc module của trang đó |
| `PendingCountsProvider`: nguồn, đọc số an toàn, làm mới | Cách từng trang dùng số đếm (thông báo, tab): thuộc module của trang |
| `layout.tsx` với `next-intl/server` giả | Dựng thật bằng Next.js: do Playwright |

## 3. Hợp đồng

- **Thứ tự chặn.** (1) Chưa có phiên hoặc không `canAccessAdmin` → màn "cần quyền quản trị" (`denied.adminRequired`) và không gì khác: không hỏi mật khẩu, không gọi BE. (2) Mục thanh bên khớp `pathname` (bằng `href` hoặc bắt đầu bằng `href/`) mà người dùng thiếu quyền → màn "từ chối truy cập" (`denied.route`). (3) `AdminPasswordGate` bao nội dung; trong cổng mới gắn `PendingCountsProvider`, nên BE chưa bị hỏi trước khi nhập mật khẩu. Trong lúc xác định phiên chỉ có chữ chờ. Cả hai màn từ chối có nút về cửa hàng (`/`).
- **Thanh bên.** Tổng quan luôn có; bốn nhóm (đơn hàng, khách hàng và thống kê, danh mục sản phẩm, hệ thống); mục chỉ hiện khi người dùng có quyền xem của mục (Analytics và Media không cần quyền); nhóm không còn mục nào thì ẩn. Mục đang xem có vạch trái màu vàng (tổng quan chỉ khi đúng `/admin`). Cuối thanh: tên (hoặc email), email, nhãn vai trò, nút đăng xuất → `logout()` rồi `router.replace("/login")`.
- **Ngăn kéo (dưới `lg`).** Đóng ban đầu và ẩn khỏi bàn phím; nút menu mở (`aria-expanded`, `aria-controls="admin-sidebar"`), focus chuyển vào nút đóng; đóng bằng nút X, vùng tối, Escape hoặc khi đổi trang, rồi focus trả về nút menu.
- **Breadcrumb.** Mỗi phần của địa chỉ; có nhãn `breadcrumb.<phần>` thì dùng, không thì giữ nguyên; phần cuối đậm.
- **Số việc cần xử lý** (`GET /api/admin/pending-counts` → `{ data: { orders?, payments?, refunds?, returns?, reviews? } }`): chỉ nhận số hữu hạn ≥ 0 cho năm khóa đó; khóa vắng nghĩa là tài khoản không được xem mục đó (không phải 0). Nhãn ở cuối mục (ẩn khi 0 hoặc vắng, `99+` khi > 99, có `title` và chữ `sr-only`), chấm trên nút menu khi có việc. Hỏi khi vào, mỗi 60 giây khi tab hiện, khi tab hoặc mạng trở lại, và sau mỗi lần ghi thành công vào `/api/admin/*` (gộp các lần trong 300 ms). 403 → không nhãn nào, không lỗi; mạng hoặc 5xx → giữ số cũ, không toast, không thử lại.
- **Máy chủ.** Ngôn ngữ lạ → không tìm thấy; tiêu đề `admin.shell.meta.title — DOOVAN`, `robots: noindex, nofollow`; chỉ gửi bản dịch dùng chung và của admin.

## 4. Thiết kế

```
layout.tsx (máy chủ) ──► ScopedMessages(admin) ──► AdminLayoutClient
AdminLayoutClient ──► AdminGuard ──► (routeAllowed) ──► AdminPasswordGate ──► PendingCountsProvider ──► thanh bên + trang
PendingBadge / PendingMenuDot ──► usePendingCounts()
authApi (ghi thành công vào /api/admin/*) ──► notifyAdminMutation ──► PendingCountsProvider.refresh
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Thứ tự chặn cố định: quyền → quyền route → mật khẩu** | Người không đủ quyền không bao giờ bị hỏi mật khẩu hay bị gọi BE | Hỏi mật khẩu trước |
| **Dữ liệu điều hướng khai báo** (`NAV_GROUPS`) dùng cho cả thanh bên và kiểm tra route | Mục hiện ra và trang vào được luôn cùng một luật quyền | Hai danh sách riêng |
| **Pub/sub** (`onAdminMutation`/`notifyAdminMutation`) giữa `authApi` và bộ đếm | `authApi` không biết ai quan tâm; bộ đếm tự làm mới sau mỗi thao tác ghi | Mỗi trang tự gọi làm mới |
| **Context cho số đếm**, giá trị mặc định rỗng | Trang dùng được không cần khung (test, tương lai) | Bắt buộc có provider |
| **Trạng thái ngăn kéo là đường dẫn đã mở** (`menuPath === pathname`) | Đổi trang tự đóng, không cần effect | `useEffect` đóng khi `pathname` đổi |
| **Giữ số cũ khi lỗi** (SWR `keepPreviousData`, không thử lại) | Số nhảy về 0 vì mạng chập chờn làm admin tưởng hết việc | Xóa số khi lỗi |

### Kiến trúc

`layout.tsx` (máy chủ) chỉ lo ngôn ngữ và metadata rồi giao cho `AdminLayoutClient`. Phụ thuộc một chiều: khung → auth (`AdminGuard`, `AdminPasswordGate`, `permissions`) → data layer (`authApi`); các trang admin phụ thuộc `usePendingCounts` chứ khung không biết trang nào. Quyền dùng chung với từng trang qua `lib/permissions`.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `layout.tsx` lo máy chủ; `AdminLayoutClient` lo khung; `PendingCountsProvider` lo số đếm |
| O | Thêm mục menu = thêm một phần tử vào `NAV_GROUPS` (kèm quyền và khóa đếm); thêm loại việc = thêm vào `PENDING_COUNT_KEYS` |
| L | `PendingBadge` và `PendingMenuDot` dùng cùng hợp đồng `usePendingCounts` |
| I | Trang chỉ cần `counts` và `refresh` |
| D | Khung phụ thuộc `authApi` và `onAdminMutation` qua hàm, test thay API bằng MSW |

### Conventions

Chuỗi qua `admin.shell`; kích thước `rem`; điều khiển 44px trên cảm ứng (`pointer-coarse:min-h-11`). Test dùng `renderApp` với danh tính thật và `tests/_support/admin.ts` (`unlockSystem`).

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị chặn, admin vào được) · permission = có (admin đủ quyền thấy mọi mục; admin thiếu quyền chỉ thấy mục được phép và bị từ chối khi gõ thẳng địa chỉ trang khác)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ADM-1 | Vào khung: admin đủ quyền thấy trang, thanh bên và vùng nội dung | đúng | admin đủ quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-1P | Vào khung: admin thiếu quyền thấy trang được phép (tổng quan, đơn hàng, các mục không cần quyền, trang mới) | đúng | admin thiếu quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-1G | Khách bị chặn bằng màn "cần quyền quản trị" có đường về cửa hàng; không hỏi mật khẩu, không gọi BE | đúng | khách | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-1U | Người mua hàng đã đăng nhập bị chặn như khách, không bị hỏi mật khẩu hệ thống | đúng | user | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-1E | Đang xác định phiên chỉ có chữ chờ, không nháy màn từ chối | lỗi | admin đủ quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-2 | Admin thiếu quyền gõ thẳng địa chỉ trang không được phép: màn "từ chối truy cập", không hỏi mật khẩu, không gọi BE; tên trang chỉ bắt đầu giống mục menu không bị nhầm | đúng | admin thiếu quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-3 | Mật khẩu hệ thống: hỏi trước mọi thứ, mở khung khi đúng rồi mới gọi BE, không hỏi lại khi còn hiệu lực, hỏi lại khi đổi trang sau 15 phút | đúng | admin đủ quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-3E | Hủy hộp mật khẩu đưa về trang chủ và không hiện gì của khu admin | lỗi | admin đủ quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-4 | Thanh bên của admin đủ quyền: logo, đủ mục theo nhóm, đánh dấu trang hiện tại, thông tin người dùng, đăng xuất về trang đăng nhập, tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-4P | Thanh bên của admin thiếu quyền: chỉ các mục được phép và mục không cần quyền, nhóm rỗng bị ẩn | đúng | admin thiếu quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-5 | Ngăn kéo menu trên điện thoại: đóng ban đầu và ẩn khỏi bàn phím, mở bằng nút menu, đóng bằng X, vùng tối, Escape hoặc đổi trang, trả focus đúng chỗ | đúng | admin đủ quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-6 | Breadcrumb: tên từng phần theo ngôn ngữ, phần lạ giữ nguyên, phần cuối đậm | đúng | admin đủ quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-6N | Số việc cần xử lý: nhãn ở cuối mục, chữ cho trình đọc màn hình, 99+, chấm trên nút menu, làm mới một lần sau chuỗi thao tác ghi, tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-6E | Số việc cần xử lý khi không lấy được: 403 không có nhãn nào, 500 hoặc mất mạng giữ số cũ hoặc không hiện, không báo lỗi; giá trị sai bị bỏ | lỗi | admin thiếu quyền | component | `tests/admin/admin-shell/shell.test.tsx` |
| ADM-7 | Layout máy chủ: tiêu đề kèm tên thương hiệu và chặn công cụ tìm kiếm | đúng | — | unit | `tests/admin/admin-shell/layout.test.tsx` |
| ADM-7E | Layout máy chủ: ngôn ngữ lạ là không tìm thấy; chỉ gửi bản dịch dùng chung và của admin | lỗi | — | unit | `tests/admin/admin-shell/layout.test.tsx` |
| ADM-8 | Bộ đếm việc cần xử lý ngoài provider: không có số nào và làm mới không làm gì | đúng | — | unit | `tests/admin/admin-shell/layout.test.tsx` |

Coverage: ngưỡng riêng cho `AdminLayoutClient.tsx`, `PendingCountsProvider.tsx` và `layout.tsx` trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Mục menu đang xem so khớp bằng `startsWith(href)` không có dấu `/`, khác với kiểm tra quyền route (`href/`) | Hai luật gần nhau nhưng không giống: địa chỉ như `/admin/ordersx` làm mục Đơn hàng sáng. Chưa có trang như vậy |
| Quyền của Analytics và Media không kiểm ở khung | Mọi admin vào được; bảo vệ nằm ở BE (khóa bởi ADM-1P) |
| Số đếm lỗi mạng hoặc 5xx không báo gì | Đúng ý (không làm phiền) nhưng admin không biết số đã cũ |
| Ngăn kéo không giữ focus trong ngăn khi mở | Tab có thể ra khỏi ngăn kéo; chưa sửa |

Thay đổi nhìn thấy được: không.

## 8. Lịch sử thay đổi

- 2026-10-23 · Viết spec và test cho toàn module (batch 3), kiểm thử đột biến. Không đổi code.
