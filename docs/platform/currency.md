# Currency (tiền tệ: VND gốc, USD do BE suy ra)

> **Nhóm:** Platform · **Cập nhật:** 2026-10-17
> **Code:** `src/lib/money.ts` · `src/hooks/use-money.ts` · `src/app/[locale]/_components/MoneyText.tsx` · `src/app/[locale]/_components/VndInput.tsx`

## 1. Tóm tắt module

Một chỗ duy nhất định dạng số tiền cho cả storefront và admin. BE lưu **VND** (số nguyên) và trả mọi số tiền thành **cặp** `<tên>Vnd` / `<tên>Usd` (USD do BE quy đổi theo tỷ giá BE cấu hình sẵn và làm tròn 2 số lẻ; FE không biết và không dùng tỷ giá). FE chỉ chọn nửa cặp phù hợp rồi định dạng.

## 2. Phục vụ gì / việc cần làm

- Tiếng Việt (`vi`) hiển thị VND, mọi ngôn ngữ khác hiển thị USD; tiền không có lựa chọn riêng ngoài ngôn ngữ giao diện.
- FE không quy đổi VND ↔ USD, không cộng, nhân hay làm tròn tiền: tổng, tạm tính, thành tiền dòng, tổng hoàn đều là giá trị BE trả (USD của một tổng là quy đổi từ tổng VND, không phải tổng các USD đã làm tròn).
- Một màn hình chỉ hiện **một** tiền tệ (theo ngôn ngữ): không hiển thị VND và USD cạnh nhau, không hiển thị tỷ giá. Ngoại lệ: các form cấu hình của admin (giá sản phẩm, `SHIPPING_CONFIG`, số tiền xác nhận thanh toán) nhập bằng VND, và doanh thu ở dashboard chỉ có VND (BE chưa có tổng doanh thu, FE không tự quy đổi).
- Ô nhập tiền của admin chỉ nhận VND nguyên.

## 3. Submodule & chức năng hiện có

| Thành phần | Nội dung |
|---|---|
| `src/lib/money.ts` | Kiểu `Money = { vnd, usd }`, `MoneyFields<K>` / `NullableMoneyFields<K>` (cặp `<K>Vnd`/`<K>Usd` của một response), `currencyForLocale`, `formatMoney(money, locale)`, `formatVnd`, `formatUsd`, `moneyValue`, `moneyOf`, `moneyOrNull`, `parseVndInput`, `maskVndInput`. Nơi duy nhất dùng `Intl.NumberFormat` |
| `src/hooks/use-money.ts` | `useMoney()` gắn với locale hiện tại: `format`, `fmt`, `fmtOrNull`, `value`, `currency`, `locale`, `vnd` (chỉ cho số liệu BE chỉ có bằng VND) |
| `MoneyText` | Một số tiền theo ngôn ngữ (`<span>` không xuống dòng), dùng trong bảng và panel của admin |
| `VndInput` | Ô nhập VND nguyên của admin: chỉ giữ chữ số, nhóm ba số bằng dấu chấm khi gõ, từ chối văn bản có số lẻ (`onReject`) |

## 4. Chi tiết

### 4.1 Định dạng

- VND: số theo `Intl.NumberFormat("vi-VN")` (0 số lẻ, dấu chấm ngăn nghìn) rồi đơn vị `VNĐ` do `formatVnd` ghép (vd `350.000 VNĐ`).
- USD: `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`, luôn 2 số lẻ (vd `$13.46`).
- `currencyForLocale(locale)`: `vi*` → `VND`, còn lại → `USD`.
- Định dạng đặt tên `price` / `priceFixed` / `vnd` không còn trong `src/i18n/request.ts`; `format.number` của `next-intl` chỉ còn dùng cho số không phải tiền (`decimal1`, đếm…).

### 4.2 Đọc cặp tiền của response

`moneyOf(order, "total")` đọc `totalVnd` + `totalUsd`; `moneyOrNull(product, "originalPrice")` trả `null` khi cặp `null`. `useMoney().fmt(source, "price")` và `fmtOrNull(source, "originalPrice")` là dạng rút gọn đã định dạng theo ngôn ngữ. Kiểu của tham số bắt buộc response có đủ hai field, nên compiler báo lỗi khi BE đổi tên.

### 4.3 Hiển thị một tiền tệ

- `useMoney().fmt(source, "total")`, `fmtOrNull` và `MoneyText` luôn chọn nửa cặp theo ngôn ngữ; `MoneyText` dùng ở bảng/panel admin (đơn, thanh toán, giao dịch, hoàn tiền, trả hàng, sản phẩm, người dùng), còn storefront và câu chữ/toast dùng `fmt` / `format`.
- FE bỏ qua mọi field tỷ giá trong response, không hiển thị và không dùng để quy đổi. Tỷ giá chỉ được admin sửa ở [admin/site-config](../admin/site-config.md) 4.6.

### 4.4 Nhập VND (admin)

`VndInput` + `maskVndInput` bỏ mọi ký tự không phải chữ số và nhóm ba số bằng dấu chấm. Văn bản có phần thập phân (`350000.5`, `350000,5`: dấu phẩy, hoặc 1–2 chữ số sau dấu chấm) bị **từ chối** khi gõ hoặc dán — ô giữ giá trị cũ và gọi `onReject` để form hiện lỗi — nên số lẻ không bao giờ bị đọc thành số nguyên lớn hơn; xóa ký tự (`350.000` → `350.00`) vẫn hoạt động. `parseVndInput(text)` chỉ nhận chuỗi chữ số hoặc nhóm ba số bằng dấu chấm, trả `null` với mọi chuỗi khác; form kiểm khoảng giá trị (sản phẩm 1–1.000.000.000, phí ship 0–1.000.000.000) trước khi gửi.

### 4.5 Ranh giới

- Bộ lọc giá và sắp xếp theo giá của BE luôn là VND (`minPrice`, `maxPrice`, `sort=price`).
- Ảnh VietQR (`qrUrl`) chỉ mang số VND và được hiển thị nguyên.
- `scripts/check-conventions.mjs` rule `money-format` chặn `Intl.NumberFormat`, `.toLocaleString(`, `.toFixed(` và `format.number(…, "price"|"priceFixed"|"vnd")` ngoài `src/lib/money.ts`.

### 4.6 Liên quan

JSON-LD theo ngôn ngữ ở [seo](seo.md); sự kiện phễu ở [analytics](../admin/analytics.md); định dạng khác ở [i18n](i18n.md).
