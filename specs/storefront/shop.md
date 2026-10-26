# Shop (danh mục, danh mục con, lưới sản phẩm) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-26 · **Trạng thái:** Implemented
> **Doc:** [storefront/shop](../../docs/storefront/shop.md) · **Test:** `tests/storefront/shop/`

## 1. Bối cảnh & mục tiêu

Các trang duyệt sản phẩm là đường dẫn tới doanh thu: khách xem danh mục, lọc, thêm yêu thích hoặc thêm nhanh vào giỏ ngay từ thẻ sản phẩm. Sai ở đây là một trang 404 giả hay thiếu, một bộ lọc gửi sai tham số làm lưới trống, hoặc một nút giỏ cho khách chưa đăng nhập làm mất sản phẩm. Module gồm ba trang (`page.tsx`, `[category]/page.tsx`, `[category]/[subcategory]/page.tsx`: render ở server, ISR 60 giây) và `_components/{ShopHero,BreadcrumbNav,CategoryGrid,SubcategoryChips,ShopProductsClient,ShopFilters,ProductGrid,ProductCard}.tsx` chạy ở trình duyệt, cùng `_common/constants.ts`. Hàm lấy dữ liệu server `_lib/server-fetchers.ts` thuộc [data-layer](../platform/data-layer.md); trang chi tiết sản phẩm là module riêng [product-detail](./product-detail.md).

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách và người đã đăng nhập, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Ba trang: nguồn dữ liệu, hero, breadcrumb, JSON-LD, metadata, `generateStaticParams`, 404 | Hàm lấy dữ liệu server `server-fetchers.ts`: thuộc [data-layer](../platform/data-layer.md) |
| Lưới sản phẩm: lọc giá, số sao, size, màu; sắp xếp; "Xem thêm"; hiệu ứng hiện dần | Ngăn kéo thêm nhanh: thuộc [cart](./cart.md) |
| Thẻ sản phẩm: giá, badge, đánh giá, tim yêu thích (cần đăng nhập), nút giỏ (cần đăng nhập) | Trang yêu thích và trạng thái yêu thích trong store: thuộc [wishlist](./wishlist.md) |

## 3. Hợp đồng

