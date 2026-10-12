# Categories (danh mục & danh mục con)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/categories` · **Cập nhật:** 2026-10-12
> **Code:** `(admin)/admin/categories/` — `CategoriesContent.tsx`, `_common/{moduleSlice,types,constants}.ts`
> **i18n:** `admin.categories`, `admin.components.crud`
> **Redux slice:** `state.categories`

## 1. Tóm tắt module

Quản lý danh mục sản phẩm (kèm danh mục con lồng bên trong) và thứ tự hiển thị của chúng. Có kéo thả để sắp xếp lại; thứ tự này quyết định cách danh mục xuất hiện trên storefront (lưới `/shop`, mega menu, burger menu).

## 2. Phục vụ gì / việc cần làm

Giữ cấu trúc catalog: mỗi sản phẩm thuộc một danh mục và (nếu có) một danh mục con. Admin đặt ảnh hero cho danh mục và quyết định danh mục nào đứng trước.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Danh sách | Search, sort, tải toàn bộ danh mục trên một trang (200) |
| Sắp xếp kéo thả | Chỉ bật khi đang sort theo `priority` |
| Tạo / sửa | Modal 2 tab: Info, Subcategories |
| Xóa | Có xác nhận |
| Hiển thị priority kế tiếp | Khi tạo mới, ô priority hiển thị số sẽ được cấp (chỉ xem) |

## 4. Chi tiết

### 4.1 Bảng

- Cột: **Priority** (số, tabular), **Title**, **Subcategories** (chip), **Description** (cắt 50 ký tự), **Actions** (sửa/xóa theo `CATEGORY_UPDATE/DELETE`).
- Sort (`CATEGORY_SORT_OPTIONS`): `priority` (mặc định, `CATEGORY_PRIORITY_SORT`), `-createdAt`, `createdAt`, `title`, `-title`.
- `pageSize = CATEGORY_PAGE_SIZE = LIST_MAX_LIMIT (200)` để mọi danh mục nằm trên một trang → kéo thả đổi thứ tự được cho toàn danh sách.
- `reorder={{ sortValue: "priority", onReorder }}`: `handleReorder(rows)` gọi `reorderCategories(ids)` → `PATCH /api/admin/categories/reorder` với `{ ids }` (BE đặt `priority` = vị trí, 1 = đầu). Thành công: toast `reordered` + refresh. Thất bại: toast lỗi, refresh, rồi **ném lỗi** để `DataTable` hoàn tác.
- Mã lỗi BE đã dịch cho thao tác này: `1101`, `1106`, `1107`, `1108` (xem [i18n](../platform/i18n.md) 4.7).

### 4.2 Form

- **Info**: Title* (gõ tên sinh `slug`), Priority (readonly, disabled; khi sửa hiện priority hiện tại, khi tạo hiện `nextPriority`), Description, Hero image (`ImageUrlField`).
- **Subcategories**: thêm/xóa nhiều dòng, mỗi dòng có Label (sinh `slug`) và Description. Dòng mới có `id: 0`.
- `nextPriority` lấy bằng thunk `fetchNextCategoryPriority` = `GET /api/admin/categories?sort=-priority&limit=1` → `priority + 1` (chỉ để hiển thị; BE tự cấp thứ hạng thật khi tạo).
- Body gửi đi: `{ slug, title, description, heroImage (trim, rỗng → null), subcategories }`; mỗi danh mục con bị bỏ `id`, `count`, `createdAt`, `updatedAt` trước khi gửi. Không gửi `priority`.
- API: `POST /api/admin/categories`, `PATCH /api/admin/categories/:id`, `DELETE /api/admin/categories/:id`, `GET /api/admin/categories?…`.

### 4.3 Kiểu dữ liệu

`Category { id, slug, title, description, heroImage | null, priority (duy nhất, 1 = đầu), subcategories: SubCategory[], createdAt, updatedAt }`, `SubCategory { id: number, slug, label, description, count }`. Module: `CategoryListParams = ListParams`, `CategoryFormData`, `CategoryListResult`.

### 4.4 Liên quan

- Storefront đọc danh mục bằng `sort=priority&limit=200` (`PUBLIC_CATEGORIES_QUERY`); `MAX_INLINE_CATEGORIES = 4` điều khiển việc lưới `/shop` chuyển thành carousel và mega menu thêm link "xem thêm".
- Dropdown danh mục của [products](./products.md) lấy từ `useAdminCategories`.
