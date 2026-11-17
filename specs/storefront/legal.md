# Legal (điều khoản, bảo mật, vận chuyển & đổi trả) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [storefront/legal](../../docs/storefront/legal.md) · **Test:** `tests/storefront/legal/`

## 1. Bối cảnh & mục tiêu

Ba văn bản pháp lý (điều khoản sử dụng, chính sách bảo mật, vận chuyển & đổi trả) và một trang tổng hợp. Sai ở đây là một văn bản nói sai thời hạn đổi trả, còn sót `{company}` chưa thay, mục đánh số lệch hay trang tổng hợp lọt vào kết quả tìm kiếm. Toàn bộ chữ nằm trong file message; code chỉ đọc cấu trúc (mục và đoạn tìm thấy theo thứ tự trong JSON) và điền thông tin cửa hàng. Module gồm `(public)/legal/` (trang tổng hợp, `LegalPage`, `LegalToc`, `content`, `metadata`), ba trang mỏng `(public)/{terms,privacy,shipping-returns}/page.tsx` và `src/lib/legal.ts`.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách (trang công khai), kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Đọc văn bản từ message: mục, đoạn, danh sách; điền thông tin cửa hàng và thời hạn đổi trả | Cấu hình thời hạn đổi trả: thuộc [admin/site-config](../admin/site-config.md); `getShippingInfo`: thuộc [data-layer](../platform/data-layer.md) |
| Trang đọc một văn bản và trang tổng hợp: tiêu đề, mục lục, mục đánh số, văn bản khác | Liên kết tới văn bản ở footer và đăng nhập: thuộc [site-chrome](../platform/site-chrome.md) |
| Metadata của bốn trang (trang tổng hợp không lập chỉ mục) | Nội dung pháp lý cụ thể (từng điều khoản): chủ cửa hàng viết và duyệt |

## 3. Hợp đồng

- **Đọc văn bản.** `getLegalDocument(locale, doc)` đọc `public.legal.<doc>`: tiêu đề từ `shared.legal`, phần mở đầu, rồi mọi mục theo thứ tự file; trong mục, `title` là tiêu đề, `p1…pN` là đoạn, `l1…lN` là mục danh sách (các `l` liền nhau gộp thành một danh sách). `{company}`, `{email}`, `{phone}`, `{address}` được thay bằng thông tin cửa hàng; `{returnWindow}` là "N ngày" theo `shipping.returnPolicy.days` do admin đặt, hoặc câu "thời hạn ghi ở trang sản phẩm" khi không đọc được hoặc bằng 0 (không bao giờ là con số viết cứng trong file).
- **Trang đọc.** `h1` là tên văn bản, dưới đó phần mở đầu và "Cập nhật lần cuối" (ngày dài, giữa trưa UTC để cùng ngày ở mọi múi giờ); mục lục (liên kết `#<doc>-<mục>` có số); mỗi mục là `h2` đánh số từ 1 với đoạn và danh sách; cuối trang là liên kết tới hai văn bản kia.
- **Trang tổng hợp** (`/legal`). `h1` là tiêu đề chung, ba văn bản liền nhau, mỗi văn bản có `h2` và phần mở đầu, mục là `h3` đánh số lại từ 1; mục lục nhóm theo văn bản; không có danh sách văn bản khác. Metadata có `robots: { index: false, follow: true }` vì lặp lại ba trang đọc.
- **Metadata.** Mỗi văn bản: tiêu đề kết thúc bằng thương hiệu, mô tả của văn bản, `hreflang`, thẻ chia sẻ; trang tổng hợp có tiêu đề và mô tả riêng.
- **Danh sách văn bản** (`LEGAL_DOCS`): điều khoản `/terms`, bảo mật `/privacy`, vận chuyển & đổi trả `/shipping-returns`; trang tổng hợp `/legal`.

## 4. Thiết kế