- **Trang `/shop`.** Hỏi `GET /api/categories?sort=priority&limit=200`, `GET /api/products?limit=25` và banner `SHOP_HERO_BANNERS` song song. Banner lỗi hoặc rỗng → hero màu trơn (không lỗi); danh mục hoặc sản phẩm lỗi → ném lỗi (trang lỗi). Hiện hero (banner xoay vòng), breadcrumb, mô tả "N danh mục", lưới danh mục, lưới sản phẩm với tổng của BE. JSON-LD `BreadcrumbList`: trang chủ, cửa hàng.
- **Trang `/shop/[category]`.** Hỏi danh mục theo `slug` (không có → 404), rồi `GET /api/products?category=…&limit=25`. Hero lấy ảnh sản phẩm đầu tiên (không có sản phẩm → hero trơn); breadcrumb ba bước; chip danh mục con (chip "Tất cả" đang mở); lưới sản phẩm với `scope {category}`. JSON-LD ba bước.
- **Trang `/shop/[category]/[subcategory]`.** Danh mục hoặc danh mục con không có → 404. Hero và breadcrumb bốn bước (ba bước có link); chip danh mục con với mục hiện tại đang mở; "N sản phẩm" là tổng của BE; lưới với `scope {category, subcategory}`. JSON-LD bốn bước.
- **Metadata.** Tiêu đề kết thúc bằng thương hiệu; mô tả theo trang; `canonical` và `hreflang` theo ngôn ngữ; thẻ chia sẻ dùng ảnh sản phẩm đầu tiên (không có thì ảnh thương hiệu). Danh mục hoặc danh mục con không tồn tại → tiêu đề "không tìm thấy". `generateStaticParams` sinh sẵn mọi danh mục và mọi cặp danh mục – danh mục con.
- **Lưới và lọc.** `ShopProductsClient` giữ trang đầu từ server và gọi `GET /api/products` cho mọi thay đổi: đổi sắp xếp hoặc bộ lọc lấy trang 1 và thay lưới; mỗi yêu cầu mang `scope` của trang. Bảy kiểu sắp xếp; bốn khoảng giá cố định bằng VND (bấm lại để bỏ); số sao tối thiểu 4/3/2/1; size và màu gom từ mọi sản phẩm đã thấy (chỉ tăng); nút Bộ lọc đếm số nhóm đang dùng (giá, số sao, size, màu), "Xóa tất cả" hiện khi có lọc hoặc đổi sắp xếp. Yêu cầu cũ trả lời muộn bị bỏ.
- **"Xem thêm".** Hiện khi số sản phẩm đã có ít hơn tổng của BE; hỏi trang kế với đúng bộ lọc đang bật, nối vào cuối lưới (loại trùng), đang tải thì khóa và ghi "Đang tải…" và chỉ gửi một yêu cầu cho một lần bấm đôi. Lỗi → toast, nút bật lại.
- **Thẻ sản phẩm.** Ảnh đầu tiên, badge, tên, giá theo ngôn ngữ (giá gốc gạch ngang khi có), đánh giá (khi đã có); sản phẩm `custom_order` hiện "giá theo yêu cầu". Cả thẻ là link tới trang sản phẩm dựng từ danh mục và danh mục con (thiếu thì `/shop`). Tim: khách → hộp đăng nhập nói rõ lý do và chưa lưu gì; người đã đăng nhập → lưu vào store và báo BE (BE từ chối thì tim trở lại), toast có link tới danh sách yêu thích; bấm lần hai bỏ ra. Nút giỏ: dưới 640 px là nút icon cạnh tim, từ đó là nút chữ trên ảnh; khách → hộp đăng nhập; người đã đăng nhập → ngăn kéo thêm nhanh; `sold_out` khóa; `custom_order` dẫn sang liên hệ kèm mã sản phẩm. Bấm tim hoặc giỏ không mở trang sản phẩm.
- **Hiệu ứng.** Lưới chỉ ẩn rồi hiện dần các thẻ mới thêm, khi chúng vào khung nhìn; thẻ đã có đứng yên; danh sách đổi hẳn thì bắt đầu lại; rời đi hoặc đổi trước khi thấy thì không thẻ nào bị ẩn. Danh mục: tối đa bốn là lưới, hơn bốn là carousel có tên.

## 4. Thiết kế

