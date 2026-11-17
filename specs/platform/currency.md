# Currency (tiền tệ) — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-21 · **Trạng thái:** Implemented
> **Doc:** [platform/currency](../../docs/platform/currency.md) · **Test:** `tests/platform/currency/`

## 1. Bối cảnh & mục tiêu

Mọi số tiền trên giao diện đi qua module này. Sai ở đây là hiển thị sai giá, nên đây là mức T0. Code hiện tại đã gọn (lõi thuần, hook mỏng, kiểu bắt buộc cặp `<tên>Vnd`/`<tên>Usd`) nhưng chưa có test nào, và chính các quy tắc "FE không quy đổi, không cộng, không làm tròn" cũng chưa có gì bảo vệ ngoài rule `money-format` của `check-conventions`.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho cả đường đúng và đường lỗi, kèm kiểm thử đột biến; ghi các điểm đáng ngờ vào mục 7. Không đổi code của module.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Test cho `money.ts`, `useMoney`, `MoneyText`, `VndInput` | Sửa code: module đã đúng thiết kế, điểm đáng ngờ ở mục 7 chờ chủ dự án quyết định |
| Kiểm tra kiểu: truyền object thiếu cặp field phải báo lỗi biên dịch | Kiểm tra rule `money-format` của `check-conventions`: thuộc `platform/dev-tooling` (batch này) |
| Kiểm thử đột biến cho logic chọn tiền tệ, định dạng, đọc cặp, nhập VND | Test trực quan (kiểu chữ, màu): thuộc design system |

## 3. Hợp đồng

- `currencyForLocale(locale)`: `vi` hoặc bắt đầu bằng `vi` (không phân biệt hoa thường) → `VND`; mọi giá trị khác (kể cả rỗng) → `USD`.
- `formatVnd(n)` = số theo `vi-VN` không số lẻ + ` VNĐ` (`350.000 VNĐ`); `formatUsd(n)` = `en-US` tiền tệ USD luôn 2 số lẻ (`$13.46`, `$1,234.50`). Đây là nơi duy nhất dùng `Intl.NumberFormat`.
- `formatMoney(money, locale)` chọn nửa `vnd` hoặc `usd` theo `currencyForLocale`; không quy đổi, không cộng, không làm tròn thêm. `moneyValue` trả con số tương ứng.
- `moneyOf(source, key)` đọc `<key>Vnd` và `<key>Usd`; `moneyOrNull` trả `null` khi một trong hai là `null`/`undefined` (số `0` là hợp lệ).
- `parseVndInput(text)`: chấp nhận chuỗi chữ số hoặc nhóm ba số bằng dấu chấm (`350000`, `350.000`, `1.234.567`), cắt khoảng trắng đầu cuối; mọi chuỗi khác (số lẻ, dấu phẩy, chữ, rỗng, âm, nhóm sai) hoặc số vượt giới hạn số nguyên an toàn → `null`.
- `maskVndInput(text)`: giữ chữ số, bỏ số 0 đầu (trừ một số 0 duy nhất), nhóm ba số bằng dấu chấm.
- `useMoney()`: gắn các hàm trên với locale hiện tại (`format`, `fmt`, `fmtOrNull`, `value`, `currency`, `locale`); `vnd` luôn là VND; kết quả ổn định giữa các lần render khi locale không đổi.
- `MoneyText`: một `<span>` không xuống dòng chứa số tiền theo ngôn ngữ.
- `VndInput`: ô văn bản `inputMode="numeric"`; chỉ giữ chữ số và nhóm bằng dấu chấm; văn bản **thêm vào** có phần thập phân (một dấu `,`, hoặc một dấu `.` đứng riêng hay kèm 1–2 chữ số cuối) bị từ chối, giữ giá trị cũ và gọi `onReject`; **xóa** ký tự luôn được chấp nhận.

## 4. Thiết kế

