# Reviews admin (kiểm duyệt đánh giá) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [admin/reviews](../../docs/admin/reviews.md) · **Test:** `tests/admin/reviews/`

## 1. Bối cảnh & mục tiêu

Đánh giá của khách đăng ngay khi gửi; admin chỉ kiểm duyệt sau: trả lời công khai và ẩn đánh giá vi phạm quy định nội dung (không ẩn vì ít sao). Sai ở đây là ẩn nhầm một đánh giá hợp lệ làm lệch điểm trung bình, hoặc để hàng đợi "chờ phản hồi" lệch với số trên menu. Module gồm `ReviewsContent.tsx` (hàng đợi hai tab, lọc, mở chi tiết theo địa chỉ), `_components/{ReviewDetailPanel,HideReviewModal,ReviewReplyForm,ReviewStatusBadge}.tsx`, `_common/{moduleSlice,types,constants}.ts` và `page.tsx`. Nội dung đánh giá hiển thị bằng thành phần dùng chung của [ui-kit](../platform/ui-kit.md).

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Hàng đợi hai tab, tìm kiếm, sắp xếp năm cách, lọc sao, form dáng, ảnh, trạng thái, phản hồi, sản phẩm, người viết; mở chi tiết theo `?reviewId=` | Hiển thị công khai và viết đánh giá: thuộc [customer-reviews](../storefront/customer-reviews.md) và [product-detail](../storefront/product-detail.md) |
| Panel chi tiết, form ẩn, form phản hồi, huy hiệu, kho Redux | Chặn người không phải admin: thuộc [admin-shell](./admin-shell.md); ở đây chỉ kiểm BE từ chối thì không lộ gì |
| Quyền `REVIEW_ADMIN_MODERATE` trên nút ẩn/hiện, `REVIEW_ADMIN_REPLY` trên khối phản hồi | Bảng, hộp thoại, sao, ảnh: thuộc [ui-kit](../platform/ui-kit.md) |

## 3. Hợp đồng

- **Hàng đợi.** `GET /api/admin/reviews?search&status&rating&fit&hasImages&product&userId&replied&sort&page&limit`. Tab `?tab=`: vắng hoặc không hợp lệ = "chờ phản hồi" (luôn gửi `status=PUBLISHED&replied=false`, đúng điều kiện của số trên menu `counts.reviews`), `all` (bộ lọc trạng thái và phản hồi tự chọn). Lọc sao (1–5), form dáng, có ảnh dùng được ở cả hai tab; trạng thái và phản hồi chỉ ở tab "Tất cả". `?product=<slug>` và `?userId=` lọc thêm và hiện chip có đường xóa; đổi tab, sản phẩm hay người viết thì tạo mới bảng. Mỗi dòng: sản phẩm (ảnh hoặc ô thay thế, tên hoặc `—`), người viết (+ link lọc theo `userId`), sao, nội dung (ẩn dưới `lg`), số ảnh (ẩn dưới `md`), hữu ích (ẩn dưới `lg`), trạng thái kèm "Đã phản hồi / Chờ phản hồi", ngày (ẩn dưới `sm`). Bảng trống nói theo tab; BE lỗi nói "không tải được" kèm "Thử lại".
- **Mở chi tiết.** Bấm Xem: panel hiện ngay bằng dữ liệu của dòng, địa chỉ nhận `?reviewId=`, rồi `GET /api/admin/reviews/:id` lấy dữ liệu đầy đủ (lỗi thì giữ dữ liệu dòng). Vào bằng `?reviewId=` thì mở đúng một lần; không thấy thì không hiện panel; địa chỉ mất `reviewId` thì đóng.
- **Panel.** Sản phẩm (link "mọi đánh giá của sản phẩm" luôn có khi còn sản phẩm; link cửa hàng mở tab mới chỉ khi có đủ danh mục và danh mục con), người viết (link "mọi đánh giá của người này" khi có `userId`), nội dung như khách thấy, dấu vết kiểm duyệt (chỉ hiện dòng có dữ liệu; lý do ẩn chỉ khi đang ẩn). Khối phản hồi cần `REVIEW_ADMIN_REPLY`; thanh nút cần `REVIEW_ADMIN_MODERATE` (đang hiện = "Ẩn đánh giá" kèm nhắc; đang ẩn = "Hiện lại").
- **Ẩn** (`POST …/hide {note}`): lý do bắt buộc (≤ 500), cắt khoảng trắng, người viết đọc được; bốn gợi ý một chạm thay nội dung ô, cố ý không có "đánh giá thấp".
- **Hiện lại** (`POST …/publish`): hỏi xác nhận trước; nút khóa khi đang gửi.
- **Phản hồi** (`PUT …/reply {content}`, `DELETE …/reply`): ≤ 1000, cắt khoảng trắng; nút chỉ bật khi nội dung khác bản đang lưu; xóa phải xác nhận.
- **Lỗi.** Toast lời BE (mã có bản dịch) hoặc lời mặc định. Mã 1906 (đã ở trạng thái đó): đóng form ẩn, tải lại đánh giá và thay panel. Mã 1901 (không còn): đóng panel và làm mới bảng. Mã đọc được từ cả `ApiError` lẫn lỗi thường do `unwrap()` ném ra.

