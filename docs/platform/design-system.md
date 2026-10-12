# Design system (token, font, style toàn cục)

> **Nhóm:** Platform · **Cập nhật:** 2026-10-12
> **Code:** `src/styles/design-system.css` · `src/app/globals.css` · `src/assets/fonts/` · `postcss.config.mjs` · `DESIGN.md` (gốc repo) · `public/`
> **Quy tắc dùng:** `.agent/rules/design-system.md`, `.agent/skills/03-tailwind-styling.md`

## 1. Tóm tắt module

Nguồn sự thật cho giao diện: bảng token CSS (màu, chữ, khoảng cách, bo góc, bóng, easing, z-index), font thương hiệu và các style toàn cục. Phong cách "boutique sang trọng": nền champagne ấm, điểm nhấn vàng, bảng màu đa sắc (hồng bụi, xanh sage, oải hương, xanh bụi, nâu chocolate, vàng bơ), đen noir chỉ dùng cho vùng tương phản.

## 2. Phục vụ gì / việc cần làm

- Mọi component lấy màu/khoảng cách từ `var(--token)` thay vì mã hex cứng.
- Giữ một typeface duy nhất cho toàn site.
- Cung cấp animation/keyframe dùng chung (fade ảnh, spinner, shimmer, route transition, drawer, mega menu, cursor).

## 3. Submodule & chức năng hiện có

| Submodule | Nội dung | File |
|---|---|---|
| Token | Màu, alias ngữ nghĩa, bóng, chữ, spacing, radius, motion, z-index | `src/styles/design-system.css` |
| Dark context | `[data-theme="dark"]` / `.dark-context` đảo biến cho vùng nền đen | cùng file |
| Style toàn cục | Reset, fade ảnh, keyframes, style drawer/mega menu/user menu/cursor | `src/app/globals.css` |
| Font | `Doovan Display` (woff2 + otf) | `src/assets/fonts/`, nạp ở `src/app/[locale]/layout.tsx` |
| Tailwind | Tailwind v4 qua `@tailwindcss/postcss`; `@import "tailwindcss"` đầu `globals.css` | `postcss.config.mjs` |
| Tài sản tĩnh | Logo/brand, con trỏ, banner, ảnh nền, video model | `public/brand`, `public/cursor`, `public/images`, `public/videos` |

## 4. Chi tiết

### 4.1 Token (`design-system.css`)

- **Họ màu thô** (`--color-*`): Champagne (`pearl-cream #fbf8f1`, `champagne-cream`, `warm-linen`, `soft-beige`, `sand`); Brand (`#a49078` + `mist`, `cream`, `deep`); Gold (`champagne-gold #c9a96e`, `pale`, `soft`, `deep`, `antique`); Dusty Rose; Sage; Lavender; Dusty Blue; Chocolate; Soft Yellow (`butter`, `vanilla`, `honey`); Noir (`noir`, `obsidian`, `charcoal`, `slate`, `ash`); `white`, `black`.
- **Alias ngữ nghĩa**: `--bg-primary/secondary/elevated/surface/inset/dark`, `--bg-section-1…8` + `--bg-section-noir`, `--text-primary/heading/secondary/muted/disabled/accent/brand/on-dark/on-gold`, `--border-subtle/light/default/gold/strong/brand/dark`, `--brand-*`, `--accent-primary/hover/subtle/pressed`, `--accent-rose/sage/lavender/blue/chocolate/butter`.
- **Bóng**: `--shadow-sm…xl` (nâu ấm), `--shadow-gold-sm/md/lg/glow`.
- **Chữ**: `--font-primary` và `--font-display` cùng trỏ `var(--font-site)` (Doovan Display, 400) kèm fallback serif; `--text-xs 11px` → `--text-3xl 42px` (`xs 11, sm 12, base 13, md 15, lg 20, xl 25, 2xl 30, 3xl 42`).
- **Spacing** (lưới 4 px): `--space-1 … --space-20`; **radius** `sm 4, md 8, lg 16, xl 24, pill`.
- **Motion**: `--ease-default/out-cubic/in-out/luxury`, `--duration-fast 150 / base 300 / slow 600 / slower 1000 / cinematic 1200`.
- **z-index**: `base 0, panel 10, overlay 12, fixed 20, cursor 50, modal 100, toast 200`.
- Breakpoint: mặc định của Tailwind v4 (không ghi đè): `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536` — xem 4.4.

### 4.2 Font

