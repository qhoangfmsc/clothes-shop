# App shell (layout gốc, provider, route group, trang lỗi)

> **Nhóm:** Platform · **Cập nhật:** 2026-10-13
> **Code:** `src/app/[locale]/layout.tsx` · `src/app/[locale]/_components/Providers.tsx` · `src/middleware.ts` · `src/app/[locale]/(public|private|admin|auth)/layout.tsx` · `not-found.tsx` · `[...rest]/page.tsx` · `(public)/error.tsx` · `unauthorized/` · `RouteTransition.tsx` · `cursor/` · `VercelTelemetry.tsx`

## 1. Tóm tắt module

Khung bao quanh mọi trang: layout gốc theo locale, chuỗi provider (Redux, Google OAuth, Auth, Toast, Confirm, mật khẩu hệ thống, popup đăng nhập, Quick Add), bốn route group với layout riêng, trang 404/500/không có quyền, hiệu ứng chuyển trang, con trỏ tùy biến và đo lường Vercel.

## 2. Phục vụ gì / việc cần làm

- Mọi trang có font, theme, thông điệp i18n đúng ngôn ngữ và các dịch vụ dùng chung (toast, confirm, giỏ hàng nổi…).
- Mỗi nhóm trang (công khai, riêng tư, admin, đăng nhập) chỉ nhận đúng nhóm message và đúng khung (header/footer) của nó.
- URL sai hiển thị trang 404 đúng ngôn ngữ thay vì trang mặc định của framework.

## 3. Submodule & chức năng hiện có

| Submodule | Chức năng | File |
|---|---|---|
| Root layout | `<html lang>`, font, `NextIntlClientProvider`, chuỗi provider, metadata gốc | `[locale]/layout.tsx` |
| Providers | Redux `StoreProvider` → `GoogleOAuthProvider` → `AuthProvider` → `CartSync` | `_components/Providers.tsx` |
| Route group | `(public)`, `(private)`, `(admin)`, `(auth)` | các `layout.tsx` |
| 404 | `not-found.tsx` + catch-all `[...rest]` | `[locale]/` |
| 500 | `error.tsx` của `(public)` | `(public)/error.tsx` |
| Không có quyền | `/unauthorized` | `unauthorized/` |
| Chuyển trang | Lớp phủ kem mờ khi bấm link nội bộ | `RouteTransition.tsx` |
| Con trỏ | Con trỏ vẽ tay (default/pointer/text) + hiệu ứng cánh hoa khi click | `cursor/` |
| Đo lường | Vercel Analytics + Speed Insights (bỏ qua `/admin`) | `VercelTelemetry.tsx` |

## 4. Chi tiết

### 4.1 Root layout (`[locale]/layout.tsx`)

- `generateStaticParams` sinh `vi`, `en`. Locale không hợp lệ → `notFound()`. Gọi `setRequestLocale(locale)`.
- Font `Doovan Display` (biến `--font-site`) gắn vào `<html className>`; `<html suppressHydrationWarning lang={locale}>`.
- Message gửi client: `common`, `shared`, `auth` (các nhóm role thêm ở layout con — xem [i18n](./i18n.md)).
- Thứ tự bọc, từ ngoài vào trong: `NextIntlClientProvider` → `CustomCursor` (anh em) / `Providers` (Redux → Google OAuth → Auth → `CartSync`) → `ToastProvider (bottom-center)` → `ConfirmProvider` → `SystemPasswordPromptProvider` → `LoginPromptProvider` → `QuickAddProvider` → `RouteTransition`, `CartFAB`, `{children}`, `VercelTelemetry`.
- `CartSync` (mount ngay trong `AuthProvider`) đồng bộ giỏ hàng khi phiên thay đổi — xem [cart](../storefront/cart.md).
- Metadata gốc (gồm `applicationName`, `verification.google`, `siteName` lấy từ `BRAND_NAME`): xem [seo](./seo.md).

### 4.2 Route group

