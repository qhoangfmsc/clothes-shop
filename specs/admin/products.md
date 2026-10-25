# Products admin (quản lý sản phẩm) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [admin/products](../../docs/admin/products.md) · **Test:** `tests/admin/products/`

## 1. Bối cảnh & mục tiêu

Đây là nơi admin dựng danh mục hàng của cửa hàng: tên, giá, ảnh, kích cỡ, màu, nhãn, trạng thái. Sai ở đây là sai thứ khách thấy và mua: giá lệch, đường dẫn hỏng, sản phẩm hết hàng vẫn bán. Module gồm `ProductsContent.tsx` (bảng và form), `_common/{moduleSlice,types,constants}.ts` và `page.tsx`; bảng, khung popup, ô ảnh và hộp xác nhận lấy từ [ui-kit](../platform/ui-kit.md).

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Bảng, bộ lọc, form tạo và sửa (ba tab), xóa, kho Redux | Hiển thị sản phẩm ở cửa hàng: thuộc storefront |
| Quyền tạo, sửa, xóa trên từng nút | Chặn người không phải admin: thuộc [admin-shell](./admin-shell.md); ở đây chỉ kiểm BE từ chối thì bảng không lộ gì |
| Ô nhập giá (`VndInput`) qua form | Logic của `VndInput` và `parseVndInput`: thuộc currency |
| Tải ảnh lên qua `ImageListField` (chỉ thêm địa chỉ) | Tải tệp: thuộc [ui-kit](../platform/ui-kit.md) |

## 3. Hợp đồng

- **Danh sách.** `GET /api/admin/products?search&category&badge&status&minRating&sort&page&limit` (mặc định `-createdAt`, 25 một trang; bộ lọc chỉ gửi khi có). Cột: sản phẩm (ảnh hoặc ô trống, tên, slug), danh mục (`slug / slug con` hoặc `—`), giá (`MoneyText` theo ngôn ngữ, giá gạch khi có), trạng thái, nhãn hoặc `—`, đánh giá (trung bình và số lượt, hoặc "chưa có đánh giá"; ẩn dưới `md`), thao tác. Bộ lọc danh mục lấy từ `GET /api/admin/categories?limit=200`, hiện theo slug đã sắp xếp. Chín cách sắp xếp. BE lỗi → bảng báo "không tải được dữ liệu" kèm "Thử lại".
- **Quyền.** Nút "Thêm" cần `PRODUCT_CREATE`, nút sửa cần `PRODUCT_UPDATE`, nút xóa cần `PRODUCT_DELETE`; mỗi nút độc lập.
- **Form** (tạo và sửa dùng chung, ba tab: Chung, Biến thể và thẻ, Hình ảnh; dữ liệu giữ khi đổi tab). Bắt buộc: tên, giá, danh mục; danh mục con bắt buộc khi danh mục có danh mục con. `slug` luôn tính lại từ tên (bỏ dấu, chữ đ thành d, ký tự lạ thành `-`, bỏ `-` hai đầu). Giá là số nguyên đồng từ 1 đến 1.000.000.000 (`parseVndInput`); giá gạch để trống hoặc từ giá bán đến 1.000.000.000; sai thì hiện lỗi dưới ô, quay về tab Chung và không gửi gì; lỗi mất khi gõ lại. Gõ số thập phân bị từ chối ngay khi gõ.
- **Gửi.** `POST /api/admin/products` (tạo) hoặc `PATCH /api/admin/products/:id` (sửa) với tên, slug, mô tả, giá, giá gạch (`null` khi trống), ảnh, danh mục, danh mục con (`null` khi trống), nhãn, trạng thái, chất liệu, bảo quản, kích cỡ, màu, thẻ. Thành công: toast, làm mới bảng, đóng form. Lỗi: toast lời BE (mã lỗi dịch) hoặc "Lưu thất bại", form giữ nguyên. Nút lưu khóa và đổi chữ khi đang gửi.
- **Biến thể.** Kích cỡ chọn từ ba nhóm hoặc gõ riêng (viết hoa, không trùng); "Xóa tất cả (n)". Màu có tên và giá trị, không trùng tên dù khác hoa thường, thêm bằng nút hoặc Enter. Thẻ chọn từ gợi ý (biến mất khi đã có) hoặc gõ riêng (viết thường, không trùng). Enter trong các ô này không gửi form.
- **Xóa.** `DELETE /api/admin/products/:id` sau khi hỏi bằng tên sản phẩm (hộp nguy hiểm); lỗi → toast lời BE hoặc "Xóa thất bại", không làm mới.

## 4. Thiết kế

