# Collections admin (bộ sưu tập) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [admin/collections](../../docs/admin/collections.md) · **Test:** `tests/admin/collections/`

## 1. Bối cảnh & mục tiêu

Bộ sưu tập gom tay một nhóm sản phẩm theo chủ đề hoặc chiến dịch để giới thiệu như một lookbook trên storefront, độc lập với danh mục. Sai ở đây là slug sai làm hỏng link, hoặc bộ sưu tập trỏ nhầm sản phẩm. Module gồm `CollectionsContent.tsx` (bảng, form hai tab, bộ chọn sản phẩm), `_common/{moduleSlice,types,constants}.ts` và `page.tsx`. Danh sách sản phẩm cho bộ chọn lấy từ hook `useAdminProducts` của [data-layer](../platform/data-layer.md); hàm sinh slug dùng chung `src/lib/slugify.ts`.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Bảng bộ sưu tập, lọc theo mùa, tìm kiếm, sắp xếp bốn cách | Cách storefront hiển thị bộ sưu tập: thuộc [collections](../storefront/collections.md) |
| Form tạo và sửa hai tab (thông tin, sản phẩm), bộ chọn sản phẩm, xóa có xác nhận | Chọn và tải ảnh bìa: thuộc [ui-kit](../platform/ui-kit.md) (`ImageUrlField`) |
| Quyền `COLLECTION_CREATE`, `COLLECTION_UPDATE`, `COLLECTION_DELETE` trên từng nút | Chặn người không phải admin: thuộc [admin-shell](./admin-shell.md); ở đây chỉ kiểm BE từ chối thì không lộ gì |

## 3. Hợp đồng

- **Bảng.** `GET /api/admin/collections?search&season&sort&page&limit` (mới nhất trước, 25 dòng; bốn cách sắp xếp). BE trả mỗi bộ sưu tập kèm `products: [{id}]`, thunk đổi thành `productIds`. Mỗi dòng: ảnh bìa hoặc ô thay thế, tên, phụ đề (nếu có), mùa (hoặc `—`), số sản phẩm. Bộ lọc mùa bắt đầu bằng mùa đã biết (`Limited Edition`) và **chỉ tăng** khi gặp mùa mới trong trang đã tải; không bao giờ co lại theo trang đang lọc. Bảng trống nói "chưa có dữ liệu" hoặc "không phù hợp"; BE lỗi nói "không tải được" kèm "Thử lại".
- **Quyền.** Nút Thêm cần `COLLECTION_CREATE`, nút Sửa `COLLECTION_UPDATE`, nút Xóa `COLLECTION_DELETE`; quyền xem một mình không có nút nào.
- **Tạo / sửa.** Form hai tab, mở ở tab thông tin. Tên bắt buộc; slug sinh lại từ tên mỗi lần gõ (`slugify`). Gửi nguyên form `{slug, name, subtitle, description, image, productIds, season}` bằng `POST /api/admin/collections` hoặc `PATCH …/:id`. Thành công: toast, đóng form, tải lại bảng; lỗi: toast lời BE hoặc lời mặc định, form giữ nguyên. Nút khóa và hiện "đang lưu" khi đang gửi. Hủy rồi mở lại thì form trống, ô tìm sản phẩm trống.
- **Bộ chọn sản phẩm.** Lấy tối đa 200 sản phẩm một lần; ô tìm lọc ngay trong trình duyệt theo tên hoặc slug (không phân biệt hoa thường); danh sách hiện tối đa 50 sản phẩm đầu sau lọc, mỗi dòng có ảnh, danh mục, giá theo ngôn ngữ; bấm để chọn hoặc bỏ chọn; sản phẩm đã chọn thành chip có nút bỏ (sản phẩm không còn trong danh sách hiện mã của nó). Không tải được danh sách thì nói "không tìm thấy sản phẩm".
- **Xóa.** Hỏi xác nhận nêu tên; đồng ý thì `DELETE /api/admin/collections/:id`, toast, tải lại; lỗi thì toast lời BE hoặc mặc định.

## 4. Thiết kế