`Doovan Display` (`DoovanDisplay.woff2` cho web, `.otf` cho công cụ thiết kế) nạp bằng `next/font/local`, weight 400, `display: swap`, biến `--font-site`. Chỉ có một độ đậm: `font-synthesis: none` ngăn trình duyệt giả in đậm/nghiêng cho `font-medium`/`font-semibold`. `html, body` đặt `letter-spacing: -0.02em`.

### 4.3 `globals.css`

- Reset: `overflow-x: hidden`, font/ màu/ nền từ token.
- Mọi `<img>` fade-in 0.4 s (`img-fade-in`); `img[data-admin-img]` và `img[data-cursor-img]` bỏ qua hiệu ứng này.
- Keyframes: `spin`, `rt-in`/`rt-out` (route transition), `cart-shimmer`, `skeleton-shimmer`, `checkout-shimmer`, `ni-pulse`, `ni-ticker-scroll` (New In).
- Custom variant `carousel` (điện thoại/thiết bị cảm ứng) cho Tailwind.
- Class riêng cho drawer menu (`.drawer-*`), mega menu (`.mega-menu-item-link`), user menu (`.user-avatar-btn`, `.user-menu-item`), `.collection-card`, `.skeleton-product-grid`; `html.custom-cursor-active *` ẩn con trỏ hệ thống.
- Khối `prefers-reduced-motion: reduce` tắt chuyển động cho các thành phần trên.

### 4.4 Responsive (hiện trạng)

- **Breakpoint**: không có `--breakpoint-*` hay `@theme` ghi đè trong `src/`, nên `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536` đều là giá trị mặc định của Tailwind 4.3. Trong `src/app` đang dùng `sm:` (nhiều nhất), `lg:`, `md:`, `max-sm:`, một `min-[480px]:`; chưa có `xl:` / `2xl:` nào.
- **Custom variant `carousel`** (`globals.css`): áp dụng khi `max-width: 767.98px` **hoặc** con trỏ chính không phải `fine` — tức điện thoại và mọi thiết bị cảm ứng (iPad kể cả khi ngang).
- **Hook `useBreakpoint()`** (`src/hooks/useMediaQuery.ts`): theo `window.innerWidth`, `isMobile < 640`, `isTablet 640–1023`, `isDesktop ≥ 1024`; giá trị khởi tạo 1024 trước khi mount; không có mức `wide`.
- **Truy vấn theo thiết bị nhập**: `(pointer: fine)` ở con trỏ tùy biến (`use-cursor-tracker.ts`), kéo chuột của `Carousel`, con trỏ `zoom-in` của `ZoomableImage`; `(hover: none)` ở mũi tên `Carousel` (luôn hiện trên cảm ứng) và `CollectionShowcase`; GSAP ở `CollectionsClient` chỉ chạy khi `(min-width: 768px) and (pointer: fine)`.
- **Phân loại theo thiết bị** nằm ở quy tắc `.agent/rules/responsive.md` (phone, tablet, iPad ngang, desktop, wide); `ResponsiveBannerImage` chọn ảnh theo `max-width` 639/1023 (mobile/tablet/desktop).
- **Khu admin**: sidebar cố định 240 px từ `lg`, drawer off-canvas dưới `lg` (xem [admin-shell](../admin/admin-shell.md)); form/modal/bảng dùng chung có kích thước riêng cho cảm ứng qua `pointer-coarse:` (xem [ui-kit](./ui-kit.md)).
- `html, body` có `overflow-x: hidden` (4.3).
- `QuickAddDrawer` chừa `env(safe-area-inset-bottom)` ở chân drawer; chưa nơi nào khác dùng `safe-area`. `100vh` còn dùng ở bố cục sticky (vd. gallery trang chi tiết `lg:h-[calc(100vh-80px)]`), chưa dùng `dvh`.

### 4.5 Ghi chú hiện trạng

- Quy tắc cũ ghi font "Quiche Display / Inter Tight", nhưng code hiện tại dùng một font duy nhất (`--font-site` = Doovan Display) cho cả `--font-primary` và `--font-display`.
- Tailwind chỉ dùng cho layout/khoảng cách; màu lấy qua `bg-[var(--token)]`, `text-[var(--token)]`.
- Tài liệu thiết kế chi tiết ở `DESIGN.md` (gốc repo) và `.gemini/skills/doovan-*.md`; file ảnh thiết kế tham chiếu `src/assets/fonts/DOOVAN_design_v1.png`, `v2.png`.