| Group | Layout | Khung | Message role | Ghi chú |
|---|---|---|---|---|
| `(public)` | `ScopedMessages public` | `SiteHeader` + `SiteFooter` | `public` | Trang chủ, shop, collections, new-in, about, contact, pháp lý. `error.tsx` bắt lỗi runtime (nút "Thử lại", "Về trang chủ") |
| `(private)` | `ScopedMessages private`, `robots noindex` | Mỗi route con tự thêm khung | `private` | `cart`, `account`, `orders`, `wishlist` có header + footer; `checkout` chỉ có header (không footer) |
| `(admin)` | `ScopedMessages admin` + `AdminLayoutClient`, `robots noindex` | Sidebar admin | `admin` | Xem [admin-shell](../admin/admin-shell.md) |
| `(auth)` | — (dùng layout gốc) | Trang đăng nhập tự dựng nền | `auth` (đã có ở root) | `/login` |

Metadata `title` của từng trang private đặt trong `layout.tsx` của route đó (`private.<module>.meta`).

### 4.3 404, 500, không có quyền

- `not-found.tsx` (client): tiêu đề/mô tả từ `shared.errors.notFound`, nền hình hoa văn mờ, hai nút "Về trang chủ" và "Khám phá" (`/shop`). `[...rest]/page.tsx` gọi `notFound()` để mọi URL không khớp dưới `/<locale>/` rơi vào đây (đúng ngôn ngữ).
- `(public)/error.tsx`: `shared.errors.serverError` (tiêu đề, mô tả, thử lại, về trang chủ); `console.error` lỗi.
- `/unauthorized`: xem [auth](./auth.md) mục 4.8.

### 4.4 `RouteTransition`

Lắng nghe `click` (capture) trên document; nếu là link nội bộ khác trang hiện tại (không phải `_blank`, không phím tắt, không nằm trong `button/input/select/textarea`) thì hiện lớp phủ `--bg-primary` fade-in 180 ms (`rt-in`). Khi `pathname` đổi: giữ tối thiểu 300 ms, đợi 3 `requestAnimationFrame`, rồi fade-out 350 ms (`rt-out`). Tự tắt sau 4 s nếu không đổi trang. `z-index 9999`, `aria-hidden`.

### 4.5 `CustomCursor`

- Chỉ bật khi có con trỏ chính xác (`(pointer: fine)`), thiết bị cảm ứng bỏ qua hoàn toàn. Thêm class `custom-cursor-active` vào `<html>` để ẩn con trỏ hệ thống.
- Ba biến thể ảnh trong `public/cursor/`: `default`, `pointer` (khi trỏ vào `a`, `button`, `label`, `select`, `summary`, role button/link/tab/checkbox/radio, input button/checkbox/radio, `[data-cursor="pointer"]`, `[onclick]`), `text` (input/textarea/`contenteditable`/`[data-cursor="text"]`). `[data-cursor="native"]` trả lại con trỏ hệ điều hành.
- Vị trí đi qua `useMotionValue` (không render lại mỗi lần di chuột, không làm mượt). Mỗi lần nhấn chuột bung 6 "cánh hoa" (vàng/hồng/xanh) tồn tại 500 ms. Cấu hình ở `cursor-config.ts`.
- Các listener `pointermove`, `pointerdown`, `pointerup`, `pointercancel` gắn ở `window` theo **pha capture** (`use-cursor-tracker.ts`, và `pointerdown` của hiệu ứng cánh hoa trong `CustomCursor.tsx`) để vẫn nhận sự kiện khi một widget gọi `stopPropagation()` — ví dụ viewer ảnh sản phẩm khi đang zoom (> 1×) chặn `pointerdown`/`pointermove` để tự kéo ảnh. Nghe ở pha bubble thì con trỏ đứng yên trong lúc zoom.

### 4.6 Đo lường

`VercelTelemetry` render `<Analytics>` và `<SpeedInsights>` với `beforeSend` loại sự kiện có URL khớp `^/(vi|en)/admin(/|$)` để traffic của admin không làm sai số liệu. Sự kiện funnel tùy chỉnh: xem [analytics](../admin/analytics.md).

### 4.7 Phụ thuộc

`next-intl`, `framer-motion`, `@react-oauth/google`, `@vercel/analytics`, `@vercel/speed-insights`, `react-redux`.
