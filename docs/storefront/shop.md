# Shop (danh mục, danh mục con, lưới sản phẩm)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]/shop`, `/shop/[category]`, `/shop/[category]/[subcategory]` · **Cập nhật:** 2026-10-14
> **Code:** `(public)/shop/` — `page.tsx`, `[category]/page.tsx`, `[category]/[subcategory]/page.tsx`, `_components/{ShopHero,BreadcrumbNav,CategoryGrid,SubcategoryChips,ShopProductsClient,ShopFilters,ProductGrid,ProductCard}.tsx`, `_lib/server-fetchers.ts`
> **i18n:** `public.shop` (`pages.index|category|subcategory`, `components.*`), `common.productBadge`
> Trang chi tiết sản phẩm: [product-detail](./product-detail.md)

## 1. Tóm tắt module

Các trang duyệt sản phẩm của cửa hàng theo ba cấp: toàn bộ cửa hàng → một danh mục → một danh mục con. Dữ liệu được lấy ở server (ISR 60 s) rồi lọc/sắp xếp/"Xem thêm" ở client.

## 2. Phục vụ gì / việc cần làm

Giúp khách tìm sản phẩm: xem các danh mục, lọc theo giá/size/màu, sắp xếp, đưa sản phẩm vào yêu thích hoặc thêm nhanh vào giỏ ngay từ thẻ sản phẩm.

## 3. Submodule & chức năng hiện có

| Thành phần | Chức năng |
|---|---|
| `/shop` | Hero (banner từ site config `SHOP_HERO_BANNERS`), breadcrumb, lưới danh mục, danh sách tất cả sản phẩm có lọc/sắp xếp |
| `/shop/[category]` | Hero lấy ảnh của sản phẩm đầu tiên, breadcrumb, chip danh mục con, danh sách sản phẩm có lọc/sắp xếp |
| `/shop/[category]/[subcategory]` | Hero, breadcrumb, chip (đánh dấu mục hiện tại), lưới sản phẩm (không lọc) + số lượng |
| `ShopHero` | Hero nền banner xoay vòng (hoặc màu trơn), hiệu ứng GSAP + parallax |
| `CategoryGrid` | Thẻ danh mục (ảnh hero admin đặt), > 4 danh mục → `Carousel` |
| `SubcategoryChips` | Chip "Tất cả" + từng danh mục con kèm số sản phẩm |
| `ShopProductsClient` + `ShopFilters` | Lọc giá/size/màu/số sao tối thiểu, 7 kiểu sắp xếp (gồm "Đánh giá cao nhất", "Nhiều đánh giá nhất"), "Xem thêm" 24 sản phẩm/lần |
| `ProductGrid` + `ProductCard` | Lưới 2/3/4 cột, thẻ có badge, wishlist, nút giỏ |

## 4. Chi tiết

### 4.1 Trang & nguồn dữ liệu (server, `server-fetchers.ts`)

| Trang | Fetch | Ghi chú |
|---|---|---|
| `/shop` | `getCategories()`, `getAllProducts()`, `getBannerConfig("SHOP_HERO_BANNERS")` | `getAllProducts` gọi `/api/products` không truyền `limit` nên số sản phẩm nhận về theo mặc định của BE (sitemap ghi chú là 24); lọc/sắp xếp ở client chỉ áp dụng cho số sản phẩm đã nhận |
| `/shop/[category]` | `getCategoryBySlug`, `getProducts(slug)` | Không có category → `notFound()` |
| `/shop/[category]/[subcategory]` | `getSubcategory`, `getProducts(cat, sub)` | Không có → `notFound()` |

- `generateStaticParams` sinh sẵn đường dẫn cho mọi danh mục / cặp danh mục–danh mục con từ `getCategories()`.
- Metadata: tiêu đề/mô tả theo `public.shop.pages.<page>.meta`; danh mục/danh mục con dùng ảnh sản phẩm đầu tiên làm ảnh chia sẻ; thêm JSON-LD `BreadcrumbList` mỗi trang. Chưa có danh mục → title "not found" (`common.notFound`).
- Hero của danh mục/danh mục con dùng ảnh sản phẩm đầu tiên (`banners = [{ image }]`); không có sản phẩm → hero màu trơn.

### 4.2 Lọc & sắp xếp (client)

`ShopProductsClient` giữ `ActiveFilters { sort, minPrice, maxPrice, sizes[], colors[], minRating }` và tính `filteredProducts` bằng `useMemo`:

