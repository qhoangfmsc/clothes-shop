# Product detail (trang chi tiết sản phẩm) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-26 · **Trạng thái:** Implemented
> **Doc:** [storefront/product-detail](../../docs/storefront/product-detail.md) · **Test:** `tests/storefront/product-detail/`

## 1. Bối cảnh & mục tiêu

Trang một sản phẩm là nơi khách quyết định mua: xem ảnh, chọn size và màu, bỏ vào giỏ hoặc yêu thích, đọc đánh giá của người đã mua. Sai ở đây là một nút giỏ cho khách chưa đăng nhập làm mất sản phẩm, một dòng giỏ có màu hay size sai, một sản phẩm hết hàng vẫn bấm mua được, một đánh giá bị hiện sai số sao hay sai số "hữu ích", hoặc một trang 404 giả. Module gồm trang server `page.tsx` (sản phẩm kèm sản phẩm liên quan, danh mục, metadata, JSON-LD, `generateStaticParams`), `_components/{ProductDetailClient,ZoomableImage,ImageViewer,SizeGuideModal,ShippingAccordion,ReviewsSection,ReviewSummaryPanel,ReviewFilterBar,ReviewItem,HelpfulButton,WriteReviewBar}.tsx` và `_common/{reviews,use-product-reviews,use-review-votes}.ts`. Hàm lấy dữ liệu server thuộc [data-layer](../platform/data-layer.md); form viết đánh giá và hạ tầng "đang chờ đánh giá" thuộc [customer-reviews](./customer-reviews.md); giỏ và yêu thích thuộc [cart](./cart.md) và [wishlist](./wishlist.md).

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách và người đã đăng nhập, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Trang server: sản phẩm + liên quan, 404, metadata, JSON-LD, trang dựng sẵn | Hàm lấy dữ liệu `getProductWithRelated`, `getSubcategory`: thuộc [data-layer](../platform/data-layer.md) |
| Hành vi mua: chọn size, màu, số lượng, giỏ (khách / đã đăng nhập), hết hàng, đặt may, yêu thích, chia sẻ, đếm lượt xem | Reducer và thunk của giỏ và yêu thích: thuộc [cart](./cart.md), [wishlist](./wishlist.md) |
| Gallery, phóng to dưới chuột, trình xem toàn màn hình, bảng size, vận chuyển & đổi trả | Thư viện `yet-another-react-lightbox` (zoom thật cần kích thước ảnh, jsdom không có) |
| Khối đánh giá: tổng hợp, mở / thu gọn, lọc, sắp xếp, xem thêm, "hữu ích", nút viết / sửa đánh giá | Form viết đánh giá và "đang chờ đánh giá": thuộc [customer-reviews](./customer-reviews.md); thẻ đánh giá dùng chung (`ReviewContent`) thuộc [ui-kit](../platform/ui-kit.md) |

## 3. Hợp đồng

