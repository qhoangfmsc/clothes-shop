# Categories admin (danh mục & danh mục con) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [admin/categories](../../docs/admin/categories.md) · **Test:** `tests/admin/categories/`

## 1. Bối cảnh & mục tiêu

Danh mục và danh mục con là khung của catalog: mỗi sản phẩm thuộc một danh mục, thứ tự danh mục quyết định cách chúng hiện trên storefront (lưới `/shop`, mega menu, burger menu). Sai ở đây là đường dẫn (slug) sai làm hỏng link cửa hàng, hoặc thứ tự lưu không như admin đã kéo. Module gồm `CategoriesContent.tsx` (bảng kéo thả, form hai tab), `_common/{moduleSlice,types,constants}.ts` và `page.tsx`. Danh sách danh mục cũng được [products](./products.md) dùng làm lựa chọn.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Bảng danh mục (một trang 200 dòng), tìm kiếm, sắp xếp năm cách, kéo thả đổi thứ tự | Cách storefront hiển thị danh mục: thuộc [shop](../storefront/shop.md) |
| Form tạo và sửa hai tab (thông tin, danh mục con), xóa có xác nhận | Chọn và tải ảnh bìa: thuộc [ui-kit](../platform/ui-kit.md) (`ImageUrlField`) |
| Quyền `CATEGORY_CREATE`, `CATEGORY_UPDATE`, `CATEGORY_DELETE` trên từng nút | Chặn người không phải admin: thuộc [admin-shell](./admin-shell.md); ở đây chỉ kiểm BE từ chối thì không lộ gì |

## 3. Hợp đồng

- **Bảng.** `GET /api/admin/categories?search&sort&page&limit`; luôn tải 200 dòng một trang để kéo thả đổi được cả danh sách; mở theo `priority`. Mỗi dòng: thứ hạng, tên, danh mục con thành chip (hoặc `—`), mô tả (cắt ở 50 ký tự kèm `...`, không có thì `—`). Năm cách sắp xếp, `priority` đầu. Bảng trống nói "chưa có dữ liệu" hoặc "không phù hợp"; BE lỗi nói "không tải được" kèm "Thử lại".
- **Kéo thả.** Chỉ bật khi đang sắp theo `priority`, không lọc, một trang. Thả xong `PATCH /api/admin/categories/reorder {ids}` với toàn bộ id theo thứ tự mới; thành công: toast và tải lại; thất bại: toast lời BE hoặc lời mặc định, tải lại, rồi ném lỗi để bảng hoàn tác ngay (không đợi tải lại).
- **Quyền.** Nút Thêm cần `CATEGORY_CREATE`, nút Sửa `CATEGORY_UPDATE`, nút Xóa `CATEGORY_DELETE`; quyền xem một mình không có nút nào.
- **Tạo.** Form trống ở tab thông tin; ô thứ hạng chỉ đọc hiện "hạng cao nhất + 1" (hỏi `GET …?sort=-priority&limit=1`; chưa có danh mục thì 1; hỏi lỗi thì để trống; mỗi lần mở đều quên giá trị lần trước). Tên bắt buộc. Gửi `{slug, title, description, heroImage, subcategories}` (không gửi thứ hạng); ảnh bìa cắt khoảng trắng, rỗng thì `null`. Thành công: toast, đóng form, tải lại bảng. Lỗi: toast lời BE hoặc lời mặc định, form giữ nguyên.
- **Sửa.** Mở với dữ liệu đang lưu và thứ hạng hiện tại (không đổi được); không hỏi thứ hạng kế. `PATCH /api/admin/categories/:id` cùng thân như tạo.
- **Slug.** Sinh lại từ tên mỗi lần gõ: chữ thường, bỏ dấu (kể cả `đ` thành `d`), mọi chuỗi ký tự khác chữ và số thành một dấu `-`, bỏ `-` hai đầu.
- **Danh mục con.** Thêm/xóa nhiều dòng, mỗi dòng có tên (sinh slug riêng) và mô tả; khi gửi bỏ `id`, `count` và ngày, chỉ còn `{slug, label, description}`; sửa dòng đã lưu không làm đổi bản trong bảng. Tab mở lại luôn về thông tin.
- **Xóa.** Hỏi xác nhận có nêu tên; đồng ý thì `DELETE /api/admin/categories/:id`, toast, tải lại; lỗi thì toast lời BE hoặc mặc định.