```
Response BE { priceVnd, priceUsd } ──► moneyOf / moneyOrNull ──► Money { vnd, usd } ──► formatMoney(money, locale)
                                                                               ▲
useMoney()  ──  useLocale()  ──────────────────────────────────────────────────┘     (MoneyText, màn hình, toast)
VndInput ──► maskVndInput / onChange(string) ──► parseVndInput ──► number (form admin)
```

Lõi thuần ở `src/lib/money.ts` (không React, không i18n); `useMoney` chỉ gắn locale; `MoneyText` và `VndInput` là lớp trình bày mỏng.

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Value object** `Money { vnd, usd }`: hai nửa đi cùng nhau | Không thể hiển thị VND của đơn này kèm USD của đơn khác; không có chỗ nào để quy đổi | Một số + mã tiền tệ (cần tỷ giá ở FE) |
| **Facade** `useMoney()` gắn locale một lần | Màn hình không phải truyền `locale` đi khắp nơi; `useMemo` giữ danh tính ổn định | Mỗi component gọi `formatMoney(money, useLocale())` |
| **Kiểu bắt buộc theo khóa** (`MoneyFields<K>`, template literal types) | BE đổi tên field → lỗi biên dịch, không phải số tiền `NaN` trên màn hình | Truy cập `order["totalVnd"]` rải rác, không kiểm tra |
| **Functional core, imperative shell**: định dạng thuần trong `lib/`, React ở ngoài | Test không cần render; dùng được ở server (JSON-LD) | Định dạng trong component |

### Kiến trúc

Lõi ở `src/lib` (dùng ≥ 2 module), hook ở `src/hooks`, hai component ở `_components` dùng chung. Hướng phụ thuộc: component → hook → lib; `lib/money.ts` không import gì của dự án. State: không có (dẫn xuất từ locale và props).

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `money.ts` chỉ biết định dạng và đọc cặp; `useMoney` chỉ gắn locale; `VndInput` chỉ biết ô nhập |
| O | Thêm tiền tệ mới = thêm nhánh ở `currencyForLocale`/`formatMoney`; các nơi gọi không đổi |
| L | Mọi hàm nhận `Money` hoạt động như nhau với kết quả của `moneyOf` hay `moneyOrNull` (sau khi bỏ `null`) |
| I | `MoneyText` chỉ nhận `money`; `VndInput` mở rộng `InputHTMLAttributes` nhưng loại `value`/`onChange`/`type` |
| D | Component phụ thuộc `useMoney`, không phụ thuộc `Intl`; `Intl` chỉ ở `money.ts` |

### Conventions

