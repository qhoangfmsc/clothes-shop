# Contact (đặt thiết kế riêng) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [storefront/contact](../../docs/storefront/contact.md) · **Test:** `tests/storefront/contact/`

## 1. Bối cảnh & mục tiêu

Trang liên hệ là cửa vào của đơn đặt may: khách mô tả thiết kế, số đo, số lượng, ngày cần và để lại tên, số điện thoại, rồi FE soạn sẵn một email gửi cho cửa hàng (không có API; không gì rời trình duyệt ngoài `mailto:`). Sai ở đây là một yêu cầu thiếu liên hệ gửi đi, một email mất thông tin sản phẩm, hay một trang cho phép chọn ngày đã qua. Module gồm trang server `page.tsx` (tra sản phẩm theo `?product=`), `_components/{OrderRequestForm,ProductSummaryCard}.tsx`, `_common/{build-order-request,constants,types}.ts` và `src/lib/contact.ts` (hằng số liên hệ và `buildMailto`). Mạng xã hội lấy từ `src/lib/socials.tsx`.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách (trang công khai), kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Trang: các bước, form, kênh liên hệ, tra sản phẩm theo id, metadata | `getProductById`: thuộc [data-layer](../platform/data-layer.md) |
| Form: kiểm tra, số đo, số lượng, ngày, soạn email, gửi bằng `mailto:` | Nút "Đặt hàng" dẫn tới đây: thuộc [shop](./shop.md), [product-detail](./product-detail.md) |
| Thẻ sản phẩm đang đặt: ảnh, badge, giá, giảm giá, mô tả, chất liệu | Danh sách mạng xã hội (`SOCIALS`) dùng chung với footer: thuộc [site-chrome](../platform/site-chrome.md) |

## 3. Hợp đồng

- **Trang.** `?product=<id>` (lấy phần tử đầu nếu có nhiều, cắt khoảng trắng; rỗng hoặc id lạ → không có sản phẩm, form dùng tự do). Sản phẩm biết trước thì hiện thẻ cạnh form và địa chỉ trang sản phẩm (theo ngôn ngữ; thiếu danh mục → `/shop`) đi vào email. Ba bước, form, các kênh: email, điện thoại, từng mạng xã hội (tab mới, `rel=noopener noreferrer`), địa chỉ trên bản đồ (tab mới), ghi chú, link về cửa hàng.
- **Form.** Cần: mô tả thiết kế (≤ 1000 ký tự), họ tên (≤ 80), điện thoại có 8–15 chữ số (đếm chữ số, bỏ ký tự khác; ≤ 20 ký tự). Không bắt buộc: số đo (cao, ngực, eo, mông; chỉ nhận chữ số, dấu chấm, dấu phẩy; ≤ 5 ký tự), cân nặng, số lượng 1–10 (mặc định 1), ngày cần nhận (không trước hôm nay). Thiếu hoặc sai thì báo từng ô và không gửi; ô trắng khoảng trắng coi như trống.
- **Email.** Khi hợp lệ: `window.location.href = mailto:contact@doovan.vn?subject=…&body=…` (khoảng trắng là `%20`). Chủ đề có tên sản phẩm (không có thì chủ đề chung). Thân: lời chào, câu mở, rồi các khối có dữ liệu — SẢN PHẨM (tên, mã, địa chỉ), YÊU CẦU THIẾT KẾ (mỗi dòng thụt 2 chữ), CHI TIẾT ĐƠN HÀNG (số đo `Cao 165 · Eo 66`, cân nặng, số lượng luôn có, ngày cần theo cách viết của ngôn ngữ), LIÊN HỆ — và lời kết kèm tên. Mọi giá trị được cắt khoảng trắng; khối không có dữ liệu bị bỏ.
- **Thẻ sản phẩm.** Ảnh (nhiều ảnh thì có nút xem từng ảnh), badge, "Danh mục · Danh mục con", tên, giá (đặt may: "giá theo yêu cầu"; còn lại có giá gốc gạch ngang và phần trăm giảm làm tròn khi giá gốc cao hơn giá), mô tả, chất liệu kèm lời nhắn rằng đó là chất liệu của thiết kế gốc.

## 4. Thiết kế