```
page.tsx ──► CollectionsContent ──► DataTable ──► fetchCollectionList (thunk) ──► authApi
CollectionsContent ──► ModalShell · FormTabs · ImageUrlField (ui-kit) ──► createCollection / updateCollection / deleteCollection ──► authApi
CollectionsContent ──► useAdminProducts (data-layer) · slugify (lib) · RoleGuard
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Bộ lọc mùa chỉ tăng** | Lọc theo một mùa rồi vẫn đổi sang mùa khác được; nếu dựng từ trang đang lọc, danh sách sẽ co lại | Dựng từ trang hiện tại |
| **Một hàm `slugify` dùng chung** (`src/lib/slugify.ts`) | Ba form (sản phẩm, danh mục, bộ sưu tập) từng chép riêng và cùng sai chữ `đ`; một nơi thì sửa một lần | Mỗi form một bản |
| **Lọc sản phẩm ở trình duyệt** | 200 sản phẩm đã có sẵn; gõ đến đâu lọc đến đó, không gọi BE | Gọi BE mỗi phím |
| **Quyền riêng cho từng nút** (`RoleGuard`) | Người chỉ được sửa không xóa được | Một quyền chung |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit, auth (quyền), data layer (`authApi`, `useAdminProducts`, `slugify`). [storefront/collections](../storefront/collections.md) đọc dữ liệu qua API công khai; ngược lại không. Kho `collections` giữ danh sách, tổng và bốn cờ bận.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Một thành phần giữ cả bảng, form và bộ chọn: chấp nhận được vì form nhỏ; tách `ProductPicker` khi cần dùng ở nơi khác |
| O | Thêm mùa hay cách sắp xếp = thêm vào hằng số và bản dịch |
| L | `ImageUrlField` dùng được ở nhiều form |
| I | Kho chỉ lộ bốn lệnh và danh sách |
| D | Thành phần phụ thuộc thunk và hook, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `admin.collections`; lỗi qua `useErrorMessage`; toast qua `useToast`; xác nhận qua `useConfirm`. Test dùng `renderApp` với danh tính thật, `adminWith(...)` cho một quyền và `collectionsApi` (BE giả: danh sách, sản phẩm, ghi) trong `collections-kit.tsx`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì không lộ bộ sưu tập nào; việc chặn trang thuộc admin-shell) · permission = có (thêm, sửa, xóa mỗi việc một quyền)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ACL-1 | Bảng: mở mới nhất trước 25 dòng kèm tổng; mỗi dòng có ảnh hoặc ô thay thế, tên, phụ đề, mùa, số sản phẩm; phần thiếu có dấu thay; tìm, sắp xếp bốn cách, tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/collections/collections-list.test.tsx` |
| ACL-1S | Bộ lọc mùa: bắt đầu bằng mùa đã biết, học thêm mùa từ trang đã tải, không bao giờ quên mùa đã thấy | đúng | admin đủ quyền | component | `tests/admin/collections/collections-list.test.tsx` |
| ACL-2 | Nút Thêm, Sửa, Xóa mỗi nút một quyền; quyền xem một mình không có nút | đúng | admin thiếu quyền | component | `tests/admin/collections/collections-list.test.tsx` |
| ACL-3E | Bảng trống nói theo bộ lọc; BE lỗi báo không tải được; BE từ chối khách (401) | lỗi | khách | component | `tests/admin/collections/collections-list.test.tsx` |
| ACL-3U | BE từ chối người mua đã đăng nhập (403): không lộ bộ sưu tập nào | lỗi | user | component | `tests/admin/collections/collections-list.test.tsx` |
| ACL-4 | Tạo: form trống, slug từ tên (bỏ dấu, đ, ký hiệu), gửi cả form, nút khóa khi lưu, toast, đóng, tải lại; Hủy rồi mở lại thì trống | đúng | admin đủ quyền | component | `tests/admin/collections/collection-form.test.tsx` |
| ACL-4E | Tạo bị từ chối: lời BE hoặc mặc định, form giữ nguyên chữ đã gõ; thiếu tên thì không gửi | lỗi | admin đủ quyền | component | `tests/admin/collections/collection-form.test.tsx` |
| ACL-5 | Sửa: mở với dữ liệu đang lưu, bộ sưu tập không có danh sách sản phẩm coi như rỗng, slug sinh lại, toast, đóng, tải lại, luôn mở ở tab thông tin | đúng | admin đủ quyền | component | `tests/admin/collections/collection-form.test.tsx` |
| ACL-5E | Sửa bị từ chối: lời BE hoặc mặc định, form giữ nguyên | lỗi | admin đủ quyền | component | `tests/admin/collections/collection-form.test.tsx` |
| ACL-6 | Chọn sản phẩm: hỏi 200, hiện danh mục và giá theo ngôn ngữ, đếm đã chọn, chọn và bỏ chọn bằng bấm hoặc chip, lọc theo tên hoặc slug, tối đa 50 dòng, giữ khi đổi tab | đúng | admin đủ quyền | component | `tests/admin/collections/collection-form.test.tsx` |
| ACL-6E | Không tải được danh sách sản phẩm: nói không tìm thấy; không khớp tìm kiếm cũng nói vậy | lỗi | admin đủ quyền | component | `tests/admin/collections/collection-form.test.tsx` |
| ACL-7 | Xóa: hỏi xác nhận nêu tên, đồng ý thì xóa, toast, tải lại; Không thì thôi | đúng | admin đủ quyền | component | `tests/admin/collections/collection-form.test.tsx` |
| ACL-7E | Xóa bị từ chối: lời BE hoặc mặc định, bảng không tải lại | lỗi | admin đủ quyền | component | `tests/admin/collections/collection-form.test.tsx` |
| ACL-8 | Kho Redux và hằng số: tham số hỏi, đổi sản phẩm lồng thành mã, thân gửi đi, ba cờ bận và lỗi, bốn cách sắp xếp, mùa đã biết, form trống | đúng | — | unit | `tests/admin/collections/collections-slice.test.ts` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Gợi ý mùa trong ô nhập chỉ có mùa đã biết | Bộ lọc học thêm mùa mới nhưng gợi ý của ô nhập thì không; admin gõ lại tay (ACL-4) |
| Chỉ 50 sản phẩm đầu hiện trong bộ chọn | Muốn thấy sản phẩm khác phải gõ tìm (ACL-6) |
| Bộ sưu tập có sản phẩm đã bị xóa | Chip hiện mã sản phẩm thay cho tên (ACL-6) |
| `slugify` từng chép ở ba nơi và cùng sai chữ `đ` | Đã gom về `src/lib/slugify.ts`, có test riêng ở [data-layer](../platform/data-layer.md) |

Thay đổi nhìn thấy được: không (không đổi hành vi nhìn thấy; slug đúng với chữ `đ` nhờ hàm dùng chung).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 5), kiểm thử đột biến. Dùng `slugify` dùng chung thay cho bản chép riêng.
