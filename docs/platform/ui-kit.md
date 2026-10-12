# UI kit (component & hook dùng chung)

> **Nhóm:** Platform · **Cập nhật:** 2026-10-12
> **Code:** `src/app/[locale]/_components/` · `src/hooks/` · `src/lib/product-badge.ts` · `src/lib/product-purchase.ts`
> **Quy tắc dùng:** `.agent/rules/components.md`

## 1. Tóm tắt module

Bộ khối giao diện và hook được ≥ 2 module dùng chung: bảng dữ liệu admin, form modal admin, toast, hộp xác nhận, carousel, ô nhập ảnh, lightbox, banner responsive, checkbox, JSON-LD… Component riêng của một module nằm trong `_components/` của module đó, không ở đây (xem [site-chrome](./site-chrome.md) cho header/footer/menu).

## 2. Phục vụ gì / việc cần làm

- Mọi màn danh sách admin dùng chung một `DataTable` (tìm kiếm, lọc, sắp xếp, phân trang, chọn nhiều, kéo thả đổi thứ tự).
- Mọi form admin dùng chung `AdminFormKit` (modal có header/footer cố định, tab, field).
- Mọi phản hồi (toast, confirm, prompt mật khẩu) đi qua provider mount ở root layout, gọi bằng hook.
- Mọi carousel/slider/banner xoay dùng chung một cài đặt để hành vi đồng nhất (autoplay, loop, kéo chuột, phím, reduced-motion).

## 3. Submodule & chức năng hiện có

| Nhóm | Thành phần | File |
|---|---|---|
| Bảng admin | `DataTable` | `DataTable.tsx` |
| Form admin | `ModalShell`, `ModalBody`, `FormTabs`, `FormSection`, `FormField`, `FormActions`, `InfoHint`, `inputClass` | `AdminFormKit.tsx` |
| Phản hồi | `ToastProvider` + `useToast`, `ConfirmProvider` + `useConfirm`, `SystemPasswordPromptProvider` | `Toast.tsx`, `ConfirmDialog.tsx`, `SystemPasswordPrompt.tsx` |
| Phân quyền UI | `RoleGuard`, `AdminGuard` | `RoleGuard.tsx` (xem [auth](./auth.md)) |
| Ảnh | `ImageUrlField`, `ImageListField`, `ImagePreviewLightbox` | cùng tên `.tsx` |
| Carousel | `Carousel`, `CarouselDots`, `CarouselArrow`, `useAutoAdvance` | `Carousel.tsx`, `CarouselControls.tsx`, `src/hooks/use-auto-advance.ts` |
| Banner | `ResponsiveBannerImage`, `BannerFade`, `useBannerRotation` | cùng tên |
| Khác | `Checkbox`, `JsonLd`, `SocialIcons`, `Logo`, `OrderDetailPanel`, `ProductBagButton` | cùng tên |
| Hook | `useSortOptions`, `useDebounce`, `useBreakpoint`, `useAutoAdvance`, `useBannerRotation`, `useAuthAction` | `src/hooks/` |
| Helper sản phẩm | `getPurchaseMode`, `isPurchasable`, `buildOrderInquiryHref`, style badge | `src/lib/product-purchase.ts`, `product-badge.ts` |

## 4. Chi tiết

### 4.1 `DataTable<T>`

Hai chế độ:

- **Server mode** (`fetchData`): gọi khi mount và mỗi khi đổi search/filter/sort/page. `fetchData(params: { search, filters, sort, page, limit }) => Promise<{ data, total }>`. Có "in-flight guard" chống gọi trùng (StrictMode, đổi tham số nhanh); đổi tham số khi đang gọi thì xếp hàng gọi lại với tham số mới.
- **Static mode** (`rows`, `loading`): không fetch/search/filter/sort, chỉ dùng khung bảng (Dashboard "Recent orders").

