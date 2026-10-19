# Contact / Custom order (liên hệ đặt may)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]/contact` (`?product=<id sản phẩm>`) · **Cập nhật:** 2026-10-18
> **Code:** `(public)/contact/` — `page.tsx`, `_common/{types,constants,build-order-request}.ts`, `_components/{OrderRequestForm,ProductSummaryCard}.tsx` · `src/lib/product-purchase.ts` (`CONTACT_PATH`, `buildOrderInquiryHref`) · `src/lib/contact.ts` (`CONTACT_EMAIL`, `buildMailto`) · `src/lib/socials.tsx`
> **i18n:** `public.contact`

## 1. Tóm tắt module

Trang đặt hàng may đo (custom order): giải thích quy trình 3 bước và có form để khách mô tả thiết kế riêng của mình. Form không có lựa chọn size/màu có sẵn (mỗi món được làm riêng cho từng khách); nó biến dữ liệu thành một email soạn sẵn (`mailto:`) chỉ dựng khi khách bấm gửi. Không có API nào nhận yêu cầu; trang là Server Component, phần form là Client Component.

## 2. Phục vụ gì / việc cần làm

Sản phẩm gắn badge `custom_order` không vào giỏ được; nút "Đặt hàng" của chúng dẫn về đây kèm id sản phẩm. Khách chọn thông số ngay trên trang và gửi yêu cầu cho shop qua kênh mình thích.

## 3. Submodule & chức năng hiện có

| Khối | Nội dung |
|---|---|
| Hero | Nhãn, tiêu đề, mô tả (`hero.*`) |
| Quy trình | 3 bước: `tell` → `design` → `confirm` (`steps.items.*`) |
| Form yêu cầu (`OrderRequestForm`) | 3 khối theo thứ tự: **Số đo & thời gian** (nhóm "Số đo của bạn" một lưới 3 cột nên các ô cùng rộng: hàng đầu **chiều cao (cm) + cân nặng (kg)**, hàng sau **ngực/eo/mông (cm)**; đều tùy chọn; số lượng 1–`MAX_QUANTITY` (10); ngày cần nhận) · **Thiết kế riêng của bạn** (ô "Yêu cầu thiết kế" lớn, bắt buộc, tối đa `MAX_NOTE_LENGTH` = 1000 ký tự, một dòng gợi ý đính kèm ảnh tham khảo) · **Thông tin của bạn** (họ tên, số điện thoại — bắt buộc). Một nút "Gửi bằng email" |
| Thẻ sản phẩm (`ProductSummaryCard`, cột bên `aside`) | Chỉ hiện khi có sản phẩm; sticky ở màn hình lớn, nằm trên form ở mobile. Ảnh lớn (hàng ảnh nhỏ đè ở đáy ảnh, bấm để đổi ảnh) + badge, danh mục · danh mục con, tên, giá hoặc "Liên hệ để báo giá" (xem cuối mục 4), mô tả (tối đa 3 dòng), **"Chất liệu thiết kế gốc"** kèm dòng nhắc khách có thể ghi chú chất liệu khác |
| Kênh liên hệ trực tiếp | Nút email `CONTACT_EMAIL` (`mailto:` trống), nút hotline `CONTACT_PHONE` (`tel:` + `CONTACT_PHONE_E164`), Instagram, Facebook từ `SOCIALS` (mở tab mới), dòng địa chỉ `CONTACT_ADDRESS` (thẻ `<address>`, link `CONTACT_MAPS_URL` mở hồ sơ Google ở tab mới) + ghi chú thời gian phản hồi |
| Quay lại | Link "Tiếp tục mua sắm" → `/shop` |

## 4. Chi tiết