```
page.tsx (server) ─► getProductById ─► OrderProduct ─► OrderRequestForm ─► validate ─► buildOrderRequest ─► buildMailto ─► window.location
                                          └─► ProductSummaryCard
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Soạn thư là hàm thuần** (`buildOrderRequest(t, { product, values, formatDate })`) | Nội dung email là phần dễ sai nhất và không cần giao diện để thử; truyền `t` và `formatDate` vào nên dùng được cho cả hai ngôn ngữ | Dựng chuỗi ngay trong component |
| **Không có API, chỉ `mailto:`** | Không cần BE hay chống spam; khách tự xem lại và gửi bằng hộp thư của mình | Form gửi lên server |
| **Sản phẩm tra ở server** | Thẻ và địa chỉ trang sản phẩm có sẵn trong HTML, không nhấp nháy | Tra ở client |
| **Kiểm tra ở một hàm** | Ba luật (mô tả, tên, điện thoại) nằm cạnh nhau, dễ đọc | Kiểm từng ô khi rời ô |

### Kiến trúc

Trang (server) phụ thuộc xuống data layer; form phụ thuộc `build-order-request` (thuần) và `buildMailto`. `src/lib/contact.ts` được [about](./about.md), [legal](./legal.md) và [seo](../platform/seo.md) dùng lại; ngược lại không.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Trang ghép, form nhập, `buildOrderRequest` soạn thư, thẻ trình bày sản phẩm |
| O | Thêm số đo = thêm vào `MEASUREMENT_KEYS` và bản dịch |
| L | — |
| I | `buildOrderRequest` chỉ nhận `t`, dữ liệu và `formatDate` |
| D | Form phụ thuộc hàm soạn thư, không phụ thuộc cách gửi |

### Conventions

Chuỗi qua `public.contact`; tiền qua `useMoney`. Test gọi thẳng hàm trang server, dùng `renderApp` và API sản phẩm giả (`contact-kit.tsx`); `window.location` được thay bằng bản sao chỉ ghi địa chỉ được gán sau khi trang đã dựng (jsdom không đi tới `mailto:`), và `readMailto` giải mã lại thư.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (trang công khai: không có hành động cần đăng nhập, thư gửi bằng hộp thư của khách) · permission = không (trang công khai)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| CT-1 | Soạn thư: lời chào, câu mở, khối sản phẩm / thiết kế / chi tiết / liên hệ, bỏ khối trống, cắt khoảng trắng, số đo nối bằng chấm, tiếng Anh, chủ đề | đúng | khách | unit | `tests/storefront/contact/contact-lib.test.ts` |
| CT-2 | Địa chỉ thư: chỉ hộp thư, chủ đề, nội dung, %20 thay dấu cách, giữ dấu cộng | đúng | khách | unit | `tests/storefront/contact/contact-lib.test.ts` |
| CT-3 | Form: đủ các ô, thẻ sản phẩm có hay không, tiếng Anh | đúng | khách | component | `tests/storefront/contact/contact-form.test.tsx` |
| CT-4 | Số đo và cân nặng chỉ nhận số, số lượng 1–10, ngày không trước hôm nay, đếm ký tự | đúng | khách | component | `tests/storefront/contact/contact-form.test.tsx` |
| CT-4E | Thiếu mô tả / tên / điện thoại sai (7, 16 chữ số, chữ): báo từng ô, không gửi; ô khoảng trắng; xóa dấu khi đúng | lỗi | khách | component | `tests/storefront/contact/contact-form.test.tsx` |
| CT-5 | Gửi: tới email của cửa hàng với thư đầy đủ, ngày theo ngôn ngữ, không sản phẩm, Enter, chưa gửi gì trước khi bấm | đúng | khách | component | `tests/storefront/contact/contact-form.test.tsx` |
| CT-6 | Trang: tiêu đề, ba bước theo thứ tự, form, kênh liên hệ (email, điện thoại, mạng xã hội, bản đồ), link về cửa hàng, tiếng Anh, báo ngôn ngữ, metadata | đúng | khách | integration | `tests/storefront/contact/contact-page.test.tsx` |
| CT-7 | Sản phẩm trong địa chỉ: tra theo id, phần tử đầu, cắt khoảng trắng, id rỗng / lạ, địa chỉ trang sản phẩm vào thư | đúng | khách | integration | `tests/storefront/contact/contact-page.test.tsx` |
| CT-8 | Thẻ sản phẩm: ảnh, nơi, giá, giá theo yêu cầu, giá gốc và phần trăm giảm, badge, nhiều ảnh, mô tả, chất liệu | đúng | khách | component | `tests/storefront/contact/contact-page.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Ngày nhỏ nhất của ô ngày tính theo UTC (`toISOString`), nên gần nửa đêm giờ Việt Nam có thể cho chọn hôm qua | Hành vi hiện tại (CT-4); ô không chặn gõ tay ngày đã qua |
| Không biết thư đã gửi hay chưa: `mailto:` chỉ mở hộp thư | Thiết kế có chủ đích; không có phản hồi trên trang |
| Số điện thoại chỉ kiểm số chữ số, không kiểm đầu số | Đủ cho thư gửi tay (CT-4E) |
| Trình duyệt không có ứng dụng thư thì `mailto:` không làm gì | Các kênh khác (điện thoại, Instagram, Facebook) có sẵn trên trang |

Thay đổi nhìn thấy được: không (không đổi hành vi nhìn thấy).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 7), kiểm thử đột biến. Không đổi code của module.
