# Media (thư viện ảnh)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/media` · **Cập nhật:** 2026-10-18
> **Code:** `(admin)/admin/media/` — `MediaContent.tsx`, `_common/{moduleSlice,types,constants,download}.ts` · `src/hooks/use-media-upload.ts` · `src/app/media/[...path]/route.ts`
> **i18n:** `admin.media`, `admin.components.imageFields`
> **Redux slice:** `state.media`

## 1. Tóm tắt module

Thư viện ảnh trên Supabase Storage (qua BE): xem danh sách, upload (chọn file hoặc kéo thả), xem trước, tải về, xóa một hoặc nhiều, và kiểm tra kết nối lưu trữ ("ping").

## 2. Phục vụ gì / việc cần làm

Là nơi quản lý ảnh dùng cho sản phẩm, danh mục, bộ sưu tập và banner. Các form khác cũng upload thẳng vào cùng kho thông qua `uploadMediaFile`; trang này là nơi xem/dọn dẹp tất cả.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Danh sách | Search, sort, phân trang; chọn nhiều dòng |
| Upload | Nút Upload (nhiều ảnh) hoặc kéo thả vào trang; chỉ nhận `image/*` |
| Xem trước | Lightbox với tên, dung lượng, ngày, nút tải |
| Tải về | Tải theo tên gốc (qua blob) |
| Xóa | Một file (xác nhận) hoặc hàng loạt (thanh hành động khi chọn) |
| Ping | Kiểm tra service role key + bucket có truy cập được |
| Trạng thái "chưa cấu hình" | Hướng dẫn thiết lập khi BE trả `errorCode 1601` |

## 4. Chi tiết

### 4.1 Bảng

- Cột: **Preview** (ảnh 48×48, bấm mở lightbox), **Name** (kèm loại · dung lượng trên mobile), **Type** (ẩn < md; `image/svg+xml` → `SVG`), **Size** (ẩn < sm; đơn vị 1024-based theo ngôn ngữ), **Uploaded** (ẩn < lg), **Actions** (xem, tải, xóa). Ảnh hiển thị qua `toMediaUrl(file.url)`.
- Sort (`MEDIA_SORT_OPTIONS`): `-createdAt` (mặc định), `createdAt`, `name`, `-name`, `-size`, `size`. `selectable` bật; `renderBulkActions` có nút Xóa.
- `fetchMediaList` → `GET /api/admin/media?search&sort&page&limit`.

### 4.2 Upload

- `handleUpload(files)`: lọc `type.startsWith("image/")` (không có ảnh nào → toast `onlyImages`); upload song song bằng `Promise.allSettled(uploadMediaFile)`; toast thành công theo số file, thất bại gộp (`uploadFailedMany` kèm lý do của lỗi đầu tiên). Thành công ≥ 1 file → `reset()` (về trang 1) + `refresh()` để thấy file mới.
- `uploadMediaFile` → `POST /api/admin/media` (multipart `file`); không có cơ chế refresh token riêng (xem [auth](../platform/auth.md) 4.3).
- Kéo thả: đếm độ sâu `dragenter/leave` (vì sự kiện nổi bọt từ phần tử con), chỉ phản ứng với `Files`, hiện lớp phủ nét đứt; không bật khi đang có lỗi tải.
- Mã lỗi upload BE đã dịch: `1603` (chỉ nhận ảnh), `1605` (lưu trữ không lưu được), `1606` (file quá lớn).

### 4.3 Tải về, xóa, ping

- `downloadMediaFile`: `fetch(toMediaUrl(url))` → blob → thẻ `<a download=name>`; để thuộc tính `download` hoạt động kể cả khi URL khác origin.
- Xóa một: `DELETE /api/admin/media/:id`. Xóa nhiều (`deleteMediaFiles`): `Promise.allSettled` rồi trả `{ succeeded, failed }` thay vì reject, nên một file lỗi không chặn các file còn lại; UI báo hai toast riêng (`deletedMany`, `deleteFailedMany`), rồi bỏ chọn + refresh.
- Ping: `GET /api/admin/media/ping`; trạng thái `isPinging` làm nút nhấp nháy; toast `pingOk` / `pingFailed`.

### 4.4 Xử lý lỗi tải

Thunk reject bằng `{ message, errorCode }` (`MediaError`) để UI phân biệt. `DataTable.onError` đặt `loadError`:

- `errorCode === 1601` (`MEDIA_NOT_CONFIGURED_CODE`) → khối hướng dẫn "chưa cấu hình" (3 bước + link Supabase dashboard + nút thử lại), ẩn bảng và nút Upload.
- Lỗi khác → khung lỗi với `useErrorMessage` (fallback `errors.loadFailed`) + thử lại. Nút "Refresh" ở header cũng xóa lỗi để thử lại.

### 4.5 Kiểu dữ liệu & liên quan

`MediaFile { id, name, mimeType, sizeOriginal, createdAt, url }`, `MediaListParams = ListParams`, `MediaListResult`, `MediaError`. URL thực tế là Supabase Storage; storefront và admin hiển thị qua proxy `/media/<key>` — xem [data-layer](../platform/data-layer.md) 4.7.

- **Đơn vị kích thước:** các số px trong doc này là giá trị ở gốc 16 px; trong code, chiều dài và cỡ chữ của module viết bằng `rem` (class `…-[…rem]`, token `--text-*` / `--space-*`, style inline `"…rem"`) nên lớn dần từ 1536 px tới 1920 px theo thang gốc `html` ([design-system](../platform/design-system.md) 4.3).