```
page.tsx (server) ─► server-fetchers (data-layer) ─► BE
  ├─ ShopHero · BreadcrumbNav · CategoryGrid · SubcategoryChips (client)
  └─ ShopProductsClient ─► ShopFilters · ProductGrid ─► ProductCard
ShopProductsClient ─► fetchProductPage (use-api) ─► GET /api/products
ProductCard ─► useProductWishlist (wishlist: requireAuth + store + BE) · useAuthAction + useQuickAdd (cart)
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Server render trang đầu, client lo phần còn lại** | Trang đầu có nội dung cho công cụ tìm kiếm và nhanh; lọc và "Xem thêm" không cần tải lại cả trang | Làm hết ở client |
| **Lọc và sắp xếp do BE làm** | Kết quả đúng trên cả danh mục lớn, không chỉ phần đã tải; FE không tính lại | Lọc trong trình duyệt |
| **Bỏ yêu cầu trả lời muộn** (`requestRef`) | Hai lần lọc nhanh liền nhau không để kết quả cũ đè kết quả mới | Khóa giao diện trong lúc tải |
| **Khoảng giá cố định bằng VND** | BE lọc theo VND; không bao giờ đổi USD ngược lại | Ô nhập giá |
| **Hành động cần đăng nhập đi qua `requireAuth`** | Khách thấy lý do và sau khi đăng nhập việc đang làm tiếp tục | Ẩn nút với khách |
| **Hiện dần bằng `IntersectionObserver`, chỉ thẻ mới** | Đọc vị trí thật của thẻ nên layout đổi sau khi tải cũng không làm thẻ ẩn mãi | Tính vị trí cuộn |

### Kiến trúc

Trang (server) phụ thuộc xuống data layer; thành phần client phụ thuộc store wishlist, ngăn kéo thêm nhanh của [cart](./cart.md), `useAuthAction`, `Carousel` và `BannerFade` của [ui-kit](../platform/ui-kit.md). [product-detail](./product-detail.md), [collections](./collections.md) và [new-in](./new-in.md) dùng lại `ProductCard`/`ProductGrid`/`ShopFilters`; ngược lại không.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi thành phần một việc: hero, breadcrumb, lưới danh mục, chip, lưới sản phẩm, bộ lọc, thẻ |
| O | Thêm kiểu sắp xếp hay khoảng giá = thêm vào hằng số và bản dịch |
| L | `ShopProductsClient` nhận `scope` nên dùng được cho danh mục, danh mục con và badge |
| I | `ShopFilters` chỉ nhận size, màu, bộ lọc đang bật và một hàm báo thay đổi |
| D | Thẻ phụ thuộc hook và store, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `public.shop`; tiền qua `useMoney`; hành động cần đăng nhập qua `useAuthAction`. Test gọi thẳng hàm trang server (khung `intl-server` thế `next-intl/server` bằng bản dịch thật), dùng `renderApp` với danh tính thật và `shopApi` (API công khai giả: sản phẩm, danh mục, banner, yêu thích) trong `shop-kit.tsx`; `IntersectionObserver` giả để điều khiển hiệu ứng.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (tim và nút giỏ cần đăng nhập: khách thấy hộp đăng nhập, người đã đăng nhập thực hiện) · permission = không (trang công khai)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| SHP-1 | Trang /shop: hỏi danh mục, 25 sản phẩm và banner; hero, breadcrumb, lưới danh mục, sản phẩm và tổng; banner lỗi vẫn hiện; JSON-LD; tiếng Anh; báo cho framework ngôn ngữ | đúng | khách | integration | `tests/storefront/shop/shop-pages.test.tsx` |
| SHP-1E | Trang /shop khi danh mục hoặc sản phẩm không đọc được: ném lỗi | lỗi | khách | integration | `tests/storefront/shop/shop-pages.test.tsx` |
| SHP-2 | Trang danh mục: hỏi đúng danh mục và sản phẩm, hero từ ảnh sản phẩm đầu, chip, tổng, JSON-LD ba bước, hero trơn khi chưa có sản phẩm, metadata và trang dựng sẵn | đúng | khách | integration | `tests/storefront/shop/shop-pages.test.tsx` |
| SHP-2E | Danh mục không tồn tại: 404 và tiêu đề "không tìm thấy" | lỗi | khách | integration | `tests/storefront/shop/shop-pages.test.tsx` |
| SHP-3 | Trang danh mục con: breadcrumb bốn bước, chip đang mở, tổng của BE, metadata và trang dựng sẵn | đúng | khách | integration | `tests/storefront/shop/shop-pages.test.tsx` |
| SHP-3E | Danh mục hoặc danh mục con không tồn tại: 404 và tiêu đề "không tìm thấy" | lỗi | khách | integration | `tests/storefront/shop/shop-pages.test.tsx` |
| SHP-10 | Thẻ sản phẩm: ảnh, tên, giá theo ngôn ngữ, giá gốc, badge, đánh giá, giá theo yêu cầu, link, thiếu danh mục | đúng | khách | component | `tests/storefront/shop/shop-card.test.tsx` |
| SHP-11G | Tim với khách: hộp đăng nhập nói rõ lý do, chưa lưu gì, chưa báo BE | đúng | khách | component | `tests/storefront/shop/shop-card.test.tsx` |
| SHP-11 | Tim với người đã đăng nhập: lưu, báo BE, toast có link; bấm lần hai bỏ ra; tim đã đầy; không mở trang sản phẩm | đúng | user | component | `tests/storefront/shop/shop-card.test.tsx` |
| SHP-11E | BE từ chối lưu yêu thích: tim trở lại | lỗi | user | component | `tests/storefront/shop/shop-card.test.tsx` |
| SHP-12G | Nút giỏ với khách: hộp đăng nhập nói rõ lý do | đúng | khách | component | `tests/storefront/shop/shop-card.test.tsx` |
| SHP-12 | Nút giỏ với người đã đăng nhập: icon trên điện thoại, chữ trên máy tính, mở ngăn kéo; sold_out khóa; custom_order dẫn sang liên hệ | đúng | user | component | `tests/storefront/shop/shop-card.test.tsx` |
| SHP-13 | Lưới: một thẻ mỗi sản phẩm, cột theo cỡ màn hình, trạng thái "sắp ra mắt" | đúng | khách | component | `tests/storefront/shop/shop-grid.test.tsx` |
| SHP-14 | Hiệu ứng hiện dần: ẩn thẻ mới đến khi vào khung nhìn, chỉ thẻ thêm vào, bắt đầu lại khi danh sách đổi, không thẻ nào bị ẩn mãi | đúng | khách | component | `tests/storefront/shop/shop-grid.test.tsx` |
| SHP-15 | Breadcrumb: bước cuối không phải link, dấu ngăn, tên | đúng | khách | component | `tests/storefront/shop/shop-parts.test.tsx` |
| SHP-16 | Thẻ danh mục: link, mô tả, tổng sản phẩm, ảnh hay màu trơn, lưới đến bốn thẻ và carousel khi hơn bốn | đúng | khách | component | `tests/storefront/shop/shop-parts.test.tsx` |
| SHP-17 | Chip danh mục con: "Tất cả" và từng mục kèm số, mục đang mở | đúng | khách | component | `tests/storefront/shop/shop-parts.test.tsx` |
| SHP-18 | Hero: nhãn, tiêu đề, mô tả, không banner / một banner / nhiều banner với chấm | đúng | khách | component | `tests/storefront/shop/shop-parts.test.tsx` |
| SHP-20 | Thanh công cụ: tổng của BE, bảy kiểu sắp xếp, nút xóa và đếm chỉ khi có lọc, tiếng Anh | đúng | khách | component | `tests/storefront/shop/shop-products.test.tsx` |
| SHP-21 | Sắp xếp: hỏi trang 1 với thứ tự mới, thay lưới và tổng, mang scope của trang, trạng thái trống | đúng | khách | component | `tests/storefront/shop/shop-products.test.tsx` |
| SHP-22 | Bảng lọc: bốn khoảng giá VND, số sao, size và màu gom từ sản phẩm đã thấy (chỉ tăng), đếm nhóm, xóa tất cả | đúng | khách | component | `tests/storefront/shop/shop-products.test.tsx` |
| SHP-23 | Xem thêm: hiện khi còn, hỏi trang kế với đúng bộ lọc, nối vào cuối không trùng, khóa khi đang tải và một lần cho bấm đôi, bắt đầu lại khi đổi lọc | đúng | khách | component | `tests/storefront/shop/shop-products.test.tsx` |
| SHP-27E | Lọc hoặc xem thêm không tải được: toast, giữ lưới, bật lại nút; bỏ câu trả lời muộn | lỗi | khách | component | `tests/storefront/shop/shop-products.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Sản phẩm không có danh mục hoặc danh mục con thì địa chỉ trang sản phẩm rơi về `/shop` | Dữ liệu BE luôn kèm quan hệ này; thẻ vẫn dùng được (SHP-10) |
| Trang đầu server lỗi thì cả trang lỗi | Danh mục hoặc sản phẩm không đọc được ném lỗi để trang lỗi hiện (SHP-1E); banner thì không bao giờ làm hỏng trang |
| Hai lần lọc nhanh để kết quả cũ đè mới | Mỗi lần lọc tăng số thứ tự yêu cầu; trả lời của yêu cầu cũ bị bỏ (SHP-27E) |
| Khoảng giá lệch đơn vị nếu đổi sang USD | Khoảng giá cố định bằng VND vì BE lọc theo VND (SHP-22) |
| Khách bấm tim hay giỏ rồi mất việc đang làm | Hộp đăng nhập chạy lại hành động sau khi đăng nhập (SHP-11G, SHP-12G) |

Thay đổi nhìn thấy được: không (không đổi hành vi nhìn thấy).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 6), kiểm thử đột biến. Không đổi code của module.
- 2026-10-26 · Tim của `ProductCard` dùng hook chung `useProductWishlist` (module [wishlist](./wishlist.md)); hành vi không đổi, các đột biến của tim chuyển sang module wishlist.