- giá trong `[minPrice, maxPrice]`; size: sản phẩm có ít nhất một size được chọn; màu: có ít nhất một màu (theo `name`) được chọn;
- số sao: `minRating` (1–4, nút "Từ N sao trở lên", bấm lại để bỏ) chỉ giữ sản phẩm có `ratingAverage` ≥ N; sản phẩm chưa có đánh giá không bao giờ khớp;
- sắp xếp: `price`, `-price`, `name`, `-name` (so sánh `localeCompare(locale)`), `-ratingAverage` (điểm giảm dần, hòa thì nhiều đánh giá hơn) và `-ratingCount` (nhiều đánh giá nhất, hòa thì điểm cao hơn) — sản phẩm chưa có đánh giá luôn ở cuối (`compareRated`), `-createdAt` giữ thứ tự server (mới nhất trước, mặc định `DEFAULT_SORT`). Như các bộ lọc khác, chạy ở client trên số sản phẩm đã nhận (cùng giá trị `ratingAverage` / `ratingCount` của BE, không tính lại).
- "Xem thêm": hiển thị 24 sản phẩm (`ITEMS_PER_PAGE`), mỗi lần bấm +24, nút ghi số còn lại; đổi bộ lọc thì quay về 24.
- `ShopFilters`: thanh công cụ (số sản phẩm sau lọc, dropdown sắp xếp, nút Filter mở panel). Panel: khoảng giá (placeholder = min/max thực tế của danh sách, tối thiểu 0–200), số sao (4 / 3 / 2 / 1 sao trở lên), danh sách size (gộp từ sản phẩm, sắp tăng), danh sách màu (tên + hex), nút "Clear all" khi có lọc. Số bộ lọc đang bật tính theo nhóm (giá, số sao, size, màu).
- Cú pháp sort dùng cùng quy ước BE (`field` / `-field`) dù xử lý ở client (nhãn `public.shop.components.filters.sort.*`).

### 4.3 Thẻ sản phẩm (`ProductCard`)

- Ảnh `aspect 2/3` (`images[0]`), badge (`PRODUCT_CARD_BADGE_STYLES`, nhãn `common.productBadge`), tên, giá (+ giá gốc gạch ngang), rồi `ProductRating compact` (sao + "4,5 (12)" từ `ratingAverage` / `ratingCount` của sản phẩm, không gọi thêm API; ẩn khi chưa có đánh giá). Toàn thẻ là link tới `/shop/<cat>/<sub>/<id>`.
- Wishlist: nút tim → `requireAuth(…, "saveToWishlist")` rồi `toggleWishlistItem` (Redux) + `syncAddToWishlist` / `syncRemoveFromWishlist` (BE) + toast `info`. Trạng thái tim được đồng bộ với store sau khi mount (tránh hydration mismatch).
- Nút giỏ (`ProductBagButton`): dưới 640 px là nút icon cạnh nút tim (chỉ render khi `!useBreakpoint().isDesktop`, và `sm:hidden`); từ 640 px là nút chữ hiện ở đáy ảnh khi hover. Bấm → `requireAuth(…, "addToBag")` → `openQuickAdd(product)` (xem [cart](./cart.md)). Sản phẩm `sold_out` khóa nút; `custom_order` dẫn tới [contact](./contact.md).
- Sản phẩm không có `category`/`subcategory` có URL chứa phân đoạn rỗng (dữ liệu BE luôn kèm quan hệ này).

### 4.4 Lưới & hiệu ứng

`ProductGrid`: `grid-cols-2 sm:3 lg:4`; GSAP ScrollTrigger làm hiện lần lượt (opacity + y, stagger 0.06 s); không có sản phẩm → khối "sắp ra mắt" (`comingSoon`). `CategoryGrid`: GSAP stagger thẻ; `categories.length > MAX_INLINE_CATEGORIES (4)` → `Carousel` (`slidesPerView {base 2, sm 3, lg 4}`), ngược lại lưới; thẻ có ảnh `heroImage` hoặc nền `--bg-section-3`, hiện số sản phẩm (`sum(subcategory.count)`) khi hover. `ShopHero`: `useBannerRotation` + `BannerFade` + `CarouselDots`; GSAP timeline vào cảnh (zoom nền 1.1 → 1, chữ stagger) và parallax nền khi cuộn (`y: 18%`, `scrub`).

### 4.5 Phụ thuộc

Redux `wishlist`, `useQuickAdd`, `useAuthAction`, `Carousel`, `BannerFade`, `JsonLd`, `useBreakpoint`. API: `GET /api/products`, `/api/categories`, `/api/site-config?key=`.

- Sản phẩm badge `custom_order` không hiện giá: `ProductCard` hiện `common.priceOnRequest` thay cho giá và giá gốc (`hasPublicPrice`); khoảng giá trong `ShopFilters` bỏ qua các sản phẩm này.
