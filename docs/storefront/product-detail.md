# Product detail (trang chi tiết sản phẩm)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]/shop/[category]/[subcategory]/[productId]` · **Cập nhật:** 2026-10-18
> **Code:** `(public)/shop/[category]/[subcategory]/[productId]/` — `page.tsx`, `_common/{reviews,use-product-reviews,use-review-votes}.ts`, `_components/{ProductDetailClient,ZoomableImage,ImageViewer,ReviewsSection,ReviewSummaryPanel,ReviewFilterBar,ReviewItem,HelpfulButton,WriteReviewBar,ShippingAccordion,SizeGuideModal,ShareButtons}.tsx`; dùng chung `_components/{ProductRating,StarRating,ReviewContent,ReviewAvatar,ReviewImageGrid}.tsx`
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
| `ReviewsSection` | Thu gọn mặc định: luôn có tổng hợp (điểm, số đánh giá, phân bố 1–5 sao, phân bố form dáng) và nút "Xem tất cả đánh giá"; mở ra mới có lọc / sắp xếp, danh sách (5 mới nhất, "Xem thêm" +5 chỉ tải trang kế, "Thu gọn"), nút "Hữu ích"; trạng thái trống |
| Điểm ở đầu trang | Dưới tên sản phẩm: `ProductRating full` từ `ratingAverage` / `ratingCount` của chính response sản phẩm (link `#reviews`), ẩn khi chưa có đánh giá |
| Liên quan | Tối đa 5 sản phẩm (`RELATED_PRODUCTS_LIMIT`, gửi BE qua `relatedLimit=5`; dưới 1024 px chỉ hiện 4; danh mục ít sản phẩm thì BE trả ít hơn) |

## 4. Chi tiết

### 4.1 Server (`page.tsx`)

- `getProductWithRelated(id)` (→ `GET /api/products/:id?relatedLimit=5` trả `data` + `related`) và `getSubcategory(cat, sub)`; thiếu một trong hai → `notFound()`. Chừa 80 px phía trên cho header cố định.
- `generateStaticParams` từ `getAllProducts()` (số sản phẩm theo mặc định của BE).
- Metadata: title `public.product.meta.title` (tên sản phẩm), description = `product.description`, ảnh chia sẻ = `images[0]`. Không tìm thấy sản phẩm → title `withBrand(common.notFound)`.
- JSON-LD: `productJsonLd` + `breadcrumbJsonLd` (Home › Shop › Category › Subcategory › Product).

### 4.2 Hành vi mua (`ProductDetailClient`)

- `purchaseMode = getPurchaseMode(product.badge)`:
  - `cart`: cần chọn đủ size **và** màu mới bật nút; gợi ý còn thiếu gì (`hintBoth|hintSize|hintColor`). Bấm → `requireAuth(...,"addToBag")` rồi `addItem(item, quantity)` (Redux) + `syncAddToCartItem` (BE, nền) + `trackEvent("add_to_cart")` + toast có link tới `/cart`; nút hiện "Đã thêm" 2.2 s.
  - `soldOut`: nút khóa "Hết hàng" + `soldOutHint`.
  - `customOrder`: không hiện bộ chọn size/màu/số lượng (và link bảng size); đổi nhãn chất liệu thành "Chất liệu thiết kế gốc", bỏ dòng bảo quản; chỉ còn nút "Đặt may" → `router.push(buildOrderInquiryHref(product.id))` (`/contact?product=<id>`) + `customOrderHint`.
- Màu được lưu bằng `hex`; tên màu tra từ `product.colors` khi thêm vào giỏ.
- `trackEvent("view_product", { productId, vnd | usd })` mỗi lần mở trang (giá theo tiền tệ của ngôn ngữ, xem [analytics](../admin/analytics.md)); `add_to_cart` gửi đơn giá cùng dạng.
- Wishlist: `requireAuth(…,"saveToWishlist")` → `toggleWishlistItem` + `syncAdd/RemoveWishlist` + toast `info`.
- Chia sẻ (nút trong cụm hành động): dùng `navigator.share` nếu có, ngược lại `clipboard.writeText` + toast `linkCopied`. URL dựng từ `location.origin + /<locale>/shop/...`.

### 4.3 Bố cục

Hai cột ≥ `lg`: trái (tối đa 55%, `sticky`) là gallery, phải (45%) là thông tin cuộn riêng; dưới là đánh giá và sản phẩm liên quan (lưới 2/4/5 cột: 2 từ mặc định, 4 từ `sm`, 5 từ `lg`; sản phẩm thứ 5 chỉ hiện từ `lg` để hàng không lẻ; mỗi thẻ là link kèm ảnh, tên, giá — không phải `ProductCard`). Breadcrumb Shop › Category › Subcategory ở đầu cột phải. Badge có nhãn `public.product.detail.badge.<badge>` và style `PRODUCT_DETAIL_BADGE_STYLES`.

