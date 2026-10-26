# Design system (token, font, style toàn cục) — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-26 · **Trạng thái:** Implemented
> **Doc:** [platform/design-system](../../docs/platform/design-system.md) · **Test:** `tests/platform/design-system/`

## 1. Bối cảnh & mục tiêu

Design system là hai file CSS mà mọi component dựa vào: bảng token (`src/styles/design-system.css`: màu, chữ, khoảng cách, bo góc, bóng, chuyển động, z-index, khung rộng trang) và style toàn cục (`src/app/globals.css`: thang co giãn của `html`, cột trang, keyframes, class của drawer / menu, ẩn con trỏ hệ thống). Đây là CSS, không có hàm để gọi, nên không có hành vi để dựng trong jsdom (kiểu "bấm nút thì …"); thứ sai ở đây là một lời hứa bị vỡ: component dùng `var(--token)` chưa ai định nghĩa (nền trong suốt, viền biến mất), keyframes bị đổi tên làm animation im lặng chết, một token đổi giá trị làm lệch cả site. Vì vậy test đọc chính các file và kiểm các lời hứa đó; phần còn lại của mô-đun (giao diện nhìn thấy) thuộc kiểm tra bằng mắt ở từng trang, không có test tự động.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho không áp dụng (file CSS, không đọc phiên), kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Mọi `var(--x)` trong `src/` đều có định nghĩa; alias trong bảng token trỏ tới token có thật; không định nghĩa trùng; bảng màu viết bằng hex | Giao diện nhìn thấy (màu có đẹp không, khoảng cách có hợp không): xem bằng mắt từng trang, không có test |
| Giá trị mà component dựa vào: khung rộng 1920 px, cỡ chữ rem, lưới khoảng cách, bậc z-index, bậc chuyển động, breakpoint Tailwind không bị ghi đè | Hằng số của riêng từng trang (nằm trong module của trang) |
| Dark context chỉ đổi token có thật; thang co giãn `html`; cột trang; keyframes dùng tới đều có; `prefers-reduced-motion` | Hiệu ứng thật của animation (cần trình duyệt): ngoài phạm vi test jsdom |
| Con trỏ tùy biến chỉ ẩn con trỏ hệ thống khi bật; file font và 3 ảnh con trỏ có mặt | Nội dung ảnh trong `public/` và `src/assets/` |

## 3. Hợp đồng

- **Token.** Mọi `var(--x)` không có giá trị dự phòng đều có định nghĩa ở bảng token, ở `globals.css`, hoặc do component đặt (`style={{ "--x": … }}`, `[--x:…]`); riêng `--font-site` do `next/font` đặt lúc chạy. Alias trong bảng token trỏ tới token có trong `:root`. Không token nào định nghĩa hai lần trong `:root`. Mọi `--color-*` là hex 6 chữ số.
- **Giá trị.** `--page-max-w: 1920px`; `--page-edge` tính từ nó; cỡ chữ `--text-xs … 3xl` bằng rem (0,6875 … 2,625); lưới khoảng cách 4 px (rem); `--radius-pill: 9999px`; một typeface (`--font-primary` và `--font-display` cùng trỏ `--font-site`); z-index 0 / 10 / 12 / 20 / 50 / 100 / 200; chuyển động 150 / 300 / 600 / 1000 / 1200 ms; không có `--breakpoint-*` hay `@theme` trong `src/`.
- **Dark context.** `[data-theme="dark"]` và `.dark-context` chỉ ghi đè token có trong `:root`; nền chuyển sang noir, chữ sang kem.
- **Thang trang.** `html { font-size: clamp(1rem, 1.0417vw, 1.25rem) }`; `body` rộng tối đa `--page-max-w`, căn giữa; `html, body` ẩn cuộn ngang, lấy chữ từ token, không giả in đậm.
- **Animation.** Mọi tên animation dùng trong CSS hoặc class `animate-[…]` đều có `@keyframes`; các keyframes của vỏ ứng dụng, giỏ, danh sách có mặt; `prefers-reduced-motion` tắt chuyển động của drawer, mega menu, avatar và thẻ bộ sưu tập; ảnh admin và ảnh con trỏ không bị fade.
- **Con trỏ và font.** `html.custom-cursor-active` mới ẩn con trỏ hệ thống; file font mà layout nạp có thật; ba ảnh con trỏ có trong `public/cursor/`.

