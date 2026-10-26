# App shell (layout gốc, provider, route group, trang lỗi) — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [platform/app-shell](../../docs/platform/app-shell.md) · **Test:** `tests/platform/app-shell/`

## 1. Bối cảnh & mục tiêu

App shell là khung bao quanh mọi trang: layout gốc theo ngôn ngữ (thẻ `<html lang>`, font, thông điệp dùng chung, chuỗi provider), layout của hai nhóm trang công khai / riêng tư (mỗi nhóm chỉ gửi đúng phần thông điệp của nó), trang 404 / lỗi / không có quyền, lớp phủ chuyển trang, con trỏ vẽ tay và đo lường Vercel. Sai ở đây là cả site lỗi cùng lúc: trang sai ngôn ngữ, mất toast / giỏ hàng nổi, trang trắng khi chuyển trang, hoặc số liệu bị lẫn lượt xem của admin.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách, người đã đăng nhập và admin thiếu quyền (chỉ ở trang không có quyền), kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Layout gốc, metadata, `generateStaticParams`, hai layout nhóm `(public)` / `(private)`, catch-all 404 | Layout `(admin)` và `AdminLayoutClient`: thuộc [admin-shell](../admin/admin-shell.md) |
| Trang 404, trang lỗi của `(public)`, trang `/unauthorized` | Header, footer, giỏ hàng nổi trong khung: thuộc [site-chrome](./site-chrome.md) |
| `RouteTransition`: khi nào lớp phủ hiện, giữ bao lâu, khi nào bỏ qua | Từng provider bên trong (`AuthProvider`, `ToastProvider`…): thuộc module của chúng; ở đây chỉ kiểm thứ tự bọc |
| `CustomCursor`: ai được dùng, hình theo phần tử, cánh hoa khi nhấn | Ảnh con trỏ trong `public/cursor/` là tài sản tĩnh, không kiểm |
| `VercelTelemetry` loại sự kiện của admin | Số liệu funnel tùy chỉnh: thuộc [analytics](../admin/analytics.md) |

## 3. Hợp đồng

- **Root layout.** Ngôn ngữ không có trong `routing.locales` (kể cả `VI`, `vi-VN`, chuỗi rỗng) → `notFound()`. Ngược lại: `setRequestLocale`, `<html lang suppressHydrationWarning className=font>`, `NextIntlClientProvider` với thông điệp `common`, `shared`, `auth` đúng ngôn ngữ, rồi `Providers` bọc phần còn lại. `generateStaticParams` cho `vi` và `en`.
- **Metadata.** Tiêu đề, mô tả, `openGraph` (`siteName` = `BRAND_NAME`, locale `vi_VN` / `en_US`) theo ngôn ngữ.
- **Nhóm trang.** `(public)` = `ScopedMessages public` + `SiteHeader` + `SiteFooter`. `(private)` = `ScopedMessages private` + `robots noindex`, khung do từng trang tự thêm. Mỗi nhóm chỉ gửi phần thông điệp của nó.
- **404.** Mọi địa chỉ không khớp dưới `/<locale>/` gọi `notFound()`; trang 404 có tiêu đề, mô tả, hai nút (về trang chủ, `/shop`) đúng ngôn ngữ.
- **Lỗi.** `error.tsx` của `(public)`: ghi `console.error`, nút "Thử lại" gọi `reset`, nút về trang chủ.
- **Không có quyền.** Khách → mời đăng nhập; đã đăng nhập → báo thiếu quyền và nút về trang chủ (không có nút đăng nhập). Metadata theo ngôn ngữ.
- **Lớp phủ chuyển trang.** Hiện (180 ms) khi bấm link nội bộ sang trang khác. Không hiện cho: link tới trang đang mở (bỏ tiền tố ngôn ngữ, query, hash), `http…`, `#…`, link không có địa chỉ, `target=_blank`, phím meta / ctrl / shift, nút trong link, click không phải link. Khi đổi trang: giữ ít nhất 300 ms, đợi 3 khung hình, mờ đi 350 ms. Tự tắt sau 4 s nếu địa chỉ không đổi. Địa chỉ đổi mà không bấm (nút Back) thì không hiện.
- **Con trỏ.** Chỉ có khi `(pointer: fine)`; thêm class `custom-cursor-active` vào `<html>` và gỡ khi dỡ. Hình mũi tên / bàn tay / thanh chữ theo phần tử dưới con trỏ; `[data-cursor=native]` trả lại con trỏ hệ thống. Nghe sự kiện ở pha capture. Nhấn chuột bung 6 cánh hoa, 500 ms; nhả / mất focus thì hết ép nhỏ.
- **Đo lường.** `beforeSend` bỏ sự kiện có URL `/(vi|en)/admin…`.

