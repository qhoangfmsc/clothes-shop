# Site config admin (banner, vận chuyển & đổi trả, tỷ giá) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [admin/site-config](../../docs/admin/site-config.md) · **Test:** `tests/admin/site-config/`

## 1. Bối cảnh & mục tiêu

Nơi admin đổi nội dung cấu hình của storefront mà không cần deploy: banner đầu trang, phí vận chuyển với ngưỡng miễn phí và chính sách đổi trả, tỷ giá VND/USD mà BE dùng cho mọi số USD. Sai ở đây là khách thấy phí sai hay giá USD sai, hoặc một lần lưu xóa mất chính sách đổi trả. Module gồm `SiteConfigContent.tsx` (tab theo loại, thẻ theo khóa), `_common/{moduleSlice,types}.ts`, `_types/registry.tsx` (nối loại với giao diện) và ba thư mục `_types/{banner,shipping,currency}/` mỗi nơi một form và mô hình form.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Tab theo loại, thẻ theo khóa BE biết, dòng trạng thái, mở đúng form theo loại | Cách storefront dùng giá trị cấu hình: thuộc [data-layer](../platform/data-layer.md) và các trang storefront |
| Form banner (ảnh theo cỡ màn hình, chữ, nút), form vận chuyển và đổi trả, form tỷ giá | Chọn và tải ảnh: thuộc [ui-kit](../platform/ui-kit.md) (`ImageUrlField`) |
| Quyền `SITE_CONFIG_UPSERT` trên nút Sửa | Chặn người không phải admin: thuộc [admin-shell](./admin-shell.md); không có nút xóa hay đưa về mặc định ở bất kỳ loại nào |

## 3. Hợp đồng

- **Tải.** Khi mở: `GET /api/admin/site-config/keys` (khóa BE biết) và `GET /api/admin/site-config` (giá trị đã lưu), một lần mỗi loại. Gộp thành dòng `{key, type, config|null}`. Trong lúc tải danh sách hiện dòng "đang tải". Chỉ loại có form (banner, vận chuyển, tỷ giá) và có ít nhất một khóa mới có tab, theo thứ tự đó; chỉ một loại thì không có thanh tab. Danh sách đã lưu không tải được thì mọi khóa hiện như chưa cấu hình.
- **Thẻ.** Mỗi khóa một thẻ: tên và mô tả theo bản dịch (khóa lạ hiện tên thô, không mô tả), dòng trạng thái do loại quyết định (banner: "Trống" hoặc "Đã cấu hình — N banner", giá trị hỏng đếm 0; vận chuyển: "Đã cấu hình" hoặc "Đang dùng giá trị mặc định"; tỷ giá: không có dòng) với chấm xanh khi đã lưu. Nút Sửa cần `SITE_CONFIG_UPSERT` và mở form của loại, lấy tên khóa làm tiêu đề.
- **Banner.** Mỗi banner: ảnh máy tính (bắt buộc), ảnh máy tính bảng, ảnh điện thoại, nhãn, tiêu đề, phụ đề, nhãn và link nút. Thêm, xóa, thu gọn từng banner (thu gọn hiện dấu tick cho mỗi ảnh đã có). Thiếu ảnh máy tính (kể cả toàn dấu cách) thì báo và không gửi. Khi lưu, ảnh cho cỡ nhỏ để trống bị bỏ, không còn ảnh nào thì bỏ cả `responsiveImages`. `PUT /api/admin/site-config/:key {value}` với `value` là chuỗi JSON của danh sách; danh sách rỗng được phép (trang storefront dùng nội dung mặc định).
- **Vận chuyển và đổi trả.** Mở bằng giá trị đã lưu; chưa lưu hoặc hỏng thì bằng cấu hình khách đang nhận (`GET /api/shipping`); giá trị đã lưu từ trước khi có chính sách đổi trả mượn chính sách đó từ cấu hình khách nhận, và form chờ nó về rồi mới mở để lưu không đặt lại chính sách về mặc định của BE. Không đọc được gì thì nói "không tải được". Form: ngưỡng miễn phí (VND nguyên, trống = tắt), ba phương thức cố định `standard`, `express`, `store-pickup` (tên, thời gian giao bắt buộc; mô tả; phí từ 0; biểu tượng), chính sách đổi trả (số ngày 1–365, mô tả, điều kiện mỗi dòng một cái, tối đa 10). Kiểm theo đúng luật của BE trước khi gửi, lỗi hiện dưới từng ô cộng một cảnh báo chung và mất khi chạm vào ô. Gửi đúng hình dạng đã lưu (không trường lạ). Sau khi lưu làm mới cache vận chuyển.
- **Tỷ giá.** Một ô số "VND cho 1 USD": chỉ chữ số kèm tối đa 2 số lẻ, không dấu ngăn nghìn, từ 1 đến 1.000.000. Lưu `{"vndPerUsd": n}` rồi làm mới cache vận chuyển (có giá USD).
- **Lỗi.** BE trả 400 mã 1503 thì hiện nguyên lời BE (danh sách trường sai); lỗi khác hiện lời mặc định; form giữ nguyên.

