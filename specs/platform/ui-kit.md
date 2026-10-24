# UI kit (thành phần và hook dùng chung) — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-23 · **Trạng thái:** Implemented
> **Doc:** [platform/ui-kit](../../docs/platform/ui-kit.md) · **Test:** `tests/platform/ui-kit/`

## 1. Bối cảnh & mục tiêu

Mọi trang admin dùng chung bảng dữ liệu và khung popup; mọi trang dùng chung toast, hộp xác nhận, carousel, ô ảnh. Một lỗi ở đây lặp lại ở hàng chục màn hình: bảng gửi sai tham số làm admin thấy dữ liệu sai, toast tắt sớm làm mất lời báo lỗi, carousel kẹt làm trang chủ không đổi banner. Module gồm các file nó sở hữu trong `docs/platform/ui-kit.md`: `DataTable`, `AdminFormKit`, `InfoHint`, `Toast`, `ConfirmDialog`, `Carousel` (+ `CarouselControls`), các ô ảnh, banner, thành phần đánh giá, `PendingActionNotice`, `OrderDetailPanel` và các hook/hàm nhỏ đi kèm.

**Mục tiêu.** Khóa hành vi của từng thành phần bằng test chạy trên bản dịch thật, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Mọi file `_components/` thuộc module (xem doc), `use-sort-options`, `use-auto-advance`, `use-banner-rotation`, `useMediaQuery`, `product-badge`, `product-purchase` | `RoleGuard`, `SystemPasswordPrompt`, `LoginPromptModal`, `UnauthenticatedState` thuộc [auth](./auth.md); `MoneyText`, `VndInput` thuộc [currency](./currency.md); header, footer, menu thuộc site-chrome |
| Hộp kéo thả của `DataTable` bằng thư viện kéo giả (jsdom không kéo được) | Cảm giác kéo thật bằng ngón tay hoặc chuột: do Playwright ở các trang dùng bảng |
| Carousel với hình học giả (slide 300px, cách nhau 16px) | Cuộn mượt và snap thật của trình duyệt |

## 3. Hợp đồng

