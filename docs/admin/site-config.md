# Site config (cấu hình banner)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/site-config` · **Cập nhật:** 2026-10-12
> **Code:** `(admin)/admin/site-config/` — `SiteConfigContent.tsx`, `_common/{moduleSlice,types,constants}.ts` · `src/types/site-config.ts` · `src/hooks/use-api.ts` (`useBannerConfig`) · `shop/_lib/server-fetchers.ts` (`getBannerConfig`)
> **i18n:** `admin.siteConfig`
> **Redux slice:** `state.siteConfig`

## 1. Tóm tắt module

Nơi admin cấu hình nội dung có thể thay đổi của storefront dưới dạng cặp khóa → giá trị. Hiện tại mọi khóa đều thuộc loại `BANNER`: danh sách banner (ảnh desktop/tablet/mobile + chữ + nút kêu gọi).

## 2. Phục vụ gì / việc cần làm

Cho admin đổi hình hero của trang Shop, New In, Collections và panel nổi bật trong burger menu mà không cần deploy lại. Nếu chưa cấu hình, storefront tự dùng nội dung mặc định của chính nó.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Lưới thẻ khóa | Mỗi khóa BE biết là một thẻ: tên, mô tả, loại, trạng thái (số banner / chưa cấu hình) |
| Sửa banner | Modal chỉnh danh sách banner: thêm/xóa, thu gọn/mở rộng từng banner |
| Ảnh responsive | Mỗi banner có ảnh desktop (bắt buộc) + tablet + mobile (tùy chọn) |
| Xóa cấu hình | Đưa khóa về trạng thái chưa cấu hình |
| Quyền | Sửa cần `SITE_CONFIG_UPSERT`; xóa cần `SITE_CONFIG_DELETE`; vào mục cần `SITE_CONFIG_VIEW` |

## 4. Chi tiết

### 4.1 Khóa (`src/types/site-config.ts`)

| Khóa | Nơi dùng ở storefront |
|---|---|
| `SHOP_HERO_BANNERS` | Hero trang `/shop` |
| `NEW_IN_HERO_BANNERS` | Hero trang `/new-in` |
| `COLLECTIONS_HERO_BANNERS` | Hero trang `/collections` |
| `NAV_MENU_BANNERS` | Panel nổi bật trong burger menu |

Mỗi khóa gắn đúng một loại (`SITE_CONFIG_KEY_TYPE`; loại có `BANNER` và `TEXT`, hiện chưa có khóa `TEXT`); BE tự suy `type` từ khóa. `value` luôn là chuỗi `JSON.stringify` mà BE không diễn giải; FE parse theo loại. Nhãn/mô tả từng khóa ở `admin.siteConfig.keys.<KEY>.label|description` — khóa chưa có bản dịch hiện tên thô.

### 4.2 Tải dữ liệu

Khi mount (một lần, có chống chạy đôi của React Strict Mode): `fetchSiteConfigKeys` → `GET /api/admin/site-config/keys` (danh sách khóa BE biết) và `fetchSiteConfigList` → `GET /api/admin/site-config`. Hai kết quả được gộp thành `SiteConfigRow { key, type, config | null, bannerCount }` (`bannerCount` = độ dài mảng JSON nếu parse được).

### 4.3 Form banner

- Mỗi banner (`BannerItem`): `image` (desktop, bắt buộc, có hint), `responsiveImages.tablet` (≥ 640 px), `responsiveImages.mobile` (< 640 px), `label`, `title`, `subtitle`, `ctaLabel`, `ctaHref` (placeholder `/shop`). Ảnh nhập qua `ImageUrlField` (dán URL hoặc upload).
- Banner có thể thu gọn (header hiển thị dấu ✓ cho các ảnh desktop/tablet/mobile đã có); xóa từng banner bằng nút X; nút "Thêm banner" thêm `EMPTY_BANNER_ITEM`.
- Lưu: nếu có banner thiếu ảnh desktop → toast `desktopRequired`. Trước khi lưu, các ảnh responsive rỗng bị loại; nếu không còn ảnh nào thì bỏ hẳn `responsiveImages`. `upsertSiteConfig` → `PUT /api/admin/site-config/:key` với `{ value }`.
- Xóa: xác nhận rồi `DELETE /api/admin/site-config/:key`. Lỗi lưu/xóa dịch qua `useErrorMessage`.

### 4.4 Cách storefront dùng giá trị

- Server: `getBannerConfig(key)` (ISR 60 s), client: `useBannerConfig(key)` — luôn trả mảng, lỗi hoặc rỗng → `[]` để component dùng nội dung mặc định.
- Ảnh được chọn theo breakpoint bằng `resolveBannerImage` (mobile → tablet → desktop) và render bằng `ResponsiveBannerImage` / `BannerFade` — xem [ui-kit](../platform/ui-kit.md) 4.6.
