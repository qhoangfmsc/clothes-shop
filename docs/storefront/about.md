# About (giới thiệu thương hiệu)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]/about` · **Cập nhật:** 2026-10-25
> **Code:** `(public)/about/` — `page.tsx`, `_common/constants.ts`, `_components/{InvitationHero,BrandStory,ServicesSection}.tsx`
> **i18n:** `public.about`

## 1. Tóm tắt module

Trang giới thiệu thương hiệu dạng tĩnh (không gọi API): hero có hình nền họa tiết, câu chuyện thương hiệu, ba dịch vụ và lời mời liên hệ qua email.

## 2. Phục vụ gì / việc cần làm

Kể câu chuyện DOOVAN và các dịch vụ (tuyển chọn, may đo, tư vấn phối đồ) để tạo niềm tin, rồi dẫn khách liên hệ.

## 3. Submodule & chức năng hiện có

| Section | Nội dung |
|---|---|
| `InvitationHero` | Ảnh nền `public/images/mood-bg/wall_sticker_pink_floral.webp`, nhãn ("Về DOOVAN" / "About DOOVAN"), tiêu đề, phụ đề, dòng "established" (`hero.*`) |
| `BrandStory` | Subtitle, tiêu đề, 4 đoạn (`STORY_PARAGRAPH_KEYS`: `first`, `second`, `third`, `identity` — câu nêu rõ DOOVAN là thương hiệu thời trang Việt Nam, trụ sở TP. Hồ Chí Minh, bán thiết kế có sẵn và nhận đặt thiết kế), câu trích, ảnh `wall_sticker_soft_cream_roses.webp` (có `imageAlt`) |
| `ServicesSection` | Nền tối; 3 thẻ dịch vụ `curated ✦`, `custom ◈`, `styling ❋` (`SERVICES`); nút CTA |

## 4. Chi tiết

- `page.tsx` (server): `generateMetadata` dùng `public.about.meta` + `buildAlternates` + `buildSocialMetadata`; `setRequestLocale`; render ba section theo thứ tự Hero → Story → Services.
- Nút CTA trong `ServicesSection` (`cta.button`) là link `buildMailto()` = `mailto:contact@doovan.vn` (`CONTACT_EMAIL` ở `src/lib/contact.ts`).
- `BrandStory` dùng `useState/useEffect` để biết đang ở desktop (bố cục khác nhau theo kích thước).
- Nội dung chữ hoàn toàn từ `public.about` (`meta, hero, story, services, cta`); cấu trúc (khóa đoạn văn, dịch vụ + icon) nằm ở `_common/constants.ts`.
- Có trong sitemap (`/about`, ưu tiên 0.8, không có `lastModified`).

- **Đơn vị kích thước:** các số px trong doc này là giá trị ở gốc 16 px; trong code, chiều dài và cỡ chữ của module viết bằng `rem` (class `…-[…rem]`, token `--text-*` / `--space-*`, style inline `"…rem"`) nên lớn dần từ 1536 px tới 1920 px theo thang gốc `html` ([design-system](../platform/design-system.md) 4.3).

### 4.1 Spec và test

Thiết kế, quyết định và các điểm cần biết: [specs/storefront/about.md](../../specs/storefront/about.md). Test ở `tests/storefront/about/about.test.tsx`; `mutants.json` có đột biến cho mọi file của module.
