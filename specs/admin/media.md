# Media admin (thư viện ảnh) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [admin/media](../../docs/admin/media.md) · **Test:** `tests/admin/media/`

## 1. Bối cảnh & mục tiêu

Thư viện ảnh trên Supabase Storage (qua BE): nơi xem, tải lên, tải về và dọn ảnh dùng cho sản phẩm, danh mục, bộ sưu tập và banner. Sai ở đây là xóa nhầm ảnh đang được dùng, hoặc báo "đã tải lên" khi chưa lưu được. Module gồm `MediaContent.tsx` (bảng, tải lên bằng nút và kéo thả, xem lớn, xóa, kiểm tra kết nối), `_common/{moduleSlice,types,constants,download}.ts` và `page.tsx`. Việc tải lên dùng chung `uploadMediaFile` của [data-layer](../platform/data-layer.md); ảnh hiện qua proxy `/media`.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Bảng ảnh, tìm kiếm, sắp xếp sáu cách, chọn nhiều dòng, xóa một hoặc nhiều | Hàm tải lên `uploadMediaFile` và proxy `/media`: thuộc [data-layer](../platform/data-layer.md) |
| Tải lên bằng nút (nhiều ảnh) và bằng kéo thả, xem lớn, tải về, kiểm tra Supabase | Lightbox: thuộc [ui-kit](../platform/ui-kit.md) |
| Trạng thái "chưa cấu hình" (mã 1601) và lỗi tải | Quyền: không có quyền riêng cho thư viện ảnh ở FE; BE quyết định, FE chỉ hiện lỗi |

## 3. Hợp đồng

- **Bảng.** `GET /api/admin/media?search&sort&page&limit` (mới nhất trước, 25 dòng; sáu cách sắp xếp). Mỗi dòng: ảnh nhỏ qua `/media/<key>` (tải lười), tên, loại (phần sau dấu `/` viết hoa, bỏ hậu tố `+xml`; ẩn dưới `md`), dung lượng (đơn vị 1024: B, KB, MB, GB; B không có số lẻ, còn lại một số lẻ; ẩn dưới `sm`; dưới `sm` hiện thêm dưới tên), thời điểm tải lên (ẩn dưới `lg`). Chọn nhiều dòng được. Bảng trống hướng dẫn tải ảnh đầu tiên; tìm không ra nói "không khớp".
- **Lỗi tải.** Mã 1601 (kho chưa cấu hình) hiện khối hướng dẫn ba bước kèm link Supabase; lỗi khác hiện lời BE (hoặc lời mặc định). Cả hai ẩn bảng và nút Tải lên, tắt kéo thả; nút "Thử lại" và nút Làm mới ở đầu trang xóa lỗi và tải lại.
- **Tải lên.** Nút mở hộp chọn tệp (`image/*`, nhiều tệp) hoặc kéo thả vào trang (chỉ phản ứng với tệp; đếm độ sâu `dragenter/leave` vì sự kiện nổi bọt). Chỉ ảnh được gửi (kéo thả tệp khác ảnh thì báo "chỉ tải được ảnh" và không gửi). Các ảnh gửi song song; báo số ảnh thành công, thất bại một ảnh thì báo lý do, nhiều ảnh thì báo số lượng kèm lý do đầu. Có ít nhất một ảnh thành công thì về trang 1 và tải lại. Nút khóa và hiện "đang tải lên"; thả thêm khi đang tải bị bỏ qua.
- **Xem lớn và tải về.** Bấm ảnh hoặc nút mắt mở xem lớn kèm tên, dung lượng, ngày, nút tải. Tải về lấy ảnh qua `/media` thành blob rồi bấm một liên kết `download` đúng tên gốc, xong dọn liên kết và địa chỉ tạm; không lấy được thì toast lỗi và không lưu gì. Nút khóa khi đang tải.
- **Xóa.** Một ảnh: hỏi xác nhận nêu tên, `DELETE /api/admin/media/:id`, toast, đóng xem lớn nếu đang xem chính ảnh đó, tải lại. Nhiều ảnh: hỏi xác nhận kèm số lượng, xóa từng ảnh song song, không dừng ở lỗi đầu; báo riêng số xóa được và số không xóa được, bỏ chọn và tải lại.
- **Kiểm tra kết nối.** `GET /api/admin/media/ping`; thành công và thất bại đều có toast (lời BE nếu có).