Props: `columns` (`key, header, width, align, hideBelow: sm|md|lg, render`), `searchable` (mặc định true), `searchPlaceholder`, `filters` (`key, label, options, defaultValue`), `sortOptions` (`value, label`), `defaultSort` (mặc định `-createdAt`), `pageSize` (mặc định 25, kẹp tối đa 200), `reorder`, `keyExtractor` (mặc định `row.id`), `selectable` + `renderBulkActions({ keys, rows, clear })`, `onError`, `emptyMessage` (chuỗi hoặc hàm theo `hasActiveFilters`), `tableRef` (`refresh()`, `reset()`).

Hành vi: ô tìm kiếm debounce 350 ms; phân trang có dấu "…" (giữ trang đầu, cuối và ±1) và chỉ hiện khi `total > pageSize`; chọn nhiều có checkbox tổng ba trạng thái và giữ lại chỉ các dòng còn hiện sau khi đổi trang/lọc/xóa; kéo thả (`@dnd-kit`) chỉ bật khi đang sắp xếp theo `reorder.sortValue`, không lọc/tìm, và toàn bộ danh sách nằm trên một trang — hàm `onReorder(rows)` nhận danh sách đầy đủ theo thứ tự mới và **ném lỗi để bảng khôi phục**. Cột có thể ẩn theo breakpoint. Chuỗi nằm ở `admin.components.dataTable`.

Quy ước: sort theo BE (`field` / `-field`); không thêm hành vi riêng của một bảng vào `DataTable` — thêm prop tùy chọn tổng quát.

### 4.2 `AdminFormKit`

- `ModalShell({ title, onClose, maxWidthClass = "max-w-160" })`: overlay (`z-100`), click nền để đóng, header + nút đóng cố định, phần dưới là cột flex có chiều cao giới hạn (`max-h-[85vh]`) — chỉ `ModalBody` cuộn nên tab ở trên và footer ở dưới luôn hiện.
- `ModalBody`, `FormTabs({ tabs, active, onChange })`, `FormSection({ title? })` (fieldset), `FormField({ label, info?, required? })` (dấu `*` đỏ, `InfoHint` hiện tooltip khi hover/focus), `FormActions({ onCancel, isSaving, submitLabel, savingLabel? })` (nút Hủy + submit, khóa khi đang lưu), `inputClass` (chuỗi class input chuẩn).
- Chuỗi: `admin.components.formKit` (`close`, `cancel`, `saving`).
- Mẫu dùng: `<ModalShell><FormTabs/><form><ModalBody>…</ModalBody><FormActions/></form></ModalShell>`.

### 4.3 Toast, Confirm

- `useToast().toast` → `success | error | info | warning (message, duration=3000)`, `dismiss(id)`, `dismissAll()`. Provider gắn ở root với `position="bottom-center"`, `maxToasts = 5` (vượt thì bỏ cái cũ nhất). `message` là `ReactNode` nên dùng được `t.rich(...)`. Text phải đến từ i18n (luật `toast-i18n`).
- `useConfirm()` → `confirm({ title?, message, confirmLabel?, cancelLabel?, danger? }) => Promise<boolean>`; thay cho `window.confirm`. Layer `z-200`. Cách dùng toast/confirm/lỗi chuẩn: `.agent/skills/06-errors-and-toasts.md`.

### 4.4 Ảnh

- `ImageUrlField({ value, onChange, placeholder? })`: ô nhập URL + nút upload (`uploadMediaFile`) + xem trước (lightbox); lỗi preview được bắt. Dùng ở Categories (hero), Collections (ảnh bìa), Site config (ảnh banner).
- `ImageListField({ value: string[], onChange })`: lưới ảnh + ô "+" upload nhiều file + nhập URL tay; ảnh đầu tiên là thumbnail chính. Dùng ở Products.
- `ImagePreviewLightbox({ open, onClose, caption?, children })`: overlay toàn màn hình qua portal; caller truyền thẻ `<img>`.
- Chuỗi: `admin.components.imageFields`.

### 4.5 Carousel

