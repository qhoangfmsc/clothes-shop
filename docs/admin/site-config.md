# Site config (cấu hình banner & phí vận chuyển)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/site-config` · **Cập nhật:** 2026-10-13
> **Code:** `(admin)/admin/site-config/` — `SiteConfigContent.tsx`, `_common/{moduleSlice,types}.ts`, `_types/registry.tsx`, `_types/banner/{BannerConfigModal.tsx,banner-form.ts}`, `_types/shipping/{ShippingConfigModal.tsx,shipping-form.ts}` · `src/types/site-config.ts` · `src/hooks/use-api.ts` (`useBannerConfig`) · `shop/_lib/server-fetchers.ts` (`getBannerConfig`)
> **i18n:** `admin.siteConfig`
> **Redux slice:** `state.siteConfig`

## 1. Tóm tắt module

Nơi admin cấu hình nội dung có thể thay đổi của storefront dưới dạng cặp khóa → giá trị. Hai loại khóa: `BANNER` (danh sách banner: ảnh desktop/tablet/mobile + chữ + nút kêu gọi) và `SHIPPING` (khóa `SHIPPING_CONFIG`: phí vận chuyển + ngưỡng miễn phí vận chuyển).

## 2. Phục vụ gì / việc cần làm

Cho admin đổi phí vận chuyển và ngưỡng miễn phí mà không cần deploy, và đổi hình hero của trang Shop, New In, Collections và panel nổi bật trong burger menu mà không cần deploy lại. Nếu chưa cấu hình, storefront tự dùng nội dung mặc định của chính nó.

## 3. Submodule & chức năng hiện có

| Chức năng | Mô tả |
|---|---|
| Tab theo loại | Mỗi loại cấu hình một tab (`Banner`, `Vận chuyển & đổi trả`), chỉ hiện loại có editor và có khóa; tab đầu tiên mở sẵn |
| Lưới thẻ khóa | Trong tab: mỗi khóa BE biết thuộc loại đó là một thẻ: tên, mô tả, trạng thái (do loại quyết định: số banner / đã cấu hình / dùng mặc định) |
| Sửa banner | Modal chỉnh danh sách banner: thêm/xóa, thu gọn/mở rộng từng banner |
| Ảnh responsive | Mỗi banner có ảnh desktop (bắt buộc) + tablet + mobile (tùy chọn) |
| Sửa phí vận chuyển | Modal riêng cho `SHIPPING_CONFIG`: ngưỡng miễn phí + 3 phương thức cố định (standard, express, store-pickup) |
| Xóa cấu hình | Đưa khóa về trạng thái chưa cấu hình (với phí vận chuyển: BE quay về giá trị mặc định) |
| Quyền | Sửa cần `SITE_CONFIG_UPSERT`; xóa cần `SITE_CONFIG_DELETE`; vào mục cần `SITE_CONFIG_VIEW` |

## 4. Chi tiết

### 4.1 Khóa (`src/types/site-config.ts`)

| Khóa | Nơi dùng ở storefront |
|---|---|
| `SHOP_HERO_BANNERS` | Hero trang `/shop` |
| `NEW_IN_HERO_BANNERS` | Hero trang `/new-in` |
| `COLLECTIONS_HERO_BANNERS` | Hero trang `/collections` |
| `NAV_MENU_BANNERS` | Panel nổi bật trong burger menu |
| `SHIPPING_CONFIG` | Phí vận chuyển ở checkout / trang sản phẩm (`GET /api/shipping`) và phí BE tính khi tạo đơn — xem 4.5 |

Mỗi khóa gắn đúng một loại (`SITE_CONFIG_KEY_TYPE`; loại có `BANNER`, `TEXT`, `SHIPPING`, hiện chưa có khóa `TEXT`); BE tự suy `type` từ khóa. `value` luôn là chuỗi `JSON.stringify` mà BE không diễn giải; FE parse theo loại. Nhãn/mô tả từng khóa ở `admin.siteConfig.keys.<KEY>.label|description` — khóa chưa có bản dịch hiện tên thô.

### 4.2 Tải dữ liệu

Khi mount (một lần, có chống chạy đôi của React Strict Mode): `fetchSiteConfigKeys` → `GET /api/admin/site-config/keys` (danh sách khóa BE biết) và `fetchSiteConfigList` → `GET /api/admin/site-config`. Hai kết quả được gộp thành `SiteConfigRow { key, type, config | null }`; trang nhóm các dòng theo `type` để dựng tab.

### 4.2b Cấu trúc theo loại (`_types/`)

Mỗi loại cấu hình có thư mục riêng chứa form và logic của nó (`_types/banner/`, `_types/shipping/`); `_types/registry.tsx` là nơi duy nhất nối loại với giao diện: `CONFIG_TYPE_VIEWS[type] = { Editor, Summary, deleteMessage }` và `CONFIG_TYPE_ORDER` (thứ tự tab). `Editor` nhận `ConfigEditorProps { configKey, title, savedValue, onClose }` và tự lưu bằng `upsertSiteConfig`; `Summary` vẽ dòng trạng thái của thẻ. `SiteConfigContent` không biết gì về nội dung từng loại: chỉ liệt kê khóa của tab đang chọn, mở `Editor` của loại đó, và hỏi xác nhận xóa (kèm làm mới cache phí vận chuyển khi xóa khóa `SHIPPING`). Thêm loại mới = một thư mục trong `_types/` + một dòng trong registry + khóa dịch `types.<TYPE>` và `keys.<KEY>`. Loại có khóa nhưng chưa có editor (hiện là `TEXT`) không có tab.

