# SEO (metadata, sitemap, robots, dữ liệu có cấu trúc)

> **Nhóm:** Platform · **Cập nhật:** 2026-10-12
> **Code:** `src/app/robots.ts` · `src/app/sitemap.ts` · `src/lib/structured-data.ts` · `src/lib/site-url.ts` · `src/lib/legal.ts` · `src/i18n/metadata.ts` · `src/app/[locale]/_components/JsonLd.tsx` · `src/app/[locale]/layout.tsx`

## 1. Tóm tắt module

Mọi thứ giúp công cụ tìm kiếm và mạng xã hội hiểu site: metadata theo từng trang và từng ngôn ngữ, `sitemap.xml` có hreflang, `robots.txt`, JSON-LD (WebSite, Organization, Product, BreadcrumbList) và Open Graph/Twitter card.

## 2. Phục vụ gì / việc cần làm

- Mỗi trang có title/description đúng ngôn ngữ, canonical và hreflang.
- Sản phẩm, danh mục, bộ sưu tập mới tự có trong sitemap (làm mới tối đa mỗi giờ).
- Trang riêng tư, admin và bản deploy không phải production không bị index.
- Chia sẻ link ra mạng xã hội có ảnh và tiêu đề đúng.

## 3. Submodule & chức năng hiện có

| Submodule | Chức năng | File |
|---|---|---|
| Metadata gốc | `metadataBase`, title/description mặc định, Open Graph, Twitter | `src/app/[locale]/layout.tsx` |
| Helper metadata | `buildAlternates`, `withBrand`, `buildSocialMetadata` | `src/i18n/metadata.ts` |
| Sitemap | Một entry mỗi locale, kèm hreflang và ảnh | `src/app/sitemap.ts` |
| Robots | Chặn khu riêng tư; chặn toàn bộ ở môi trường không phải production | `src/app/robots.ts` |
| JSON-LD | `siteJsonLd`, `productJsonLd`, `breadcrumbJsonLd`, `absoluteUrl`, `pageUrl` | `src/lib/structured-data.ts` |
| Origin | `SITE_URL` | `src/lib/site-url.ts` |

## 4. Chi tiết

### 4.1 Metadata

- Root layout đặt `metadataBase = SITE_URL`, title/description từ `shared.site.meta`, `alternates` qua `buildAlternates(locale)`, Open Graph (`siteName: DOOVAN`, `ogLocale`, ảnh `/brand/brand_og.png` 1200×630) và Twitter `summary_large_image`.
- Mỗi trang `generateMetadata` lấy chuỗi từ `<role>.<module>.meta`, dùng `withBrand(title)`, `buildAlternates(locale, path)`; trang có hình riêng dùng `buildSocialMetadata`.
- Trang `noindex`: `/login`, `/unauthorized`, layout `(private)`, layout `(admin)`, trang `/legal` (hub).

### 4.2 Sitemap (`revalidate = 3600`)

- Đường dẫn tĩnh: `""`, `/shop`, `/collections`, `/new-in`, `/about`, `/contact`, ba trang pháp lý (`LEGAL_DOCS`). Trang hub `/legal` bị bỏ vì lặp lại và `noindex`.
- Động: danh mục `/shop/<cat>`, danh mục con `/shop/<cat>/<sub>`, bộ sưu tập `/collections/<slug>` (kèm ảnh bìa), sản phẩm `/shop/<cat>/<sub>/<id>` (kèm toàn bộ ảnh). Lấy sản phẩm bằng cách duyệt từng trang `limit = 200` (tối đa 100 trang).
- Mỗi URL xuất hiện một lần cho mỗi locale, `alternates.languages` liệt kê mọi locale và `x-default`.
- `priority`: trang chủ 1; trang tĩnh 0.8; sản phẩm 0.9; danh mục 0.7; bộ sưu tập 0.7; danh mục con 0.6.
- `lastModified`: lấy từ `updatedAt` của sản phẩm/bộ sưu tập; danh mục không có `updatedAt` nên lấy theo sản phẩm mới nhất bên trong. Danh mục con rỗng (không có sản phẩm) bị bỏ — trừ khi danh sách sản phẩm bị lỗi.
- Dùng `Promise.allSettled`: một nguồn lỗi không làm hỏng cả sitemap.

### 4.3 Robots

- Production: `allow /`, `disallow` `/api/` và các đường `/<locale>/{admin,login,cart,checkout,account,orders,wishlist,unauthorized}`; trỏ `sitemap` tới `${SITE_URL}/sitemap.xml`.
- `VERCEL_ENV` có giá trị khác `production` → `disallow: /` toàn bộ.

### 4.4 JSON-LD

- Trang chủ: `siteJsonLd()` = `WebSite` + `Organization` (tên `DOOVAN`, `alternateName` `Doovan`/`doovan.vn`, `logo` `${SITE_URL}/icon.png`, `sameAs` từ `SOCIALS`).
- Sản phẩm: `productJsonLd(locale, product, path)` — `Product` + `Offer` (USD, giá `toFixed(2)`, `InStock`, `NewCondition`), không có `aggregateRating`.
- `breadcrumbJsonLd(locale, crumbs)` cho `BreadcrumbList`.
- `JsonLd` nhúng script; URL ảnh `/media/...` được đổi thành tuyệt đối bằng `absoluteUrl`.

### 4.5 Pháp lý (`src/lib/legal.ts`)

`LEGAL_DOCS` (`terms`, `privacy`, `shippingReturns` → `/terms`, `/privacy`, `/shipping-returns`), `LEGAL_HUB_PATH = "/legal"`, `LEGAL_LAST_UPDATED = "2026-10-11"`, `LEGAL_CONTACT` (`email` = `CONTACT_EMAIL` `contact@doovan.vn`; `phone`, `address` đang là placeholder `[hotline]`, `[business address]`). Xem [legal](../storefront/legal.md).

### 4.6 Biến môi trường

`NEXT_PUBLIC_SITE_URL` (không có dấu `/` cuối), `VERCEL_ENV`.

- `productJsonLd` bỏ `offers` khi sản phẩm có badge `custom_order` (`hasPublicPrice`).
