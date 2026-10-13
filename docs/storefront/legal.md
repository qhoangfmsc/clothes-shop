# Legal (Điều khoản, Chính sách bảo mật, Vận chuyển & đổi trả)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]/terms`, `/privacy`, `/shipping-returns`, `/legal` · **Cập nhật:** 2026-10-13
> **Code:** `(public)/legal/` — `page.tsx`, `_common/{content,metadata,types}.ts`, `_components/{LegalPage,LegalToc}.tsx` · `(public)/{terms,privacy,shipping-returns}/page.tsx` · `src/lib/legal.ts`
> **i18n:** `public.legal`, `shared.legal`

## 1. Tóm tắt module

Ba văn bản pháp lý và một trang tổng hợp. Toàn bộ nội dung nằm trong file message (không hard-code trong component): thêm đoạn/mục chỉ cần sửa JSON.

## 2. Phục vụ gì / việc cần làm

Cung cấp các điều khoản mà khách phải đồng ý khi đăng nhập (checkbox ở trang login) và thông tin vận chuyển/đổi trả; hiển thị ở footer, burger menu, landing footer.

## 3. Submodule & chức năng hiện có

| Trang | Route | Ghi chú |
|---|---|---|
| Điều khoản sử dụng | `/terms` | `LegalPage docs=["terms"]` |
| Chính sách bảo mật | `/privacy` | `docs=["privacy"]` |
| Vận chuyển & đổi trả | `/shipping-returns` | `docs=["shippingReturns"]` |
| Tổng hợp | `/legal` | Cả ba văn bản trên một trang, `robots: { index: false, follow: true }`, không đưa vào sitemap |

## 4. Chi tiết

### 4.1 Cấu hình (`src/lib/legal.ts`)

- `LEGAL_DOCS` = `[{ key: "terms", path: "/terms" }, { key: "privacy", path: "/privacy" }, { key: "shippingReturns", path: "/shipping-returns" }]`; `LEGAL_HUB_PATH = "/legal"`.
- `LEGAL_LAST_UPDATED = "2026-10-13"` — phải đổi cùng lúc với nội dung message. Hiển thị dạng `long` ở mỗi trang (neo 12:00 UTC để ngày không lệch múi giờ).
- `LEGAL_CONTACT` `{ company: "DOOVAN", email, phone, address }` được chèn vào văn bản qua các placeholder `{company} {email} {phone} {address}`; `email` lấy từ `CONTACT_EMAIL` (`contact@doovan.vn`, `src/lib/contact.ts`); `phone` và `address` vẫn là chỗ trống (`[hotline]`, `[business address]`).

### 4.2 Cấu trúc message (`public.legal.<doc>`)

`meta.description`, `intro`, `sections.<sectionKey>.{ title, p1…pN, l1…lN }`. Thời hạn đổi trả **không nằm trong file dịch**: các câu dùng placeholder `{returnWindow}` (mục `returns` và `faulty` của `shippingReturns`), `getLegalDocument` lấy `returnPolicy.days` từ `getShippingInfo()` (`GET /api/shipping`, ISR 60 s, cấu hình ở Site Config → Vận chuyển & đổi trả) rồi đổi thành chữ bằng `shared.legal.returnWindow` ("{days} ngày"); API lỗi thì dùng `shared.legal.returnWindowUnknown` ("thời hạn đổi trả ghi ở trang sản phẩm"). `getLegalDocument(locale, doc)` đọc cây này bằng `t.raw`, giữ thứ tự trong file; khóa bắt đầu bằng `l` là mục danh sách (các mục liên tiếp gộp thành một `<ul>`), khóa khác `title` là đoạn văn. Mọi chuỗi được nội suy `LEGAL_CONTACT`. `public.legal.common` (`lastUpdated`, `otherPolicies`, `contents`) và `public.legal.hub` dùng chung; tên văn bản ở `shared.legal`.

### 4.3 Giao diện

- `LegalPage` (Server Component): tiêu đề trang, ngày cập nhật, cột trái là `LegalToc` (mục lục neo, sticky từ `lg`), cột phải là các `article`. Trang đơn: tiêu đề là tên văn bản, các mục là `h2`; trang tổng hợp: mỗi văn bản có `h2`, mục là `h3`, mục lục gom theo văn bản (trên điện thoại chỉ hiện tên văn bản). Đánh số mục `1., 2., …`. Dưới trang đơn có khối link tới hai văn bản còn lại ("Các chính sách khác").
- `buildLegalMetadata(locale, doc)` dựng title (`withBrand`), description, alternates và social card.

### 4.4 Nơi tham chiếu

Footer (`SiteFooter`), burger menu, footer của landing (chỉ 2 văn bản đầu), checkbox đồng ý ở [auth](../platform/auth.md) mục 4.1, và [seo](../platform/seo.md) (sitemap).