## 4. Thiết kế

```
page.tsx ──► MediaContent ──► DataTable (chọn nhiều) ──► fetchMediaList (thunk) ──► authApi
MediaContent ──► uploadMediaFile (data-layer) · downloadMediaFile · deleteMediaFile / deleteMediaFiles / pingMedia ──► authApi
MediaContent ──► ImagePreviewLightbox (ui-kit) · useConfirm · useToast
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Thunk từ chối bằng `{ message, errorCode }`** | Redux không giữ được `Error`; trang cần mã 1601 để phân biệt "chưa cấu hình" với lỗi thật | Ném `Error` rồi đọc `message` |
| **Xóa nhiều trả `{ succeeded, failed }` thay vì từ chối** | Một ảnh lỗi không chặn các ảnh còn lại; trang báo từng phần | Dừng ở lỗi đầu tiên |
| **Đếm độ sâu `dragenter/leave`** | Các sự kiện nổi bọt từ phần tử con làm lớp phủ nhấp nháy nếu chỉ bật/tắt theo từng sự kiện | Bật/tắt theo từng sự kiện |
| **Tải về qua blob** | Thuộc tính `download` không có tác dụng với địa chỉ khác nguồn | Mở địa chỉ trong tab mới |
| **Các ảnh tải lên chạy song song** | Nhanh hơn với nhiều ảnh; lỗi từng ảnh được gom lại | Tuần tự |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit (bảng, lightbox, xác nhận, toast), data layer (`authApi`, `uploadMediaFile`, `toMediaUrl`). Các form khác (sản phẩm, danh mục, banner) dùng chung `uploadMediaFile` nhưng không phụ thuộc trang này. Kho `media` giữ danh sách, tổng, và cờ bận (tải, xóa, kiểm tra).

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Một thành phần giữ bảng, tải lên, xem lớn và xóa: chấp nhận được vì mỗi việc ngắn; tách khi thêm việc mới |
| O | Thêm cách sắp xếp = thêm vào hằng số và bản dịch |
| L | `downloadMediaFile` nhận bất kỳ `{ url, name }` |
| I | Kho chỉ lộ bốn lệnh |
| D | Thành phần phụ thuộc thunk và hàm, không phụ thuộc `fetch` trực tiếp (trừ `downloadMediaFile`) |

### Conventions

Chuỗi qua `admin.media`; lỗi qua `useErrorMessage`; toast qua `useToast`; xác nhận qua `useConfirm`. Test dùng `renderApp` với danh tính thật và `mediaApi` (BE giả: danh sách, tải lên, xóa, kiểm tra, tải ảnh) trong `media-kit.tsx`; tên tệp tải lên được đọc từ nội dung vì jsdom mất tên khi đi qua FormData.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì không lộ ảnh nào; việc chặn trang thuộc admin-shell) · permission = không (không có quyền riêng cho thư viện ảnh ở FE; mọi admin vào được trang, BE quyết định từng thao tác)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| AMD-1 | Bảng: mở mới nhất trước kèm tổng; mỗi dòng có ảnh qua proxy, tên, loại, dung lượng đúng đơn vị, ngày; cột ẩn trên điện thoại; tìm, sắp xếp sáu cách, chọn nhiều dòng, tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/media/media-list.test.tsx` |
| AMD-2E | Bảng trống hướng dẫn; tìm không ra; lỗi tải hiện lời BE và ẩn bảng; kho chưa cấu hình (1601) hiện hướng dẫn; thử lại và làm mới; BE từ chối khách (401) | lỗi | khách | component | `tests/admin/media/media-list.test.tsx` |
| AMD-2U | BE từ chối người mua đã đăng nhập (403): không lộ ảnh nào | lỗi | user | component | `tests/admin/media/media-list.test.tsx` |
| AMD-3 | Tải lên bằng nút: chỉ ảnh, nhiều ảnh, gửi kèm token, báo số ảnh, về trang 1 và tải lại, nút khóa, xóa lựa chọn để chọn lại cùng tệp | đúng | admin đủ quyền | component | `tests/admin/media/media-actions.test.tsx` |
| AMD-3E | Tải lên bị từ chối: lý do (mã có bản dịch) hoặc lời mặc định, thành công một phần, nhiều thất bại gom thành một thông báo, không tải lại khi tất cả lỗi | lỗi | admin đủ quyền | component | `tests/admin/media/media-actions.test.tsx` |
| AMD-4 | Kéo thả: lớp phủ khi kéo tệp qua (kể cả phần tử con), bỏ qua kéo không phải tệp, cho phép thả, thả để tải lên, chỉ lấy ảnh, báo khi không có ảnh nào, bỏ qua khi đang tải hoặc trang đang lỗi | đúng | admin đủ quyền | component | `tests/admin/media/media-actions.test.tsx` |
| AMD-5 | Xem lớn: từ ảnh hoặc nút mắt, kèm tên, dung lượng, ngày; đóng được | đúng | admin đủ quyền | component | `tests/admin/media/media-actions.test.tsx` |
| AMD-6 | Tải về: lấy ảnh, lưu đúng tên gốc, dọn liên kết và địa chỉ tạm, nút khóa khi đang tải, cả từ xem lớn | đúng | admin đủ quyền | component | `tests/admin/media/media-actions.test.tsx` |
| AMD-6E | Tải về không lấy được ảnh: toast lỗi, không lưu gì | lỗi | admin đủ quyền | component | `tests/admin/media/media-actions.test.tsx` |
| AMD-7 | Xóa một ảnh: hỏi xác nhận nêu tên, xóa, toast, đóng xem lớn của chính ảnh đó, tải lại; Không thì thôi | đúng | admin đủ quyền | component | `tests/admin/media/media-actions.test.tsx` |
| AMD-7E | Xóa bị từ chối: lời BE hoặc lời mặc định | lỗi | admin đủ quyền | component | `tests/admin/media/media-actions.test.tsx` |
| AMD-7B | Xóa nhiều: hỏi kèm số lượng, xóa từng ảnh, báo riêng thành công và thất bại, bỏ chọn, tải lại; Không thì thôi | đúng | admin đủ quyền | component | `tests/admin/media/media-actions.test.tsx` |
| AMD-8 | Kiểm tra kết nối Supabase: toast khi tốt; khi hỏng lời BE hoặc lời mặc định; nút có chú thích | đúng | admin đủ quyền | component | `tests/admin/media/media-actions.test.tsx` |
| AMD-9 | Kho Redux và hằng số: tham số hỏi, danh sách và tổng, từ chối kèm lời và mã, xóa một và nhiều, kiểm tra, cờ bận và lỗi, sáu cách sắp xếp, mã 1601 | đúng | — | unit | `tests/admin/media/media-slice.test.ts` |
| AMD-10 | Lưu ảnh về máy: lấy qua `/media`, liên kết có tên và địa chỉ blob, dọn xong; ảnh không lấy được thì ném lỗi và không lưu | đúng | — | unit | `tests/admin/media/media-slice.test.ts` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Không có quyền riêng cho thư viện ảnh ở FE | Mọi admin thấy nút tải lên và xóa; BE từ chối thì FE hiện lời BE (AMD-3E, AMD-7E). Cần chủ dự án quyết định có thêm quyền hay không |
| Xóa nhầm ảnh đang được sản phẩm hay banner dùng | Hỏi xác nhận nêu tên; FE không biết ảnh có đang được dùng không, BE có thể từ chối (AMD-7E) |
| Khách chưa đăng nhập thấy lỗi chung, không thấy lời của BE | Khi mất phiên, lỗi tải hiện lời mặc định (AMD-2E) |
| Báo "đã tải lên" nhưng bảng chưa kịp thấy | Tải lại và về trang 1 ngay sau khi có ảnh thành công (AMD-3) |

Thay đổi nhìn thấy được: không (không đổi hành vi nhìn thấy).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 5), kiểm thử đột biến. Không đổi code của module.