```
page.tsx ──► ProductsContent ──► DataTable (ui-kit) ──► fetchProductList ──► authApi
ProductsContent ──► createProduct / updateProduct / deleteProduct (thunk) ──► authApi
ProductsContent ──► useAdminCategories (SWR) ──► authApi
ProductsContent ──► ModalShell · FormTabs · FormField · ImageListField · VndInput · RoleGuard · useConfirm · useToast
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Một form cho tạo và sửa** (`editingId` quyết định) | Hai chế độ cùng ô nhập, cùng kiểm tra; không lệch nhau | Hai form |
| **Giá là chuỗi trong form, số khi gửi** (`parseVndInput`) | Ô nhập giữ nguyên chữ người gõ (có dấu chấm), nhưng số gửi đi luôn là số nguyên đồng; số thập phân không thể thành số lớn hơn | Lưu số ngay trong ô |
| **Kiểm tra giá ở FE giống BE** (1 đến 1 tỷ, giá gạch không thấp hơn giá) | Báo lỗi dưới ô ngay thay vì chờ BE trả 400 | Chỉ dựa vào BE |
| **Slug tự tính từ tên** | Admin không phải gõ hai lần; luôn hợp lệ | Ô slug sửa tay |
| **Xóa luôn hỏi lại** (hộp nguy hiểm có tên) | Xóa không hoàn tác được | Xóa ngay |
| **Quyền riêng cho từng nút** (`RoleGuard`) | Nhân viên có thể được cấp sửa mà không được xóa | Một quyền "quản lý sản phẩm" |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit, auth (quyền), data layer (`authApi`, `useAdminCategories`), currency (`VndInput`). Không module nào phụ thuộc ngược vào đây. Kho `products` giữ danh sách, tổng và cờ đang làm.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Kho lo gọi BE và trạng thái; `ProductsContent` ghép màn hình; ui-kit lo bảng và khung popup |
| O | Thêm nhóm kích cỡ hoặc gợi ý thẻ = sửa hằng số trong `constants.ts` |
| L | Cột nhận dòng `Product` như mọi bảng admin |
| I | Form chỉ biết `Category` và `SubCategory` ở phần cần để chọn |
| D | Trang phụ thuộc thunk và hook, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `admin.products`, `common.status`, `common.productBadge`; tiền qua `MoneyText` và `VndInput`; lỗi qua `useErrorMessage`; toast qua `useToast`; xác nhận qua `useConfirm`. Test dùng `renderApp` với danh tính thật, `adminWith(...)` cho một quyền, và `productsApi` (BE giả) trong `products-kit.tsx`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì bảng không lộ gì; việc chặn trang thuộc admin-shell) · permission = có (mỗi nút Thêm, Sửa, Xóa cần quyền riêng)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| APR-1 | Bảng: hỏi mới nhất trước 25 một trang; mỗi dòng có ảnh (qua đường dẫn media) hoặc ô trống, tên và slug, danh mục / danh mục con, giá theo ngôn ngữ và giá gạch, trạng thái, nhãn, đánh giá (ẩn trên điện thoại); tiêu đề đếm tổng | đúng | admin đủ quyền | component | `tests/admin/products/products-list.test.tsx` |
| APR-1E | Không tải được danh sách, hoặc BE từ chối khách (401) và người mua (403): báo không tải được thay cho "chưa có dữ liệu"; danh sách rỗng báo chưa có dữ liệu | lỗi | khách | component | `tests/admin/products/products-list.test.tsx` |
| APR-1U | BE từ chối người mua đã đăng nhập (403): không lộ sản phẩm nào | lỗi | user | component | `tests/admin/products/products-list.test.tsx` |
| APR-2 | Tìm kiếm, lọc theo danh mục (slug, xếp thứ tự), trạng thái, nhãn, số sao tối thiểu; chín cách sắp xếp; bộ lọc chưa đặt không được gửi | đúng | admin đủ quyền | component | `tests/admin/products/products-list.test.tsx` |
| APR-3 | Nút Thêm, Sửa, Xóa hiện đủ cho admin đủ quyền; mỗi nút chỉ hiện với đúng quyền tạo, sửa, xóa | đúng | admin đủ quyền | component | `tests/admin/products/products-list.test.tsx` |
| APR-3P | Admin chỉ có quyền xem đơn hàng không thấy nút Thêm, Sửa, Xóa | đúng | admin thiếu quyền | component | `tests/admin/products/products-list.test.tsx` |
| APR-4 | Sản phẩm mới: form trống ở tab đầu, danh mục để chọn; tạo với giá nguyên đồng, slug từ tên (kể cả chữ đ), giá gạch, danh mục con bắt buộc khi danh mục có; đổi danh mục xóa danh mục con; toast, đóng form, làm mới bảng | đúng | admin đủ quyền | component | `tests/admin/products/products-form.test.tsx` |
| APR-4E | Lưu không được: giá 0, quá một tỷ, số thập phân, giá gạch thấp hơn giá hoặc quá một tỷ, lỗi nằm dưới ô và đưa về tab đầu, mất lỗi khi sửa; BE từ chối thì báo lời BE hoặc lời mặc định và giữ form | lỗi | admin đủ quyền | component | `tests/admin/products/products-form.test.tsx` |
| APR-5 | Đóng form bằng nút X, Hủy hoặc vùng tối rồi mở lại thì trống; nút lưu bị khóa khi đang gửi | đúng | admin đủ quyền | component | `tests/admin/products/products-form.test.tsx` |
| APR-6 | Sửa sản phẩm: mở với đủ dữ liệu (giá có dấu chấm), gửi PATCH tới đúng id, bỏ giá gạch khi xóa ô, mở lại luôn ở tab đầu và ô phụ sạch, sản phẩm không có danh mục | đúng | admin đủ quyền | component | `tests/admin/products/products-form.test.tsx` |
| APR-6E | Sửa không được vì BE từ chối: báo lời BE và giữ form | lỗi | admin đủ quyền | component | `tests/admin/products/products-form.test.tsx` |
| APR-7 | Kích cỡ (chọn, bỏ, xóa tất cả có số đếm, kích cỡ riêng viết hoa một lần), màu (tên và giá trị màu, thêm bằng nút hoặc Enter, không trùng tên dù khác hoa thường, gỡ), thẻ (gợi ý biến mất khi đã chọn, thẻ riêng viết thường một lần, gỡ), chất liệu và bảo quản; Enter không gửi form; giữ dữ liệu khi đổi tab | đúng | admin đủ quyền | component | `tests/admin/products/products-form.test.tsx` |
| APR-8 | Hình ảnh: thêm địa chỉ ảnh và gửi danh sách | đúng | admin đủ quyền | component | `tests/admin/products/products-form.test.tsx` |
| APR-9 | Xóa sản phẩm: hỏi bằng tên (hộp nguy hiểm), đồng ý thì xóa, toast, làm mới bảng; từ chối không gửi gì | đúng | admin đủ quyền | component | `tests/admin/products/products-form.test.tsx` |
| APR-9E | Xóa bị BE từ chối: báo lời BE hoặc lời mặc định, không làm mới bảng | lỗi | admin đủ quyền | component | `tests/admin/products/products-form.test.tsx` |
| APR-10 | Kho Redux và hằng số: tham số hỏi, danh sách và tổng, cờ đang tải/tạo/sửa/xóa, lỗi, giới hạn giá, lựa chọn sao, chín cách sắp xếp, nhóm kích cỡ, form trống | đúng | — | unit | `tests/admin/products/products-slice.test.ts` |

Coverage: ngưỡng riêng cho `ProductsContent.tsx` và `moduleSlice.ts` trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Slug bỏ mất chữ đ: "Đầm Lụa" thành "am-lua" | Đã sửa: đ và Đ thành d (APR-4) |
| BE lỗi cho ra bảng "chưa có dữ liệu" | Đã sửa trong ui-kit (APR-1E) |
| Slug tính lại cả khi sửa tên một sản phẩm đã có | Slug đổi theo tên; link cửa hàng dùng id nên không hỏng (APR-4) |
| Ô kích cỡ, màu, thẻ không có nhãn gắn với ô | Truy cập bằng chữ gợi ý; trình đọc màn hình chỉ nghe chữ gợi ý |
| Tên màu trùng chỉ so sánh theo tên, không theo giá trị màu | Hai tên khác nhau cùng một mã màu được phép |
| Gõ tên, kích cỡ, thẻ trùng giữ nguyên chữ trong ô, không báo | Người dùng phải tự xóa chữ trùng |

Thay đổi nhìn thấy được: slug của sản phẩm có chữ đ giờ có chữ d; bảng báo lỗi tải thay cho "chưa có dữ liệu".

## 8. Lịch sử thay đổi

- 2026-10-24 · Viết spec và test cho toàn module (batch 3), kiểm thử đột biến.
- 2026-10-24 · Sửa: slug bỏ mất chữ đ (trước đây "Đầm Lụa" ra "am-lua"); test APR-4 tái hiện lỗi trước khi sửa.
- 2026-10-25 · `slugify` chuyển sang `src/lib/slugify.ts` (dùng chung với danh mục và bộ sưu tập); hành vi không đổi, đột biến về slug chuyển sang `tests/platform/data-layer`.
- 2026-10-25 · no-test: `slugify` chỉ đổi nơi chứa (`src/lib/slugify.ts`), hành vi không đổi và vẫn được kiểm bởi APR-4 cùng `tests/platform/data-layer/slugify.test.ts`.
