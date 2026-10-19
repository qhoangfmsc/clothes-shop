# Customer reviews (đánh giá của khách)

> **Nhóm:** Storefront (private) · **Route:** `/[locale]/reviews` (`?tab=pending|mine`, `?productId=<id>` lọc "Đánh giá của tôi") · **Cập nhật:** 2026-10-18
> **Code:** `(private)/reviews/` — `page.tsx`, `layout.tsx`, `ReviewsContent.tsx`, `_common/{constants,types,upload,use-deadline-label,use-my-reviews,use-pending-reviews}.ts`, `_components/{PendingReviewCard,MyReviewCard,ReviewFormModal,ReviewImageUploader,StarPicker}.tsx`; dùng chung `_components/{ReviewContent,ReviewImageGrid,StarRating}.tsx`
> **i18n:** `private.reviews` (`meta`, `page`, `tabs`, `pending`, `mine`, `toast.loadFailed`), `shared.reviews` (`form`, `toast`, `deadline` — để form dùng được cả ở trang sản phẩm thuộc scope `public`), `shared.errors.byCode` (1601, 1602, 1606, 1607, 1901–1908, 9001), `private.orders.detail.review`, `private.orders.list.reviewsLink`

## 1. Tóm tắt module

Phía khách của đánh giá sản phẩm: màn "Chờ đánh giá" (dòng hàng còn đánh giá được), màn "Đánh giá của tôi", và `ReviewFormModal` dùng để viết đánh giá mới hoặc sửa đánh giá (một lần). Trang sản phẩm hiển thị đánh giá ở [product-detail](./product-detail.md); admin kiểm duyệt ở [admin/reviews](../admin/reviews.md).

## 2. Phục vụ gì / việc cần làm

Khách đã nhận hàng viết đánh giá (sao, tiêu đề, nội dung, form dáng, tối đa 5 ảnh), xem lại các đánh giá đã viết (kể cả đã bị cửa hàng ẩn, kèm lý do) và sửa đúng một lần trong hạn. Đánh giá hiện ngay khi gửi, không chờ duyệt.

## 3. Submodule & chức năng hiện có

| Thành phần | Chức năng |
|---|---|
| Trang `/reviews` | Chặn khi chưa đăng nhập (`UnauthenticatedState`), skeleton khi tải phiên, hai tab `role="tablist"` (tab nằm trong URL `?tab=`, mặc định `pending`) |
| Tab "Chờ đánh giá" (`PendingReviewCard`) | Mỗi dòng hàng: ảnh, tên, size · màu, số lượng, "còn N ngày để đánh giá" (đỏ khi ≤ 3 ngày; "ngày cuối" khi còn dưới 1 ngày), link `/orders/<orderId>`, nút "Viết đánh giá". Số trên tab = `total` của BE |
| Tab "Đánh giá của tôi" (`MyReviewCard`) | Chip lọc Tất cả / Đang hiển thị / Đã bị ẩn (`status`), chip "Một sản phẩm" khi có `?productId=`, "Xem thêm" 10/lần. Mỗi thẻ: sản phẩm (link "Xem sản phẩm" tra URL bằng `getProductUrl` khi bấm), `ReviewContent`, nhãn "Đã bị ẩn" + lý do `moderationNote` + "chỉ mình bạn thấy, không sửa được", dòng trạng thái sửa và nút "Sửa" |
| `ReviewFormModal` | Dialog portal (bottom-sheet toàn chiều cao dưới `sm`, hộp giữa màn từ `sm`), header/footer cố định, phần giữa cuộn; Esc và nút X đóng (không đóng khi bấm nền để khỏi mất chữ); khóa cuộn trang phía sau |
| `StarPicker` | 5 radio ẩn + sao 44 px (bàn phím, trình đọc màn hình dùng được; chuột xem trước sao đang rê), nhãn "Rất tệ … Tuyệt vời" |
| `ReviewImageUploader` | Lưới thumbnail 80 px (xem trước cục bộ): spinner khi đang tải lên lúc gửi, viền đỏ + dấu chấm than ở ảnh tải lỗi, nút xóa từng ảnh, nút "Thêm ảnh", dòng gợi ý giới hạn ("ảnh chỉ tải lên khi bạn gửi đánh giá"), thông báo lý do từ chối file |
| Nút "Viết đánh giá" ở đơn và ở trang sản phẩm | Trang chi tiết đơn ([customer-orders](./customer-orders.md)) và khối đánh giá của [product-detail](./product-detail.md) (`WriteReviewBar`, kèm "Sửa đánh giá của bạn") mở cùng `ReviewFormModal` |

## 4. Chi tiết

### 4.1 API (qua `useApiAuth().apiFetch`)

| Việc | API |
|---|---|
| Danh sách chờ | `GET /api/my-reviews/pending?limit=200` (SWR, khóa `reviews:pending`, dùng chung với trang đơn; lỗi hoặc thiếu quyền = danh sách rỗng, tính năng phụ thuộc tự ẩn) |
| Đánh giá của tôi | `GET /api/my-reviews?sort=-createdAt&page&limit=10&status&productId` — gọi với `raw: true` để giữ URL ảnh gốc của BE (hiển thị qua `toMediaUrl`), vì sửa đánh giá gửi lại đúng các URL đó |
| Upload ảnh | `POST /api/reviews/images` (multipart, field `file`) → `data.url`, chỉ gọi **khi bấm gửi**; `apiFetch` nhận `FormData` và không đặt `Content-Type` |
| Gửi | `POST /api/reviews` `{ orderItemId, rating, title?, content?, fit?, images? }` (chỉ gửi field có giá trị) → 201, đánh giá hiện ngay |
| Sửa | `PATCH /api/reviews/:reviewId` chỉ gồm field đã đổi (`images` thay cả danh sách) |