Rule `money-format` (check-conventions) cấm `Intl.NumberFormat`, `.toLocaleString(`, `.toFixed(` ngoài `money.ts`. Chữ hiển thị (`VNĐ`) là đơn vị tiền tệ chứ không phải chữ UI nên nằm trong `money.ts`. Test lấy văn bản từ hàm thật hoặc ghi giá trị tiền tuyệt đối, không viết cứng chữ giao diện.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (số tiền chỉ phụ thuộc ngôn ngữ giao diện, không phụ thuộc người dùng) · permission = không (không có quyền nào ở tầng định dạng)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| MON-1 | `vi` hiển thị VND: nhóm chấm, `VNĐ`, không số lẻ, số 0, số lớn | đúng | — | unit | `tests/platform/currency/money.test.ts` |
| MON-2 | Ngôn ngữ khác hiển thị USD: `$`, luôn 2 số lẻ, nhóm phẩy | đúng | — | unit | `tests/platform/currency/money.test.ts` |
| MON-3 | `currencyForLocale`: `vi`, `vi-VN`, `VI` → VND; `en`, `fr`, rỗng → USD | đúng | — | unit | `tests/platform/currency/money.test.ts` |
| MON-4 | `moneyOf`, `moneyOrNull`, `moneyValue` đọc đúng cặp; `0` hợp lệ | đúng | — | unit | `tests/platform/currency/money.test.ts` |
| MON-4E | Cặp `null` → `null`; field thiếu không được bảo vệ (hiện `NaN`); kiểu từ chối object thiếu cặp | lỗi | — | unit | `tests/platform/currency/money.test.ts` |
| MON-5 | `parseVndInput` nhận chữ số và nhóm ba số bằng chấm | đúng | — | unit | `tests/platform/currency/money.test.ts` |
| MON-5E | `parseVndInput` từ chối số lẻ, dấu phẩy, chữ, rỗng, âm, nhóm sai, số vượt giới hạn | lỗi | — | unit | `tests/platform/currency/money.test.ts` |
| MON-6 | `maskVndInput` nhóm ba số, bỏ ký tự lạ và số 0 đầu | đúng | — | unit | `tests/platform/currency/money.test.ts` |
| MON-7 | `useMoney` theo ngôn ngữ: `format`, `fmt`, `value`, `currency`, ổn định giữa các lần render | đúng | — | component | `tests/platform/currency/use-money.test.tsx` |
| MON-7E | `fmtOrNull` trả `null`; `vnd` luôn VND kể cả ở `en` | lỗi | — | component | `tests/platform/currency/use-money.test.tsx` |
| MON-8 | `MoneyText` hiển thị số tiền theo ngôn ngữ, không xuống dòng, nhận class | đúng | — | component | `tests/platform/currency/use-money.test.tsx` |
| MON-9 | `VndInput`: gõ chữ số thì nhóm bằng chấm; chữ bị bỏ; thuộc tính được chuyển vào ô | đúng | — | component | `tests/platform/currency/vnd-input.test.tsx` |
| MON-9E | `VndInput`: gõ hoặc dán số lẻ bị từ chối (giữ giá trị cũ, gọi `onReject`); xóa ký tự vẫn chạy | lỗi | — | component | `tests/platform/currency/vnd-input.test.tsx` |

Coverage: `money.ts`, `use-money.ts`, `MoneyText.tsx`, `VndInput.tsx` có ngưỡng dòng ≥ 90% trong `vitest.config.mts`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (được test khóa) | Hệ quả |
|---|---|---|
| BE gửi thiếu một field của cặp | `moneyOf` trả `undefined`, màn hình hiện `NaN VNĐ` / `$NaN` | Lỗi hợp đồng BE lộ ra trên giao diện thay vì bị chặn; kiểu biên dịch chỉ bảo vệ khi BE đổi tên, không bảo vệ lúc chạy |
| `formatVnd` nhận số lẻ | Làm tròn khi định dạng (`350000.5` → `350.001`) | FE không bao giờ tạo số lẻ; chỉ xảy ra nếu BE gửi |
| Số âm | Định dạng bình thường (`-350.000 VNĐ`, `-$13.46`), không có quy ước hiển thị riêng | Hoàn tiền/giảm giá phải do màn hình tự quyết định cách hiển thị |
| `Intl` phụ thuộc dữ liệu ICU của môi trường | Node 22 có ICU đầy đủ; test dựa vào đó | Môi trường CI khác phải có ICU đầy đủ |

Một thay đổi hành vi nhỏ có chủ đích (lỗi đã sửa): gõ từng phím `13.46` trước đây bỏ lặng lẽ dấu `.` rồi nhận `1346` thành `1.346` (đọc thành 1.346 đồng); nay dấu `.` hoặc `,` gõ riêng bị từ chối và gọi `onReject`. Các chữ số gõ tiếp sau đó vẫn được nhận, nên form phải hiện cảnh báo khi nhận `onReject` (các form hiện có đã làm vậy cho trường hợp dán).

## 8. Lịch sử thay đổi

- 2026-10-21 · Viết spec và test khóa hành vi hiện tại (batch 1). Không đổi code.
- 2026-10-21 · Sửa `VndInput`: dấu `.` hoặc `,` gõ riêng cũng bị từ chối (test đỏ tái hiện trước). Kiểm thử đột biến 22/22 bị bắt.