## 4. Thiết kế

```
design-system.css (token, dark context) ──► globals.css (@import, thang trang, keyframes, class chung) ──► mọi component qua var(--token)
layout.tsx (next/font) ──► --font-site
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Kiểm bằng cách đọc nguồn thay vì dựng giao diện**: test duyệt `src/` và so khớp với bảng token | Lời hứa của file CSS là sự nhất quán giữa các file (token dùng ↔ token có); đọc nguồn bắt được lỗi này rẻ và chắc hơn ảnh chụp | Ảnh chụp màn hình (chậm, dễ vỡ, cần trình duyệt) |
| **Một nguồn sự thật cho token** (`design-system.css`), component chỉ dùng `var(--token)` | Đổi một giá trị là đổi cả site; test canh để giá trị cốt lõi không đổi vô ý | Hex viết cứng trong component |

### Kiến trúc

`globals.css` import bảng token; mọi component phụ thuộc xuống hai file này, không có chiều ngược lại. Test không nhập module nào của `src/`, chỉ đọc file.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Bảng token chỉ giữ giá trị; `globals.css` chỉ giữ style toàn cục và keyframes |
| O | Thêm token = thêm một dòng ở `:root`; component dùng tiếp, không sửa chỗ khác |
| L | — |
| I | — |
| D | Component phụ thuộc tên token (hợp đồng), không phụ thuộc giá trị |

### Conventions

Test đọc file bằng `node:fs` từ gốc repo; các biểu thức chính quy tách khối quy tắc theo bộ chọn; token đặt lúc chạy (`--font-site`) nằm trong một danh sách ghi rõ.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (file CSS, không đọc phiên) · permission = không (file CSS, không có quyền)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| DSN-1 | Mọi `var(--x)` có định nghĩa; alias trỏ đúng; không định nghĩa trùng; bảng màu là hex — bắt token thiếu | lỗi | — | unit | `tests/platform/design-system/design-tokens.test.ts` |
| DSN-2 | Giá trị cốt lõi: khung 1920 px, cỡ chữ, khoảng cách, bo góc, typeface, z-index, chuyển động, breakpoint | đúng | — | unit | `tests/platform/design-system/design-tokens.test.ts` |
| DSN-3 | Dark context chỉ đổi token có thật; nền noir, chữ kem | đúng | — | unit | `tests/platform/design-system/design-tokens.test.ts` |
| DSN-4 | Thang trang: clamp của `html`, cột trang, ẩn cuộn ngang, không giả in đậm | đúng | — | unit | `tests/platform/design-system/design-tokens.test.ts` |
| DSN-5 | Animation: mọi tên đều có keyframes, `prefers-reduced-motion`, ảnh không fade | đúng | — | unit | `tests/platform/design-system/design-tokens.test.ts` |
| DSN-6 | Con trỏ chỉ ẩn khi bật, file font và ảnh con trỏ có mặt | đúng | — | unit | `tests/platform/design-system/design-tokens.test.ts` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Trước đây hai token chưa từng được định nghĩa: `--border-medium` (thanh kéo của `QuickAddDrawer` và `SizeGuideModal`, nên thanh kéo vô hình) và `--color-warm-white` (nền khung ảnh ở `BrandStory`) | Đã sửa: dùng `--border-default` và `--color-pearl-cream`; test DSN-1 canh lỗi này |
| Quy tắc "không dùng hex viết cứng" không được kiểm tự động (còn nhiều chỗ ở `HamburgerMenu`, v.v.) | Chưa có test; chỉ review |
| Màu sắc, khoảng cách và bố cục thật chỉ kiểm được bằng mắt | Ngoài phạm vi test tự động |
| Kiểm animation chỉ bảo đảm keyframes tồn tại, không bảo đảm chạy đúng | Hành vi thật nằm ở test của từng module có animation |

Thay đổi nhìn thấy được: thanh kéo của `QuickAddDrawer` / `SizeGuideModal` hiện ra; khung ảnh ở trang About có nền kem.

## 8. Lịch sử thay đổi

- 2026-10-26 · Viết spec và test cho toàn module (batch 8): kiểm token đọc từ nguồn, kiểm thử đột biến trên hai file CSS; sửa hai token chưa định nghĩa (`--border-medium`, `--color-warm-white`).
