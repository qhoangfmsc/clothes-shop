# Customer reviews (đánh giá của khách) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [storefront/customer-reviews](../../docs/storefront/customer-reviews.md) · **Test:** `tests/storefront/customer-reviews/`

## 1. Bối cảnh & mục tiêu

Đánh giá là chỗ khách nói thật về sản phẩm, nên sai ở đây là mất lòng tin: một đánh giá viết được cho đơn chưa giao, một ảnh gửi lên rồi mất, một lần sửa tính thành hai, hay một đường link lọt vào lời đánh giá. Module là phía khách: trang `/reviews` (hai tab "Chờ đánh giá" và "Đánh giá của tôi"), form viết / sửa `ReviewFormModal` (cũng được mở từ trang đơn và trang sản phẩm) và các phần của nó. Quy tắc nghiệp vụ (ai được đánh giá, hạn 30 ngày, sửa một lần) nằm ở BE; FE lấy khả năng từ danh sách BE trả về và chỉ kiểm lại những gì BE kiểm để khách không gặp lỗi 400. Phần hiển thị đánh giá ở trang sản phẩm thuộc [product-detail](./product-detail.md); kiểm duyệt thuộc [admin/reviews](../admin/reviews.md).

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách và người đã đăng nhập, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Trang `/reviews`: chặn khi chưa đăng nhập, hai tab trong địa chỉ, danh sách chờ, danh sách của tôi (lọc trạng thái, theo sản phẩm, "Xem thêm") | Hiển thị đánh giá ở trang sản phẩm và "hữu ích": thuộc [product-detail](./product-detail.md) |
| Form viết / sửa: sao, tiêu đề, nội dung, form dáng, ảnh (chọn, từ chối, tải lên lúc gửi), chặn link, mã lỗi của BE | Trang chi tiết đơn có nút "Viết đánh giá": thuộc [customer-orders](./customer-orders.md) |
| Thẻ chờ đánh giá và thẻ của tôi, ô chọn sao, vùng ảnh, hạn còn lại | `ReviewContent`, `StarRating`, `ReviewImageGrid` dùng chung: thuộc [ui-kit](../platform/ui-kit.md) |

## 3. Hợp đồng

- **Ai được xem.** Khách chưa đăng nhập thấy hộp mời đăng nhập và FE không hỏi BE gì; trong lúc chưa biết phiên thì là hai khung xám.
- **Hai tab.** Tab nằm trong địa chỉ (`?tab=mine`; tab đầu thì bỏ khỏi địa chỉ, phần còn lại của địa chỉ được giữ, không cuộn trang); tab lạ mở tab đầu. Số trên tab đầu là `total` của BE.
- **Chờ đánh giá.** `GET /api/my-reviews/pending?limit=200`; mỗi dòng: ảnh, tên (link nếu sản phẩm còn), size · màu, số lượng (chỉ khi > 1), "còn N ngày" (làm tròn lên; đỏ khi ≤ 3 ngày; "ngày cuối" chỉ khi hạn đã qua), link tới đơn, nút "Viết đánh giá". Trống → mời mua sắm; lỗi → hộp lỗi + "Thử lại".
- **Đánh giá của tôi.** `GET /api/my-reviews?sort=-createdAt&limit=10[&page][&status][&productId]` (không gửi `page` khi là 1, không gửi `status` cho "Tất cả"); chip trạng thái, chip "Một sản phẩm" khi có `?productId=` (bấm để bỏ); "Xem thêm" nối trang kế (lỗi trang kế giữ danh sách, nút đổi thành "Thử lại"). Thẻ: sản phẩm (link dựng từ danh mục có sẵn, không có thì tra bằng `getProductUrl` khi bấm; sản phẩm đã xóa thì "không còn bán"), nội dung, và dòng trạng thái sửa: đến hết ngày nào / đã sửa rồi / hết thời gian / đang bị ẩn nên không sửa được; đánh giá bị ẩn hiện lý do của cửa hàng và chỉ khách thấy; nút "Sửa" chỉ khi BE cho (`canEdit`) và không bị ẩn.
- **Form.** Sao 1–5 bắt buộc (báo khi gửi); tiêu đề ≤ 255, nội dung ≤ 2000; tiêu đề và nội dung không chứa `http(s)://` hay `www.` (báo ngay khi gõ, chặn gửi); form dáng chọn / bỏ chọn (khi sửa một đánh giá đã có form dáng thì chỉ đổi được). Gửi: tiêu đề và nội dung cắt khoảng trắng, field rỗng không gửi. Một lần bấm gửi một request (khóa trong lúc chạy; Esc, nút đóng và Hủy bị khóa).
- **Ảnh.** Tối đa 5, mỗi ảnh ≤ 5 MB (đúng 5 MB nhận), JPEG / PNG / WebP / GIF / AVIF (theo `type`, `type` rỗng thì theo đuôi file); ảnh trùng bỏ qua; file bị từ chối nói rõ lý do. Chọn ảnh **chưa gửi gì**: ảnh chỉ tải lên khi bấm gửi, cùng lúc; ảnh lỗi bị đánh dấu, review không được gửi, bấm lại chỉ tải ảnh lỗi; BE trả 413 / 429 không mã thì gán mã 1606 / 1607. Đóng form thả hết bản xem trước.
- **Sửa.** Form hiện lời nhắc "chỉ sửa một lần" (kèm hạn); chỉ gửi field đổi (`PATCH /api/reviews/:id`); không đổi gì thì chặn và báo; ảnh mới được tính là có đổi; `images` gửi cả danh sách khi khác.
- **Sau khi lưu.** Đóng form, toast, đọc lại "chờ đánh giá", "của tôi" và tổng hợp ở trang sản phẩm. Mã BE: 1905 báo dưới ô nội dung; 1908 bỏ hết ảnh; 1903 báo, đóng, chuyển sang tab "Đánh giá của tôi" và đọc lại; 1902 / 1904 báo, đóng, đọc lại; lỗi khác báo và giữ form.

