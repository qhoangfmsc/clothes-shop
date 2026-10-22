# SEO — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-22 · **Trạng thái:** Implemented
> **Doc:** [platform/seo](../../docs/platform/seo.md) · **Test:** `tests/platform/seo/`

## 1. Bối cảnh & mục tiêu

Công cụ tìm kiếm chỉ thấy những gì `robots.txt`, `sitemap.xml` và JSON-LD nói. Sai ở đây làm lộ trang riêng tư, bỏ sót sản phẩm, báo sai giá hoặc để bản preview bị index. Module gồm `robots.ts`, `sitemap.ts`, `structured-data.ts`, `site-url.ts`, `brand.ts`; metadata theo ngôn ngữ nằm ở [i18n](./i18n.md) (đã phủ). Chưa có test nào.

**Mục tiêu.** Khóa hành vi hiện tại cho cả đường đúng và đường lỗi, kèm kiểm thử đột biến; ghi các điểm đáng ngờ ở mục 7. Không đổi code.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Test cho `robots`, `sitemap`, `structured-data`, `site-url`, `brand` | Sửa code: điểm đáng ngờ chờ chủ dự án quyết định |
| Test thành phần `JsonLd` (thuộc [ui-kit](./ui-kit.md) nhưng là một phần hợp đồng SEO: dữ liệu không thể đóng thẻ script) | Các thành phần còn lại của ui-kit (batch 3) |
| Sitemap qua MSW (API thật bị thay bằng API giả) | Gọi Google Search Console hay kiểm tra index thật |

## 3. Hợp đồng

- **`SITE_URL`**: `NEXT_PUBLIC_SITE_URL` bỏ mọi dấu `/` cuối; không đặt thì `http://localhost:3000`. Đọc một lần lúc nạp module.
- **Thương hiệu**: `BRAND_NAME = "DOOVAN"`, `BRAND_ALTERNATE_NAME = "Doovan"`, `BRAND_FOUNDING_YEAR = "2026"`.
- **robots**: sản xuất (hoặc không chạy trên Vercel): `allow /`, `disallow` `/api/` cộng `/<locale><đường dẫn riêng tư>` cho mọi locale (`/admin`, `/login`, `/cart`, `/checkout`, `/account`, `/orders`, `/returns`, `/reviews`, `/wishlist`, `/unauthorized`), `sitemap = SITE_URL/sitemap.xml`. Khi `VERCEL_ENV` có giá trị khác `production` (preview, development): chặn toàn bộ (`disallow /`) và không khai sitemap. Giá trị `VERCEL_ENV` đọc lúc nạp module.
- **sitemap** (`revalidate = 3600`): mỗi đường dẫn có một entry cho mỗi locale, kèm `alternates.languages` (mọi locale và `x-default` trỏ locale mặc định). Đường dẫn tĩnh: trang chủ, `/shop`, `/collections`, `/new-in`, `/about`, `/contact` và ba trang pháp lý; trang hub `/legal` không có. `priority`: trang chủ 1, trang tĩnh 0.8, sản phẩm 0.9, danh mục và bộ sưu tập 0.7, danh mục con 0.6. `lastModified`: trang chủ, `/shop`, `/new-in` lấy ngày cập nhật mới nhất của sản phẩm; `/collections` của bộ sưu tập; danh mục và danh mục con theo sản phẩm mới nhất bên trong; sản phẩm và bộ sưu tập theo `updatedAt` của chính nó. Danh mục con không có sản phẩm bị bỏ (trừ khi danh sách sản phẩm bị lỗi). Sản phẩm thiếu danh mục hoặc danh mục con bị bỏ. Sản phẩm và bộ sưu tập kèm ảnh tuyệt đối. Sản phẩm lấy theo trang 200, dừng khi hết dữ liệu, khi đủ `total` hoặc sau 100 trang. Mỗi nguồn (danh mục, bộ sưu tập, sản phẩm) lỗi riêng thì chỉ mất phần của nó.
- **structured-data**: `absoluteUrl` giữ URL tuyệt đối, thêm `SITE_URL` cho đường dẫn tương đối; `pageUrl(locale, path)`; `breadcrumbJsonLd` (vị trí từ 1, URL tuyệt đối theo locale); `siteNavigationJsonLd`; `productJsonLd`: loại `Product`, ảnh tuyệt đối, thương hiệu DOOVAN, `category`/`material`/`color` chỉ khi có, `offers` chỉ khi `hasPublicPrice(badge)` (khác `custom_order`) với `priceCurrency` và `price` theo ngôn ngữ (`vi`: VND và `priceVnd`; khác: USD và `priceUsd`), luôn `InStock` và `NewCondition`, không có `aggregateRating`; `siteJsonLd`: hai nút `WebSite` và `ClothingStore` nối bằng `@id = SITE_URL/#organization`.
- **`JsonLd`**: thẻ `<script type="application/ld+json">`; mọi ký tự `<` trong dữ liệu bị đổi thành `<` nên không thể đóng thẻ.

