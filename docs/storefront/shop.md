# Shop (danh mục, danh mục con, lưới sản phẩm)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]/shop`, `/shop/[category]`, `/shop/[category]/[subcategory]` · **Cập nhật:** 2026-10-18
> **Code:** `(public)/shop/` — `page.tsx`, `[category]/page.tsx`, `[category]/[subcategory]/page.tsx`, `_components/{ShopHero,BreadcrumbNav,CategoryGrid,SubcategoryChips,ShopProductsClient,ShopFilters,ProductGrid,ProductCard}.tsx`, `_common/constants.ts`, `_lib/server-fetchers.ts`
> **i18n:** `public.shop` (`pages.index|category|subcategory`, `components.*`), `common.productBadge`
> Trang chi tiết sản phẩm: [product-detail](./product-detail.md)

## 1. Tóm tắt module

Các trang duyệt sản phẩm của cửa hàng theo ba cấp: toàn bộ cửa hàng → một danh mục → một danh mục con. Dữ liệu được lấy ở server (ISR 60 s) (trang đầu); lọc/sắp xếp/"Xem thêm" gọi tiếp `GET /api/products` từ client, mỗi lần chỉ lấy phần cần thêm.

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
| `ShopProductsClient` + `ShopFilters` | Lọc giá/size/màu/số sao tối thiểu, 7 kiểu sắp xếp (gồm "Đánh giá cao nhất", "Nhiều đánh giá nhất"), "Xem thêm" 25 sản phẩm/lần (`SHOP_PAGE_SIZE` = `LIST_DEFAULT_LIMIT`) (chỉ tải trang kế, giữ nguyên các sản phẩm đã hiện) |
| `ProductGrid` + `ProductCard` | Lưới 2/3/4/5 cột, thẻ có badge, wishlist, nút giỏ |

## 4. Chi tiết

### 4.1 Trang & nguồn dữ liệu (server, `server-fetchers.ts`)

| Trang | Fetch | Ghi chú |
|---|---|---|
| `/shop` | `getCategories()`, `getProductsWithParams({ limit: SHOP_PAGE_SIZE })`, `getBannerConfig("SHOP_HERO_BANNERS")` | Trang đầu 25 sản phẩm kèm `total`; các trang sau do client lấy |
| `/shop/[category]` | `getCategoryBySlug`, `getProductsWithParams({ category, limit: SHOP_PAGE_SIZE })` | Không có category → `notFound()` |
| `/shop/[category]/[subcategory]` | `getSubcategory`, `getProductsWithParams({ category, subcategory, limit: SHOP_PAGE_SIZE })` | Không có → `notFound()`; lưới dùng cùng `ShopProductsClient` (lọc, sắp xếp, "Xem thêm" từng trang 25) với `scope` `{ category, subcategory }`; dòng "N sản phẩm" ở tiêu đề là `total` của BE |

- `generateStaticParams` sinh sẵn đường dẫn cho mọi danh mục / cặp danh mục–danh mục con từ `getCategories()`.
- Metadata: tiêu đề/mô tả theo `public.shop.pages.<page>.meta`; danh mục/danh mục con dùng ảnh sản phẩm đầu tiên làm ảnh chia sẻ; thêm JSON-LD `BreadcrumbList` mỗi trang. Chưa có danh mục → title "not found" (`common.notFound`).
- Hero của danh mục/danh mục con dùng ảnh sản phẩm đầu tiên (`banners = [{ image }]`); không có sản phẩm → hero màu trơn.

### 4.2 Lọc, sắp xếp & "Xem thêm" (BE phân trang)

`ShopProductsClient({ initialProducts, initialTotal, scope?, heading })` nhận trang đầu từ server và giữ `ActiveFilters { sort, minPrice, maxPrice, sizes[], colors[], minRating }`. Lọc và sắp xếp do BE làm (`GET /api/products` qua `fetchProductPage`, `limit` = `SHOP_PAGE_SIZE` = 25, kèm `scope` của trang: `category`, `subcategory` hoặc `badge`):

