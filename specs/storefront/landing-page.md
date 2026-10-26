# Landing page (trang chủ) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [storefront/landing-page](../../docs/storefront/landing-page.md) · **Test:** `tests/storefront/landing-page/`

## 1. Bối cảnh & mục tiêu

Trang chủ là một câu chuyện cuộn: video người mẫu nền, một tấm đen trượt lên chứa lưới ảnh các bộ sưu tập, rồi phần kết dẫn vào cửa hàng. Sai ở đây là chiều cao cuộn tính sai (trang cụt hay thừa), thẻ không hiện, nút kết không bấm được, hoặc dữ liệu có cấu trúc thiếu cho công cụ tìm kiếm. Module gồm `(public)/page.tsx` (server), `landing-page/page.tsx` (cuộn: GSAP + vòng `requestAnimationFrame`), `_components/{VideoContainer,Caption,ProductInfo,ViewButton,OutroSection,Footer,CollectionShowcase}.tsx` và `_common/constants.ts`.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách (trang công khai, không có hành động cần đăng nhập), kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Trang chủ server: JSON-LD `WebSite`, `ClothingStore`, `SiteNavigationElement`, tiêu đề ẩn cho trình đọc | Metadata mặc định của trang: thuộc [seo](../platform/seo.md) |
| Cơ chế cuộn: chiều cao, video, khối thẻ, thẻ lớn dần, phần kết, ký hiệu ngẫu nhiên, tấm đen | Header và footer chung của trang: thuộc [site-chrome](../platform/site-chrome.md) |
| Video luân phiên, chữ, nút "khám phá", footer của landing, lưới ảnh bộ sưu tập | Dữ liệu bộ sưu tập: thuộc [data-layer](../platform/data-layer.md) và [collections](./collections.md) |

## 3. Hợp đồng

- **Trang chủ.** Báo ngôn ngữ cho framework; JSON-LD: `WebSite` và `ClothingStore` (mô tả và nhận diện từ bản dịch), `ItemList` năm mục (Cửa hàng, Hàng mới, Bộ sưu tập, Đặt thiết kế, Giới thiệu) với địa chỉ tuyệt đối theo ngôn ngữ; một `h1` chỉ dành cho trình đọc.
- **Chiều cao.** `#scroll-spacer` cao `vh + maxScroll + 2·vh`, `maxScroll = max(0, chiều cao khối thẻ − vh)`; tính lại khi đổi cỡ cửa sổ.
- **Cuộn (mỗi khung hình).** Video ẩn khi `scrollY > vh`; từ đó khối thẻ dịch lên đúng phần đã cuộn quá `vh`; mỗi thẻ có `scale` 0 khi ngoài màn hình, lớn dần trong 60% màn từ đáy, nhỏ dần trong 40% màn ở đỉnh, lấy nhỏ hơn; ký hiệu trong vòng tròn đổi ngẫu nhiên không nhanh hơn mỗi 80 ms.
- **Phần kết.** Khi `scrollY > vh + maxScroll`, `tiến độ = (scrollY − bắt đầu)/(vh − 100)` (tối đa 1) điều khiển độ mờ lớp phủ và footer, độ dịch của nhãn (`(offset − 80)·tiến độ`, offset mặc định 160) và độ lớn nút; trước đó mọi thứ về trạng thái ẩn.
- **Tấm đen.** GSAP trượt tấm lên trong 100vh đầu theo cuộn (`scrub`); dọn khi rời trang.
- **Video.** Hai video xếp chồng, bắt đầu từ video trái; khi một video kết thúc, video kia chạy từ đầu và hai bên mờ chéo trong 600 ms (không mờ khi người dùng muốn bớt chuyển động); hộp hiện sau khi có video tải xong hoặc sau 2 giây.
- **Lưới ảnh.** Mỗi bộ sưu tập một thẻ (tỷ lệ 2:3, ảnh, tên, "Mua ngay", link `/collections/<slug>`), rải so le thành 2, 3, 4 và 5 cột (CSS chọn cột nào hiện), thẻ nửa trái lớn lên từ góc phải dưới, nửa phải từ góc trái dưới; có dữ liệu thì gửi sự kiện `resize` sau 50 ms để trang tính lại chiều cao. Không có hoặc không đọc được dữ liệu → lưới trống.
- **Phần nhỏ.** Chú thích, nhãn, nút "khám phá" → `/shop`, footer với năm hiện tại và hai tài liệu pháp lý đầu.

## 4. Thiết kế