## 4. Thiết kế

```
RootLayout ─► NextIntlClientProvider ─► CustomCursor
                          └──────────► Providers ─► Toast ─► Confirm ─► SystemPassword ─► LoginPrompt ─► QuickAdd ─► RouteTransition · CartFAB · {children} · VercelTelemetry
(public)/layout ─► ScopedMessages public ─► SiteHeader · children · SiteFooter
(private)/layout ─► ScopedMessages private (noindex)
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Layout là hàm async trả cây phần tử**; test chạy hàm rồi duyệt cây (`resolveServerTree`) thay vì dựng cả Next | Server component không dựng được bằng `renderApp`; duyệt cây cho thấy đúng thứ tự bọc và props mà không cần trình duyệt | Dựng toàn bộ app bằng Next trong test |
| **Phụ thuộc theo hướng một chiều**: layout biết provider, provider không biết layout | Đổi chuỗi provider chỉ sửa một chỗ | Provider tự lấy ngôn ngữ từ layout |
| **`isCurrentPage` là hàm thuần**, bỏ tiền tố ngôn ngữ bằng một biểu thức dựng từ `routing.locales` | Link mang `/vi/shop`, còn `usePathname()` trả `/shop`; so sánh thẳng thì lớp phủ hiện cho chính trang đang mở và không bao giờ tắt (đến 4 s). Dựng từ `routing.locales` để thêm ngôn ngữ không phải sửa | Liệt kê cứng `vi|en`; dùng `Link` của next-intl cho mọi link |
| **Con trỏ tách theo vai**: `use-cursor-tracker` (trạng thái, motion value), `CustomCursor` (vẽ), `cursor-config` (hình và bộ chọn) | Mỗi file đổi vì một lý do; thêm biến thể hình chỉ sửa config | Một component 300 dòng |

### Kiến trúc

Layout gốc phụ thuộc xuống `Providers` và các provider của module khác; không module nào import ngược layout. `RouteTransition` chỉ biết `usePathname` và `routing`. `cursor/` chỉ biết `framer-motion` và config của nó.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `RouteTransition` quyết định khi nào hiện / tắt lớp phủ; `isCurrentPage` quyết định thế nào là cùng trang; con trỏ tách ba file như trên |
| O | Thêm ngôn ngữ hay biến thể con trỏ = thêm dữ liệu (`routing.locales`, `CURSOR_VARIANTS`), không sửa logic |
| L | — |
| I | `ScopedMessages` chỉ nhận `scope`; `VercelTelemetry` chỉ nhận sự kiện |
| D | Layout nhóm phụ thuộc `ScopedMessages` và khung, không phụ thuộc nội dung trang |

### Conventions

Chuỗi người dùng qua `shared.errors`, `auth`, `private.*.meta`. Test dùng `tests/_support/intl-server.ts` thay `next-intl/server` và `server-tree.tsx` để chạy server component; đồng hồ giả bật sau khi dựng (bật trước thì `waitFor` treo) và `requestAnimationFrame` được đếm bằng spy dựng sau khi bật đồng hồ giả.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (trang không có quyền đổi theo khách / đã đăng nhập; các phần còn lại không đổi theo danh tính) · permission = không (khung không kiểm quyền; việc chặn trang admin thuộc admin-shell)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| SHL-1 | Root layout: `<html lang>`, font, `suppressHydrationWarning`, bọc trang con, chỉ gửi `common` / `shared` / `auth` đúng ngôn ngữ, báo ngôn ngữ, `generateStaticParams` | đúng | khách | integration | `tests/platform/app-shell/shell-layouts.test.tsx` |
| SHL-1E | Ngôn ngữ lạ (`fr`, `VI`, rỗng, `vi-VN`) → 404 | lỗi | khách | integration | `tests/platform/app-shell/shell-layouts.test.tsx` |
| SHL-2 | Metadata gốc: tiêu đề, mô tả, openGraph theo ngôn ngữ | đúng | khách | unit | `tests/platform/app-shell/shell-layouts.test.tsx` |
| SHL-3 | Nhóm công khai: thông điệp `public`, header, footer, thứ tự | đúng | khách | integration | `tests/platform/app-shell/shell-layouts.test.tsx` |
| SHL-4 | Nhóm riêng tư: thông điệp `private`, noindex, không tự thêm khung | đúng | user | integration | `tests/platform/app-shell/shell-layouts.test.tsx` |
| SHL-5 | Thông điệp mỗi nhóm gửi: chỉ phần của nhóm, đúng ngôn ngữ | đúng | khách | integration | `tests/platform/app-shell/shell-layouts.test.tsx` |
| SHL-6E | Địa chỉ không trang nào khớp → `notFound()` | lỗi | khách | integration | `tests/platform/app-shell/shell-layouts.test.tsx` |
| SHL-7E | Trang 404: tiêu đề, mô tả, hai nút, tiếng Anh | lỗi | khách | component | `tests/platform/app-shell/shell-pages.test.tsx` |
| SHL-8E | Trang lỗi: ghi log, thử lại, về trang chủ, tiếng Anh | lỗi | khách | component | `tests/platform/app-shell/shell-pages.test.tsx` |
| SHL-9 | Không có quyền: khách thấy nút đăng nhập; người đã đăng nhập và admin thiếu quyền thấy lời báo và nút về trang chủ; tiếng Anh; metadata | đúng | admin thiếu quyền | component | `tests/platform/app-shell/shell-pages.test.tsx` |
| SHL-10 | Lớp phủ hiện cho link sang trang khác, không hiện cho trang đang mở (có tiền tố ngôn ngữ, query, hash), link ngoài, `#`, không địa chỉ, tab mới, phím, nút, click không phải link; trang chủ của ngôn ngữ; dừng nghe khi dỡ | đúng | khách | component | `tests/platform/app-shell/route-transition.test.tsx` |
| SHL-11 | Lớp phủ tắt: giữ tối thiểu 300 ms, 3 khung hình, mờ 350 ms; tự tắt sau 4 s; không hiện khi Back; hiện lại cho link sau | đúng | khách | component | `tests/platform/app-shell/route-transition.test.tsx` |
| SHL-12 | Rời trang: bộ đếm giờ dọn sạch khi dỡ | đúng | khách | component | `tests/platform/app-shell/route-transition.test.tsx` |
| SHL-13 | Con trỏ: không vẽ khi không có con trỏ chính xác, vẽ và ẩn con trỏ hệ thống khi có, trả lại khi dỡ, gỡ mọi listener | đúng | khách | component | `tests/platform/app-shell/cursor.test.tsx` |
| SHL-14 | Con trỏ: vị trí, hình theo phần tử, `native`, cửa sổ, ẩn khi chuột rời, nghe cả khi trang chặn lan sự kiện | đúng | khách | component | `tests/platform/app-shell/cursor.test.tsx` |
| SHL-15 | Cánh hoa: 6 cánh, 500 ms, nhấn liên tiếp | đúng | khách | component | `tests/platform/app-shell/cursor.test.tsx` |
| SHL-16 | Nhấn: ép nhỏ khi giữ, nhả, mất focus, bộ chọn | đúng | khách | component | `tests/platform/app-shell/cursor.test.tsx` |
| SHL-17 | Đo lường: bỏ sự kiện của admin (cả hai ngôn ngữ), giữ phần còn lại | đúng | khách | unit | `tests/platform/app-shell/providers.test.tsx` |
| SHL-18 | Chuỗi provider: thứ tự bọc, các phần tử anh em | đúng | khách | integration | `tests/platform/app-shell/providers.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Link tới trang đang mở: trước đây lớp phủ hiện và chỉ tắt sau 4 s vì `pathname` không đổi (link có `/vi/…`, `usePathname()` không) | Đã sửa: `isCurrentPage` bỏ tiền tố ngôn ngữ (SHL-10) |
| `(auth)/layout.tsx` có trong danh sách file của module nhưng không tồn tại; `/login` dùng layout gốc | Không đổi; trang đăng nhập thuộc [auth](./auth.md) |
| Nút Back / Forward không hiện lớp phủ | Hành vi hiện tại (SHL-11) |
| Lớp phủ chỉ biết `pathname`; đổi chỉ query (cùng trang) không bao giờ hiện | Có chủ đích: địa chỉ không đổi thì lớp phủ không tắt được |

Thay đổi nhìn thấy được: lớp phủ chuyển trang không còn hiện (4 s) khi bấm link tới trang đang mở.

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 8), kiểm thử đột biến; sửa `RouteTransition` nhận ra link tới trang đang mở khi link có tiền tố ngôn ngữ.
