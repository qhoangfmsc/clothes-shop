# Refactor Admin Products — Plan

## Phân tích vấn đề

Sau khi so sánh code hiện tại với 3 skills (`01-project-structure`, `02-api-slice-pattern`, `03-tailwind-styling`), tìm thấy các vấn đề sau:

### 1. Dual Slice (Zustand + Redux) — VI PHẠM skill 02
- `products-slice.ts` ở module root dùng Zustand, NHƯNG `_common/moduleSlice.ts` đã có Redux slice chuẩn
- `ProductsContent.tsx` đang dùng **Zustand** (`useProductsSlice()`) thay vì Redux (`useAppDispatch` + `useAppSelector`)
- Kết quả: 2 slice cùng tồn tại, component dùng cái cũ (Zustand), Redux slice bị bỏ không

### 2. Constants & Types nằm trong component — VI PHẠM skill 01
- `SORT_OPTIONS`, `SIZE_GROUPS`, `TAG_SUGGESTIONS`, `EMPTY_FORM` hardcode trong `ProductsContent.tsx`
- `_common/constants.ts` **chưa tồn tại**
- `ProductListResult` type nằm trong `products-slice.ts` (Zustand) thay vì `_common/types.ts`

### 3. Inline `style={}` objects ~500 dòng — VI PHẠM skill 03
- Object `S:` dài 350+ dòng (toàn bộ table, modal, form styles)
- Object `FS:` dài 30+ dòng (fieldset styles)
- Object chip styles dài 60+ dòng
- Tất cả đều là static styles → phải dùng Tailwind className

### 4. `use-admin-api.ts` duplicate types
- `ProductFormData` và `ProductFilters` được define ở cả `use-admin-api.ts` và `_common/types.ts`

---

## Kế hoạch thực hiện

### Bước 1: Tạo `_common/constants.ts`
Tách các hằng số từ `ProductsContent.tsx`:
- `SORT_OPTIONS` — sort options cho DataTable
- `SIZE_GROUPS` — nhóm size (Letter, Number, Special)
- `TAG_SUGGESTIONS` — tag gợi ý
- `EMPTY_FORM` — form state mặc định

### Bước 2: Cập nhật `_common/types.ts`
- Export `ProductListResult` interface (đang nằm trong `products-slice.ts` sắp xoá)

### Bước 3: Cập nhật `_common/moduleSlice.ts`
- Thêm query params `category`, `badge`, `status` vào `fetchProductList` (hiện đang thiếu)
- Export thêm `ProductListResult` từ types

### Bước 4: Xoá `products-slice.ts` (Zustand)
- File này bị thay thế hoàn toàn bởi Redux `_common/moduleSlice.ts`

### Bước 5: Refactor `ProductsContent.tsx`
Ba thay đổi chính:

**a) Data flow:** Zustand → Redux
- Xoá `import { useProductsSlice } from "./products-slice"`
- Thêm `import { useAppDispatch, useAppSelector } from "@/src/store/hooks"`
- Thêm `import { createProduct, updateProduct, deleteProduct, fetchProductList, clearError } from "./_common/moduleSlice"`
- `useProductsSlice()` → `useAppDispatch()` + `dispatch(thunk)`
- Loading states từ `useAppSelector((s) => s.products)`

**b) Constants:** Tách ra `_common/constants.ts`
- Import từ `./_common/constants`

**c) Styles:** Inline `style={}` → Tailwind `className`
- Toàn bộ static styles trong `S:`, `FS:`, chip variables → Tailwind classes
- Dùng `[var(--design-token)]` syntax cho màu sắc (ví dụ: `bg-[var(--bg-secondary)]`, `text-[var(--text-muted)]`)
- Chỉ giữ `style={}` cho dynamic values (ví dụ: `style={{ opacity: loading ? 0.4 : 1 }}`)

### Bước 6: Kiểm tra lint
- Chạy ESLint / TypeScript check để đảm bảo không lỗi

---

## Không đụng đến
- `DataTable.tsx` — vẫn dùng inline styles, sẽ refactor riêng sau
- `use-admin-api.ts` — vẫn còn duplicate types nhưng đang được dùng cho categories, sẽ clean up khi refactor categories
- `src/store/`, `src/lib/` — đã chuẩn
- `page.tsx` — đã chuẩn (thin route entry)

---

## Rủi ro
- Modal form rất lớn (~400 dòng), chuyển sang Tailwind cần cẩn thận từng field
- Chip selectors (sizes, colors, tags) có logic UI phức tạp