`Carousel` là carousel duy nhất của dự án (con trực tiếp = từng slide). Mặc định bật: chấm, mũi tên, kéo chuột, autoplay 5000 ms, loop vô hạn (nhân bản slide hai đầu). Props: `ariaLabel` (bắt buộc), `slidesPerView` (1, 1.25, 2, 2.5, 3, 4, 5, 6; có thể theo breakpoint `{ base, sm, lg }`), `gap` (0, 2, 3, 4, 5, 6), `arrows` (`true|"hover"|false`), `dots` (`true|"overlay"|false`), `arrowsTone`/`dotsTone` (`onImage|onSurface`), `autoplay`, `loop`, `draggable`, `keyboard`, `fill`, `className`, `slideClassName`, `carouselRef` (`next`, `prev`, `scrollToPage`), `onPageChange`. Giá trị `slidesPerView`/`gap` mới phải thêm vào cả kiểu và bảng class ở đầu file (Tailwind cần class literal). Chuỗi: `shared.carousel`.

`useAutoAdvance(ref, { enabled, intervalMs, onAdvance, pauseOnHover })` là nơi duy nhất được dùng `setInterval`; tạm dừng khi ngoài màn hình, tab ẩn, reduced-motion, có focus bên trong, đang hover, hoặc vừa chạm/cuộn (3 s). Trả về `pause()`.

### 4.6 Banner

- `ResponsiveBannerImage({ banner, alt, ...ImageProps })`: render `<picture>` với `<source media>` cho mobile (<640) và tablet (<1024) chỉ khi ảnh khác nhau; fallback `resolveBannerImage` (mobile → tablet → desktop). Banner không có ảnh riêng cho breakpoint nào thì thu về một `<img>`.
- `BannerFade({ banners, index, sizes, imageOpacity = 0.85, priority = true })`: chồng banner chuyển mờ 0.8 s, lấp đầy parent.
- `useBannerRotation(banners, intervalMs = 5000)` trả `{ ref, index, goTo, count }`, reset về 0 khi mảng banner đổi, không dừng khi hover. Ghép với `CarouselDots`.

### 4.7 Khác

- `Checkbox({ checked, onCheckedChange, indeterminate? })`: input thật được phủ trong suốt lên ô vẽ; phải có `<label>` bọc hoặc `aria-label`.
- `JsonLd({ data })`: nhúng `<script type="application/ld+json">`.
- `SocialIcons({ linkClassName, iconSize, className })`: dựng từ `CONTACT_LINKS` (`src/lib/socials.tsx`): icon Email (`mailto:contact@doovan.vn`, mở cùng tab) rồi tới `SOCIALS` (Instagram `doo_doofairies`, Facebook `doovan.vn`, mở tab mới). `SOCIALS` giữ riêng vì còn dùng cho `sameAs` của JSON-LD.
- `OrderDetailPanel({ order, loading, onClose })`: nội dung chi tiết đơn (trạng thái, ngày, sản phẩm, vận chuyển + địa chỉ, thanh toán, ghi chú). Dùng trong Orders và Users. Chuỗi: `admin.components.orderDetailPanel`.
- `ProductBagButton({ product, variant: icon|text, onAddToBag, className, enabledClassName, iconSize })`: nút giỏ trên thẻ sản phẩm theo badge — `sold_out` khóa; `custom_order` đổi thành nút liên hệ `/contact?product=<id>`; còn lại gọi `onAddToBag`. Chuỗi: `shared.cart.productAction`.
- `useSortOptions(defs)`: đổi `{ value, key }` thành `{ value, label }` với nhãn ở `admin.components.crud.sort`.
- `useBreakpoint()` (`isMobile < 640`, `isTablet 640–1023`, `isDesktop ≥ 1024`) trong `useMediaQuery.ts`.

### 4.8 Quy tắc phân loại sản phẩm theo badge

- `getPurchaseMode(badge)`: `sold_out` → `soldOut`; `custom_order` → `customOrder`; còn lại `cart`. `isPurchasable` = mode `cart`.
- Style badge: `PRODUCT_CARD_BADGE_STYLES` (thẻ sản phẩm), `PRODUCT_DETAIL_BADGE_STYLES` (trang chi tiết), `ADMIN_BADGE_STYLES` (bảng admin).
- `hasPublicPrice(badge)` (`src/lib/product-purchase.ts`): `false` cho `custom_order`; mọi nơi hiện giá sản phẩm ở storefront dùng nó và hiện `common.priceOnRequest` ("Liên hệ để báo giá" / "Price on request") thay giá.