## 4. Thiết kế

```
robots.ts / sitemap.ts (route của Next) ──► routing (locales) · SITE_URL
sitemap.ts ──► server-fetchers (API) ──► structured-data.absoluteUrl · legal (LEGAL_DOCS)
page ──► structured-data (productJsonLd, breadcrumbJsonLd, siteJsonLd…) ──► JsonLd (script)
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Graceful degradation** (`Promise.allSettled`) trong sitemap | Một nguồn lỗi không làm mất cả sitemap | Ném lỗi, sitemap 500 |
| **Functional core**: mọi hàm JSON-LD là hàm thuần nhận dữ liệu và trả object | Test không cần render; dùng được ở server | Dựng JSON trong component |
| **Một nguồn sự thật** cho tên thương hiệu và origin (`brand.ts`, `site-url.ts`) | Không có hai cách viết tên; không có URL gốc nằm rải rác | Chuỗi cứng ở từng trang |
| **Thoát an toàn khi nhúng** (`JsonLd` thay `<`) | Tên sản phẩm do admin nhập không thể chèn thẻ | Tin dữ liệu |

### Kiến trúc

Route `robots.ts`, `sitemap.ts` do Next gọi; chúng phụ thuộc `routing`, `site-url` và fetcher của data layer. `structured-data.ts` ở `lib/` (dùng bởi nhiều trang), không phụ thuộc React. Giá trị môi trường (`SITE_URL`, `VERCEL_ENV`) đọc một lần ở mức module.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `robots` chỉ lo chặn; `sitemap` chỉ lo liệt kê; `structured-data` chỉ dựng dữ liệu có cấu trúc |
| O | Thêm trang tĩnh = thêm vào `STATIC_PATHS`; thêm locale = thêm vào `routing` |
| L | `localizedEntries` cho mọi loại trang cùng một dạng entry |
| I | Mỗi hàm JSON-LD nhận đúng các trường nó dùng |
| D | `sitemap` phụ thuộc fetcher của data layer, không gọi `fetch` trực tiếp |

### Conventions

Tiếng Anh cho code; chữ thương hiệu không dịch. Test đặt `NEXT_PUBLIC_SITE_URL`/`VERCEL_ENV` bằng `vi.stubEnv` rồi nạp lại module.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (người gọi các route này luôn là trình thu thập chưa đăng nhập; `robots` chặn các URL của khu đăng nhập, danh tính `khách` ở bảng chỉ để nói rõ người gọi) · permission = không (không có quyền nào ở tầng SEO)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| SEO-1 | Hằng thương hiệu; `SITE_URL` bỏ dấu `/` cuối | đúng | — | unit | `tests/platform/seo/site-url.test.ts` |
| SEO-1E | `SITE_URL` mặc định khi chưa đặt biến; nhiều dấu `/` cuối | lỗi | — | unit | `tests/platform/seo/site-url.test.ts` |
| SEO-2 | `robots` sản xuất: cho phép `/`, chặn `/api/` và khu riêng tư của mọi locale, khai sitemap | đúng | khách | unit | `tests/platform/seo/robots.test.ts` |
| SEO-2E | `robots` ở preview/development chặn toàn bộ, không khai sitemap; `VERCEL_ENV` trống coi như sản xuất | lỗi | khách | unit | `tests/platform/seo/robots.test.ts` |
| SEO-3 | `absoluteUrl`, `pageUrl`, `breadcrumbJsonLd`, `siteNavigationJsonLd` | đúng | — | unit | `tests/platform/seo/structured-data.test.ts` |
| SEO-4 | `productJsonLd`: giá VND ở `vi`, USD ở ngôn ngữ khác, ảnh tuyệt đối, thương hiệu | đúng | — | unit | `tests/platform/seo/structured-data.test.ts` |
| SEO-4E | `productJsonLd`: sản phẩm đặt riêng không có `offers`; trường tùy chọn bị bỏ khi thiếu | lỗi | — | unit | `tests/platform/seo/structured-data.test.ts` |
| SEO-5 | `siteJsonLd`: `WebSite` và `ClothingStore` nối bằng `@id`, liên hệ, mạng xã hội | đúng | — | unit | `tests/platform/seo/structured-data.test.ts` |
| SEO-6 | `JsonLd` nhúng JSON hợp lệ và thay `<` để không đóng được thẻ script | đúng | — | component | `tests/platform/seo/json-ld.test.tsx` |
| SEO-6E | Dữ liệu chứa `</script>` không thoát được | lỗi | — | component | `tests/platform/seo/json-ld.test.tsx` |
| SEO-7 | `sitemap`: trang tĩnh, danh mục, danh mục con, bộ sưu tập, sản phẩm; hreflang; ưu tiên; ngày sửa; ảnh | đúng | khách | integration | `tests/platform/seo/sitemap.test.ts` |
| SEO-7P | `sitemap`: duyệt hết các trang sản phẩm và dừng đúng lúc | đúng | khách | integration | `tests/platform/seo/sitemap.test.ts` |
| SEO-7E | `sitemap`: mỗi nguồn lỗi chỉ mất phần của nó; danh mục con rỗng và sản phẩm thiếu danh mục bị bỏ | lỗi | khách | integration | `tests/platform/seo/sitemap.test.ts` |

Coverage: các file của module ≥ 90% dòng trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| `NEXT_PUBLIC_GOOGLE_BUSINESS_URL` được doc và comment nói là ghi đè link Google Business | Không có code nào đọc biến này; `GOOGLE_BUSINESS_URL` là hằng cố định |
| Sản phẩm `sold_out` vẫn được khai `InStock` | Theo thiết kế ghi trong code (API công khai không có tồn kho), nhưng Google có thể hiển thị sai tình trạng |
| Sitemap duyệt sản phẩm tuần tự, tối đa 100 trang × 200 | Trên 20.000 sản phẩm sẽ bị cắt; mỗi lần dựng gọi API nhiều lần |
| `SITE_URL` và `VERCEL_ENV` đọc lúc nạp module | Đổi biến cần khởi động lại; trên Vercel không ảnh hưởng vì mỗi bản deploy có môi trường riêng |
| Doc ghi `LEGAL_LAST_UPDATED` là `2026-10-11` | Code là `2026-10-13`; doc được sửa |

Thay đổi nhìn thấy được: không.

## 8. Lịch sử thay đổi

- 2026-10-22 · Viết spec và test khóa hành vi hiện tại (batch 1). Không đổi code.
- 2026-10-22 · Phủ test (60 ca) và kiểm thử đột biến 34/34. Doc sửa: `LEGAL_LAST_UPDATED` và việc `NEXT_PUBLIC_GOOGLE_BUSINESS_URL` chưa được đọc ở đâu.