## 4. Thiết kế

```
page.tsx ──► ReviewsContent ──► FormTabs · DataTable ──► fetchReviews (thunk) ──► authApi
ReviewsContent ──► ReviewDetailPanel ──► HideReviewModal · ReviewReplyForm ──► hideReview / publishReview / replyToReview / deleteReviewReply ──► authApi
ReviewDetailPanel ──► RoleGuard (REVIEW_ADMIN_MODERATE, REVIEW_ADMIN_REPLY) · ReviewContent (ui-kit)
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Tab và đánh giá đang mở nằm trong địa chỉ** (`?tab=`, `?reviewId=`) | Gửi link cho đồng nghiệp; Back đóng panel; tab lạ về hàng đợi chính | State cục bộ |
| **Tab chờ phản hồi cùng điều kiện với badge menu** | Số trên menu và số dòng trong tab luôn khớp | Hai điều kiện riêng |
| **Hiện ngay dữ liệu của dòng, tải đầy đủ sau** | Admin không phải chờ; lỗi tải thêm không làm mất panel | Chờ rồi mới mở |
| **Panel phản ứng với lỗi của BE bằng mã** (`errorCodeOf`) | 1906 và 1901 là tình huống bình thường khi hai admin cùng làm; panel tự về trạng thái thật | So `instanceof ApiError`: lỗi từ `unwrap()` là object thường nên không bao giờ khớp |
| **Quyền riêng cho khối phản hồi và thanh nút** (`RoleGuard`) | Người chỉ trả lời không ẩn được và ngược lại | Một quyền chung |
| **Form phản hồi dựng lại theo thời điểm trả lời đã lưu** (`key`) | Ô nhập bắt đầu lại từ bản BE đang giữ sau khi lưu hay tải lại | Đồng bộ bằng effect |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit, auth (quyền), admin-shell (số đếm), data layer (`authApi`). Hình dạng `AdminReview` ở `src/types/review.ts` dùng chung với storefront. Không module nào phụ thuộc ngược vào đây. Kho `reviews` giữ danh sách, tổng và cờ đang tải, đang cập nhật; bốn lệnh ghi dùng chung một nhánh trạng thái.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi thành phần một việc: hàng đợi, panel, form ẩn, form phản hồi, huy hiệu |
| O | Thêm lý do gợi ý hay cách sắp xếp = thêm vào hằng số và bản dịch |
| L | Hai form có cùng hợp đồng `review`, `onDone`/`onChanged`, `onFailed` |
| I | Form chỉ nhận một đánh giá và vài hàm gọi lại, không nhận cả kho |
| D | Thành phần phụ thuộc thunk và hook, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `admin.reviews`; lỗi qua `useErrorMessage` và `errorCodeOf`; toast qua `useToast`; xác nhận qua `useConfirm`. Test dùng `renderApp` với danh tính thật, `adminWith(...)` cho một quyền và `reviewsApi` (BE giả) trong `reviews-kit.tsx`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì không lộ đánh giá nào; việc chặn trang thuộc admin-shell) · permission = có (ẩn/hiện cần `REVIEW_ADMIN_MODERATE`, phản hồi cần `REVIEW_ADMIN_REPLY`)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ARV-1 | Hàng đợi: mở ở tab chờ phản hồi với đúng điều kiện của badge menu, mới nhất trước; mỗi dòng có sản phẩm, người viết, sao, nội dung, ảnh, hữu ích, trạng thái, ngày; phần thiếu có dấu thay; tìm, sắp xếp, cột ẩn trên điện thoại, tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/reviews/reviews-list.test.tsx` |
| ARV-2 | Tab: số chờ phản hồi trên tab (không biết thì không số), đổi tab bằng địa chỉ giữ tham số khác, tab lạ về hàng đợi chính, tab tất cả không gửi trạng thái, bảng dựng lại khi tab, sản phẩm hay người viết đổi, chip lọc | đúng | admin đủ quyền | component | `tests/admin/reviews/reviews-list.test.tsx` |
| ARV-2F | Bộ lọc: sao, form dáng, ảnh ở cả hai tab; trạng thái và phản hồi chỉ ở tab tất cả; giá trị gửi đúng tên tham số | đúng | admin đủ quyền | component | `tests/admin/reviews/reviews-list.test.tsx` |
| ARV-3 | Mở đánh giá: hiện ngay bằng dữ liệu dòng, ghi vào địa chỉ, rồi dữ liệu đầy đủ; lỗi tải thêm giữ dữ liệu dòng; đóng bỏ khỏi địa chỉ; vào bằng `?reviewId=` mở một lần; không thấy thì không panel; địa chỉ mất id thì đóng; thao tác xong thì bảng tải lại; đánh giá đã mất thì đóng panel và tải lại bảng | đúng | admin đủ quyền | component | `tests/admin/reviews/reviews-list.test.tsx` |
| ARV-4E | Bảng trống nói theo tab và bộ lọc; BE lỗi báo không tải được; BE từ chối khách (401) | lỗi | khách | component | `tests/admin/reviews/reviews-list.test.tsx` |
| ARV-4U | BE từ chối người mua đã đăng nhập (403): không lộ đánh giá nào | lỗi | user | component | `tests/admin/reviews/reviews-list.test.tsx` |
| ARV-5 | Panel: sản phẩm và hai link, người viết và link, nội dung như khách thấy, dấu vết kiểm duyệt chỉ hiện dòng có dữ liệu, lý do ẩn chỉ khi đang ẩn; đóng; tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/reviews/review-detail.test.tsx` |
| ARV-5B | Huy hiệu trạng thái, kể cả trạng thái lạ | đúng | — | component | `tests/admin/reviews/review-detail.test.tsx` |
| ARV-6 | Nút theo trạng thái và quyền: đang hiện có Ẩn kèm nhắc, đang ẩn có Hiện lại; mở form ẩn, Hủy đóng | đúng | admin đủ quyền | component | `tests/admin/reviews/review-detail.test.tsx` |
| ARV-6P | Chỉ có quyền ẩn/hiện thì không thấy khối phản hồi; chỉ có quyền phản hồi thì không thấy nút; chỉ xem thì không thấy cả hai | đúng | admin thiếu quyền | component | `tests/admin/reviews/review-detail.test.tsx` |
| ARV-6S | Hiện lại: hỏi trước, gửi, toast, báo cha, nút khóa khi đang gửi; Không thì không gửi | đúng | admin đủ quyền | component | `tests/admin/reviews/review-detail.test.tsx` |
| ARV-6E | Hiện lại bị từ chối: lỗi khác chỉ báo; 1906 tải lại đánh giá và thay panel (kể cả khi tải lại cũng lỗi); 1901 báo cha là đã mất | lỗi | admin đủ quyền | component | `tests/admin/reviews/review-detail.test.tsx` |
| ARV-7 | Form ẩn: nhắc quy định, bốn gợi ý thay nội dung ô, bộ đếm và giới hạn, lý do bắt buộc và cắt khoảng trắng, toast, báo cha | đúng | admin đủ quyền | component | `tests/admin/reviews/review-forms.test.tsx` |
| ARV-7E | Ẩn bị từ chối: lời BE hoặc mặc định, giữ chữ, báo cho nơi gọi; chạy được khi nơi gọi không nghe | lỗi | admin đủ quyền | component | `tests/admin/reviews/review-forms.test.tsx` |
| ARV-8 | Form phản hồi: bắt đầu từ bản đã lưu, nút chỉ bật khi đổi, đăng mới hay cập nhật nói đúng, nội dung cắt khoảng trắng và không được rỗng, giới hạn và bộ đếm | đúng | admin đủ quyền | component | `tests/admin/reviews/review-forms.test.tsx` |
| ARV-8E | Phản hồi bị từ chối: lời BE hoặc mặc định, giữ chữ, báo cho nơi gọi | lỗi | admin đủ quyền | component | `tests/admin/reviews/review-forms.test.tsx` |
| ARV-8D | Xóa phản hồi: hỏi trước, xóa, ô trống lại, toast, báo cha; Không thì thôi | đúng | admin đủ quyền | component | `tests/admin/reviews/review-forms.test.tsx` |
| ARV-8X | Xóa phản hồi bị từ chối: lời mặc định, giữ chữ, báo cho nơi gọi; chạy được khi nơi gọi không nghe | lỗi | admin đủ quyền | component | `tests/admin/reviews/review-forms.test.tsx` |
| ARV-9 | Panel quanh các form: ẩn xong đóng form và báo cha; đăng phản hồi báo cha; ô phản hồi dựng lại khi bản lưu đổi | đúng | admin đủ quyền | component | `tests/admin/reviews/review-forms.test.tsx` |
| ARV-9E | Panel quanh các form khi BE từ chối: lỗi khác giữ form; 1906 đóng form và tải lại; 1901 (ẩn hoặc phản hồi) báo mất | lỗi | admin đủ quyền | component | `tests/admin/reviews/review-forms.test.tsx` |
| ARV-10 | Kho Redux và hằng số: tham số hỏi, danh sách và tổng, id được mã hóa, thân gửi đi của bốn lệnh ghi, cờ đang tải và đang cập nhật, lỗi, hai tab, bốn lý do gợi ý, năm cách sắp xếp, giới hạn BE | đúng | — | unit | `tests/admin/reviews/reviews-slice.test.ts` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Lỗi từ `unwrap()` không phải `ApiError` nên mã 1906/1901 không bao giờ được nhận ra | Đã sửa: panel đọc mã bằng `errorCodeOf` (ARV-6E, ARV-9) |
| Ẩn nhầm vì ít sao | Nhắc ở nút và trong form, không có gợi ý "đánh giá thấp" (ARV-7) |
| Hai admin cùng ẩn một đánh giá | BE trả 1906; panel tải lại và hiện trạng thật (ARV-9) |
| Số tab và số menu lệch nhau | Cả hai dùng `counts.reviews` và cùng điều kiện (ARV-1, ARV-2) |
| BE lỗi cho ra bảng "không có đánh giá" | Đã sửa trong ui-kit: "không tải được dữ liệu" kèm "Thử lại" (ARV-4E) |

Thay đổi nhìn thấy được: mã 1906 và 1901 giờ thật sự làm panel tải lại hoặc đóng.

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 4), kiểm thử đột biến. Sửa `ReviewDetailPanel`: đọc mã lỗi bằng `errorCodeOf` thay vì `instanceof ApiError`.