**Zoom ảnh (`ZoomableImage`)**: mỗi slide của gallery là một `ZoomableImage` (lấp đầy slide, `overflow-hidden`). Chuột/pen nằm yên trên ảnh 150 ms (hover intent, lướt ngang không kích hoạt) → ảnh phóng ×2 (`transform: scale`, 300 ms) và `transform-origin` bám theo con trỏ (biến CSS `--zoom-origin` cập nhật theo `pointermove`); rời ảnh thì hủy/thu về. Gợi ý cho người dùng biết ảnh phóng được: badge kính lúp (`ZoomIn`, góc dưới phải, `aria-hidden`, không có chữ) mờ đi khi đang zoom; con trỏ `zoom-in` chỉ ở thiết bị `pointer: fine`. Cảm ứng (`pointerType === "touch"`) không hover-zoom nên vuốt carousel vẫn như cũ; click (chuột) hoặc chạm (cảm ứng) vào ảnh gọi `onOpen` → `ProductDetailClient` mở `ImageViewer` (state `viewer` = `null` đến lần mở đầu tiên, sau đó `{ open, index }`) và đặt `autoplay={false}` cho gallery trong lúc viewer mở (tắt hẳn autoplay vì cảm ứng không có hover để tự dừng). Khi đóng viewer, gallery cuộn tới ảnh vừa xem cuối (`selectImage(viewerIndexRef.current)`). Badge kính lúp hiện ở mọi loại thiết bị. Nhấn giữ chuột (kéo carousel) tắt zoom cho đến khi nhả chuột; lần `pointermove` kế tiếp bật lại. Lần zoom đầu tiên đổi `sizes` của ảnh sang `250vw/140vw` để trình duyệt lấy nguồn nét hơn. Autoplay của gallery dừng nhờ `pauseOnHover` sẵn có của `useAutoAdvance` (chuột đang ở trong carousel) và chạy lại 3 s sau khi chuột rời — zoom không có cơ chế dừng riêng, xem [ui-kit](../platform/ui-kit.md).

**`ImageViewer`** (mọi thiết bị): bọc `yet-another-react-lightbox` 3.32 với plugin `Zoom` và `Counter` (import CSS gốc của thư viện và của plugin Counter ngay trong file), nạp lười bằng `next/dynamic` (`ssr: false`), không nằm trong bundle đầu của trang; `ProductDetailClient` nạp trước chunk khi trình duyệt rảnh (`requestIdleCallback`, hoặc `setTimeout` 2 s nếu không có) để lần mở đầu không phải chờ. Slides = `product.images` (ảnh gốc, không qua `next/image`), `alt` = `detail.imageAlt`. Hành vi: pinch, double-tap/double-click, Ctrl + cuộn chuột (`scrollToZoom`), kéo để pan, phím `+`/`-`/mũi tên; vuốt hoặc mũi tên đổi ảnh (vòng lặp, ẩn nút trước/sau khi chỉ có một ảnh); đóng bằng nút X, Esc, bấm nền hoặc kéo xuống (`closeOnBackdropClick`, `closeOnPullDown`). Zoom tối đa `MAX_ZOOM = 8` lần mức vừa khung, giới hạn bởi `maxZoomPixelRatio = 2` (ảnh gốc được phóng tối đa gấp đôi kích thước tự nhiên). Thanh công cụ: Thu nhỏ · độ zoom hiện tại (`zoom × 100`%, 100% = vừa khung; bấm để về vừa khung) · Phóng to (`render.buttonZoom` → `ZoomBar`), bộ đếm ảnh, nút đóng. Nền `--bg-dark` 96% qua biến `--yarl__color_backdrop`. Chuỗi nằm ở `public.product.detail.viewer.*` (`close`, `previous`, `next`, `zoomIn`, `zoomOut`, `resetZoom`, `lightbox`, `gallery`, `slide`, `slideOf`) truyền vào prop `labels` của thư viện.

### 4.4 Các khối phụ