## 4. Thiết kế

```
page.tsx ──► CategoriesContent ──► DataTable (kéo thả) ──► fetchCategoryList · reorderCategories (thunk) ──► authApi
CategoriesContent ──► ModalShell · FormTabs · ImageUrlField (ui-kit) ──► createCategory / updateCategory / deleteCategory / fetchNextCategoryPriority ──► authApi
CategoriesContent ──► RoleGuard (CATEGORY_CREATE, CATEGORY_UPDATE, CATEGORY_DELETE)
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Kéo thả lạc quan, bảng hoàn tác khi thành phần ném lỗi** | Admin thấy thứ tự mới ngay; nếu BE từ chối, hàng trở về chỗ cũ không cần đợi tải lại | Chờ BE rồi mới đổi |
| **Thứ hạng chỉ để xem, BE mới cấp thật** | Hai admin tạo cùng lúc không đụng nhau; FE không tự đặt hạng | FE gửi `priority` |
| **Một trang 200 dòng** | Kéo thả cần thấy cả danh sách | Phân trang rồi sắp xếp từng trang |
| **Slug sinh từ tên, bỏ dấu tiếng Việt** | Link cửa hàng luôn gõ được; `đ` không bị mất chữ | Để admin tự gõ slug |
| **Quyền riêng cho từng nút** (`RoleGuard`) | Người chỉ được sửa không xóa được | Một quyền chung |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit, auth (quyền), data layer (`authApi`). [products](./products.md) đọc danh mục qua hook riêng; ngược lại không. Kho `categories` giữ danh sách, tổng và bốn cờ bận (đang tải, tạo, cập nhật, xóa); thứ tự và cập nhật dùng chung `isUpdating`.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Một thành phần giữ cả bảng và form: chấp nhận được vì form nhỏ; tách `CategoryForm` khi thêm trường |
| O | Thêm cách sắp xếp = thêm vào hằng số và bản dịch |
| L | `DataTable` dùng được cho mọi danh sách có kéo thả |
| I | Kho chỉ lộ năm lệnh và danh sách |
| D | Thành phần phụ thuộc thunk và hook, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `admin.categories`; lỗi qua `useErrorMessage`; toast qua `useToast`; xác nhận qua `useConfirm`. Test dùng `renderApp` với danh tính thật, `adminWith(...)` cho một quyền, `categoriesApi` (BE giả) trong `categories-kit.tsx` và thế `@dnd-kit/core` như test của `DataTable` vì jsdom không kéo được.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì không lộ danh mục nào; việc chặn trang thuộc admin-shell) · permission = có (thêm, sửa, xóa mỗi việc một quyền)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ACT-1 | Bảng: mở theo thứ hạng một trang 200 dòng kèm tổng; mỗi dòng có hạng, tên, chip danh mục con, mô tả cắt ở 50 chữ; phần thiếu có dấu thay; tìm, sắp xếp năm cách, tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/categories/categories-list.test.tsx` |
| ACT-2 | Nút Thêm, Sửa, Xóa mỗi nút một quyền; quyền xem một mình không có nút | đúng | admin thiếu quyền | component | `tests/admin/categories/categories-list.test.tsx` |
| ACT-3 | Kéo thả: bật khi sắp theo thứ hạng, tắt khi sắp khác; gửi đủ id theo thứ tự mới, toast, tải lại | đúng | admin đủ quyền | component | `tests/admin/categories/categories-list.test.tsx` |
| ACT-3F | Kéo thả bị BE từ chối: hàng trở về ngay, toast lời BE hoặc mặc định, tải lại | lỗi | admin đủ quyền | component | `tests/admin/categories/categories-list.test.tsx` |
| ACT-4E | Bảng trống nói theo bộ lọc; BE lỗi báo không tải được; BE từ chối khách (401) | lỗi | khách | component | `tests/admin/categories/categories-list.test.tsx` |
| ACT-4U | BE từ chối người mua đã đăng nhập (403): không lộ danh mục nào | lỗi | user | component | `tests/admin/categories/categories-list.test.tsx` |
| ACT-5 | Tạo: form trống, hạng kế tiếp (1 khi chưa có, trống khi hỏi lỗi, quên lần trước), slug từ tên (bỏ dấu, đ, ký hiệu, dấu - hai đầu), thân gửi đi, ảnh bìa cắt khoảng trắng, nút khóa khi lưu, toast, đóng, tải lại; Hủy rồi mở lại thì trống | đúng | admin đủ quyền | component | `tests/admin/categories/category-form.test.tsx` |
| ACT-5E | Tạo bị từ chối: lời BE hoặc mặc định, form giữ nguyên chữ đã gõ; thiếu tên thì không gửi | lỗi | admin đủ quyền | component | `tests/admin/categories/category-form.test.tsx` |
| ACT-6 | Sửa: mở với dữ liệu đang lưu và hạng hiện tại không đổi được, không hỏi hạng kế, gửi thân đã bỏ id/count của danh mục con, slug sinh lại, toast, đóng, tải lại | đúng | admin đủ quyền | component | `tests/admin/categories/category-form.test.tsx` |
| ACT-6E | Sửa bị từ chối: lời BE hoặc mặc định, form giữ nguyên | lỗi | admin đủ quyền | component | `tests/admin/categories/category-form.test.tsx` |
| ACT-7 | Danh mục con: đếm ở tiêu đề, thêm, đánh số, gõ tên sinh slug riêng, xóa đúng dòng, giữ khi đổi tab, tab mở lại về thông tin, sửa bản trong form không làm đổi bảng | đúng | admin đủ quyền | component | `tests/admin/categories/category-form.test.tsx` |
| ACT-8 | Xóa: hỏi xác nhận nêu tên, đồng ý thì xóa, toast, tải lại; Không thì thôi | đúng | admin đủ quyền | component | `tests/admin/categories/category-form.test.tsx` |
| ACT-8E | Xóa bị từ chối: lời BE hoặc mặc định, bảng không tải lại | lỗi | admin đủ quyền | component | `tests/admin/categories/category-form.test.tsx` |
| ACT-9 | Kho Redux và hằng số: tham số hỏi, danh sách và tổng, hạng kế tiếp, thân gửi đi của các lệnh ghi, bốn cờ bận và lỗi, năm cách sắp xếp, trang 200, form trống | đúng | — | unit | `tests/admin/categories/categories-slice.test.ts` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Slug sai khi tên có `đ` | Đã sửa: `đ` thành `d` trước khi bỏ dấu (ACT-5); hàm `slugify` còn bản sao ở [products](./products.md) và `collections`, nên gom về một chỗ khi làm collections |
| Kéo thả thất bại để lại thứ tự sai | Thành phần ném lỗi để bảng hoàn tác ngay và còn tải lại để khớp BE (ACT-3F) |
| Hai admin tạo cùng lúc thấy cùng một hạng kế | Hạng chỉ để xem; BE cấp hạng thật khi tạo (ACT-5) |
| Gõ tên danh mục con đồng thời sửa hai trường qua `updSub` | Mỗi lần gõ cập nhật tên rồi slug trên bản sao của dòng; kiểm ở ACT-7 |

Thay đổi nhìn thấy được: tên danh mục bắt đầu bằng `đ` giờ cho slug đúng (trước đây mất chữ `d` đầu).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 4), kiểm thử đột biến. Sửa `slugify`: `đ` thành `d` trước khi bỏ dấu (giống đã sửa ở products); sau đó dùng `slugify` dùng chung ở `src/lib/slugify.ts`.
- 2026-10-25 · no-test: việc chuyển `slugify` sang `src/lib/slugify.ts` không đổi hành vi; ACT-5 và `tests/platform/data-layer/slugify.test.ts` kiểm cả hai phía.