## 4. Thiết kế

```
ReviewsContent ─► usePendingReviews (SWR) · useMyReviews ─► useApiAuth.apiFetch ─► BE
  ├─ PendingReviewCard · MyReviewCard
  └─ ReviewFormModal ─► ReviewImageUploader · StarPicker · uploadReviewImage
(trang đơn, trang sản phẩm) ─► ReviewFormModal
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Khả năng lấy từ danh sách của BE, không đoán** | BE biết hạn 30 ngày, sửa một lần và trạng thái ẩn; FE chỉ hiển thị `canEdit` / `editableUntil` / danh sách chờ | Suy ra từ trạng thái đơn ở FE |
| **Ảnh tải lên lúc gửi, không lúc chọn** | Hủy form không tốn hạn mức 30 ảnh mỗi ngày; ảnh đã lên không tải lại khi một ảnh khác lỗi | Tải ngay khi chọn |
| **Chỉ gửi field đã đổi khi sửa** | BE nhận PATCH từng phần và chỉ cho sửa một lần: gửi thừa chỉ tốn lần sửa vô nghĩa | Gửi cả đánh giá |
| **Khóa gửi bằng `ref`** | Hai lần bấm sát nhau không tạo hai đánh giá (state chưa kịp cập nhật) | Chỉ dựa vào `disabled` |
| **Bộ đếm yêu cầu trong `useMyReviews`** | Đổi bộ lọc nhanh không để câu trả lời cũ đè câu trả lời mới | Hủy `fetch` |
| **Form một thành phần cho ba nơi** | Trang đơn, trang sản phẩm và trang này mở cùng `ReviewFormModal`; luật nằm một chỗ | Mỗi nơi một form |

### Kiến trúc

Trang và các thẻ phụ thuộc hook (`useMyReviews`, `usePendingReviews`) và `useApiAuth`; form phụ thuộc `useApiAuth`, `useErrorMessage`, `useToast`. `usePendingReviews` và `useRefreshReviewData` được [customer-orders](./customer-orders.md) và [product-detail](./product-detail.md) dùng lại; không module nào khác import ngược. Mã lỗi thuộc `shared.errors.byCode`.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi file một việc: trang ghép hai tab, mỗi thẻ vẽ một dòng, form lo nhập và gửi, uploader lo vùng ảnh, hook lo dữ liệu |
| O | Thêm bộ lọc = thêm vào `constants.ts` và một chip |
| L | `ReviewFormModal` nhận `target` (viết hoặc sửa) và dùng được ở mọi nơi |
| I | Thẻ chỉ nhận dòng của mình và một hàm; uploader chỉ nhận ảnh và hai hàm |
| D | Thành phần phụ thuộc `apiFetch` và hook, không phụ thuộc `fetch`; `uploadReviewImage` nhận `apiFetch` làm tham số |

### Conventions

Chuỗi qua `private.reviews` và `shared.reviews`; lỗi qua `useErrorMessage` và `shared.errors.byCode`; toast qua `useToast`. Test dùng `renderApp` với danh tính thật và `reviewsBackend` (BE giả: chờ đánh giá, của tôi, lưu, tải ảnh, tra sản phẩm) trong `reviews-kit.tsx`; `form-kit.tsx` mở form và tìm các phần của nó; jsdom không có `URL.createObjectURL` nên test thế bản giả và đếm lần thả; jsdom mất tên file trong form nên BE giả đọc tên từ nội dung file.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (trang chỉ dành cho người đã đăng nhập: khách thấy hộp mời đăng nhập) · permission = không (trang của khách hàng, BE tự trả 9001 khi thiếu quyền)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| REV-1 | Khách thấy hộp mời đăng nhập và không gọi BE; khung xám khi chưa biết phiên | đúng | khách | component | `tests/storefront/customer-reviews/reviews-page.test.tsx` |
| REV-1U | Người đã đăng nhập: tiêu đề, link về tài khoản, hai tab, tab đầu mở; tiếng Anh | đúng | user | component | `tests/storefront/customer-reviews/reviews-page.test.tsx` |
| REV-2 | Chờ đánh giá: dòng với ảnh, tên, size · màu, số lượng, hạn còn lại, đơn, nút; mức khẩn; sản phẩm đã xóa; limit 200; trống; mở form | đúng | user | component | `tests/storefront/customer-reviews/reviews-page.test.tsx` |
| REV-2E | Không đọc được danh sách chờ: hộp lỗi, thử lại, lý do BE | lỗi | user | component | `tests/storefront/customer-reviews/reviews-page.test.tsx` |
| REV-3 | Tab trong địa chỉ: mở từ địa chỉ, tab lạ, đổi tab giữ phần còn lại, tên vùng | đúng | user | component | `tests/storefront/customer-reviews/reviews-page.test.tsx` |
| REV-4 | Đánh giá của tôi: yêu cầu đúng, lọc trạng thái, theo sản phẩm, xem thêm, khung xám, trống | đúng | user | component | `tests/storefront/customer-reviews/reviews-page.test.tsx` |
| REV-5 | Một đánh giá của tôi: hạn sửa, đã sửa, hết hạn, bị ẩn kèm lý do, sản phẩm đã xóa, tra địa chỉ sản phẩm, mở sửa | đúng | user | component | `tests/storefront/customer-reviews/reviews-page.test.tsx` |
| REV-5E | Không đọc được đánh giá của tôi / trang kế lỗi: hộp lỗi hoặc giữ danh sách, thử lại, lý do theo mã | lỗi | user | component | `tests/storefront/customer-reviews/reviews-page.test.tsx` |
| REV-6 | Tiêu đề và mô tả của trang | đúng | user | integration | `tests/storefront/customer-reviews/reviews-page.test.tsx` |
| REV-7 | Viết đánh giá: sản phẩm, sao bắt buộc, nghĩa của sao, gửi tối thiểu và đầy đủ, cắt khoảng trắng, đếm chữ, form dáng | đúng | user | component | `tests/storefront/customer-reviews/reviews-form.test.tsx` |
| REV-8 | Chặn link trong tiêu đề và nội dung (http, https, www, chữ hoa), bỏ link rồi gửi lại, BE từ chối link | lỗi | user | component | `tests/storefront/customer-reviews/reviews-form.test.tsx` |
| REV-9 | Đóng bằng Esc, nút, Hủy; khóa cuộn; gửi một lần; khóa trong lúc gửi | đúng | user | component | `tests/storefront/customer-reviews/reviews-form.test.tsx` |
| REV-9E | BE từ chối: lỗi khác giữ form; 1903, 1902, 1904 đóng và báo trang; 1908 bỏ ảnh | lỗi | user | component | `tests/storefront/customer-reviews/reviews-form.test.tsx` |
| REV-10 | Chọn ảnh: xem trước, định dạng, từ chối loại / cỡ / số lượng, trùng, đuôi file khi không có type, bỏ ảnh, thả bản xem trước | đúng | user | component | `tests/storefront/customer-reviews/reviews-photos.test.tsx` |
| REV-11 | Gửi kèm ảnh: tải từng ảnh lúc gửi, theo thứ tự, hủy form không tải gì, spinner | đúng | user | component | `tests/storefront/customer-reviews/reviews-photos.test.tsx` |
| REV-11E | Ảnh tải lỗi: đánh dấu, báo, không gửi review, thử lại chỉ tải ảnh lỗi, 413 / 429 / mã BE | lỗi | user | component | `tests/storefront/customer-reviews/reviews-photos.test.tsx` |
| REV-12 | Sửa đánh giá: giá trị ban đầu, lời nhắc và hạn, chặn khi không đổi, chỉ gửi field đổi, form dáng khóa, ảnh | đúng | user | component | `tests/storefront/customer-reviews/reviews-edit.test.tsx` |
| REV-12E | BE từ chối sửa: 1904 và lỗi khác | lỗi | user | component | `tests/storefront/customer-reviews/reviews-edit.test.tsx` |
| REV-13 | Ô chọn sao: năm lựa chọn, chọn, nghĩa, xem trước khi rê, không hợp lệ | đúng | user | component | `tests/storefront/customer-reviews/reviews-parts.test.tsx` |
| REV-14 | Vùng ảnh: đếm, thêm / ẩn nút thêm, chọn file, xóa, khóa lúc gửi, trạng thái tải / lỗi, lý do | đúng | user | component | `tests/storefront/customer-reviews/reviews-parts.test.tsx` |
| REV-15 | Luật file ảnh, số ngày còn lại (làm tròn lên, hết hạn), lời hạn còn lại | đúng | user | unit | `tests/storefront/customer-reviews/reviews-parts.test.tsx` |
| REV-16 | Tải một ảnh: đúng địa chỉ và dạng form, gán mã 1606 / 1607 cho 413 / 429 không mã, giữ lỗi khác | đúng | user | unit | `tests/storefront/customer-reviews/reviews-parts.test.tsx` |
| REV-17 | Lưu từ trang: đóng form, toast, đọc lại hai danh sách; sửa thì đọc lại và hiện dữ liệu BE; Esc đóng | đúng | user | component | `tests/storefront/customer-reviews/reviews-flow.test.tsx` |
| REV-17E | BE nói dòng không đánh giá được: 1903 chuyển tab và đọc lại, 1902 / 1904 đọc lại, lỗi khác giữ form | lỗi | user | component | `tests/storefront/customer-reviews/reviews-flow.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Nhãn "ngày cuối" chỉ hiện khi hạn đã qua; còn vài giờ vẫn là "còn 1 ngày" (làm tròn lên). Chú thích cũ của hook nói ngược lại | Chú thích đã sửa cho đúng; hành vi hiện tại giữ (REV-15) |
| `useMyReviews.replace` bị bỏ: ngay sau khi sửa danh sách được đọc lại và hiện khung xám nên bản "thay tại chỗ" không bao giờ được thấy | Đã bỏ hàm và lời gọi; sau khi lưu chỉ đọc lại (REV-17) |
| Danh sách chờ lỗi hay thiếu quyền ở trang sản phẩm và trang đơn thì ẩn tính năng (rỗng), còn ở trang này hiện hộp lỗi | Hành vi hiện tại (REV-2E); do hai nơi dùng chung `usePendingReviews` |
| Chặn link chỉ bắt `http(s)://` và `www.`, không bắt "abc.com" trần | BE cũng chỉ chặn đúng hai dạng đó (mã 1905); giữ khớp BE (REV-8) |
| Hạn mức 30 ảnh / 24 giờ chỉ BE biết | FE không đếm; 429 hiện thông báo dịch (REV-11E) |
| Form khóa Esc khi đang gửi nhưng không có `aria-busy` | Nút đổi thành "Đang gửi…" và disabled (REV-9) |

Thay đổi nhìn thấy được: có (nhỏ): sau khi sửa đánh giá danh sách tải lại ngay (không còn hàm thay tại chỗ không thấy được).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 7), kiểm thử đột biến.
- 2026-10-25 · Sửa: bỏ `useMyReviews.replace` (không bao giờ thấy được); sửa chú thích sai của `useDeadlineLabel`.