Sau khi lưu: `useRefreshReviewData` làm mới `reviews:pending` và mọi khóa SWR chứa `/api/reviews/` (tổng hợp ở trang sản phẩm), danh sách "Đánh giá của tôi" tải lại.

### 4.2 Form: ràng buộc phía FE (khớp BE)

- Sao 1–5 bắt buộc (báo lỗi khi gửi). Tiêu đề ≤ 255, nội dung ≤ 2000 (`maxLength` + bộ đếm `n/2000`). Tiêu đề và nội dung **không chứa** `http(s)://` hay `www.` (`REVIEW_LINK_PATTERN`): báo ngay khi gõ và chặn gửi. Form dáng nhỏ / đúng size / rộng không bắt buộc, bấm lại để bỏ chọn (khi sửa một đánh giá đã có form dáng thì chỉ đổi được, không bỏ được).
- Ảnh: tối đa 5, mỗi ảnh ≤ 5 MB, JPEG/PNG/WebP/GIF/AVIF (nhận theo `File.type`, nếu rỗng thì theo đuôi file); file trùng (cùng tên · kích thước · `lastModified`) bị bỏ qua. Kiểm tra ngay khi chọn nhưng **chưa gửi gì lên server**: ảnh chỉ có bản xem trước cục bộ (object URL, trạng thái `local`), nên chọn rồi hủy form không tốn hạn mức 30 ảnh/24 giờ. Khi bấm gửi: (1) mọi ảnh chưa có URL tải lên cùng lúc bằng `Promise.allSettled` (trạng thái `uploading` → `done` | `error`); (2) nếu có ảnh lỗi thì **không** gọi API đánh giá, ảnh lỗi được đánh dấu, toast báo lỗi, các ảnh đã lên giữ nguyên URL; bấm gửi lần nữa chỉ tải lại ảnh lỗi; (3) tất cả xong mới gọi `POST`/`PATCH` với các URL BE trả về (đúng thứ tự trong form). Nếu bước đánh giá lỗi (ví dụ `1905`), ảnh đã lên không tải lại ở lần gửi sau. Ảnh đã tải mà đánh giá không được lưu thì bỏ lại trên server (không có API xóa). Khi sửa, ảnh mới chưa tải được tính là có thay đổi.
- Chống gửi hai lần: cờ `submittingRef` + nút `disabled` khi đang gửi.
- Sửa: hộp "mỗi đánh giá chỉ sửa được 1 lần" kèm hạn `editableUntil`; chỉ gửi field đổi, không đổi gì thì chặn ("Hãy thay đổi nội dung trước khi lưu"). Nút "Sửa" hiện theo `canEdit` của BE, hạn theo `editableUntil`; đánh giá `HIDDEN` không có nút. Không có nút xóa.

### 4.3 Xử lý mã lỗi (`useErrorMessage` + `shared.errors.byCode`)

| Mã | Hành vi |
|---|---|
| 1905 | Lỗi ngay dưới ô nội dung, form giữ nguyên |
| 1908 | Bỏ toàn bộ ảnh khỏi form để tải lại, toast lỗi |
| 1903 | Toast, đóng form, làm mới hai danh sách và chuyển sang tab "Đánh giá của tôi" (từ trang đơn: `/reviews?tab=mine`) |
| 1902 / 1904 | Toast, đóng form, làm mới "Chờ đánh giá" và "Đánh giá của tôi" |
| 1606 (HTTP 413 không có mã) / 1607 (HTTP 429 không có mã) | `uploadReviewImage` gán mã cho hai trường hợp BE trả không kèm `errorCode` để hiện thông báo dịch; lúc gửi, lỗi upload đầu tiên hiện thành toast và dừng trước bước gọi API đánh giá |
| 9001, 1601, 1602, 1605, 1603 | Thông báo dịch theo mã |
| Mã khác / không mã | Toast `toast.saveFailed` (hoặc text BE) |

### 4.4 Quyền

FE không kiểm `REVIEW_CREATE/VIEW/VOTE` của khách (giống `RETURN_*`): đưa các quyền này vào `PERMISSIONS` sẽ làm `canAccessAdmin` cho khách vào admin. Khi thiếu quyền BE trả `9001`: danh sách chờ rỗng (không toast), các thao tác khác hiện thông báo dịch.

### 4.5 Responsive

Một cột `max-w-[720px]`. Dialog form: toàn chiều rộng và tối đa `100dvh` dưới `sm`, `max-w-[560px]` và `90dvh` từ `sm`; chân form chừa `env(safe-area-inset-bottom)`; sao, chip form dáng, nút X, nút xóa ảnh đạt 44 px trên cảm ứng (`pointer-coarse:`). Thẻ chờ đánh giá xếp dọc dưới `sm`, nút nằm cạnh nội dung từ `sm`. Đã kiểm ở 390 và 1440 (không tràn ngang).

- **Đơn vị kích thước:** các số px trong doc này là giá trị ở gốc 16 px; trong code, chiều dài và cỡ chữ của module viết bằng `rem` (class `…-[…rem]`, token `--text-*` / `--space-*`, style inline `"…rem"`) nên lớn dần từ 1536 px tới 1920 px theo thang gốc `html` ([design-system](../platform/design-system.md) 4.3).