```
(public)/page.tsx (server) ─► JsonLd + LandingPage (client)
LandingPage ─► GSAP (tấm đen) · vòng rAF (video, thẻ, phần kết, ký hiệu)
  ├─ VideoContainer · Caption · ProductInfo · ViewButton · OutroSection · Footer
  └─ CollectionShowcase ─► useCollections ─► GET /api/collections
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Một vòng `requestAnimationFrame` duy nhất cho mọi thứ theo cuộn** | Mọi phần tử đọc `scrollY` một lần mỗi khung hình, không có trình nghe cuộn; dễ giữ nhất quán | Nhiều ScrollTrigger |
| **Phần tử nối với vòng bằng `id`** (`outro-*`, `main-canvas`, `circle-symbol`) | Các phần nhỏ là thành phần riêng nhưng vòng không cần props | Truyền ref qua mọi tầng |
| **Giữ cả bốn lưới cột trong DOM, CSS chọn** | Không phải đo màn hình ở JavaScript | `useBreakpoint` |
| **Server chỉ lo dữ liệu có cấu trúc** | JSON-LD và `h1` có trong HTML đầu tiên cho công cụ tìm kiếm | Sinh ở client |

### Kiến trúc

Trang (server) phụ thuộc xuống thư viện dữ liệu có cấu trúc; thành phần client phụ thuộc `useCollections` của data layer. Không module nào khác import từ đây.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi thành phần một khối; vòng cuộn nằm ở trang |
| O | Thêm bước kết = thêm phần tử có `id` và một nhánh trong vòng |
| L | `CollectionShowcase` nhận hai ref và không biết trang cha |
| I | Các phần nhỏ không nhận props |
| D | Showcase phụ thuộc hook `useCollections`, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `public.landing`; hành vi cuộn kiểm bằng khung hình giả (`requestAnimationFrame` được thế, test chạy từng khung) và các đo đạc của jsdom được thế (`scrollHeight`, `getBoundingClientRect`, `scrollY`, `innerHeight`); `HTMLMediaElement.play` được thế vì jsdom không có.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (trang công khai, không có hành động cần đăng nhập; nút "khám phá" chỉ chuyển trang) · permission = không (trang công khai)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| LND-1 | Trang chủ: JSON-LD site, cửa hàng và năm mục, `h1` ẩn, tiếng Anh, báo ngôn ngữ | đúng | khách | integration | `tests/storefront/landing-page/landing-page.test.tsx` |
| LND-2 | Chiều cao câu chuyện, tính lại khi đổi cỡ, không âm | đúng | khách | component | `tests/storefront/landing-page/landing-page.test.tsx` |
| LND-3 | Cuộn: video ẩn sau màn đầu, khối thẻ dịch lên, quay lại, vòng chạy mỗi khung và dừng khi rời | đúng | khách | component | `tests/storefront/landing-page/landing-page.test.tsx` |
| LND-4 | Thẻ lớn dần từ đáy, nhỏ dần ở đỉnh, ẩn khi ngoài màn hình | đúng | khách | component | `tests/storefront/landing-page/landing-page.test.tsx` |
| LND-5 | Phần kết: ẩn, hiện theo tiến độ, đầy đủ, offset của nhãn, quay lại | đúng | khách | component | `tests/storefront/landing-page/landing-page.test.tsx` |
| LND-6 | Ký hiệu ngẫu nhiên không nhanh hơn 80 ms | đúng | khách | component | `tests/storefront/landing-page/landing-page.test.tsx` |
| LND-7 | Tấm đen trượt theo cuộn và được gỡ khi rời trang | đúng | khách | component | `tests/storefront/landing-page/landing-page.test.tsx` |
| LND-8 | Lưới ảnh: thẻ, link, ảnh, tên, rải so le trên 2 / 3 / 4 / 5 cột, gốc lớn lên theo nửa trái / phải | đúng | khách | component | `tests/storefront/landing-page/landing-showcase.test.tsx` |
| LND-9 | Gửi `resize` sau khi có dữ liệu | đúng | khách | component | `tests/storefront/landing-page/landing-showcase.test.tsx` |
| LND-9E | Không có hoặc không đọc được bộ sưu tập: lưới trống, không resize | lỗi | khách | component | `tests/storefront/landing-page/landing-showcase.test.tsx` |
| LND-10 | Video: xếp chồng, chạy video trái, luân phiên và mờ chéo, bớt chuyển động, hiện sau khi tải hoặc 2 giây, trình duyệt từ chối phát, dọn khi rời | đúng | khách | component | `tests/storefront/landing-page/landing-parts.test.tsx` |
| LND-11 | Chú thích, nhãn, phần kết | đúng | khách | component | `tests/storefront/landing-page/landing-parts.test.tsx` |
| LND-12 | Nút "khám phá" dẫn tới cửa hàng | đúng | khách | component | `tests/storefront/landing-page/landing-parts.test.tsx` |
| LND-13 | Footer: năm hiện tại, hai tài liệu pháp lý, ẩn lúc đầu | đúng | khách | component | `tests/storefront/landing-page/landing-parts.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Bốn lưới cột đều nằm trong DOM nên mỗi ảnh được vẽ bốn lần (ba cái bị CSS ẩn) | Hành vi hiện tại (LND-8); cân nhắc chỉ vẽ lưới đang dùng |
| Vòng chạy mỗi khung hình kể cả khi tab ẩn hay đã cuộn xa | Hành vi hiện tại (LND-3); trình duyệt tự giảm khung hình ở tab ẩn |
| Phần tử nối bằng `id` toàn cục: hai bản của trang cùng lúc sẽ trùng | Chỉ có một trang chủ tại một thời điểm |
| Video không phát được (tự phát bị chặn) thì chỉ thấy khung hình đầu | Lỗi `play()` được nuốt (LND-10) |
| Không đo bố cục thật: jsdom không có kích thước | Công thức khóa bằng số đo giả; kiểm tay trên trình duyệt thật |

Thay đổi nhìn thấy được: không (không đổi hành vi nhìn thấy).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 6), kiểm thử đột biến. Không đổi code của module.