### 4.3 Form banner (`_types/banner/BannerConfigModal.tsx`)

- Mỗi banner (`BannerItem`): `image` (desktop, bắt buộc, có hint), `responsiveImages.tablet` (≥ 640 px), `responsiveImages.mobile` (< 640 px), `label`, `title`, `subtitle`, `ctaLabel`, `ctaHref` (placeholder `/shop`). Ảnh nhập qua `ImageUrlField` (dán URL hoặc upload).
- Banner có thể thu gọn (header hiển thị dấu ✓ cho các ảnh desktop/tablet/mobile đã có); xóa từng banner bằng nút X; nút "Thêm banner" thêm `EMPTY_BANNER_ITEM`.
- Lưu: nếu có banner thiếu ảnh desktop → toast `desktopRequired`. Trước khi lưu, các ảnh responsive rỗng bị loại; nếu không còn ảnh nào thì bỏ hẳn `responsiveImages`. `upsertSiteConfig` → `PUT /api/admin/site-config/:key` với `{ value }`.
- Xóa: xác nhận rồi `DELETE /api/admin/site-config/:key`. Lỗi lưu/xóa dịch qua `useErrorMessage`.

### 4.4 Cách storefront dùng giá trị

- Server: `getBannerConfig(key)` (ISR 60 s), client: `useBannerConfig(key)` — luôn trả mảng, lỗi hoặc rỗng → `[]` để component dùng nội dung mặc định.
- Ảnh được chọn theo breakpoint bằng `resolveBannerImage` (mobile → tablet → desktop) và render bằng `ResponsiveBannerImage` / `BannerFade` — xem [ui-kit](../platform/ui-kit.md) 4.6.

### 4.5 Phí vận chuyển (`SHIPPING_CONFIG`, `ShippingConfigModal`)

- Thẻ của khóa hiện "Đã cấu hình" hoặc "Đang dùng giá trị mặc định" (chưa có dòng trong DB). Bấm Sửa mở `ShippingConfigModal` thay vì modal banner; nút Sửa cần `SITE_CONFIG_UPSERT`.
- Giá trị ban đầu của form: `value` đã lưu (parse bằng `parseShippingValue`); nếu chưa lưu hoặc hỏng thì lấy cấu hình khách đang nhận từ `useShipping()` (`GET /api/shipping`, `shippingInfoToForm`) — FE không hardcode mức phí nào. Chưa tải được cả hai → thông báo lỗi tải.
- Form (`_types/shipping/shipping-form.ts`): `freeShippingThreshold` (để trống = `null` = tắt miễn phí vận chuyển; có giá trị thì > 0, tối đa 2 chữ số thập phân; áp dụng cho cả 3 phương thức) và đúng 3 phương thức `standard`, `express`, `store-pickup` (`SHIPPING_METHOD_IDS` từ `src/types/shipping.ts`; không thêm/xóa, `id` chỉ đọc, hiện dạng chip). Mỗi phương thức: `name` (bắt buộc, ≤ 100), `estimatedDays` (bắt buộc, ≤ 100), `description` (≤ 255, được trống), `price` (≥ 0, tối đa 2 chữ số thập phân), `icon` ∈ `truck | express | store`. Số tiền cùng đơn vị với giá sản phẩm; tối đa 99.999.999. Form còn có nhóm **Chính sách đổi trả** (`returnPolicy`, khớp BE): `days` (số nguyên 1–365, bắt buộc), `description` (≤ 500, được trống), `conditions` (mỗi dòng một điều kiện, tối đa 10 dòng, mỗi dòng ≤ 255). Giá trị ban đầu lấy từ `value` đã lưu; dòng lưu từ trước khi có chính sách đổi trả thì lấy theo `GET /api/shipping`, để lưu không đặt lại chính sách về mặc định của BE. `GET /api/shipping` là nơi khách đọc (trang sản phẩm).
- Lưu: `validateShippingForm` kiểm tra các quy tắc trên (lỗi hiện dưới từng trường, toast `shipping.toast.invalid`); hợp lệ thì `serializeShippingForm` tạo đúng `{ freeShippingThreshold, methods: [{ id, name, description, estimatedDays, price, icon }] }` (không field lạ) và `upsertSiteConfig` → `PUT /api/admin/site-config/SHIPPING_CONFIG` với `{ value }` (chuỗi JSON). Thành công: `useRefreshShipping()` làm mới cache, toast `toast.saved`, đóng modal. BE trả 400 mã 1503 → toast hiện nguyên `message` của BE (liệt kê từng lỗi, không có bản dịch theo mã); 403 → lỗi chung qua `useErrorMessage`.
- Xóa: xác nhận riêng (`confirmDelete.shippingMessage`), rồi `DELETE`, và làm mới cache shipping.
- Thay đổi chỉ áp dụng cho đơn tạo sau đó; đơn cũ giữ nguyên phí.
