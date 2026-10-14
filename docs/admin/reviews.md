# Reviews (kiểm duyệt đánh giá)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/reviews` (`?tab=all`, `?reviewId=<id>` mở chi tiết, `?product=<slug>` và `?userId=<id>` lọc) · **Cập nhật:** 2026-10-14
> **Code:** `(admin)/admin/reviews/` — `page.tsx`, `ReviewsContent.tsx`, `_common/{moduleSlice,types,constants}.ts`, `_components/{ReviewStatusBadge,ReviewDetailPanel,HideReviewModal,ReviewReplyForm}.tsx`; dùng chung `_components/{ReviewContent,ReviewAvatar,StarRating}.tsx`
> **i18n:** `admin.reviews`, `shared.reviews`, `shared.errors.byCode` (1901, 1906), `admin.components.crud.sort` (`ratingDesc`, `ratingAsc`, `helpfulDesc`), `admin.shell.nav.pending.reviews`
> **Redux slice:** `state.reviews`

## 1. Tóm tắt module

Danh sách đánh giá của khách cho admin, chi tiết một đánh giá, ẩn / hiện lại kèm lý do, và phản hồi công khai của cửa hàng. Đánh giá đăng ngay khi khách gửi; admin chỉ kiểm duyệt sau.

## 2. Phục vụ gì / việc cần làm

Trả lời đánh giá (hàng đợi "chờ phản hồi" khớp badge menu) và ẩn các đánh giá vi phạm quy định nội dung. Không có chức năng ẩn theo số sao.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Tab | "Chờ phản hồi (N)" (mặc định) = `status=PUBLISHED&replied=false`; N là `counts.reviews` từ `usePendingCounts()` — cùng nguồn và cùng điều kiện với badge menu; "Tất cả đánh giá". Tab nằm trong URL `?tab=` (vắng = chờ phản hồi), đổi tab hay bộ lọc `?product=`/`?userId=` thì dựng lại bảng (`key`) |
| Bảng (`DataTable`, server) | Search (tiêu đề, nội dung, tên người viết, tên sản phẩm), sort `createdAt` / `rating` / `helpfulCount`, 25 dòng/trang; lọc `rating`, `fit`, `hasImages` (cả hai tab) và `status`, `replied` (chỉ tab "Tất cả"). Cột: sản phẩm (ảnh + tên), người viết (+ `userId` là link lọc), sao, nội dung rút gọn (ẩn dưới `lg`), số ảnh (ẩn dưới `md`), hữu ích (ẩn dưới `lg`), trạng thái + "Đã phản hồi / Chờ phản hồi", ngày (ẩn dưới `sm`), "Xem" |
| Chi tiết (`ReviewDetailPanel`) | Modal: sản phẩm (+ link "Mọi đánh giá của sản phẩm này"), người viết (+ link "Mọi đánh giá của người này"), trạng thái, `ReviewContent` (sao, nội dung, ảnh phóng to được, form dáng, size/màu, phản hồi), mục "Chi tiết" (ngày viết, `orderItemId`, `editedAt`, `moderatedAt` / `moderatedBy`, lý do ẩn, `repliedBy`) |
| Ẩn (`HideReviewModal`) | `note` bắt buộc ≤ 500, nhãn "Lý do (khách sẽ thấy)"; bốn gợi ý bấm một chạm (link/quảng cáo, thông tin cá nhân, ngôn từ không phù hợp, spam; không có gợi ý "đánh giá thấp"); khung nhắc "chỉ ẩn khi vi phạm, không ẩn vì thấp sao" trong modal và gần nút "Ẩn đánh giá" |
| Hiện lại | `useConfirm` rồi `POST .../publish` (không body) |
| Phản hồi (`ReviewReplyForm`) | Ô ≤ 1000 + bộ đếm, ghi chú "mọi người đều thấy"; "Đăng / Cập nhật phản hồi" (`PUT`) và "Xóa phản hồi" (`useConfirm`, `DELETE`) |
| Quyền | Vào trang, xem: `REVIEW_ADMIN_VIEW` (18000); ẩn / hiện: `REVIEW_ADMIN_MODERATE` (18001); phản hồi: `REVIEW_ADMIN_REPLY` (18002). `RoleGuard` ẩn khối phản hồi và thanh nút ẩn/hiện khi thiếu quyền; role `admin` có đủ |

## 4. Chi tiết

### 4.1 API (qua `authApi`, bọc `{ data }`)

| Thunk | API |
|---|---|
| `fetchReviews` | `GET /api/admin/reviews?search&status&rating&fit&hasImages&product&userId&replied&sort&page&limit` (`hasImages`, `replied` là `"true"`/`"false"`) |
| `fetchReviewDetail` | `GET /api/admin/reviews/:reviewId` (cũng dùng khi mở từ URL `?reviewId=`) |
| `hideReview` | `POST .../hide` `{ note }` |
| `publishReview` | `POST .../publish` |
| `replyToReview` | `PUT .../reply` `{ content }` |
| `deleteReviewReply` | `DELETE .../reply` |

Mỗi thao tác trả đánh giá sau khi đổi (góc nhìn admin); panel thay thẳng và bảng `refresh()`. `authApi` phát `notifyAdminMutation()` sau mỗi ghi nên badge menu và số trên tab làm mới sau ~300 ms. Ảnh trong admin lấy URL gốc của BE (`authApi` không map), hiển thị qua `toMediaUrl`.

### 4.2 Lỗi

Toast qua `useErrorMessage` với fallback `toast.failed` / `saveFailed` / `deleteFailed`. `1906` (đã ở trạng thái đó): tải lại chi tiết đánh giá và đóng modal ẩn; `1901` (không còn): đóng panel và làm mới bảng. Modal ẩn giữ nguyên chữ khi lỗi.

### 4.3 Badge menu

`reviews` là key thứ năm của `PendingCountsProvider` (chỉ có khi tài khoản có `REVIEW_ADMIN_VIEW`; vắng key = không hiện badge, không coi là 0). Mục "Đánh giá" nằm ở nhóm "Khách hàng & Thống kê" của sidebar, xem [admin-shell](./admin-shell.md).

### 4.4 Phụ thuộc

Hình dạng dữ liệu `AdminReview` ở `src/types/review.ts` (dùng chung với storefront); phía khách ở [customer-reviews](../storefront/customer-reviews.md), hiển thị công khai ở [product-detail](../storefront/product-detail.md). Điểm trung bình và số đánh giá của sản phẩm hiện ở cột Rating của [products](./products.md).