- **`DataTable<T>`** có hai chế độ. *Hỏi BE* (`fetchData`): hỏi khi mở và mỗi khi đổi tìm kiếm (chờ 350 ms ngừng gõ), bộ lọc, sắp xếp, trang, với `{ search, filters, sort, page, limit }`; `limit` mặc định 25, kẹp tối đa 200; đổi tìm kiếm, bộ lọc hoặc sắp xếp thì về trang 1. Không bao giờ gửi hai yêu cầu cùng tham số cùng lúc; đổi tham số khi đang chờ thì hỏi lại một lần với tham số mới nhất. Lỗi: bảng không còn dòng nào, xóa phần chọn, gọi `onError` và hiện "không tải được dữ liệu" kèm nút "Thử lại" (hỏi lại đúng tham số đang dùng) thay cho lời "chưa có dữ liệu". Trang hiện tại trống mà còn dữ liệu thì lùi về trang cuối còn tồn tại. *Tĩnh* (`rows`): hiện đúng các dòng được đưa vào, không hỏi, không tìm kiếm thật. `tableRef.refresh()` hỏi lại, `reset()` đưa mọi tham số về ban đầu. Chọn dòng (`selectable`) giữ khóa theo `keyExtractor`, chỉ giữ các dòng còn hiện sau mỗi lần hỏi. Kéo thả (`reorder`) chỉ bật khi đang sắp theo `reorder.sortValue`, không lọc/tìm, trọn danh sách nằm trên một trang; `onReorder` nhận danh sách đầy đủ theo thứ tự mới, ném lỗi thì bảng khôi phục.
- **`ToastProvider`/`useToast`**: `success|error|info|warning(message, duration=3000)`, `dismiss(id)` (id dạng `toast-<n>`), `dismissAll()`; tối đa `maxToasts` (5) cái, vượt thì bỏ cái cũ nhất; vùng `aria-live="polite"` gắn vào `<body>`. **`ConfirmProvider`/`useConfirm`**: `confirm(options) → Promise<boolean>`; nút xác nhận → `true`; nút hủy, vùng tối hoặc Escape → `false`. Dùng hook ngoài provider ném lỗi.
- **`AdminFormKit`**: `ModalShell` (header cố định, chỉ `ModalBody` cuộn, vùng tối đóng popup), `FormTabs`, `FormSection`, `FormField` (dấu `*` và gợi ý `InfoHint`), `FormActions` (Hủy/Lưu, khóa nút khi `isSaving`), `inputClass`.
- **`InfoHint`**: chuột mở khi di vào, đóng khi rời; bàn phím mở khi focus-visible; cảm ứng chạm để mở/đóng, chạm ra ngoài thì đóng; bong bóng luôn nằm trong màn hình, cách mép 8px.
- **Ảnh**: `ImageUrlField` (nhập URL hoặc tải lên qua `POST /api/admin/media`, điền URL BE trả về, xem trước qua `/media`), `ImageListField` (ảnh đầu là ảnh chính, thêm URL, tải nhiều tệp, xóa), `ImagePreviewLightbox` (gắn vào `<body>`, đóng bằng nút hoặc vùng tối).
- **`Carousel`**: mỗi con trực tiếp là một slide; trang = nhóm slide vừa màn hình; mặc định bật chấm, mũi tên, kéo chuột, tự chạy 5000 ms, lặp vô hạn (chỉ khi có nhiều slide hơn số slide hiện cùng lúc); `carouselRef` có `next/prev/scrollToPage`. `useAutoAdvance` là nơi duy nhất được dùng `setInterval` cho slider: chỉ chạy khi phần tử nằm trong màn hình, tab hiện, không giảm chuyển động, không có chuột đè hay focus trong, không vừa được chạm/cuộn (3 giây).
- **Banner**: `ResponsiveBannerImage` dựng `<picture>` với nguồn điện thoại (<640) và máy tính bảng (<1024) chỉ khi ảnh khác ảnh tiếp theo; `BannerFade` + `useBannerRotation` đổi banner theo chu kỳ.
- **Đánh giá**: `StarRating` (làm tròn sao nguyên), `ProductRating` (lấy số từ API, trống nếu chưa có đánh giá), `ReviewContent` (ngày theo `createdAt`), `ReviewAvatar`, `ReviewImageGrid` + `ReviewImageViewer`.
- **Khác**: `Checkbox` (ô thật phủ trong suốt), `CopyButton`, `JsonLd` (đổi `<` thành `\u003c`), `PendingActionNotice` (ẩn khi `count` là `undefined` hoặc 0), `OrderPaymentBadge`, `OrderDetailPanel`, `ProductBagButton`, `ProductLink`, `useSortOptions`, `useBreakpoint` (mobile <640, tablet 640–1023, desktop ≥1024), `getPurchaseMode`/`isPurchasable`/`hasPublicPrice`/`buildOrderInquiryHref`, style badge.

## 4. Thiết kế

