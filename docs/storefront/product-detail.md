# Product detail (trang chi tiết sản phẩm)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]/shop/[category]/[subcategory]/[productId]` · **Cập nhật:** 2026-10-12
> **Code:** `(public)/shop/[category]/[subcategory]/[productId]/` — `page.tsx`, `_components/{ProductDetailClient,ZoomableImage,ImageViewer,ReviewsSection,ShippingAccordion,SizeGuideModal,ShareButtons}.tsx`
> **i18n:** `public.product` (`meta`, `detail`, `reviews`, `shipping`, `sizeGuideModal`, `share`), `common.productBadge`

## 1. Tóm tắt module

Trang một sản phẩm: bộ sưu tập ảnh, thông tin, chọn size/màu/số lượng, thêm vào giỏ hoặc wishlist, bảng size, vận chuyển & đổi trả, đánh giá và sản phẩm liên quan.

## 2. Phục vụ gì / việc cần làm

Giúp khách quyết định mua: xem rõ sản phẩm, chọn đúng biến thể, đưa vào giỏ. Với sản phẩm không mua qua giỏ (hết hàng, đặt may) trang đổi hành động tương ứng.

## 3. Submodule & chức năng hiện có

| Thành phần | Chức năng |
|---|---|
| `page.tsx` (server) | Lấy sản phẩm + sản phẩm liên quan + danh mục/danh mục con, metadata, JSON-LD `Product` + `BreadcrumbList`, `generateStaticParams` |
| Gallery | `Carousel` ảnh (mũi tên khi hover, chấm overlay) + thumbnail (≥ sm) điều khiển carousel qua `carouselRef`; phím ←/→; mỗi ảnh là `ZoomableImage` (rê chuột để phóng to soi chi tiết; click/chạm mở `ImageViewer` toàn màn hình, xem 4.3) |
| Lựa chọn | Size (nút), màu (swatch theo `hex`), số lượng 1–10 — ẩn hoàn toàn với sản phẩm `custom_order` |
| Hành động chính | Thêm vào giỏ / Hết hàng / Đặt may theo `purchaseMode` |
| Wishlist, chia sẻ | Nút tim; nút chia sẻ (Web Share API, hoặc sao chép link + toast) |
| Chi tiết | Chất liệu, hướng dẫn giặt, danh mục — danh mục con. Sản phẩm `custom_order`: nhãn chất liệu là "Chất liệu thiết kế gốc" (`detail.materialCustomOrder`, cùng chữ với trang liên hệ) và không hiện dòng hướng dẫn giặt |
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
  - `customOrder`: không hiện bộ chọn size/màu/số lượng (và link bảng size); đổi nhãn chất liệu thành "Chất liệu thiết kế gốc", bỏ dòng bảo quản; chỉ còn nút "Đặt may" → `router.push(buildOrderInquiryHref(product.id))` (`/contact?product=<id>`) + `customOrderHint`.
- Màu được lưu bằng `hex`; tên màu tra từ `product.colors` khi thêm vào giỏ.
- `trackEvent("view_product", { productId, price })` mỗi lần mở trang.
- Wishlist: `requireAuth(…,"saveToWishlist")` → `toggleWishlistItem` + `syncAdd/RemoveWishlist` + toast `info`.
- Chia sẻ (nút trong cụm hành động): dùng `navigator.share` nếu có, ngược lại `clipboard.writeText` + toast `linkCopied`. URL dựng từ `location.origin + /<locale>/shop/...`.

### 4.3 Bố cục

Hai cột ≥ `lg`: trái (tối đa 55%, `sticky`) là gallery, phải (45%) là thông tin cuộn riêng; dưới là đánh giá và sản phẩm liên quan (lưới 2/4 cột, mỗi thẻ là link kèm ảnh, tên, giá — không phải `ProductCard`). Breadcrumb Shop › Category › Subcategory ở đầu cột phải. Badge có nhãn `public.product.detail.badge.<badge>` và style `PRODUCT_DETAIL_BADGE_STYLES`.