- `searchParams.product` là id sản phẩm. `loadOrderProduct` gọi `getProductById` (`shop/_lib/server-fetchers.ts`) và rút gọn thành `OrderProduct` (`id, name, sku, priceVnd, priceUsd, originalPriceVnd, originalPriceUsd, badge, images, categoryTitle, subcategoryLabel, description, material, url`; giá lấy nguyên cặp VND/USD của API; phần trăm giảm của thẻ tính từ hai giá VND, không phải số tiền; `url` = `pageUrl(locale, /shop/<category>/<subcategory>/<id>)`, `sku` chỉ đi vào nội dung tin nhắn). Chữ của thẻ nằm ở `public.contact.product.*`. Không có id hoặc id không tồn tại → `product = null`: form vẫn dùng được, không có thẻ sản phẩm và message bỏ khối `PRODUCT`.
- Điểm vào: `ProductBagButton` (thẻ sản phẩm), nút mua ở trang chi tiết sản phẩm và dòng sản phẩm trong giỏ hàng (khi sản phẩm có badge `custom_order`) → `buildOrderInquiryHref(productId)` = `/contact?product=<encodeURIComponent(id)>`.
- `buildOrderRequest(t, { product, values, formatDate })` (`_common/build-order-request.ts`) dựng `{ subject, body }` dạng văn bản thuần (`mailto:` không mang được HTML): lời chào, câu mở đầu, các khối `PRODUCT` / `PERSONALISED DESIGN REQUEST` / `ORDER DETAILS` (số đo, cân nặng, số lượng, ngày cần) / `CONTACT` (tiêu đề in hoa, dòng `  nhãn: giá trị`), lời kết kèm tên. Khối hoặc dòng không có dữ liệu bị bỏ. Chuỗi nằm ở `public.contact.message.*`; ngày hiển thị bằng `format.dateTime(…, "long")`.
- Cân nặng (`values.weight`, chuỗi chỉ gồm số/`.`/`,`, tối đa 5 ký tự) tách khỏi `Measurements` vì đơn vị là kg, không phải cm; vào message thành dòng riêng `message.labels.weight` ("Cân nặng (kg)"), bỏ khi để trống. Chuỗi form: `form.measurements.weight|weightUnit`.
- Kiểm tra khi bấm gửi (`validate`): `note` (yêu cầu thiết kế) và `fullName` không rỗng; số điện thoại có từ `MIN_PHONE_DIGITS` (8) đến `MAX_PHONE_DIGITS` (15) chữ số. Lỗi hiện dưới ô (`form.errors.*`). Chưa hợp lệ thì không mở `mailto:`.
- Gửi email: `window.location.href = buildMailto(subject, body)`. Không có request nào đến BE.
- Email liên hệ `contact@doovan.vn` khai báo một chỗ ở `src/lib/contact.ts` (`CONTACT_EMAIL`); Số hotline (`CONTACT_PHONE` hiển thị, `CONTACT_PHONE_E164` dạng quốc tế) và địa chỉ (`CONTACT_ADDRESS` một dòng, `CONTACT_ADDRESS_PARTS` tách phần cho dữ liệu có cấu trúc, `CONTACT_MAPS_URL` = `GOOGLE_BUSINESS_URL`, link chia sẻ Google Business Profile của DOOVAN, biến `NEXT_PUBLIC_GOOGLE_BUSINESS_URL` ghi đè được) cũng khai báo ở đó. `buildMailto(subject?, body?)` dựng link `mailto:` (mã hóa `%20`, xuống dòng `%0A`).
- Metadata: `public.contact.meta` + `buildAlternates(locale, "/contact")` + `buildSocialMetadata`. Có trong sitemap (`/contact`, 0.8). Trang phụ thuộc `searchParams` nên được render theo yêu cầu.
- Hồ sơ mạng xã hội cấu hình ở `src/lib/socials.tsx` (Instagram `doovan.vn`, Facebook `doovan.vn`).
- Hiện trạng: yêu cầu không được lưu hay gửi từ server; khách dùng app mail của mình để gửi và đính kèm ảnh tham khảo.
- Thẻ sản phẩm không hiện giá khi sản phẩm có badge `custom_order` (hiện `common.priceOnRequest`, `hasPublicPrice`).

- **Đơn vị kích thước:** các số px trong doc này là giá trị ở gốc 16 px; trong code, chiều dài và cỡ chữ của module viết bằng `rem` (class `…-[…rem]`, token `--text-*` / `--space-*`, style inline `"…rem"`) nên lớn dần từ 1536 px tới 1920 px theo thang gốc `html` ([design-system](../platform/design-system.md) 4.3).