```
trang (admin, storefront) ──► ui-kit ──► i18n (next-intl) · hooks · lib (list-query, money, media-url)
DataTable ──► use-debounce · @dnd-kit · list-query (clampLimit)
Carousel ──► use-auto-advance ──► IntersectionObserver · matchMedia
ImageUrlField / ImageListField ──► use-media-upload ──► BE /api/admin/media
OrderDetailPanel ──► MoneyText · ProductLink · OrderPaymentBadge · AdminFormKit (FormTabs)
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Provider + hook** cho toast và xác nhận (`useToast`, `useConfirm`) | Mọi nơi gọi bằng một dòng, không cần giữ state dialog ở từng trang; ném lỗi khi thiếu provider để lỗi cấu hình lộ ngay | Mỗi trang tự dựng dialog; `window.confirm` |
| **Promise thay cho callback** ở `confirm` | Gọi `if (!(await confirm(...))) return;` đọc tuần tự, không lồng | Truyền `onConfirm`/`onCancel` |
| **Compound components** ở `AdminFormKit` | Mỗi form tự ghép khung, tab, trường, nút theo nhu cầu mà vẫn cùng một dáng và cùng hành vi cuộn | Một `<Form>` nhận cấu hình khổng lồ |
| **Render prop** ở cột và hành động hàng loạt của `DataTable` | Bảng không biết kiểu dòng; mỗi trang tự vẽ ô và nút | Bảng biết từng loại dòng |
| **Ref API có chủ đích** (`tableRef`, `carouselRef`) | Trang cha cần "làm mới", "về trang đầu", "tới trang n" mà không đẩy state lên | Đẩy toàn bộ state của bảng ra ngoài |
| **Bảo vệ yêu cầu đang bay + xếp hàng một lần** trong `DataTable` | StrictMode và đổi tham số nhanh không gửi trùng; câu hỏi cuối cùng luôn được trả lời | Hủy yêu cầu cũ (`AbortController`): BE ghi dữ liệu không cần hủy, chỉ cần bỏ kết quả |
| **Một nơi duy nhất cho bộ hẹn giờ slider** (`useAutoAdvance`) | Quy tắc tạm dừng (ngoài màn hình, tab ẩn, giảm chuyển động, chạm) nhất quán; luật `auto-advance` của `conventions:check` cấm `setInterval` nơi khác | Mỗi slider tự đặt timer |
| **Bản sao hai đầu để lặp** trong `Carousel` thay vì dựng lại danh sách | Cuộn tự nhiên của trình duyệt giữ nguyên, nhảy về slide thật không thấy được (cùng pixel) | Dịch chuyển bằng transform |

### Kiến trúc

Tầng thấp nhất của giao diện: phụ thuộc `next-intl`, `hooks/`, `lib/` và thư viện bên ngoài, không phụ thuộc module trang nào. Các trang (admin, storefront) phụ thuộc vào kit, không ngược lại; `OrderDetailPanel` nhận `AdminOrder` làm kiểu (kiểu dữ liệu, không phải logic của trang). Chuỗi giao diện của kit nằm ở `admin.components.*` và `shared.*` để cả hai vai trò tải được.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `DataTable` lo bảng; `Toast` lo thông báo; `ConfirmDialog` lo xác nhận; `useAutoAdvance` chỉ lo nhịp thời gian |
| O | Thêm cột, bộ lọc, hành động hàng loạt, kiểu toast bằng props/biến thể, không sửa lõi; thêm giá trị `SlidesPerView` = thêm một dòng vào bảng lớp |
| L | `DataTable` chế độ tĩnh và chế độ BE cùng hợp đồng cột/dòng; hai biến thể `useAutoAdvance` (hover hay không) cùng kiểu trả về |
| I | `CarouselArrow`, `CarouselDots` đứng riêng, banner dùng dấu chấm mà không cần mũi tên; `ProductBagButton` chỉ cần `id` và `badge` |
| D | Trang phụ thuộc `useToast`/`useConfirm`, không phụ thuộc cách dựng portal; ô ảnh gọi `uploadMediaFile` qua một hàm, test thay bằng MSW |

### Conventions

Chuỗi hiển thị qua `next-intl` (`admin.components.*`, `shared.*`); không hardcode. Kích thước dùng `rem`, điều khiển lớn hơn trên cảm ứng bằng `pointer-coarse:`. Slider mới phải dùng `Carousel`, bảng admin phải dùng `DataTable` (`.agent/rules/components.md`). Test dùng `renderApp` (provider thật), `carousel-layout.ts` cho hình học giả, `browser-apis.ts` cho `ResizeObserver`/`IntersectionObserver`/`scrollTo`, `pointer-event.ts` cho `PointerEvent`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (các thành phần không đọc phiên; trang dùng chúng quyết định ai được thấy) · permission = không (không có quyền nào ở tầng kit; quyền của từng nút do trang chứa nó kiểm)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| UI-1 | Bảng hỏi BE khi mở: tham số mặc định, giới hạn trang kẹp ở 200, giá trị lọc/sắp xếp mặc định, lớp phủ "đang tải", hiện các dòng | đúng | — | component | `tests/platform/ui-kit/data-table.test.tsx` |
| UI-1E | BE từ chối: bảng hiện "không tải được dữ liệu" thay cho dòng cũ và thay cho "chưa có dữ liệu", nút "Thử lại" hỏi lại đúng tham số, `onError` được gọi, không có `onError` vẫn không lỗi | lỗi | — | component | `tests/platform/ui-kit/data-table.test.tsx` |
| UI-2 | Tìm kiếm (chờ ngừng gõ, về trang 1), lọc, sắp xếp: hỏi lại đúng tham số, nút đặt lại, ẩn hộp khi không cần | đúng | — | component | `tests/platform/ui-kit/data-table.test.tsx` |
| UI-3 | Phân trang: câu "hiển thị a–b trên n", trước/sau, cửa sổ trang có dấu …, lùi về trang cuối còn tồn tại khi trang hiện tại rỗng | đúng | — | component | `tests/platform/ui-kit/data-table.test.tsx` |
| UI-3E | Bảng trống: lời "chưa có dữ liệu" khác lời "không khớp bộ lọc", lời của người gọi (chuỗi hoặc hàm), ô thông báo trải mọi cột | lỗi | — | component | `tests/platform/ui-kit/data-table.test.tsx` |
| UI-4 | Yêu cầu chồng nhau: không gửi trùng, câu hỏi đổi giữa chừng được hỏi lại với tham số mới nhất | đúng | — | component | `tests/platform/ui-kit/data-table.test.tsx` |
| UI-5 | `tableRef`/`ref`: `refresh` hỏi lại, `reset` đưa tìm kiếm, bộ lọc, sắp xếp, trang về ban đầu | đúng | — | component | `tests/platform/ui-kit/data-table.test.tsx` |
| UI-6 | Chọn dòng: đếm, hành động hàng loạt nhận khóa và dòng, ô chọn tất cả ba trạng thái, bỏ chọn, giữ lại dòng còn hiện, khóa theo `keyExtractor` | đúng | — | component | `tests/platform/ui-kit/data-table.test.tsx` |
| UI-7 | Chế độ tĩnh: hiện các dòng được đưa vào, không hỏi ai, lớp phủ tải theo cha; nhiều dòng hơn một trang vẫn hiện hết | đúng | — | component | `tests/platform/ui-kit/data-table.test.tsx` |
| UI-8 | Cột: nội dung, độ rộng, căn phải, ẩn dưới điểm ngắt, tiếng Anh | đúng | — | component | `tests/platform/ui-kit/data-table.test.tsx` |
| UI-9 | Kéo thả thứ tự: tay cầm chỉ bật khi sắp theo thứ tự gốc, không lọc, một trang, bảng hỏi BE; thả → danh sách đầy đủ theo thứ tự mới; từ chối → khôi phục | đúng | — | component | `tests/platform/ui-kit/data-table-reorder.test.tsx` |
| UI-9E | Kéo thả không hợp lệ (thả lên chính nó, ra ngoài, dòng lạ) không làm gì; tay cầm bị khóa kèm lý do | lỗi | — | component | `tests/platform/ui-kit/data-table-reorder.test.tsx` |
| UI-10 | Toast: bốn loại, nội dung phong phú, tự tắt sau 3 giây hoặc thời gian được cho, nút đóng, đóng theo id hoặc tất cả, tối đa 5 (hoặc `maxToasts`), góc đặt, vùng thông báo `aria-live` | đúng | — | component | `tests/platform/ui-kit/feedback.test.tsx` |
| UI-10E | Dùng `useToast` ngoài provider ném lỗi rõ ràng | lỗi | — | component | `tests/platform/ui-kit/feedback.test.tsx` |
| UI-11 | Hộp xác nhận: trả `true`/`false` theo nút, vùng tối và Escape, nhãn mặc định hoặc của người gọi, kiểu nguy hiểm, nút xác nhận có focus, hỏi lại được | đúng | — | component | `tests/platform/ui-kit/feedback.test.tsx` |
| UI-11E | Dùng `useConfirm` ngoài provider ném lỗi rõ ràng | lỗi | — | component | `tests/platform/ui-kit/feedback.test.tsx` |
| UI-12 | Khung popup và các khối form: tiêu đề, đóng bằng nút hoặc vùng tối, chiều rộng, thân cuộn riêng, tab, nhóm, trường có dấu sao và gợi ý, nút Hủy/Lưu và trạng thái đang lưu | đúng | — | component | `tests/platform/ui-kit/form-kit.test.tsx` |
| UI-13 | Gợi ý "i": mở bằng chuột (di vào/ra), bàn phím (focus-visible), cảm ứng (chạm mở, chạm ngoài đóng), dịch bong bóng vào trong màn hình, vùng chạm lớn theo cỡ icon | đúng | — | component | `tests/platform/ui-kit/form-kit.test.tsx` |
| UI-14 | Ô một ảnh: nhập URL, tải lên (khóa nút khi đang tải, điền URL BE trả, toast), xem trước qua đường dẫn media | đúng | — | component | `tests/platform/ui-kit/image-fields.test.tsx` |
| UI-14E | Ô một ảnh: BE từ chối tệp báo bằng lời BE hoặc lời mặc định, giữ nguyên giá trị; đóng hộp chọn tệp không làm gì | lỗi | — | component | `tests/platform/ui-kit/image-fields.test.tsx` |
| UI-15 | Xem trước: bấm thumbnail mở/đóng bản lớn; ảnh hỏng hiện dấu hỏng, không mở; thử lại sau khi sửa URL hoặc tải tệp mới | đúng | — | component | `tests/platform/ui-kit/image-fields.test.tsx` |
| UI-16 | Ô nhiều ảnh: lưới có nhãn ảnh chính, xóa đúng ảnh, thêm URL (cắt khoảng trắng, nút hoặc Enter, không gửi form), tải nhiều tệp nối cuối, nút xóa hiện được trên cảm ứng | đúng | — | component | `tests/platform/ui-kit/image-fields.test.tsx` |
| UI-16E | Ô nhiều ảnh: địa chỉ trống bị bỏ, BE từ chối thì không thêm gì và báo lỗi | lỗi | — | component | `tests/platform/ui-kit/image-fields.test.tsx` |
| UI-17 | Khung xem ảnh lớn: ẩn khi đóng, nội dung và chú thích, đóng bằng nút (một lần) hoặc vùng tối, bấm vào ảnh không đóng, gắn ở `<body>` | đúng | — | component | `tests/platform/ui-kit/image-fields.test.tsx` |
| UI-18 | `useAutoAdvance`: chạy theo chu kỳ khi ở trong màn hình, dừng khi ra ngoài, tắt khi `enabled=false`, giảm chuyển động, tab ẩn, dùng hàm mới nhất, dọn dẹp khi gỡ | đúng | — | component | `tests/platform/ui-kit/auto-advance.test.tsx` |
| UI-19 | Giữ yên khi người dùng đang dùng: chuột đè, focus trong, chạm/cuộn/nhấn (3 giây), `pause()`; banner không dừng khi di chuột | đúng | — | component | `tests/platform/ui-kit/auto-advance.test.tsx` |
| UI-19E | `useBannerRotation`: xoay vòng, một banner hoặc không có thì đứng yên, `goTo` giữ 3 giây, đổi danh sách thì về banner đầu | lỗi | — | component | `tests/platform/ui-kit/auto-advance.test.tsx` |
| UI-20 | Carousel hiển thị: vùng có tên, slide có số thứ tự, trang theo nhóm slide vừa màn hình, chấm, mũi tên, lớp theo breakpoint, `fill` | đúng | — | component | `tests/platform/ui-kit/carousel.test.tsx` |
| UI-21 | Điều khiển: mũi tên, chấm, phím ←/→, `carouselRef`, `onPageChange`, cuộn mượt hoặc tức thì khi giảm chuyển động, không vượt hai đầu khi không lặp | đúng | — | component | `tests/platform/ui-kit/carousel.test.tsx` |
| UI-22 | Lặp vô hạn: bản sao hai đầu ẩn khỏi trình đọc màn hình và `inert`, bắt đầu ở slide thật đầu, nhảy không thấy về slide thật, bước theo trang, giữ trang khi đổi kích thước, tắt khi đủ chỗ hoặc `loop=false` | đúng | — | component | `tests/platform/ui-kit/carousel.test.tsx` |
| UI-23 | Tự chạy: tắt mặc định khi `autoplay=false` hoặc một trang, chạy theo chu kỳ, tạm dừng sau khi dùng mũi tên hoặc chấm | đúng | — | component | `tests/platform/ui-kit/carousel.test.tsx` |
| UI-24 | Kéo bằng chuột: cuộn theo, dừng ở slide gần nhất, kéo ngắn là bấm, nuốt đúng một cú bấm sau khi kéo, bỏ qua ngón tay và nút phải, tắt được | đúng | — | component | `tests/platform/ui-kit/carousel.test.tsx` |
| UI-24E | Mũi tên và chấm đứng riêng: tên theo hướng, khóa, tông màu; dưới hai chấm thì không vẽ | lỗi | — | component | `tests/platform/ui-kit/carousel.test.tsx` |
| UI-25 | Ảnh banner theo màn hình: một `<img>`, thêm nguồn cho điện thoại (<640) và máy tính bảng (<1024) khi khác ảnh, thứ tự hẹp trước | đúng | — | component | `tests/platform/ui-kit/banner.test.tsx` |
| UI-26 | Chuyển mờ giữa banner: hiện đúng chỉ số, trống thì không vẽ, độ mờ, ưu tiên tải, banner duy nhất không mờ dần | đúng | — | component | `tests/platform/ui-kit/banner.test.tsx` |
| UI-27 | `StarRating`: làm tròn đến sao nguyên, đọc một lần bằng `role=img`, tiếng Anh | đúng | — | component | `tests/platform/ui-kit/reviews.test.tsx` |
| UI-28 | `ProductRating`: hai kiểu hiển thị, không vẽ gì khi chưa có đánh giá, số theo ngôn ngữ | đúng | — | component | `tests/platform/ui-kit/reviews.test.tsx` |
| UI-29 | `ReviewAvatar`: ảnh qua đường dẫn media, chữ cái đầu viết hoa khi không có ảnh, kích thước | đúng | — | component | `tests/platform/ui-kit/reviews.test.tsx` |
| UI-30 | `ReviewContent`: sao, ngày theo `createdAt`, tiêu đề, nội dung giữ xuống dòng, "đã chỉnh sửa", "đã mua", form dáng, ảnh, phản hồi cửa hàng | đúng | — | component | `tests/platform/ui-kit/reviews.test.tsx` |
| UI-31 | `ReviewImageGrid` và viewer: thumbnail, mở đúng ảnh, chuyển ảnh, một ảnh không có mũi tên, mô tả ảnh, đóng | đúng | — | component | `tests/platform/ui-kit/reviews.test.tsx` |
| UI-33 | `Checkbox`: là ô thật, báo giá trị mới, có tên từ nhãn, trạng thái "một phần", khóa | đúng | — | component | `tests/platform/ui-kit/small-parts.test.tsx` |
| UI-34 | `CopyButton`: chép đúng giá trị, toast, dấu tick 1,5 giây, xin chép tay khi trình duyệt từ chối | đúng | — | component | `tests/platform/ui-kit/small-parts.test.tsx` |
| UI-35 | `JsonLd`: JSON trong script, đổi `<` nên dữ liệu không đóng được thẻ | đúng | — | component | `tests/platform/ui-kit/small-parts.test.tsx` |
| UI-36 | `PendingActionNotice`: ẩn khi không có số hoặc bằng 0, nội dung đầy đủ, nút bật/tắt bộ lọc, dòng "đã xử lý hết" khi được yêu cầu | đúng | — | component | `tests/platform/ui-kit/small-parts.test.tsx` |
| UI-37 | `OrderPaymentBadge`: ba trạng thái đúng màu và nhãn, trạng thái lạ hiện nguyên giá trị với màu trung tính | đúng | — | component | `tests/platform/ui-kit/small-parts.test.tsx` |
| UI-38 | `ProductBagButton`: thêm vào giỏ, hết hàng bị khóa, đặt hàng thiết kế đi tới liên hệ, không để link của thẻ mở | đúng | — | component | `tests/platform/ui-kit/small-parts.test.tsx` |
| UI-39 | `ProductLink`: link theo slug, tab mới an toàn, không slug thì chữ thường | đúng | — | component | `tests/platform/ui-kit/small-parts.test.tsx` |
| UI-40 | Nhãn sắp xếp, điểm ngắt màn hình, luật theo badge (mua được, có giá công khai, link đặt hàng), style badge đủ ở ba nơi | đúng | — | unit | `tests/platform/ui-kit/small-parts.test.tsx` |
| UI-41 | Panel đơn: tiêu đề, trạng thái, thanh toán, ngày, dòng hàng, vận chuyển, địa chỉ, tổng tiền theo ngôn ngữ, ghi chú | đúng | — | component | `tests/platform/ui-kit/order-detail-panel.test.tsx` |
| UI-41E | Panel đơn: thiếu trạng thái thanh toán, địa chỉ, ảnh, sản phẩm đã xóa, phương thức giao lạ hoặc rỗng, danh sách giao hàng không tải được | lỗi | — | component | `tests/platform/ui-kit/order-detail-panel.test.tsx` |
| UI-42 | Panel đơn: tab thanh toán chỉ có khi được đưa vào, chuyển qua lại, vẫn hiện khi chi tiết đang tải, thông báo nằm trên cả hai | đúng | — | component | `tests/platform/ui-kit/order-detail-panel.test.tsx` |

Coverage: mỗi file của module có ngưỡng riêng trong `tests/_support/coverage.json` (dòng ≥ 95%, nhánh 70–90%).

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| `DataTable` tĩnh vẫn vẽ ô tìm kiếm và, khi quá 25 dòng, cả điều khiển trang, nhưng không lọc hay cắt trang | Mọi dòng được hiện; ô tìm kiếm và nút trang không có tác dụng (UI-7). Dùng `searchable={false}` và ≤ 25 dòng cho bảng tĩnh |
| Gõ tìm kiếm khi đang ở trang n từng hỏi trang n của kết quả mới | Đã sửa: tìm kiếm mới về trang 1 (UI-2) |
| Bảng admin khi BE lỗi từng hiện "chưa có dữ liệu" (lời nói sai: chỉ trang Media có `onError`) | Đã sửa: bảng tự hiện "không tải được dữ liệu" và nút thử lại (UI-1E) |
| Nút đóng của `ImagePreviewLightbox` từng gọi `onClose` hai lần (nổi bọt lên vùng tối) | Đã sửa (UI-17) |
| `ConfirmDialog` không đóng bằng Escape | Đã sửa: Escape trả `false` (UI-11) |
| Nút xóa ảnh của `ImageListField` chỉ hiện khi rê chuột | Đã sửa: hiện sẵn trên cảm ứng và khi có focus (UI-16) |
| `ModalShell` và `ImagePreviewLightbox` không đóng bằng Escape, không giữ focus trong hộp | Chưa có: sửa chung cần thống nhất với hộp xác nhận lồng bên trong popup (Escape không được đóng cả hai) |
| Khi đổi kích thước, `Carousel` chọn lại trang gần vị trí cuộn hiện tại nhất (comment cũ nói "giữ trang") | Hành vi: dán vào đầu trang gần nhất (UI-22) |
| Chấm của `Carousel` cao 32px, thấp hơn 44px của luật cảm ứng | Giữ nguyên; vùng bấm rộng hơn chấm nhìn thấy |
| `ReviewImageViewer` nạp thư viện lightbox lười: lần mở đầu có độ trễ | Giữ: đổi lấy bundle nhỏ |

Thay đổi nhìn thấy được: tìm kiếm trong bảng admin về trang 1; Escape đóng hộp xác nhận; nút xóa ảnh luôn thấy trên điện thoại.

## 8. Lịch sử thay đổi

- 2026-10-23 · Viết spec và test cho toàn module (batch 3), kiểm thử đột biến.
- 2026-10-23 · Sửa: `DataTable` hiện "không tải được dữ liệu" kèm "Thử lại" khi BE lỗi (trước đây nói "chưa có dữ liệu"); tìm kiếm mới của `DataTable` về trang 1; `ImagePreviewLightbox` đóng một lần; `ConfirmDialog` đóng bằng Escape; nút xóa của `ImageListField` hiện trên cảm ứng.
- 2026-10-23 · Harness thêm `PointerEvent`, `ResizeObserver`, `IntersectionObserver`, `Element.scrollTo` giả và hình học carousel giả (thuộc [dev-tooling](./dev-tooling.md)).