```
terms · privacy · shipping-returns · legal (server pages) ─► LegalPage (async) ─► getLegalDocument ─► public.legal (messages) + getShippingInfo
                                              └─► LegalToc
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Nội dung nằm trong message, code đọc cấu trúc** | Thêm mục hay đoạn chỉ sửa JSON; khóa `p`/`l` quyết định đoạn hay danh sách | Một component cho mỗi văn bản |
| **Thời hạn đổi trả từ cấu hình của admin** | Văn bản không bao giờ lệch với thứ cửa hàng thật áp dụng | Viết số ngày vào bản dịch |
| **Một `LegalPage` cho cả đọc một văn bản và tổng hợp** | Cùng bố cục, chỉ khác mức tiêu đề và có hay không danh sách văn bản khác | Hai trang riêng |
| **Trang tổng hợp không lập chỉ mục** | Nội dung lặp lại ba trang đọc; tránh trùng lặp trong kết quả tìm kiếm | Lập chỉ mục cả bốn |

### Kiến trúc

Các trang server phụ thuộc xuống `LegalPage` → `content` → `getShippingInfo` (data layer). `src/lib/legal.ts` được footer, trình đơn, đăng nhập, thanh toán và [landing-page](./landing-page.md) dùng lại; ngược lại không.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `content` đọc văn bản, `LegalPage` vẽ, `LegalToc` làm mục lục, `metadata` dựng thẻ |
| O | Thêm văn bản = thêm vào `LEGAL_DOCS`, message và một trang mỏng |
| L | — |
| I | `LegalPage` chỉ nhận ngôn ngữ và danh sách khóa |
| D | Trang phụ thuộc `getLegalDocument`, không phụ thuộc cách đọc message |

### Conventions

Chuỗi qua `public.legal` và `shared.legal`. Các thành phần server không đồng bộ (`LegalPage`, `LegalToc`) được `resolveServerTree` chạy như server rồi mới vẽ bằng `renderApp`; `next-intl/server` được thế bằng `intl-server.ts` (có `getFormatter`).

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (trang nội dung công khai: không có hành động cần đăng nhập) · permission = không (trang công khai)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| LGL-1 | Đọc văn bản: tiêu đề, phần mở đầu, mục theo thứ tự, đoạn và danh sách, điền thông tin cửa hàng, thời hạn đổi trả 14 ngày, tiếng Anh | đúng | khách | integration | `tests/storefront/legal/legal.test.tsx` |
| LGL-1E | Không đọc được cấu hình đổi trả hoặc bằng 0: văn bản nói thời hạn ghi ở trang sản phẩm | lỗi | khách | integration | `tests/storefront/legal/legal.test.tsx` |
| LGL-2 | Trang đọc: tiêu đề, cập nhật lần cuối, mục đánh số, đoạn và danh sách, địa chỉ mục, mục lục, hai văn bản khác, tiếng Anh, báo ngôn ngữ | đúng | khách | integration | `tests/storefront/legal/legal.test.tsx` |
| LGL-3 | Trang tổng hợp: ba văn bản, mục mức ba đánh số lại, mục lục nhóm, không có "chính sách khác", cập nhật lần cuối | đúng | khách | integration | `tests/storefront/legal/legal.test.tsx` |
| LGL-4 | Metadata: tiêu đề và mô tả từng văn bản, `hreflang`, thẻ chia sẻ; trang tổng hợp không lập chỉ mục | đúng | khách | integration | `tests/storefront/legal/legal.test.tsx` |
| LGL-5 | Danh sách văn bản và đường dẫn | đúng | khách | unit | `tests/storefront/legal/legal.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Văn bản pháp lý do chủ cửa hàng viết; test chỉ khóa cấu trúc và việc điền thông tin, không đánh giá nội dung | Ngoài phạm vi kỹ thuật |
| `LEGAL_LAST_UPDATED` phải được sửa cùng chữ mỗi lần văn bản đổi | Ghi chú trong `src/lib/legal.ts`; test khóa việc hiển thị ngày |
| Không đọc được cấu hình đổi trả thì văn bản nói thời hạn ghi ở trang sản phẩm | Hành vi hiện tại (LGL-1) |
| Mục trong file message mà không có khóa `title` sẽ hiện tiêu đề trống | `yarn i18n:check` bảo đảm khóa có ở mọi ngôn ngữ, không bảo đảm có `title` |

Thay đổi nhìn thấy được: không (không đổi hành vi nhìn thấy).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 7), kiểm thử đột biến. Không đổi code của module.
