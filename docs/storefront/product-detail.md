# Product detail (trang chi tiết sản phẩm)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]/shop/[category]/[subcategory]/[productId]` · **Cập nhật:** 2026-10-12
> **Code:** `(public)/shop/[category]/[subcategory]/[productId]/` — `page.tsx`, `_components/{ProductDetailClient,ReviewsSection,ShippingAccordion,SizeGuideModal,ShareButtons}.tsx`
> **i18n:** `public.product` (`meta`, `detail`, `reviews`, `shipping`, `sizeGuideModal`, `share`), `common.productBadge`

## 1. Tóm tắt module

Trang một sản phẩm: bộ sưu tập ảnh, thông tin, chọn size/màu/số lượng, thêm vào giỏ hoặc wishlist, bảng size, vận chuyển & đổi trả, đánh giá và sản phẩm liên quan.

## 2. Phục vụ gì / việc cần làm

Giúp khách quyết định mua: xem rõ sản phẩm, chọn đúng biến thể, đưa vào giỏ. Với sản phẩm không mua qua giỏ (hết hàng, đặt may) trang đổi hành động tương ứng.

## 3. Submodule & chức năng hiện có

| Thành phần | Chức năng |
|---|---|
| `page.tsx` (server) | Lấy sản phẩm + sản phẩm liên quan + danh mục/danh mục con, metadata, JSON-LD `Product` + `BreadcrumbList`, `generateStaticParams` |
| Gallery | `Carousel` ảnh (mũi tên khi hover, chấm overlay) + thumbnail (≥ sm) điều khiển carousel qua `carouselRef`; phím ←/→ |
| Lựa chọn | Size (nút), màu (swatch theo `hex`), số lượng 1–10 |
| Hành động chính | Thêm vào giỏ / Hết hàng / Đặt may theo `purchaseMode` |
| Wishlist, chia sẻ | Nút tim; nút chia sẻ (Web Share API, hoặc sao chép link + toast) |
| Chi tiết | Chất liệu, hướng dẫn giặt, danh mục — danh mục con |
| `SizeGuideModal` | Bảng size theo danh mục (`GET /api/size-guides/:category`) |
| `ShippingAccordion` | Phương thức vận chuyển, ngưỡng free ship, chính sách đổi trả |
| `ReviewsSection` | Điểm trung bình, số đánh giá, danh sách đánh giá, xem thêm |
| Liên quan | Tối đa 4 sản phẩm liên quan |

## 4. Chi tiết

### 4.1 Server (`page.tsx`)

- `getProductWithRelated(id)` (→ `GET /api/products/:id` trả `data` + `related`) và `getSubcategory(cat, sub)`; thiếu một trong hai → `notFound()`. Chừa 80 px phía trên cho header cố định.
- `generateStaticParams` từ `getAllProducts()` (số sản phẩm theo mặc định của BE).
- Metadata: title `public.product.meta.title` (tên sản phẩm), description = `product.description`, ảnh chia sẻ = `images[0]`.
- JSON-LD: `productJsonLd` + `breadcrumbJsonLd` (Home › Shop › Category › Subcategory › Product).

### 4.2 Hành vi mua (`ProductDetailClient`)

- `purchaseMode = getPurchaseMode(product.badge)`:
  - `cart`: cần chọn đủ size **và** màu mới bật nút; gợi ý còn thiếu gì (`hintBoth|hintSize|hintColor`). Bấm → `requireAuth(...,"addToBag")` rồi `addItem(item, quantity)` (Redux) + `syncAddToCartItem` (BE, nền) + `trackEvent("add_to_cart")` + toast có link tới `/cart`; nút hiện "Đã thêm" 2.2 s.
  - `soldOut`: nút khóa "Hết hàng" + `soldOutHint`.
  - `customOrder`: nút "Đặt may" → `router.push(buildOrderInquiryHref(product.id))` (`/contact?product=<id>`) + `customOrderHint`.
- Màu được lưu bằng `hex`; tên màu tra từ `product.colors` khi thêm vào giỏ.
- `trackEvent("view_product", { productId, price })` mỗi lần mở trang.
- Wishlist: `requireAuth(…,"saveToWishlist")` → `toggleWishlistItem` + `syncAdd/RemoveWishlist` + toast `info`.
- Chia sẻ (nút trong cụm hành động): dùng `navigator.share` nếu có, ngược lại `clipboard.writeText` + toast `linkCopied`. URL dựng từ `location.origin + /<locale>/shop/...`.

### 4.3 Bố cục

Hai cột ≥ `lg`: trái (tối đa 55%, `sticky`) là gallery, phải (45%) là thông tin cuộn riêng; dưới là đánh giá và sản phẩm liên quan (lưới 2/4 cột, mỗi thẻ là link kèm ảnh, tên, giá — không phải `ProductCard`). Breadcrumb Shop › Category › Subcategory ở đầu cột phải. Badge có nhãn `public.product.detail.badge.<badge>` và style `PRODUCT_DETAIL_BADGE_STYLES`.

### 4.4 Các khối phụ

- **`SizeGuideModal`**: chỉ gọi API khi mở (`useSizeGuide(isOpen ? category : null)`), portal vào `body`, đóng bằng Esc/nút; bảng theo `columns` + `rows`, mẹo (`tips`) và trạng thái `loading/unavailable`.
- **`ShippingAccordion`** (`useShipping`, cache 5 phút): tiêu đề, dòng "miễn phí vận chuyển từ <ngưỡng>", từng phương thức (tên, mô tả, thời gian, giá hoặc "Miễn phí"), phần chính sách đổi trả.
- **`ReviewsSection`** (`useReviews(productId)`): trung bình sao (`decimal1`), tổng số đánh giá, từng đánh giá (avatar, tác giả, nhãn "đã xác minh", sao, ngày, tiêu đề, nội dung); nút "Hiện tất cả/Thu gọn". Chỉ đọc — không có form gửi đánh giá.
- **`ShareButtons`** (sao chép link, chia sẻ native, X, Pinterest): đã có file nhưng hiện chưa được trang nào import.

### 4.5 Hiện trạng cần biết

- `SizeGuideModal` còn một dòng "Measurements in {unit}" cứng bằng tiếng Anh (không qua i18n).
- `QuickAddDrawer` (thêm nhanh từ thẻ sản phẩm) lặp lại logic chọn size/màu/số lượng của trang này — xem [cart](./cart.md).
- Sản phẩm badge `custom_order` không hiện giá: dòng giá chính và giá ở "sản phẩm liên quan" hiện `common.priceOnRequest` (`hasPublicPrice`); JSON-LD không có `Offer` cho sản phẩm này.
