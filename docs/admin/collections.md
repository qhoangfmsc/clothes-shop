# Collections (bộ sưu tập)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/collections` · **Cập nhật:** 2026-10-18
> **Code:** `(admin)/admin/collections/` — `CollectionsContent.tsx`, `_common/{moduleSlice,types,constants}.ts`
> **i18n:** `admin.collections`, `admin.components.crud`
> **Redux slice:** `state.collections`

## 1. Tóm tắt module

CRUD bộ sưu tập: một nhóm sản phẩm được chọn tay, có tên, phụ đề, mô tả, ảnh bìa và "mùa". Hiển thị ở trang `/collections` và chi tiết bộ sưu tập của storefront.

## 2. Phục vụ gì / việc cần làm

Cho phép admin gom sản phẩm theo chủ đề/chiến dịch (ví dụ "Limited Edition") để giới thiệu như một lookbook, độc lập với danh mục.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Danh sách | Search, lọc theo mùa, sort, phân trang 25/trang |
| Tạo / sửa | Modal 2 tab: Info, Products |
| Chọn sản phẩm | Ô tìm kiếm cục bộ trên toàn bộ sản phẩm (tối đa 200; mỗi dòng hiện danh mục và giá VND `priceVnd`), danh sách đã chọn có nút bỏ |
| Xóa | Có xác nhận |

## 4. Chi tiết

### 4.1 Bảng

- Cột: **Collection** (ảnh bìa + tên + phụ đề), **Season** (chip), **Products** (số lượng `productIds.length`), **Actions** (`COLLECTION_UPDATE/DELETE`).
- Bộ lọc `season`: tập tùy chọn bắt đầu từ `SEASONS = ["Limited Edition"]` và **chỉ tăng** khi gặp mùa mới trong dữ liệu đã tải (nếu tính từ trang đang lọc thì danh sách sẽ co lại và không đổi sang mùa khác được).
- Sort (`COLLECTION_SORT_OPTIONS`): `-createdAt` (mặc định), `createdAt`, `name`, `-name`.
- `fetchCollectionList` → `GET /api/admin/collections?search&season&sort&page&limit`. BE trả mỗi bộ sưu tập kèm `products: [{id}]`; thunk đổi thành `productIds: string[]`.

### 4.2 Form (`EMPTY_COLLECTION_FORM`)

- **Info**: Name* (sinh `slug`), Subtitle (có hint), Season (ô nhập có `datalist` gợi ý từ các mùa đã biết), Cover image (`ImageUrlField`), Description.
- **Products**: bộ chọn nhiều sản phẩm từ `useAdminProducts({ limit: 200 })`; ô lọc theo tên/slug (lọc ở client); sản phẩm đã chọn hiện thành danh sách có nút bỏ; tiêu đề đếm số đã chọn.
- Gửi nguyên form: `{ slug, name, subtitle, description, image, productIds, season }`. API: `POST /api/admin/collections`, `PATCH /api/admin/collections/:id`, `DELETE /api/admin/collections/:id`.

### 4.3 Kiểu dữ liệu

`Collection { id, slug, name, subtitle, description, image, productIds, season, createdAt, updatedAt }`. Module: `CollectionListParams extends ListParams { season? }`, `CollectionFormData`, `CollectionListResult`.

### 4.4 Liên quan

Storefront: [collections](../storefront/collections.md) đọc từ `GET /api/collections` (danh sách) và `?slug=` (chi tiết + sản phẩm).

- **Đơn vị kích thước:** các số px trong doc này là giá trị ở gốc 16 px; trong code, chiều dài và cỡ chữ của module viết bằng `rem` (class `…-[…rem]`, token `--text-*` / `--space-*`, style inline `"…rem"`) nên lớn dần từ 1536 px tới 1920 px theo thang gốc `html` ([design-system](../platform/design-system.md) 4.3).