- giá: `minPrice`/`maxPrice` (VND); size: `sizes=S,M` (sản phẩm có ít nhất một size); màu: `colors=Red,Blue` (theo tên màu); số sao: `minRating` (1–4, nút "Từ N sao trở lên", bấm lại để bỏ; sản phẩm chưa có đánh giá bị BE loại);
- sắp xếp: `sort` = `-createdAt` (mặc định, `DEFAULT_SORT`), `price`, `-price`, `name`, `-name`, `-ratingAverage`, `-ratingCount` (BE xử lý, FE không tính lại);
- đổi bộ lọc hoặc sắp xếp: lấy trang 1 của kết quả mới và **thay** lưới; lượt trả lời của yêu cầu cũ bị bỏ (`requestRef`); lỗi → toast `loadFailed`;
- "Xem thêm": chỉ gọi trang kế (`page + 1`) và **nối** vào cuối `products`; các sản phẩm đã hiện giữ nguyên (không tải lại, không chạy lại hiệu ứng). Nút hiện khi `products.length < total` (`total` của BE), chỉ ghi "Xem thêm" (không kèm số), đang tải thì ghi "Đang tải…" và khóa; trùng id được loại;
- lưới (`ProductGrid`) chỉ chạy hiệu ứng hiện dần cho thẻ mới thêm (so danh sách id với lần trước), thẻ cũ đứng yên; thẻ mới ẩn đến khi vào khung nhìn (`IntersectionObserver`, đọc vị trí thật của từng thẻ nên layout đổi sau khi tải cũng không làm thẻ bị ẩn mãi), rồi GSAP cho hiện lần lượt.
- `ShopFilters`: thanh công cụ (số sản phẩm sau lọc, dropdown sắp xếp, nút Filter mở panel). Panel: khoảng giá là các mức cố định định nghĩa theo VND (`PRICE_BANDS`: dưới 500.000 VNĐ, 500.000–1.000.000 VNĐ, 1.000.000–2.000.000 VNĐ, trên 2.000.000 VNĐ; chọn một, bấm lại để bỏ; nhãn `priceBand.*` đổi chữ theo ngôn ngữ nhưng số luôn là VND, FE không quy đổi sang USD), số sao (4 / 3 / 2 / 1 sao trở lên), danh sách size và màu (gộp từ mọi sản phẩm đã tải của trang, chỉ tăng thêm, nên lựa chọn không biến mất khi lọc; size sắp tăng, màu gồm tên + hex), nút "Clear all" khi có lọc. Số bộ lọc đang bật tính theo nhóm (giá, số sao, size, màu); số sản phẩm ở thanh công cụ là `total` của BE.
- Cú pháp sort dùng quy ước BE (`field` / `-field`); nhãn `public.shop.components.filters.sort.*`.

### 4.3 Thẻ sản phẩm (`ProductCard`)

- Ảnh `aspect 2/3` (`images[0]`), badge (`PRODUCT_CARD_BADGE_STYLES`, nhãn `common.productBadge`), tên, giá theo ngôn ngữ (+ giá gốc gạch ngang khi `originalPriceVnd` không `null`), rồi `ProductRating compact` (sao + "4,5 (12)" từ `ratingAverage` / `ratingCount` của sản phẩm, không gọi thêm API; ẩn khi chưa có đánh giá). Toàn thẻ là link tới `/shop/<cat>/<sub>/<id>`.
- Wishlist: nút tim → `requireAuth(…, "saveToWishlist")` rồi `toggleWishlistItem` (Redux) + `syncAddToWishlist` / `syncRemoveFromWishlist` (BE) + toast `info`. Trạng thái tim được đồng bộ với store sau khi mount (tránh hydration mismatch).
- Nút giỏ (`ProductBagButton`): dưới 640 px là nút icon cạnh nút tim (chỉ render khi `!useBreakpoint().isDesktop`, và `sm:hidden`); từ 640 px là nút chữ hiện ở đáy ảnh khi hover. Bấm → `requireAuth(…, "addToBag")` → `openQuickAdd(product)` (xem [cart](./cart.md)). Sản phẩm `sold_out` khóa nút; `custom_order` dẫn tới [contact](./contact.md).
- Sản phẩm không có `category`/`subcategory` có URL chứa phân đoạn rỗng (dữ liệu BE luôn kèm quan hệ này).

### 4.4 Lưới & hiệu ứng

`ProductGrid`: `grid-cols-2 sm:3 lg:4 xl:5` (từ 1280 px là 5 cột, khớp trang 25 sản phẩm = 5 hàng đầy); thẻ mới hiện lần lượt khi vào khung nhìn (`IntersectionObserver` + GSAP opacity + y, stagger 0.06 s); không có sản phẩm → khối "sắp ra mắt" (`comingSoon`). `CategoryGrid`: GSAP stagger thẻ; `categories.length > MAX_INLINE_CATEGORIES (4)` → `Carousel` (`slidesPerView {base 2, sm 3, lg 4}`), ngược lại lưới; thẻ có ảnh `heroImage` hoặc nền `--bg-section-3`, hiện số sản phẩm (`sum(subcategory.count)`) khi hover. `ShopHero`: `useBannerRotation` + `BannerFade` + `CarouselDots`; GSAP timeline vào cảnh (zoom nền 1.1 → 1, chữ stagger) và parallax nền khi cuộn (`y: 18%`, `scrub`).

### 4.5 Phụ thuộc

Redux `wishlist`, `useQuickAdd`, `useAuthAction`, `Carousel`, `BannerFade`, `JsonLd`, `useBreakpoint`. API: `GET /api/products`, `/api/categories`, `/api/site-config?key=`.

- Sản phẩm badge `custom_order` không hiện giá: `ProductCard` hiện `common.priceOnRequest` thay cho giá và giá gốc (`hasPublicPrice`); các mức giá của `ShopFilters` là cố định nên không phụ thuộc giá sản phẩm.