**Zoom ảnh (`ZoomableImage`)**: mỗi slide của gallery là một `ZoomableImage` (lấp đầy slide, `overflow-hidden`). Chuột/pen nằm yên trên ảnh 150 ms (hover intent, lướt ngang không kích hoạt) → ảnh phóng ×2 (`transform: scale`, 300 ms) và `transform-origin` bám theo con trỏ (biến CSS `--zoom-origin` cập nhật theo `pointermove`); rời ảnh thì hủy/thu về. Gợi ý cho người dùng biết ảnh phóng được: badge kính lúp (`ZoomIn`, góc dưới phải, `aria-hidden`, không có chữ) mờ đi khi đang zoom; con trỏ `zoom-in` chỉ ở thiết bị `pointer: fine`. Cảm ứng (`pointerType === "touch"`) không hover-zoom nên vuốt carousel vẫn như cũ; click (chuột) hoặc chạm (cảm ứng) vào ảnh gọi `onOpen` → `ProductDetailClient` mở `ImageViewer` (state `viewer` = `null` đến lần mở đầu tiên, sau đó `{ open, index }`) và đặt `autoplay={false}` cho gallery trong lúc viewer mở (tắt hẳn autoplay vì cảm ứng không có hover để tự dừng). Khi đóng viewer, gallery cuộn tới ảnh vừa xem cuối (`selectImage(viewerIndexRef.current)`). Badge kính lúp hiện ở mọi loại thiết bị. Nhấn giữ chuột (kéo carousel) tắt zoom cho đến khi nhả chuột; lần `pointermove` kế tiếp bật lại. Lần zoom đầu tiên đổi `sizes` của ảnh sang `250vw/140vw` để trình duyệt lấy nguồn nét hơn. Autoplay của gallery dừng nhờ `pauseOnHover` sẵn có của `useAutoAdvance` (chuột đang ở trong carousel) và chạy lại 3 s sau khi chuột rời — zoom không có cơ chế dừng riêng, xem [ui-kit](../platform/ui-kit.md).

**`ImageViewer`** (mọi thiết bị): bọc `yet-another-react-lightbox` 3.32 với plugin `Zoom` và `Counter` (import CSS gốc của thư viện và của plugin Counter ngay trong file), nạp lười bằng `next/dynamic` (`ssr: false`), không nằm trong bundle đầu của trang; `ProductDetailClient` nạp trước chunk khi trình duyệt rảnh (`requestIdleCallback`, hoặc `setTimeout` 2 s nếu không có) để lần mở đầu không phải chờ. Slides = `product.images` (ảnh gốc, không qua `next/image`), `alt` = `detail.imageAlt`. Hành vi: pinch, double-tap/double-click, Ctrl + cuộn chuột (`scrollToZoom`), kéo để pan, phím `+`/`-`/mũi tên; vuốt hoặc mũi tên đổi ảnh (vòng lặp, ẩn nút trước/sau khi chỉ có một ảnh); đóng bằng nút X, Esc, bấm nền hoặc kéo xuống (`closeOnBackdropClick`, `closeOnPullDown`). Zoom tối đa `MAX_ZOOM = 8` lần mức vừa khung, giới hạn bởi `maxZoomPixelRatio = 2` (ảnh gốc được phóng tối đa gấp đôi kích thước tự nhiên). Thanh công cụ: Thu nhỏ · độ zoom hiện tại (`zoom × 100`%, 100% = vừa khung; bấm để về vừa khung) · Phóng to (`render.buttonZoom` → `ZoomBar`), bộ đếm ảnh, nút đóng. Nền `--bg-dark` 96% qua biến `--yarl__color_backdrop`. Chuỗi nằm ở `public.product.detail.viewer.*` (`close`, `previous`, `next`, `zoomIn`, `zoomOut`, `resetZoom`, `lightbox`, `gallery`, `slide`, `slideOf`) truyền vào prop `labels` của thư viện.

### 4.4 Các khối phụ

- **`SizeGuideModal`**: chỉ gọi API khi mở (`useSizeGuide(isOpen ? category : null)`), portal vào `body`, đóng bằng Esc/nút; bảng theo `columns` + `rows`, mẹo (`tips`) và trạng thái `loading/unavailable`.
- **`ShippingAccordion`** (`useShipping`, cache 5 phút): tiêu đề, dòng "miễn phí vận chuyển từ <ngưỡng>", từng phương thức (tên, mô tả, thời gian, giá hoặc "Miễn phí"), phần chính sách đổi trả.
- **`ReviewsSection`** (`useReviews(productId)`): trung bình sao (`decimal1`), tổng số đánh giá, từng đánh giá (avatar, tác giả, nhãn "đã xác minh", sao, ngày, tiêu đề, nội dung); nút "Hiện tất cả/Thu gọn". Chỉ đọc — không có form gửi đánh giá.
- **`ShareButtons`** (sao chép link, chia sẻ native, X, Pinterest): đã có file nhưng hiện chưa được trang nào import.

### 4.5 Hiện trạng cần biết

- `SizeGuideModal` còn một dòng "Measurements in {unit}" cứng bằng tiếng Anh (không qua i18n).
- `QuickAddDrawer` (thêm nhanh từ thẻ sản phẩm) lặp lại logic chọn size/màu/số lượng của trang này — xem [cart](./cart.md).
- Sản phẩm badge `custom_order` không hiện giá: dòng giá chính và giá ở "sản phẩm liên quan" hiện `common.priceOnRequest` (`hasPublicPrice`); JSON-LD không có `Offer` cho sản phẩm này.
