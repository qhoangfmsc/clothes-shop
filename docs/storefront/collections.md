# Collections (bộ sưu tập — danh sách & chi tiết)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]/collections`, `/[locale]/collections/[slug]` · **Cập nhật:** 2026-10-12
> **Code:** `(public)/collections/` — `page.tsx`, `loading.tsx`, `_components/CollectionsClient.tsx`, `[slug]/page.tsx`, `[slug]/loading.tsx`, `[slug]/_components/CollectionDetailClient.tsx`
> **i18n:** `public.collections` (`meta`, `detailMeta`, `list`, `detail`)
> Quản trị: [admin/collections](../admin/collections.md)

## 1. Tóm tắt module

Hai trang giới thiệu các bộ sưu tập (lookbook) theo phong cách editorial: trang danh sách với hero, dải chữ chạy ngang, dải thẻ cuộn ngang và các khối tạp chí cho ba bộ đầu; trang chi tiết với hero toàn màn hình, ba sản phẩm nổi bật, câu trích và lưới toàn bộ sản phẩm của bộ sưu tập.

## 2. Phục vụ gì / việc cần làm

Dẫn khách vào từng chiến dịch/chủ đề thay vì duyệt theo danh mục, tạo cảm xúc thương hiệu và đưa tới trang sản phẩm hoặc thêm nhanh vào giỏ.

## 3. Submodule & chức năng hiện có

| Thành phần | Chức năng |
|---|---|
| Danh sách (`CollectionsClient`) | Hero banner xoay (site config `COLLECTIONS_HERO_BANNERS`), marquee, dải thẻ ngang (desktop: ghim + cuộn ngang bằng GSAP; điện thoại/cảm ứng: `Carousel` tự chạy 2.5 s), 3 "editorial spread" |
| Chi tiết (`CollectionDetailClient`) | Hero ảnh bìa, "Lookbook" 3 sản phẩm đầu, khối trích dẫn, lưới "Shop the collection", liên kết quay lại tất cả bộ sưu tập |
| Trạng thái tải | `loading.tsx` cho cả hai route |

## 4. Chi tiết

### 4.1 Server

- Danh sách: `getCollections()` + `getBannerConfig("COLLECTIONS_HERO_BANNERS")` (ISR 60 s). JSON-LD `BreadcrumbList` (Home › Collections).
- Chi tiết: `getCollectionBySlug(slug)` (không có → `notFound()`) và `getCollectionProducts(slug)` (sản phẩm đi kèm trong cùng response `GET /api/collections?slug=`). `generateStaticParams` từ `getCollections()`. Metadata dùng `public.collections.detailMeta.title` (`{name}`), mô tả = `collection.description`, ảnh chia sẻ = `collection.image`. JSON-LD Home › Collections › <tên>.
- Bộ sưu tập có trong sitemap (kèm ảnh bìa).

### 4.2 Danh sách (`CollectionsClient`)

- Hero (`min-h` theo màn hình): `BannerFade` + `CarouselDots` + `useBannerRotation`; chữ `heroSeason`, `heroTitleLine1/2`, `heroSubtitle`, gợi ý cuộn `scroll`; hiệu ứng vào cảnh GSAP.
- Marquee: chuỗi `list.marquee` chạy ngang (`col-marquee-scroll` 25 s, tắt khi `prefers-reduced-motion`).
- Dải thẻ ngang (`CollectionCard`: ảnh 3:4, số thứ tự, tên, phụ đề, link `/collections/<slug>`): `gsap.matchMedia` — màn hình rộng + con trỏ chính xác thì ghim section và dịch track theo cuộn dọc (`scrub`); điện thoại/cảm ứng thì ẩn bản ghim và hiện `Carousel` (`carousel:` custom variant trong `globals.css`).
- `buildEditorialSections`: chỉ 3 bộ đầu, mỗi bộ một khối nền tint luân phiên (`--color-rose-milk`, `--color-vanilla`, `--color-lavender-cream`) có số `01…`, tên, mô tả, ảnh, nút "Khám phá bộ sưu tập"; GSAP reveal ảnh + chữ theo cuộn.

### 4.3 Chi tiết (`CollectionDetailClient`)

- Hero: ảnh bìa (`cd-hero__media`) zoom-out khi vào, parallax khi cuộn; mùa (`collection.season`), tên, phụ đề, đường kẻ, mô tả hiện lần lượt.
- **Lookbook**: `products.slice(0, min(3, n))` — mỗi sản phẩm là một khối lớn (badge, "01 / 03", tên, giá, "Xem chi tiết") link tới trang sản phẩm.
- Khối trích dẫn (`quoteBy` kèm `season`).
- **Shop the collection**: toàn bộ `products` (số lượng `pieces`), mỗi thẻ gồm ảnh, badge (`PRODUCT_CARD_BADGE_STYLES`), nút tim, `ProductBagButton` (icon trên mobile, chữ khi hover trên desktop), tên, giá.
- Nút giỏ → `openQuickAdd(product)` (không qua `requireAuth` ở màn hình này). Sản phẩm `sold_out`/`custom_order` xử lý theo `ProductBagButton`.
- Chân trang: link về `/collections` và `/shop` (`allCollections`, `exploreAll`).

### 4.4 Hiện trạng cần biết

- Nút tim ở lưới sản phẩm của trang chi tiết chỉ bật/tắt state cục bộ `likedMap` + hiện toast; **không** gọi store/BE wishlist như `ProductCard` ở [shop](./shop.md).
- Không có dữ liệu → các khối tương ứng không hiển thị nội dung; hero danh sách vẫn dùng màu nền `--bg-section-3` khi chưa có banner.
- Sản phẩm badge `custom_order` không hiện giá: khối lookbook và thẻ "Shop the collection" hiện `common.priceOnRequest` (`hasPublicPrice`).