- **Trang server.** Hỏi `GET /api/products/:id?relatedLimit=5` (BE từ chối `relatedLimit` bằng 400 thì hỏi lại không kèm) và danh mục theo `slug`. Thiếu sản phẩm, danh mục hoặc danh mục con → 404. JSON-LD: `Product` (có `Offer` với giá theo ngôn ngữ, `InStock` / `OutOfStock`; sản phẩm đặt may không có `Offer`) và `BreadcrumbList` năm bước. Metadata: tiêu đề kết thúc bằng thương hiệu, mô tả = mô tả sản phẩm, `hreflang`, ảnh chia sẻ = ảnh đầu; thiếu sản phẩm → tiêu đề "không tìm thấy". `generateStaticParams` cho mọi sản phẩm.
- **Chọn và mua.** `getPurchaseMode(badge)` quyết định một chỗ: `cart` (nút giỏ khóa đến khi chọn đủ size và màu; gợi ý thiếu gì), `soldOut` (nút khóa, vẫn lưu yêu thích được), `customOrder` (không bộ chọn, giá "theo yêu cầu", nút dẫn sang `/contact?product=<id>`). Số lượng 1–10. Thêm vào giỏ: khách → hộp đăng nhập nói rõ lý do và chưa đổi gì; người đã đăng nhập → dòng vào store ngay (tên màu tra từ `product.colors`), báo BE, đếm `add_to_cart` (VND hoặc USD theo ngôn ngữ), toast có link tới giỏ, nút "Đã thêm" 2,2 giây và không thêm lần hai trong lúc đó; BE từ chối → dòng bị rút khỏi giỏ và toast lỗi.
- **Yêu thích và chia sẻ.** Tim: khách → hộp đăng nhập; người đã đăng nhập → store + BE (BE từ chối thì tim trở lại), toast có link; bấm lần hai bỏ ra. Chia sẻ: dùng `navigator.share` nếu có (đóng hộp thoại không báo gì), không thì chép địa chỉ `origin/<locale>/shop/…` và toast; chép lỗi thì im lặng. Mỗi sản phẩm mở trang đếm một `view_product`.
- **Ảnh.** Gallery là `Carousel` (thumbnail điều khiển nó, phím ←/→); rê chuột 150 ms trên ảnh thì phóng ×2 quanh con trỏ (cảm ứng thì không, nhấn giữ chuột để kéo thì thôi); bấm hoặc chạm mở trình xem toàn màn hình đúng ảnh đó (nạp lười, tải trước khi trình duyệt rảnh); đóng trình xem thì gallery về ảnh xem cuối.
- **Bảng size và vận chuyển.** Bảng size chỉ được hỏi khi mở, đóng bằng nút / Esc / bấm nền, khóa cuộn trang, là tấm trượt dưới 640 px. Vận chuyển & đổi trả gập sẵn; không đọc được thì mục không hiện.
- **Đánh giá.** Mọi con số do BE tính. Tổng hợp (điểm, số đánh giá, chip 1–5 sao và "có hình ảnh") luôn hiện; danh sách gập sẵn và **chưa được hỏi** cho đến khi mở (nút "Xem tất cả", bấm một chip, link điểm dưới tên sản phẩm, hoặc `#reviews`). Danh sách: 5 mỗi lần, "Xem thêm" chỉ hỏi trang kế, đổi lọc hoặc sắp xếp thì bắt đầu lại và bỏ câu trả lời muộn, lỗi → hộp lỗi + "Thử lại"; "Thu gọn" đóng danh sách, đặt lại lọc và cuộn về đầu khối. "Hữu ích": khách → hộp đăng nhập; đã đăng nhập → bật / tắt theo BE, đánh giá của chính mình không có nút (`1907` cũng vậy), `1901` (đã bị ẩn) tải lại danh sách và tổng hợp. Thanh viết đánh giá chỉ cho khách điều BE cho phép (đang chờ đánh giá → viết; còn sửa được → sửa; còn lại → không gì cả hoặc lời cảm ơn) và sau khi lưu tải lại tổng hợp, danh sách và "đánh giá của tôi".

## 4. Thiết kế

