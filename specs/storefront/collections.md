# Collections (danh sách và chi tiết bộ sưu tập) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [storefront/collections](../../docs/storefront/collections.md) · **Test:** `tests/storefront/collections/`

## 1. Bối cảnh & mục tiêu

Bộ sưu tập là cửa vào theo chủ đề: khách đọc câu chuyện của từng bộ rồi vào trang sản phẩm hoặc thêm nhanh vào giỏ. Sai ở đây là một trang 404 giả, một thẻ dẫn sai bộ, hoặc một nút tim cho khách chưa đăng nhập mà không lưu gì thật. Module gồm hai trang server (`page.tsx`, `[slug]/page.tsx`, ISR 60 giây) và hai thành phần client `_components/CollectionsClient.tsx`, `[slug]/_components/CollectionDetailClient.tsx`. Hàm lấy dữ liệu server thuộc [data-layer](../platform/data-layer.md); trái tim yêu thích dùng hook chung của [wishlist](./wishlist.md); ngăn kéo thêm nhanh thuộc [cart](./cart.md).

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách và người đã đăng nhập, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Hai trang: nguồn dữ liệu, JSON-LD, metadata, `generateStaticParams`, 404 | Hàm lấy dữ liệu server: thuộc [data-layer](../platform/data-layer.md) |
| Danh sách: hero (banner xoay), dải chữ, thẻ (carousel cảm ứng và dải ghim trên màn rộng), ba khối editorial | `Carousel`, `BannerFade`, `useBannerRotation`: thuộc [ui-kit](../platform/ui-kit.md) |
| Chi tiết: hero, lookbook ba sản phẩm, câu trích, lưới sản phẩm với tim và nút giỏ | Ngăn kéo thêm nhanh và hook tim: thuộc [cart](./cart.md), [wishlist](./wishlist.md) |

## 3. Hợp đồng

- **Trang danh sách.** Hỏi `GET /api/collections?limit=200` và banner `COLLECTIONS_HERO_BANNERS` song song. Banner lỗi hoặc rỗng → hero màu trơn; bộ sưu tập không đọc được → ném lỗi (trang lỗi). JSON-LD `BreadcrumbList` Trang chủ › Bộ sưu tập.
- **Trang chi tiết.** Hỏi `GET /api/collections?slug=` (một lần cho bộ, một lần cho sản phẩm đi kèm). Không có bộ → 404, kể cả khi API lỗi (lỗi đọc trông như không có). JSON-LD ba bước. Metadata: tiêu đề kết thúc bằng thương hiệu, mô tả, `hreflang`, ảnh bìa làm ảnh chia sẻ; không có → tiêu đề "không tìm thấy". `generateStaticParams` cho mọi bộ.
- **Danh sách (client).** Hero theo số banner (0 = nền trơn, 1 = ảnh, ≥ 2 = chấm + chuyển mờ); dải chữ lặp 4 lần trên và 4 lần dưới các thẻ; thẻ cho mọi bộ (số `01…`, tên, phụ đề, ảnh, link `/collections/<slug>`) ở hai dạng: dải ghim cuộn ngang trên màn rộng có chuột, `Carousel` có tên trên điện thoại và cảm ứng; ba bộ đầu thêm khối editorial (số, tên, mô tả, ảnh, nút vào bộ), khối chẵn đảo bên và mỗi khối một màu nền.
- **Chi tiết (client).** Hero (ảnh bìa, mùa, tên, phụ đề, mô tả); lookbook ba sản phẩm đầu ("01 / 03", badge, tên, mô tả, giá hoặc "giá theo yêu cầu" cho đặt may, giá gốc gạch ngang); câu trích mô tả ký bằng mùa; lưới mọi sản phẩm với số lượng; hai link về danh sách bộ sưu tập.
- **Tim trên thẻ.** Khách → hộp đăng nhập nói rõ lý do, chưa lưu gì; người đã đăng nhập → lưu vào store và báo BE (BE từ chối thì tim trở lại), toast có link tới danh sách yêu thích; bấm lần hai bỏ ra; bấm không mở trang sản phẩm. Nút giỏ mở ngăn kéo thêm nhanh cho cả khách (việc đăng nhập đòi lúc thêm); `sold_out` khóa; `custom_order` dẫn sang liên hệ kèm mã sản phẩm.

