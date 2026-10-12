# Landing page (trang chủ)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]` · **Cập nhật:** 2026-10-12
> **Code:** `(public)/page.tsx` · `(public)/landing-page/` — `page.tsx`, `_common/constants.ts`, `_components/{VideoContainer,Caption,ProductInfo,ViewButton,OutroSection,Footer,CollectionShowcase}.tsx`
> **i18n:** `public.landing`

## 1. Tóm tắt module

Trang chủ dạng "cuộn kể chuyện": hai video người mẫu quay trái/phải xen kẽ làm nền toàn màn hình, khi cuộn xuống một tấm nền đen trượt lên chứa lưới ảnh các bộ sưu tập (hiện dần bằng scale), cuối cùng là phần kết (outro) có nút dẫn vào cửa hàng.

## 2. Phục vụ gì / việc cần làm

Gây ấn tượng thương hiệu ngay màn hình đầu và dẫn khách tới `/shop` (nút "View") hoặc vào từng bộ sưu tập. Đồng thời xuất JSON-LD `WebSite` + `Organization` cho SEO.

## 3. Submodule & chức năng hiện có

| Thành phần | Chức năng |
|---|---|
| `(public)/page.tsx` | Server component: `setRequestLocale`, nhúng `siteJsonLd()`, render `LandingPage` |
| `VideoContainer` | Hai video `model_turn_left.mp4` / `model_turn_right.mp4` crossfade khi video kia kết thúc |
| `Caption`, `ProductInfo` | Chữ giới thiệu (`caption`, `productInfo.line1` + `"DOOVAN"`), vòng tròn có ký hiệu đổi ngẫu nhiên |
| `CollectionShowcase` | Lưới ảnh bộ sưu tập (API) rải so le theo số cột 2/3/4, link tới `/collections/<slug>` |
| `OutroSection` | Lớp phủ kết thúc: tiêu đề hai dòng + phụ đề |
| `ViewButton` | Nút "View" → `router.push("/shop")` |
| `Footer` (của landing) | Dòng copyright + hai link pháp lý đầu (`terms`, `privacy`) |

## 4. Chi tiết

### 4.1 Cơ chế cuộn (`landing-page/page.tsx`, client)

- Trang là một `div#scroll-spacer` có chiều cao tính lại khi resize: `vh + maxScroll + 2·vh` (`maxScroll` = chiều cao của khối ảnh − viewport). Mọi thứ khác `position: fixed`/trong khối này và bị dịch bằng transform theo `scrollY`.
- **GSAP + ScrollTrigger** (`scrub: true`): tấm nền đen (`panelRef`) trượt từ `y: 100vh` lên `0` trong 100vh đầu.
- **Vòng lặp `requestAnimationFrame`**: (1) đổi ký hiệu `@ ^^ ! $ # ><` (`SYMBOLS`) trong `#circle-symbol` mỗi ≥ 80 ms; (2) ẩn `#main-canvas` (video) khi `scrollY > vh`; (3) sau 1vh dịch khối ảnh `translateY(-(scrollY − vh))`; (4) mỗi `.collection-card` scale từ 0 → 1 khi vào (60% viewport từ đáy) và 1 → 0 khi ra (40% viewport phía trên), card ngoài viewport `scale(0)`; (5) pha outro khi `scrollY > vh + maxScroll`: `progress` điều khiển opacity của `#outro-overlay` và `#outro-footer`, dịch `#outro-info` (offset `data-outro-offset`, mặc định 160) và scale `#outro-buy` từ 0 → 1.
- Không dùng scroll listener (đúng quy tắc RAF).

### 4.2 Video (`VideoContainer`)

Hai thẻ `<video muted>` xếp chồng, chuyển bằng `opacity` (`FADE_MS = 600`); bắt đầu bằng video trái; `ended` của video này kích hoạt video kia (`currentTime = 0`, `play()`), vòng lặp vô hạn. Người dùng `prefers-reduced-motion` → bỏ transition. Hiện container sau khi video sẵn sàng hoặc sau 2 s dự phòng.

### 4.3 Bộ sưu tập (`CollectionShowcase`)

`useCollections()` (SWR) → mỗi bộ sưu tập một thẻ `aspect-ratio 2/3`, `next/image` fill, lớp phủ gradient + tên + "Shop now" (`showcase.shopNow`). `buildLayout(count, cols)` rải thẻ so le: hàng `r` đặt ở cột `(2r + r%2) % cols`, cứ mỗi 3 hàng thêm một thẻ thứ hai. Có ba lưới (2, 3, 4 cột) hiển thị theo breakpoint. Khi dữ liệu về xong, component bắn sự kiện `resize` sau 50 ms để trang tính lại chiều cao spacer. Thẻ ở nửa trái có `transform-origin: right bottom`, nửa phải `left bottom`.

### 4.4 Khác

- Landing page nằm trong `(public)/layout.tsx` nên vẫn có `SiteHeader` + `SiteFooter` chung (xem [site-chrome](../platform/site-chrome.md)).
- Tài sản: `public/videos/*.mp4`; ảnh bộ sưu tập là `collection.image` từ BE (qua `/media/...`).
- Không có dữ liệu bộ sưu tập thì lưới trống (không có nội dung dự phòng).