```
page.tsx (server) ─► server-fetchers (data-layer) ─► BE
  └─ ProductDetailClient ─► Carousel · ZoomableImage ─► ImageViewer (lazy)
       ├─ cart / wishlist store (requireAuth) · trackEvent
       ├─ SizeGuideModal ─► useSizeGuide · ShippingAccordion ─► useShipping
       └─ ReviewsSection ─► useReviewSummary · useReviewList · useReviewVotes
            └─ ReviewSummaryPanel · ReviewFilterBar · ReviewItem ─► HelpfulButton · WriteReviewBar ─► ReviewFormModal (customer-reviews)
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Một hàm quyết định cách mua** (`getPurchaseMode`) | Nút giỏ, gợi ý, bộ chọn, giá và JSON-LD cùng đọc một kết quả nên không thể lệch nhau (sản phẩm hết hàng không thể có nút mua) | Mỗi chỗ tự so `badge` |
| **Hook tách dữ liệu khỏi giao diện đánh giá** (`useReviewSummary`, `useReviewList`, `useReviewVotes`) | Giao diện chỉ vẽ; luật tải trang, bỏ câu trả lời muộn, vote nằm ở hook nên test được riêng | Gom hết vào `ReviewsSection` |
| **Bộ đếm thế hệ để bỏ câu trả lời muộn** (`generation`) | Đổi lọc nhanh liền nhau không để kết quả cũ đè kết quả mới | Hủy `fetch` bằng `AbortController` |
| **BE lọc, sắp xếp, phân trang, đếm đánh giá** | Số liệu đúng trên cả danh sách lớn; FE không tính lại trung bình hay phân bố | Tính ở trình duyệt |
| **Danh sách chỉ được hỏi khi mở** | Phần lớn khách không mở đánh giá; tổng hợp đã đủ để quyết định | Tải sẵn mọi đánh giá |
| **Khả năng viết / sửa đánh giá lấy từ danh sách của BE** | Không đoán từ trạng thái đơn: BE biết hạn 30 ngày và quyền sửa một lần | Suy ra ở FE |
| **Trình xem ảnh nạp lười + tải trước khi rảnh** (`next/dynamic`, `requestIdleCallback`) | Thư viện nặng nằm ngoài bundle đầu nhưng lần bấm đầu không phải chờ | Nhúng thẳng |
| **Hành động cần đăng nhập đi qua `requireAuth`** | Khách thấy lý do và việc đang làm tiếp tục sau khi đăng nhập | Ẩn nút với khách |

### Kiến trúc

Trang (server) phụ thuộc xuống data layer; thành phần client phụ thuộc store giỏ và yêu thích, `useAuthAction`, `Carousel` của [ui-kit](../platform/ui-kit.md) và form đánh giá của [customer-reviews](./customer-reviews.md). Không module nào khác import từ đây. `ProductDetailClient` (gần 700 dòng) còn gom gallery, mua, yêu thích, chia sẻ và liên quan trong một file: đã tách ảnh (`ZoomableImage`, `ImageViewer`), bảng size, vận chuyển và đánh giá ra file riêng; phần còn lại là ứng viên tách tiếp (xem mục 7), chưa đổi trong đợt này vì test đã khóa hành vi.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi file một việc: phóng to, trình xem, bảng size, vận chuyển, tổng hợp, bộ lọc, một đánh giá, nút hữu ích, thanh viết; hook riêng cho tổng hợp, danh sách và vote. Ngoại lệ đã ghi: `ProductDetailClient` |
| O | Thêm kiểu sắp xếp hay bộ lọc = thêm vào `reviews.ts` và bản dịch |
| L | `ReviewItem` và `HelpfulButton` nhận dữ liệu qua props nên dùng được cho danh sách đã lọc hay không |
| I | `ReviewFilterBar` chỉ nhận bộ lọc, hàm đổi và hàm xóa; `ImageViewer` chỉ nhận ảnh, chỉ số và hai hàm |
| D | Thành phần phụ thuộc hook và store, không phụ thuộc `fetch`; hàm báo "đã lưu" truyền xuống `WriteReviewBar` |

### Conventions

Chuỗi qua `public.product` và `shared.reviews`; tiền qua `useMoney`; hành động cần đăng nhập qua `useAuthAction`; lỗi qua `useErrorMessage`. Test gọi thẳng hàm trang server (`intl-server` thế `next-intl/server` bằng bản dịch thật), dùng `renderApp` với danh tính thật và `detailApi` (API công khai giả: đánh giá, tổng hợp, vote, bảng size, vận chuyển, giỏ, yêu thích) trong `detail-kit.tsx`; `IntersectionObserver` giả điều khiển nút thu gọn; `carouselLayout` cho hình học của gallery.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (giỏ, yêu thích, "hữu ích" và viết đánh giá cần đăng nhập: khách thấy hộp đăng nhập, người đã đăng nhập thực hiện) · permission = không (trang công khai)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| PD-1 | Trang sản phẩm: hỏi sản phẩm kèm 5 liên quan và danh mục; tên, mô tả, breadcrumb, liên quan; JSON-LD sản phẩm và breadcrumb 5 bước; hết hàng và đặt may trong JSON-LD; tiếng Anh; báo ngôn ngữ | đúng | khách | integration | `tests/storefront/product-detail/detail-page.test.tsx` |
| PD-2 | BE từ chối `relatedLimit` (400): hỏi lại không kèm và vẫn hiện trang | đúng | khách | integration | `tests/storefront/product-detail/detail-page.test.tsx` |
| PD-2E | Sản phẩm, danh mục hoặc danh mục con không có: 404 | lỗi | khách | integration | `tests/storefront/product-detail/detail-page.test.tsx` |
| PD-3 | Metadata: tiêu đề, mô tả, hreflang, ảnh chia sẻ; trang dựng sẵn cho mọi sản phẩm | đúng | khách | integration | `tests/storefront/product-detail/detail-page.test.tsx` |
| PD-3E | Sản phẩm không có: tiêu đề "không tìm thấy" | lỗi | khách | integration | `tests/storefront/product-detail/detail-page.test.tsx` |
| PD-4 | Nội dung: tên, giá theo ngôn ngữ, giá gốc, badge, điểm đánh giá là link mở đánh giá, breadcrumb, bảng chi tiết | đúng | khách | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-5 | Chọn size, màu, số lượng 1–10; gợi ý còn thiếu; nút giỏ khóa đến khi chọn đủ | đúng | khách | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-6G | Thêm vào giỏ với khách: hộp đăng nhập nói rõ lý do, giỏ không đổi, không đếm | đúng | khách | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-6 | Thêm vào giỏ (đã đăng nhập): dòng vào giỏ ngay, báo BE, đếm sự kiện VND / USD, toast có link, nút "đã thêm" rồi trở lại, không thêm hai lần | đúng | user | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-6E | BE từ chối thêm vào giỏ: dòng bị rút ra và toast lỗi | lỗi | user | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-7 | Hết hàng: nút khóa, gợi ý, giá vẫn hiện, vẫn lưu yêu thích được | đúng | user | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-8 | Đặt may: không bộ chọn, giá theo yêu cầu, nhãn chất liệu riêng, nút dẫn sang liên hệ kèm mã sản phẩm | đúng | khách | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-9G | Tim với khách: hộp đăng nhập nói rõ lý do, chưa lưu gì | đúng | khách | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-9 | Tim với người đã đăng nhập: lưu, báo BE, toast có link; bấm lần hai bỏ ra; tim đã đầy | đúng | user | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-9E | BE từ chối lưu yêu thích: tim trở lại | lỗi | user | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-10 | Chia sẻ: hộp chia sẻ hoặc chép địa chỉ + toast; đóng hộp / chép lỗi im lặng; thiếu danh mục thì địa chỉ cửa hàng | đúng | khách | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-11 | Đếm một lượt xem mỗi sản phẩm, VND hoặc USD theo ngôn ngữ, không đếm lại khi vẽ lại | đúng | khách | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-12 | Sản phẩm liên quan: link, tên, giá, giá theo yêu cầu, ẩn khi không có, thứ năm chỉ ở màn rộng | đúng | khách | component | `tests/storefront/product-detail/detail-buy.test.tsx` |
| PD-13 | Gallery: ảnh, thumbnail, phím mũi tên, mở trình xem đúng ảnh, về ảnh xem cuối, tải trước trình xem | đúng | khách | component | `tests/storefront/product-detail/detail-media.test.tsx` |
| PD-14 | Trình xem toàn màn hình: ảnh, bộ đếm, đóng, nút trước / sau, thanh zoom, tiếng Anh | đúng | khách | component | `tests/storefront/product-detail/detail-media.test.tsx` |
| PD-15 | Phóng to dưới chuột: ×2 sau 150 ms quanh con trỏ, cảm ứng không phóng, nhấn giữ thì thôi, rời thì thu, bấm mở trình xem | đúng | khách | component | `tests/storefront/product-detail/detail-media.test.tsx` |
| PD-16 | Bảng size: chỉ hỏi khi mở, bảng và đơn vị, đóng bằng nút / Esc / nền, khóa cuộn trang, tấm trượt trên điện thoại | đúng | khách | component | `tests/storefront/product-detail/detail-media.test.tsx` |
| PD-16E | Không có bảng size cho danh mục: thông báo | lỗi | khách | component | `tests/storefront/product-detail/detail-media.test.tsx` |
| PD-17 | Vận chuyển & đổi trả: gập sẵn, phương thức, "miễn phí", ngưỡng free ship, chính sách đổi trả, tiếng Anh | đúng | khách | component | `tests/storefront/product-detail/detail-media.test.tsx` |
| PD-17E | Không đọc được thông tin vận chuyển: mục không hiện | lỗi | khách | component | `tests/storefront/product-detail/detail-media.test.tsx` |
| PD-18 | Tổng hợp: điểm, số đánh giá, chip 1–5 sao và hình ảnh với số của BE; khung xám; trạng thái trống | đúng | khách | component | `tests/storefront/product-detail/detail-reviews.test.tsx` |
| PD-19 | Mở danh sách: không hỏi khi gập, nút "Xem tất cả", link điểm, `#reviews` | đúng | khách | component | `tests/storefront/product-detail/detail-reviews.test.tsx` |
| PD-20 | Một đánh giá: tác giả, ngày, sao, tiêu đề, nội dung, đã mua, form dáng, phản hồi cửa hàng, đã sửa | đúng | khách | component | `tests/storefront/product-detail/detail-reviews.test.tsx` |
| PD-21 | Xem thêm: chỉ hỏi trang kế, nối vào cuối, khóa khi đang tải, hết thì mất nút | đúng | khách | component | `tests/storefront/product-detail/detail-reviews.test.tsx` |
| PD-22 | Chip, form dáng, sắp xếp, xóa lọc: hỏi lại từ trang 1, bỏ câu trả lời muộn | đúng | khách | component | `tests/storefront/product-detail/detail-reviews.test.tsx` |
| PD-22E | Lọc không ra, danh sách trống, danh sách hoặc trang kế không tải được: thông báo và thử lại | lỗi | khách | component | `tests/storefront/product-detail/detail-reviews.test.tsx` |
| PD-23 | Thu gọn: nút nổi khi danh sách trong khung nhìn, đóng, đặt lại lọc, cuộn về đầu khối, giảm chuyển động | đúng | khách | component | `tests/storefront/product-detail/detail-reviews.test.tsx` |
| PD-24 | Hook danh sách: tắt thì không hỏi, thu rồi xem thêm không hỏi lại, tải lại đúng số đã có, xóa lỗi; bộ lọc có hiệu lực | đúng | khách | component | `tests/storefront/product-detail/detail-reviews.test.tsx` |
| PD-25 | Khách bấm "hữu ích": không hỏi vote, hộp đăng nhập nói rõ lý do, không gửi | đúng | khách | component | `tests/storefront/product-detail/detail-votes.test.tsx` |
| PD-26 | Đã đăng nhập: hỏi vote và đánh giá của mình một lần; bật / tắt theo BE; số của BE; đánh giá của mình không có nút; tra cứu lỗi thì im lặng | đúng | user | component | `tests/storefront/product-detail/detail-votes.test.tsx` |
| PD-27E | BE từ chối vote: của chính mình (1907), đã bị ẩn (1901) tải lại, lỗi khác báo và bật lại nút | lỗi | user | component | `tests/storefront/product-detail/detail-votes.test.tsx` |
| PD-28G | Thanh viết đánh giá với khách: nút + lời nhắc đăng nhập, bấm mở hộp đăng nhập | đúng | khách | component | `tests/storefront/product-detail/detail-write.test.tsx` |
| PD-28 | Thanh viết đánh giá, đã đăng nhập: viết (còn N ngày, dòng gần hạn nhất), sửa, lời cảm ơn, hoặc không gì cả | đúng | user | component | `tests/storefront/product-detail/detail-write.test.tsx` |
| PD-29 | Form mở để viết hoặc sửa; đóng bằng Esc / Hủy | đúng | user | component | `tests/storefront/product-detail/detail-write.test.tsx` |
| PD-30 | Lưu đánh giá: gửi, cảm ơn, đóng, tải lại tổng hợp, danh sách đang mở, chờ đánh giá và đánh giá của mình; sửa | đúng | user | component | `tests/storefront/product-detail/detail-write.test.tsx` |
| PD-30E | BE từ chối lưu: giữ form khi lỗi thường; 1902 và 1903 đóng form và tải lại | lỗi | user | component | `tests/storefront/product-detail/detail-write.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Thêm vào giỏ bị BE từ chối thì toast "đã thêm" hiện rồi dòng biến mất mà không giải thích | Đã sửa: rút dòng và toast lỗi như ngăn kéo thêm nhanh (PD-6E) |
| Dòng "Measurements in …" cứng tiếng Anh trong bảng size | Đã sửa: `sizeGuideModal.unit` ở cả hai ngôn ngữ (PD-16) |
| `ShareButtons.tsx` không trang nào import | Đã xóa cùng khối `public.product.share`; chia sẻ nằm trong `ProductDetailClient` (PD-10) |
| Tổng hợp đánh giá không đọc được hiện như "Chưa có đánh giá nào"; chỉ danh sách mới có hộp lỗi | Hành vi hiện tại, test khóa (PD-18); nên có hộp lỗi riêng nếu BE hay lỗi |
| Có `ratingCount` mà `ratingAverage` là `null` (BE không nhất quán) | Điểm hiện "–" và không có sao (PD-18) |
| "Thu gọn đánh giá" đóng cả danh sách nên mở lại là hỏi lại 5 đánh giá đầu; việc giữ các trang đã tải chỉ có ở lớp hook | Hành vi hiện tại (PD-23, PD-24) |
| Nhãn "ngày cuối" của hạn đánh giá chỉ hiện khi hạn đã qua (làm tròn lên thành "còn 1 ngày") | Thuộc [customer-reviews](./customer-reviews.md); test ở đây chỉ khóa "còn N ngày" (PD-28) |
| Thu phóng tối đa của trình xem và dừng autoplay lúc xem ảnh không kiểm được bằng jsdom | Không có test; kiểm tay trên trình duyệt thật |
| `ProductDetailClient` gần 700 dòng, còn gom nhiều việc | Test khóa hành vi để tách an toàn ở đợt sau |
| Sản phẩm thiếu danh mục hoặc danh mục con thì link và địa chỉ chia sẻ rơi về `/shop` | BE luôn kèm quan hệ này; trang vẫn dùng được (PD-10, PD-12) |

Thay đổi nhìn thấy được: có (nhỏ): thêm vào giỏ lỗi thì báo; "Số đo tính bằng …" theo ngôn ngữ; bỏ file `ShareButtons` chưa dùng.

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 6), kiểm thử đột biến.
- 2026-10-25 · Sửa: thêm vào giỏ bị BE từ chối thì báo lỗi; nhãn đơn vị bảng size qua i18n; xóa `ShareButtons` và `public.product.share` không dùng.
- 2026-10-26 · Tim dùng hook chung `useProductWishlist` ([wishlist](./wishlist.md)); hành vi không đổi, các đột biến của tim chuyển sang module wishlist.
- 2026-10-26 · no-test: kiểm bởi `tests/platform/design-system` (DSN-1). Thanh kéo của `SizeGuideModal` dùng `--border-default` (trước đây `--border-medium` chưa từng được định nghĩa); ghi nhận trong batch 8 (design-system).