## 4. Thiết kế

```
page.tsx ──► SiteConfigContent ──► FormTabs · registry (_types/registry.tsx) ──► Editor của loại
  BANNER  ──► BannerConfigModal ◄── banner-form.ts
  SHIPPING ──► ShippingConfigModal ◄── shipping-form.ts (+ useShipping)
  CURRENCY ──► ExchangeRateModal ◄── exchange-rate-form.ts
mọi Editor ──► upsertSiteConfig (thunk) ──► authApi · useRefreshShipping
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Registry loại → giao diện** (`CONFIG_TYPE_VIEWS`, `CONFIG_TYPE_ORDER`) | Trang không biết nội dung từng loại; thêm loại = một thư mục và một dòng, không sửa trang | `switch` theo loại trong trang |
| **Mô hình form tách khỏi giao diện** (`*-form.ts`: đọc, kiểm, ghi) | Luật kiểm và hình dạng gửi đi test được như hàm thuần, và khớp BE ở một nơi | Kiểm rải trong component |
| **Form chờ dữ liệu mượn rồi mới mở** | Form chỉ giữ `initial` đầu tiên; mở sớm sẽ làm mất chính sách đổi trả khi lưu | Đồng bộ lại bằng effect |
| **Kiểm trước theo luật của BE, hiện lời của BE khi vẫn bị từ chối** | Admin thấy lỗi ngay ở ô; lỗi hiếm còn lại không mất thông tin | Chỉ dựa vào BE |
| **Quyền riêng cho nút Sửa** (`RoleGuard`) | Người chỉ xem cấu hình không sửa được | Một quyền chung |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit, auth (quyền), data layer (`authApi`, `useShipping`, `useRefreshShipping`). Các form phụ thuộc vào trang chỉ qua kiểu `ConfigEditorProps` trong registry. Storefront đọc cùng khóa qua API công khai; ngược lại không. Kho `siteConfig` giữ khóa, giá trị đã lưu, cờ đang tải và đang cập nhật; lưu xong thay hoặc thêm đúng dòng của khóa đó.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Trang chỉ liệt kê thẻ và mở form; mỗi loại tự lo form và luật của nó |
| O | Thêm loại cấu hình = thêm thư mục `_types/<loại>/` và một dòng registry |
| L | Mọi `Editor` nhận cùng `ConfigEditorProps` |
| I | `Editor` chỉ nhận khóa, tiêu đề, giá trị đã lưu và `onClose` |
| D | Form phụ thuộc thunk và hook, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `admin.siteConfig`; tiền qua `VndInput` và `maskVndInput`/`parseVndInput`; lỗi qua `useErrorMessage`; toast qua `useToast`. Test dùng `renderApp` với danh tính thật, `adminWith(...)` cho một quyền và `siteConfigApi` (BE giả: khóa, giá trị, lưu, `GET /api/shipping`) trong `site-config-kit.tsx`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì không lộ cấu hình nào; việc chặn trang thuộc admin-shell) · permission = có (nút Sửa cần `SITE_CONFIG_UPSERT`)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ASC-1 | Thẻ: dòng đang tải, hỏi khóa và giá trị một lần, tab theo loại theo thứ tự, chỉ một loại thì không tab, loại không có editor không có tab, khóa lạ hiện tên thô | đúng | admin đủ quyền | component | `tests/admin/site-config/site-config-page.test.tsx` |
| ASC-2 | Dòng trạng thái: banner trống hay N banner (giá trị hỏng = 0), vận chuyển đã cấu hình hay mặc định, tỷ giá không có dòng; chấm xanh hay xám | đúng | admin đủ quyền | component | `tests/admin/site-config/site-config-page.test.tsx` |
| ASC-3 | Nút Sửa chỉ với quyền ghi cấu hình và mở đúng form theo loại với tên khóa làm tiêu đề; tiếng Anh | đúng | admin thiếu quyền | component | `tests/admin/site-config/site-config-page.test.tsx` |
| ASC-3E | Khóa không tải được thì không có thẻ; giá trị đã lưu không tải được thì mọi khóa như chưa cấu hình; BE từ chối khách (401) | lỗi | khách | component | `tests/admin/site-config/site-config-page.test.tsx` |
| ASC-3U | BE từ chối người mua đã đăng nhập (403): không lộ thẻ nào | lỗi | user | component | `tests/admin/site-config/site-config-page.test.tsx` |
| ASC-4 | Đọc giá trị banner đã lưu (hỏng hoặc không phải danh sách = rỗng); banner mới trống | đúng | — | unit | `tests/admin/site-config/banner-config.test.tsx` |
| ASC-5 | Form banner: mở với banner đã lưu, thêm, xóa đúng banner, thu gọn và tick, sửa mọi trường, ảnh máy tính bắt buộc, bỏ ảnh cỡ nhỏ trống, lưu đúng khóa, danh sách rỗng, nút khóa | đúng | admin đủ quyền | component | `tests/admin/site-config/banner-config.test.tsx` |
| ASC-5E | Form banner: thiếu ảnh máy tính thì báo và không gửi; bị từ chối thì lời BE hoặc mặc định, form giữ nguyên | lỗi | admin đủ quyền | component | `tests/admin/site-config/banner-config.test.tsx` |
| ASC-6 | Mô hình form vận chuyển: đọc giá trị lưu và cấu hình khách nhận, kiểm từng luật (ngưỡng, tên, thời gian, mô tả, phí, số ngày, mô tả đổi trả, điều kiện), ghi đúng hình dạng đã lưu và đọc lại được | đúng | — | unit | `tests/admin/site-config/shipping-form.test.ts` |
| ASC-8 | Form vận chuyển và đổi trả: mở bằng giá trị lưu hoặc cấu hình khách nhận, mượn chính sách đổi trả và chờ nó, nhập tiền có nhóm chấm, kiểm trước khi lưu, gửi đúng hình dạng, làm mới cache, nút khóa | đúng | admin đủ quyền | component | `tests/admin/site-config/shipping-config.test.tsx` |
| ASC-8E | Form vận chuyển: không tải được cấu hình thì nói vậy; bị từ chối thì lời BE (danh sách trường sai) hoặc mặc định, form giữ nguyên | lỗi | admin đủ quyền | component | `tests/admin/site-config/shipping-config.test.tsx` |
| ASC-7 | Mô hình và form tỷ giá: đọc giá trị, luật số và khoảng, ghi đúng, làm mới cache, nút khóa | đúng | admin đủ quyền | component | `tests/admin/site-config/exchange-rate.test.tsx` |
| ASC-7E | Tỷ giá sai thì báo dưới ô và không gửi; bị từ chối thì lời BE hoặc mặc định, form giữ nguyên | lỗi | admin đủ quyền | component | `tests/admin/site-config/exchange-rate.test.tsx` |
| ASC-9 | Kho Redux và registry: khóa, giá trị, thêm hoặc thay đúng dòng khi lưu, cờ bận và lỗi, ba loại có form theo thứ tự | đúng | — | unit | `tests/admin/site-config/site-config-slice.test.ts` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Giá trị đã lưu không tải được thì mọi khóa trông như chưa cấu hình | Admin có thể lưu đè lên cấu hình thật khi chỉ mở được danh sách khóa (ASC-3E); cần cân nhắc báo lỗi tải thay vì thẻ "Trống" |
| Form vận chuyển mở sớm làm mất chính sách đổi trả khi lưu | Đã sửa: form chờ chính sách mượn về rồi mới mở (ASC-8) |
| Luật kiểm lệch với BE | Kiểm theo đúng luật BE; vẫn bị từ chối thì hiện nguyên lời BE (ASC-8E, ASC-7E) |
| Tỷ giá đổi nhưng giá USD cũ còn trong cache | Sau khi lưu tỷ giá và vận chuyển, cache vận chuyển được làm mới (ASC-7, ASC-8) |

Thay đổi nhìn thấy được: lưu cấu hình vận chuyển đã lưu từ trước khi có chính sách đổi trả không còn đặt lại chính sách đó.

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 5), kiểm thử đột biến. Sửa `ShippingConfigModal`: form chờ chính sách đổi trả mượn từ cấu hình khách nhận về rồi mới mở. Bỏ hàm `isMethodId` không ai dùng.