## 4. Thiết kế

```
page.tsx (server) ─► server-fetchers (data-layer) ─► BE
  ├─ CollectionsClient ─► BannerFade · Carousel · GSAP (ghim khi rộng + chuột)
  └─ CollectionDetailClient ─► ShopCard ─► useProductWishlist (wishlist) · useQuickAdd (cart) · ProductBagButton
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Dùng chung hook tim** (`useProductWishlist`) | Trước đây thẻ sản phẩm, trang chi tiết và trang này mỗi nơi tự viết luồng lưu / bỏ tim; riêng ở đây tim chỉ là state cục bộ nên khách bấm tim không lưu gì. Một hook chung sửa lỗi này và bỏ lặp | Chép luồng lần thứ ba |
| **`ShopCard` là một thành phần riêng** | Hook không gọi được trong vòng `map`; mỗi thẻ có hook và state của nó | Giữ cả lưới trong một hàm |
| **Hai dạng thẻ cùng một dữ liệu** (dải ghim và `Carousel`) | Ghim cuộn ngang cần con trỏ chính xác; cảm ứng cần vuốt và điểm dừng. CSS chọn dạng, GSAP chỉ đăng ký ghim khi `matchMedia` khớp | Một dạng cho mọi thiết bị |
| **Server render, client chỉ tạo chuyển động** | Nội dung có sẵn cho công cụ tìm kiếm; GSAP thêm hiệu ứng, dọn bằng `ctx.revert()` khi rời trang | Mọi thứ ở client |

### Kiến trúc

Trang (server) phụ thuộc xuống data layer; thành phần client phụ thuộc `Carousel` và `BannerFade` của [ui-kit](../platform/ui-kit.md), hook tim của [wishlist](./wishlist.md) và ngăn kéo của [cart](./cart.md). Không module nào khác import từ đây.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi thành phần một việc: hero, thẻ, khối editorial; `ShopCard` giữ tim và nút giỏ của một sản phẩm |
| O | Thêm khối mới = thêm một section; số lượng spread là một hằng số |
| L | `CollectionCard` và `ShopCard` nhận dữ liệu qua props |
| I | `useProductWishlist` chỉ nhận sản phẩm và một hàm báo kết quả |
| D | Thành phần phụ thuộc hook và store, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `public.collections`; tiền qua `useMoney`; hành động cần đăng nhập qua `useAuthAction` (trong hook tim). Test gọi thẳng hàm trang server (`intl-server` thế `next-intl/server`), dùng `renderApp` với danh tính thật và `collectionsApi` (API công khai giả) trong `collections-kit.tsx`; thành phần client được bọc trong `<main>` như trang thật vì GSAP bọc phần tử ghim bằng một lớp đệm mà React không gỡ được khỏi vùng chứa trần.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (tim cần đăng nhập: khách thấy hộp đăng nhập, người đã đăng nhập thực hiện) · permission = không (trang công khai)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| COL-1 | Trang danh sách: hỏi bộ sưu tập (limit 200) và banner; hero, thẻ, spread; banner lỗi vẫn hiện; JSON-LD; tiếng Anh; báo ngôn ngữ; metadata | đúng | khách | integration | `tests/storefront/collections/collections-pages.test.tsx` |
| COL-1E | Danh sách không đọc được: ném lỗi | lỗi | khách | integration | `tests/storefront/collections/collections-pages.test.tsx` |
| COL-2 | Trang chi tiết: hỏi bộ theo địa chỉ, hiện bộ và sản phẩm, JSON-LD ba bước, metadata, trang dựng sẵn | đúng | khách | integration | `tests/storefront/collections/collections-pages.test.tsx` |
| COL-3E | Bộ không có hoặc API lỗi: 404 và tiêu đề "không tìm thấy" | lỗi | khách | integration | `tests/storefront/collections/collections-pages.test.tsx` |
| COL-4 | Hero danh sách: tiêu đề, mùa, phụ đề, banner (0 / 1 / nhiều với chấm) | đúng | khách | component | `tests/storefront/collections/collections-list.test.tsx` |
| COL-5 | Dải chữ lặp 4 + 4 lần | đúng | khách | component | `tests/storefront/collections/collections-list.test.tsx` |
| COL-6 | Thẻ: carousel cảm ứng có tên, dải ghim, số, tên, phụ đề, link, ảnh; không có bộ nào | đúng | khách | component | `tests/storefront/collections/collections-list.test.tsx` |
| COL-7 | Spread editorial: ba bộ đầu, số, tên, mô tả, ảnh, link, đảo bên, màu nền | đúng | khách | component | `tests/storefront/collections/collections-list.test.tsx` |
| COL-8 | Chuyển động: ghim chỉ trên màn rộng có chuột, nhả khi rời trang | đúng | khách | component | `tests/storefront/collections/collections-list.test.tsx` |
| COL-9 | Hero và câu trích của trang chi tiết; tiếng Anh | đúng | khách | component | `tests/storefront/collections/collections-detail.test.tsx` |
| COL-10 | Lookbook: ba sản phẩm đầu, vị trí "01 / 03", badge, giá, giá gốc, giá theo yêu cầu, đảo bên | đúng | khách | component | `tests/storefront/collections/collections-detail.test.tsx` |
| COL-11 | Lưới sản phẩm: số lượng, link, ảnh, tên, giá, badge; bộ trống; link về danh sách | đúng | khách | component | `tests/storefront/collections/collections-detail.test.tsx` |
| COL-12G | Tim với khách: hộp đăng nhập nói rõ lý do, chưa lưu gì, chưa báo BE | đúng | khách | component | `tests/storefront/collections/collections-detail.test.tsx` |
| COL-12 | Tim với người đã đăng nhập: lưu, báo BE, toast có link; bấm lần hai bỏ ra; tim đã đầy; không mở trang sản phẩm | đúng | user | component | `tests/storefront/collections/collections-detail.test.tsx` |
| COL-12E | BE từ chối lưu yêu thích: tim trở lại | lỗi | user | component | `tests/storefront/collections/collections-detail.test.tsx` |
| COL-13 | Nút giỏ: mở ngăn kéo (cả khách), sold_out khóa, custom_order dẫn sang liên hệ, không mở trang sản phẩm | đúng | user | component | `tests/storefront/collections/collections-detail.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Nút tim ở lưới trang chi tiết chỉ là state cục bộ: khách bấm tim không lưu gì | Đã sửa: dùng `useProductWishlist` như thẻ sản phẩm (COL-12G, COL-12, COL-12E) |
| Bộ không đọc được (API lỗi) hiện 404 như bộ không tồn tại | Hành vi hiện tại, test khóa (COL-3E); `getCollectionBySlug` nuốt lỗi |
| Trang chi tiết hỏi `?slug=` hai lần (bộ và sản phẩm) | Hành vi hiện tại (COL-2); bộ nhớ đệm fetch của Next gộp chúng |
| Nút giỏ mở ngăn kéo cho khách rồi mới đòi đăng nhập khi thêm; thẻ ở shop đòi đăng nhập trước | Hành vi hiện tại (COL-13); ngăn kéo tự đòi đăng nhập |
| Dải ghim trên màn rộng cần con trỏ chính xác; iPad ngang dùng carousel | Điều kiện `matchMedia` khóa bằng test (COL-8) |
| Test của GSAP chỉ kiểm có / không ghim, không kiểm hoạt cảnh | Hoạt cảnh kiểm tay trên trình duyệt |

Thay đổi nhìn thấy được: có (nhỏ): tim ở trang chi tiết bộ sưu tập giờ lưu thật (cần đăng nhập).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 6), kiểm thử đột biến.
- 2026-10-25 · Sửa: tim ở lưới sản phẩm của trang chi tiết dùng hook chung `useProductWishlist` (lưu vào store và BE, khách phải đăng nhập); tách `ShopCard`.
