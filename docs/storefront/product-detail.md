# Product detail (trang chi tiết sản phẩm)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]/shop/[category]/[subcategory]/[productId]` · **Cập nhật:** 2026-10-14
> **Code:** `(public)/shop/[category]/[subcategory]/[productId]/` — `page.tsx`, `_common/{reviews,use-product-reviews,use-review-votes}.ts`, `_components/{ProductDetailClient,ZoomableImage,ImageViewer,ReviewsSection,ReviewSummary,ReviewFilterBar,ReviewItem,HelpfulButton,WriteReviewBar,ShippingAccordion,SizeGuideModal,ShareButtons}.tsx`; dùng chung `_components/{ProductRating,StarRating,ReviewContent,ReviewAvatar,ReviewImageGrid}.tsx`
> **i18n:** `public.product` (`meta`, `detail`, `reviews`, `shipping`, `sizeGuideModal`, `share`), `shared.reviews` (kể cả `form`, `toast`, `deadline` của form viết đánh giá), `common.productBadge`

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
| `ReviewsSection` | Tổng hợp (điểm, số đánh giá, phân bố 1–5 sao, phân bố form dáng), lọc / sắp xếp, danh sách đánh giá phân trang, nút "Hữu ích", trạng thái trống |
| Điểm ở đầu trang | Dưới tên sản phẩm: `ProductRating full` từ `ratingAverage` / `ratingCount` của chính response sản phẩm (link `#reviews`), ẩn khi chưa có đánh giá |
| Liên quan | Tối đa 4 sản phẩm liên quan |

## 4. Chi tiết

### 4.1 Server (`page.tsx`)

- `getProductWithRelated(id)` (→ `GET /api/products/:id` trả `data` + `related`) và `getSubcategory(cat, sub)`; thiếu một trong hai → `notFound()`. Chừa 80 px phía trên cho header cố định.
- `generateStaticParams` từ `getAllProducts()` (số sản phẩm theo mặc định của BE).
- Metadata: title `public.product.meta.title` (tên sản phẩm), description = `product.description`, ảnh chia sẻ = `images[0]`. Không tìm thấy sản phẩm → title `withBrand(common.notFound)`.
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
- **`ShippingAccordion`** (`useShipping`, cache 5 phút): tiêu đề, dòng "miễn phí vận chuyển từ <ngưỡng>" (ẩn khi `freeShippingThreshold` là `null`), từng phương thức (tên, mô tả, thời gian, giá hoặc "Miễn phí"), phần chính sách đổi trả.
- **`ReviewsSection`** (`id="reviews"`, mọi con số lấy từ BE, không tính trung bình ở client):
  - **Tổng hợp** (`ReviewSummary`, `useReviewSummary` → `GET /api/reviews/:productId/summary`, SWR, dedupe 5 s): điểm `ratingAverage` (`decimal1`) + `StarRating`, "Dựa trên N đánh giá", năm thanh phân bố sao — mỗi thanh là nút bật/tắt lọc theo số sao đó — và ba thanh form dáng (nhỏ / đúng size / rộng) chỉ khi `fit.total > 0`. `ratingAverage` là `null` hoặc `ratingCount` 0 thì cả khối thay bằng trạng thái trống ("Chưa có đánh giá nào"), không hiện 0 sao. Trong lúc tải hiện khung xám.
  - **Lọc / sắp xếp** (`ReviewFilterBar`): chip số sao (Tất cả, 5 … 1 ★, cuộn ngang trên điện thoại), chọn form dáng, nút "Có hình ảnh (withImages)" (`hasImages=true`), sắp xếp `-createdAt` (mặc định), `-rating`, `rating`, `-helpfulCount`, nút "Xóa bộ lọc". Mọi lọc/sort do BE xử lý (`GET /api/reviews/:productId?rating&fit&hasImages&sort&page&limit`).
  - **Danh sách** (`useReviewList`): 10 đánh giá/trang, "Xem thêm N đánh giá" nối trang kế; đổi bộ lọc quay về trang 1, phản hồi tới muộn của bộ lọc cũ bị bỏ; lỗi tải hiện hộp lỗi + "Thử lại"; không khớp bộ lọc hiện "Không có đánh giá nào khớp". Mỗi đánh giá (`ReviewItem`): avatar (chữ cái đầu khi `avatar` rỗng), `author` đúng như BE trả (không che tên), rồi `ReviewContent` (sao, ngày `createdAt`, "Đã mua hàng", "Đã chỉnh sửa", tiêu đề, nội dung, "Đã mua: size · màu", form dáng, lưới ảnh bấm để phóng to, khối "Phản hồi từ cửa hàng"). Đánh giá không tiêu đề / nội dung / ảnh vẫn hiển thị gọn.
  - **Hữu ích** (`HelpfulButton`, `useReviewVotes`): đã đăng nhập thì khi vào trang gọi `GET /api/my-reviews/votes?productId=` (tô các đánh giá đã bấm) và `GET /api/my-reviews?productId=&limit=200` (biết đánh giá nào của chính mình; lỗi hoặc thiếu quyền thì bỏ qua, không toast). Bấm = `POST /api/reviews/:id/helpful`, bấm lại = `DELETE`; số hiển thị lấy `helpfulCount` trong response, nút `disabled` khi đang gọi. Đánh giá của chính mình hiện chữ "Đánh giá của bạn · N hữu ích" thay cho nút (và nếu BE vẫn trả `1907` thì ghi nhớ và báo nhẹ bằng toast `info`). Chưa đăng nhập: bấm mở popup đăng nhập (`requireAuth`) rồi thực hiện vote. `1901` (đánh giá đã bị ẩn): toast + tải lại danh sách và tổng hợp.
  - **Viết / sửa ngay tại trang** (`WriteReviewBar`, dưới tiêu đề khối đánh giá, hiện cả khi chưa có đánh giá): khả năng của khách lấy từ danh sách của BE, không đoán. Có dòng hàng của sản phẩm này trong `usePendingReviews()` (dòng sắp hết hạn nhất, kèm "còn N ngày") → nút "Viết đánh giá" mở `ReviewFormModal` (module [customer-reviews](./customer-reviews.md), cùng form với trang `/reviews` và trang đơn); không có nhưng đánh giá của mình về sản phẩm này còn `canEdit` → nút "Sửa đánh giá của bạn"; còn lại một dòng chữ ("Cảm ơn bạn đã đánh giá" hoặc "Chỉ khách đã mua và nhận sản phẩm này mới đánh giá được"). Chưa đăng nhập: nút "Viết đánh giá" mở popup đăng nhập, sau đó thanh tự đổi theo tài khoản. Lưu xong tải lại danh sách, tổng hợp và "đánh giá của mình" của trang. Đánh giá của mình lấy bằng `GET /api/my-reviews?productId=` với `raw: true` (cùng lần gọi dùng để biết đánh giá nào là của mình).
- **`ShareButtons`** (sao chép link, chia sẻ native, X, Pinterest): đã có file nhưng hiện chưa được trang nào import.

### 4.5 Hiện trạng cần biết

- `SizeGuideModal` còn một dòng "Measurements in {unit}" cứng bằng tiếng Anh (không qua i18n).
- `QuickAddDrawer` (thêm nhanh từ thẻ sản phẩm) lặp lại logic chọn size/màu/số lượng của trang này — xem [cart](./cart.md).
- Sản phẩm badge `custom_order` không hiện giá: dòng giá chính và giá ở "sản phẩm liên quan" hiện `common.priceOnRequest` (`hasPublicPrice`); JSON-LD không có `Offer` cho sản phẩm này.