- **`SizeGuideModal`**: chỉ gọi API khi mở (`useSizeGuide(isOpen ? category : null)`), portal vào `body`, đóng bằng Esc/nút; bảng theo `columns` + `rows`, mẹo (`tips`) và trạng thái `loading/unavailable`.
- **`ShippingAccordion`** (`useShipping`, cache 5 phút): tiêu đề, dòng "miễn phí vận chuyển từ <ngưỡng>" (ẩn khi `freeShippingThresholdVnd/Usd` là `null`), từng phương thức (tên, mô tả, thời gian, `priceVnd/priceUsd` theo ngôn ngữ hoặc "Miễn phí" khi `priceVnd` = 0), phần chính sách đổi trả.
- **`ReviewsSection`** (`id="reviews"`, mọi con số lấy từ BE, không tính trung bình ở client):
  - **Tổng hợp** (`ReviewSummaryPanel`, `useReviewSummary` → `GET /api/reviews/:productId/summary`, SWR, dedupe 5 s): một thẻ đơn giản, không biểu đồ (`rounded-xl`, bóng nhẹ, chip dạng pill như bộ lọc của shop: viền vàng + nền vàng nhạt khi đang chọn). Bên trái: điểm `ratingAverage` (`decimal1`) "trên 5" + `StarRating` + "N đánh giá"; bên phải: các chip lọc kèm số đếm của BE — "Tất cả", "5 sao (n)" … "1 sao (n)" (đọc từ `distribution`, loại trừ nhau, bấm lại để bỏ) và "Có hình ảnh (n)" (`withImages`, bật thêm được lên trên chip sao); chip có số đếm 0 bị vô hiệu. Thanh phân bố form dáng đã bỏ khỏi giao diện (`fit` của summary không còn được dùng); lọc theo form dáng nằm ở danh sách khi mở. `ratingAverage` là `null` hoặc `ratingCount` 0 thì cả khối thay bằng trạng thái trống ("Chưa có đánh giá nào"), không hiện 0 sao. Khung xám chỉ hiện ở lần tải đầu của tổng hợp; mở danh sách không làm thẻ tổng hợp nháy lại, chỉ vùng danh sách có khung xám trong lúc chờ trang đầu.
  - **Thu gọn / mở** (state `open`, mặc định `false` ở mọi cỡ màn hình): khi thu gọn chỉ có thẻ tổng hợp (~450 px cả khối trên desktop, ~600 px trên điện thoại, chip xuống dòng) kèm nút "Xem tất cả đánh giá" dưới các chip; bộ lọc, danh sách và **request danh sách đánh giá chưa được gửi** (`useReviewList(..., enabled)` chỉ tải trang 1 khi mở; tổng hợp vẫn tải như cũ). Các cách mở: nút "Xem tất cả"; bấm một chip ("5 sao", "Có hình ảnh"…) trong thẻ tổng hợp (mở và lọc luôn theo chip đó); link "4,5 · N đánh giá" dưới tên sản phẩm (phát sự kiện `reviews:open` rồi cuộn tới `#reviews`); vào trang bằng địa chỉ có `#reviews` hoặc đổi hash về `#reviews`. Nút "Thu gọn" nổi (xem bên dưới) đóng cả danh sách, đặt lại bộ lọc về mặc định và về 5 đánh giá đầu, rồi cuộn về đầu khối. Sản phẩm chưa có đánh giá không có nút mở (chỉ trạng thái trống và nút "Viết đánh giá"). Lưu một đánh giá / vote trúng đánh giá bị ẩn chỉ tải lại danh sách khi đang mở. Nút "Viết đánh giá" luôn nằm trên khối, cả khi thu gọn.
  - **Lọc / sắp xếp** (`ReviewFilterBar`, chỉ khi mở; sao và ảnh là chip của thẻ tổng hợp phía trên): chọn form dáng, sắp xếp `-createdAt` (mặc định), `-rating`, `rating`, `-helpfulCount`, nút "Xóa bộ lọc". Mọi lọc/sort do BE xử lý (`GET /api/reviews/:productId?rating&fit&hasImages&sort&page&limit`).
  - **Danh sách** (`useReviewList`): 5 đánh giá mỗi lần (`REVIEW_PAGE_SIZE`). Request đầu `GET /api/reviews/:productId?sort&limit=5` (5 mới nhất theo sort đang chọn); mỗi lần bấm "Xem thêm" (nút không kèm số lượng) chỉ gọi **trang kế** (`page=2&limit=5`, `page=3`…) và nối vào cuối, không hỏi lại phần đã có; các thẻ đã hiển thị là `React.memo` nên không render lại (handler Hữu ích ổn định nhờ đọc `votedIds` qua ref). `loaded` là mọi thứ đã tải, `visible` là số đang hiện: "Thu gọn" hạ `visible` về 5 (không gọi API, trang cuộn về đầu khối đánh giá, `smooth`, tắt khi `prefers-reduced-motion`), các trang đã tải vẫn nằm trong bộ nhớ nên mở rồi "Xem thêm" lại hiện ngay và chỉ gọi API khi vượt quá phần đã tải. Khi danh sách đang mở, nút "Thu gọn đánh giá" nổi giữa đáy màn hình (`position: fixed` qua portal, chỉ hiện khi danh sách đang nằm trong khung nhìn — `sticky` không dùng được vì `html` và `body` cùng `overflow-x: hidden`) nên bấm được từ bất cứ chỗ nào trong danh sách. Đổi bộ lọc hoặc sort: bỏ hết và tải lại từ trang 1; `reload` (sau khi lưu đánh giá, hoặc vote trúng đánh giá đã bị ẩn) hỏi lại đúng số đánh giá đã tải trong một request (`limit` ≤ 200). Phản hồi đến muộn của truy vấn cũ bị bỏ. Không dùng cuộn vô hạn: khối đánh giá nằm giữa trang (còn sản phẩm liên quan và chân trang bên dưới) nên cuộn vô hạn sẽ chặn đường xuống chân trang. Lỗi tải hiện hộp lỗi + "Thử lại"; không khớp bộ lọc hiện "Không có đánh giá nào khớp". Mỗi đánh giá (`ReviewItem`): avatar (chữ cái đầu khi `avatar` rỗng), `author` đúng như BE trả (không che tên), rồi `ReviewContent` (sao, ngày `createdAt`, "Đã chỉnh sửa", tiêu đề, nội dung, "Đã mua: size · màu", form dáng, lưới ảnh bấm để phóng to, khối "Phản hồi từ cửa hàng"). Đánh giá không tiêu đề / nội dung / ảnh vẫn hiển thị gọn.
  - **Hữu ích** (`HelpfulButton`, `useReviewVotes`): đã đăng nhập thì khi vào trang gọi `GET /api/my-reviews/votes?productId=` (tô các đánh giá đã bấm) và `GET /api/my-reviews?productId=&limit=200` (biết đánh giá nào của chính mình; lỗi hoặc thiếu quyền thì bỏ qua, không toast). Bấm = `POST /api/reviews/:id/helpful`, bấm lại = `DELETE`; số hiển thị lấy `helpfulCount` trong response, nút `disabled` khi đang gọi. Đánh giá của chính mình hiện chữ "Đánh giá của bạn · N hữu ích" thay cho nút (và nếu BE vẫn trả `1907` thì ghi nhớ và báo nhẹ bằng toast `info`). Chưa đăng nhập: bấm mở popup đăng nhập (`requireAuth`) rồi thực hiện vote. `1901` (đánh giá đã bị ẩn): toast + tải lại danh sách và tổng hợp.
  - **Viết / sửa ngay tại trang** (`WriteReviewBar`, dưới tiêu đề khối đánh giá, hiện cả khi chưa có đánh giá): khả năng của khách lấy từ danh sách của BE, không đoán. Có dòng hàng của sản phẩm này trong `usePendingReviews()` (dòng sắp hết hạn nhất, kèm "còn N ngày") → nút "Viết đánh giá" mở `ReviewFormModal` (module [customer-reviews](./customer-reviews.md), cùng form với trang `/reviews` và trang đơn); không có nhưng đánh giá của mình về sản phẩm này còn `canEdit` → nút "Sửa đánh giá của bạn"; nếu đã đánh giá mà hết quyền sửa thì một dòng "Cảm ơn bạn đã đánh giá"; các trường hợp còn lại (chưa mua, đơn chưa giao hoặc chưa thanh toán, quá 30 ngày) thanh không hiện gì và không có chú thích. Chưa đăng nhập: nút "Viết đánh giá" mở popup đăng nhập, sau đó thanh tự đổi theo tài khoản. Lưu xong tải lại danh sách, tổng hợp và "đánh giá của mình" của trang. Đánh giá của mình lấy bằng `GET /api/my-reviews?productId=` với `raw: true` (cùng lần gọi dùng để biết đánh giá nào là của mình).
- **`ShareButtons`** (sao chép link, chia sẻ native, X, Pinterest): đã có file nhưng hiện chưa được trang nào import.

### 4.5 Hiện trạng cần biết

- `SizeGuideModal` còn một dòng "Measurements in {unit}" cứng bằng tiếng Anh (không qua i18n).
- `QuickAddDrawer` (thêm nhanh từ thẻ sản phẩm) lặp lại logic chọn size/màu/số lượng của trang này — xem [cart](./cart.md).
- Sản phẩm badge `custom_order` không hiện giá: dòng giá chính và giá ở "sản phẩm liên quan" hiện `common.priceOnRequest` (`hasPublicPrice`); JSON-LD không có `Offer` cho sản phẩm này. Giá chính, giá gốc gạch ngang (khi `originalPriceVnd` không `null`) và giá sản phẩm liên quan hiện theo ngôn ngữ qua `useMoney`.
