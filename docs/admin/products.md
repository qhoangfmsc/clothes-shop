# Products (quản lý sản phẩm)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/products` · **Cập nhật:** 2026-10-17
> **Code:** `(admin)/admin/products/` — `ProductsContent.tsx`, `_common/{moduleSlice,types,constants}.ts`
> **i18n:** `admin.products`, `admin.components.crud`, `common.status`, `common.productBadge`
> **Redux slice:** `state.products`

## 1. Tóm tắt module

Trang CRUD sản phẩm cho admin: bảng danh sách có tìm kiếm/lọc/sắp xếp/phân trang phía server, và modal 3 tab để tạo/sửa (thông tin chung, biến thể & tag, ảnh).

## 2. Phục vụ gì / việc cần làm

Cho phép admin đưa sản phẩm lên cửa hàng và giữ catalog đúng: giá, danh mục, trạng thái hiển thị (`active`/`disabled`), nhãn (badge) điều khiển cách khách mua (xem [ui-kit](../platform/ui-kit.md) mục 4.8), kích cỡ, màu, chất liệu, hướng dẫn giặt, tag và ảnh.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Danh sách | Server-side: search, lọc (category, status, badge, số sao tối thiểu), sort (có theo sao và số đánh giá), phân trang 25/trang; cột Rating |
| Tạo / sửa | Modal 3 tab; tự sinh slug từ tên |
| Xóa | Có hộp xác nhận (`danger`) |
| Quyền | Nút Thêm/Sửa/Xóa bọc `RoleGuard` theo `PRODUCT_CREATE/UPDATE/DELETE` |
| Upload ảnh | `ImageListField` (upload nhiều file hoặc dán URL) |

## 4. Chi tiết

### 4.1 Bảng

- Cột: **Sản phẩm** (ảnh đầu + tên + slug; `toMediaUrl` cho ảnh), **Danh mục** (`category.slug / subcategory.slug`), **Giá** (`MoneyText` theo ngôn ngữ; giá gốc gạch ngang khi `originalPriceVnd` không `null`), **Trạng thái** (badge sage/xám), **Nhãn** (`ADMIN_BADGE_STYLES`), **Rating** (ẩn dưới `md`: sao vàng + `ratingAverage` một chữ số thập phân và "N đánh giá" lấy từ `ratingAverage` / `ratingCount` của BE; "Chưa có đánh giá" khi `ratingAverage` là `null`/`ratingCount` 0), **Thao tác** (sửa/xóa theo quyền).
- Bộ lọc: `category` (danh sách slug từ `useAdminCategories({ limit: 200 })`, sắp A→Z), `status` (`PRODUCT_STATUSES`), `badge` (`PRODUCT_BADGES`), `minRating` (`PRODUCT_MIN_RATINGS` 5…1, nhãn "Từ N sao trở lên"; sản phẩm chưa có đánh giá bị BE loại).
- Sort (`PRODUCT_SORT_OPTIONS`): `-createdAt` (mặc định), `createdAt`, `-price`, `price` (sắp theo VND, BE không có sort theo USD), `name`, `-name`, `-ratingAverage`, `ratingAverage`, `-ratingCount` (nhãn `ratingDesc`, `ratingAsc`, `reviewsDesc` ở `admin.components.crud.sort`; BE luôn đặt sản phẩm chưa có đánh giá ở cuối).
- Dữ liệu qua thunk `fetchProductList` → `GET /api/admin/products?search&category&badge&status&minRating&sort&page&limit` (dựng bằng `buildListQuery`). Tiêu đề trang hiện tổng từ `state.products.total`.

### 4.2 Form (`EMPTY_FORM`)

| Tab | Trường |
|---|---|
| General | Tên*, Mô tả; Giá (VND)* và Giá gốc (VND, tùy chọn) là `VndInput` (chỉ chữ số, nhóm ba số bằng dấu chấm khi gõ; số lẻ như `350000.5` bị từ chối ngay khi gõ/dán và hiện lỗi dưới ô); Danh mục*, Danh mục con (khóa tới khi chọn danh mục; bắt buộc nếu danh mục có danh mục con), Trạng thái, Badge |
| Variants | Sizes (nhóm `SIZE_GROUPS`: `letter` XS–XXL, `number` 28–42, `special` One Size; thêm size tùy ý bằng Enter, tự viết hoa; nút xóa tất cả), Colors (tên + color picker `hex`, không cho trùng tên không phân biệt hoa thường), Material, Care, Tags (gợi ý `TAG_SUGGESTIONS`: summer, winter, casual, formal, luxury, streetwear; thêm tag tự do bằng Enter, viết thường) |
| Images | `ImageListField` — ảnh đầu tiên là ảnh đại diện |

- Form không có trường điểm hay số đánh giá (BE từ chối nếu gửi `ratingAverage` / `ratingCount`); `openEdit` chỉ nạp các trường của `EMPTY_FORM` nên payload không bao giờ chứa chúng.
- Gõ tên → `slug = slugify(name)` (bỏ dấu, chữ thường, `-`); slug không có ô nhập riêng.
- Đổi danh mục sẽ xóa `subcategoryId`.
- Submit: nếu danh mục có danh mục con mà chưa chọn → toast lỗi `toast.subcategoryRequired`. Trước khi gửi, `parseVndInput` kiểm giá: số nguyên VND từ `MIN_PRICE_VND` (1) đến `MAX_PRICE_VND` (1.000.000.000) và giá gốc (nếu có) không nhỏ hơn giá; sai thì hiện lỗi dưới ô (`form.errors.price` / `form.errors.originalPrice`) và không gọi API (nếu BE vẫn từ chối bằng 400, toast hiện lỗi của BE). Payload gửi: form với `priceVnd` / `originalPriceVnd` (số nguyên hoặc `null`, không còn `price`/`originalPrice`), `subcategoryId || null`.
- Tạo: `POST /api/admin/products`; sửa: `PATCH /api/admin/products/:id`; xóa: `DELETE /api/admin/products/:id`. Sau thành công: toast, `tableRef.refresh()`, đóng modal; lỗi: toast qua `useErrorMessage` (modal giữ nguyên).

### 4.3 Kiểu dữ liệu

- `Product` (`src/types/product.ts`): `id, slug, sku, name, priceVnd, priceUsd, originalPriceVnd | null, originalPriceUsd | null, images, category (object join), subcategory (object join), badge, status, description, material, care, sizes, colors[{name,hex}], tags, createdAt, updatedAt`.
- Module: `ProductListParams extends ListParams { category?, badge?, status? }`, `ProductFormData`, `ProductListResult`.
- Enum: badge `new | sale | bestseller | sold_out | limited | custom_order`; status `active | disabled`.

### 4.4 Liên quan

- Badge `sold_out` / `custom_order` thay đổi nút mua ở storefront ([shop](../storefront/shop.md), [product-detail](../storefront/product-detail.md)).
- Sản phẩm được chọn vào bộ sưu tập ở [collections](./collections.md).
