# Dashboard admin (tổng quan) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [admin/dashboard](../../docs/admin/dashboard.md) · **Test:** `tests/admin/dashboard/`

## 1. Bối cảnh & mục tiêu

Trang đầu tiên admin thấy sau khi đăng nhập: bao nhiêu đơn đang chờ, doanh thu, bao nhiêu sản phẩm, người dùng, lượng khách ghé thăm và tỉ lệ chuyển đổi. Sai ở đây là một con số sai (hoặc một số 0 giả khi BE lỗi) làm admin hiểu sai tình hình cửa hàng. Module gồm `DashboardContent.tsx` (thẻ KPI, đơn gần đây, đơn theo trạng thái), `_components/AnalyticsSummary.tsx` (lượt truy cập 7 ngày, chuyển đổi, đường xu hướng) và `page.tsx`. Số liệu lấy từ ba hook SWR admin của [data-layer](../platform/data-layer.md) và từ `useAdminAnalytics` của [analytics](./analytics.md).

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Năm thẻ KPI, tám đơn gần đây, phân bố đơn theo sáu trạng thái, tóm tắt lưu lượng bảy ngày | Báo cáo lưu lượng đầy đủ: thuộc [analytics](./analytics.md) |
| Trạng thái đang tải, lỗi và thử lại của ba nguồn số liệu | Chặn người không phải admin: thuộc [admin-shell](./admin-shell.md); trang không có quyền riêng, BE kiểm từng API |
| Định dạng tiền và ngày theo ngôn ngữ | Bảng, tiền, ngày: thuộc [ui-kit](../platform/ui-kit.md) |

## 3. Hợp đồng

- **Nguồn.** `GET /api/admin/products`, `/orders`, `/users` mỗi cái `limit=200` (tối đa của BE); số "tổng" lấy từ `total` của BE, các số tính từ danh sách (doanh thu, phân bố trạng thái, sản phẩm đang bán, đơn gần đây) chỉ phản ánh những bản ghi đã tải.
- **Thẻ KPI.** Doanh thu = tổng `totalVnd` của đơn không bị hủy (dong nguyên, không suy ra USD), kèm số đơn đó; Cần xử lý = số đơn `pending` (thẻ viền dày và chấm nhấp nháy khi > 0); Đơn hàng = `total` của BE kèm số đơn `completed`; Sản phẩm = `total` kèm số đang bán và số còn lại (`total − đang bán`); Người dùng = `total`. Trong lúc tải, giá trị là `—` và dòng phụ bị bỏ.
- **Lỗi.** Nếu một trong ba nguồn lỗi: hiện một cảnh báo "không tải được số liệu" có nút Thử lại (tải lại cả ba); thẻ phụ thuộc nguồn lỗi hiện `—` (không bao giờ là số 0); danh sách đơn gần đây hiện lời lỗi thay cho "chưa có đơn"; khối đơn theo trạng thái hiện `—`. Nguồn còn lại vẫn hiện bình thường.
- **Đơn gần đây.** Tám đơn đầu của danh sách mới nhất trước: mã, trạng thái (màu và biểu tượng riêng), số món (đơn không có dòng tính 0; ẩn dưới `sm`), tổng tiền theo ngôn ngữ, ngày (ẩn dưới `sm`). Không có ô tìm kiếm; trống nói "chưa có đơn".
- **Đơn theo trạng thái.** Sáu trạng thái theo thứ tự `pending, confirmed, shipping, delivered, completed, cancelled`, mỗi cái một thanh rộng bằng phần trăm làm tròn của số đơn trong danh sách so với `total` của BE (0 khi chưa có đơn) và số lượng.
- **Lưu lượng.** `GET /api/analytics?range=7d&view=summary`: khách truy cập và lượt xem (kèm % so với 7 ngày trước, không có thì ghi "7 ngày qua"), chuyển đổi = đơn không hủy tạo từ đầu cửa sổ của báo cáo ÷ khách truy cập (`—` khi không có khách), đường xu hướng khách mỗi ngày (cần ít nhất hai ngày; tất cả bằng 0 thì đường phẳng), link sang `/admin/analytics`. Chưa cấu hình thì nói cách kết nối; lỗi (kể cả HTTP) thì nói chưa tải được; trong lúc tải hiện `—`.

## 4. Thiết kế

```
page.tsx ──► DashboardContent ──► useAdminProducts · useAdminOrders · useAdminUsers (data-layer) ──► authApi
DashboardContent ──► DataTable (tĩnh) · MoneyText (ui-kit) · AnalyticsSummary ──► useAdminAnalytics (analytics) ──► /api/analytics
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Số "tổng" lấy từ BE, số khác tính từ danh sách đã tải** | Đúng khi có hơn 200 bản ghi: tổng không lệch, còn phần tính từ danh sách là xấp xỉ có ghi chú | Tải hết rồi đếm |
| **Con số lỗi là dấu gạch, không phải số 0** | Một số 0 giả ("không có đơn nào") làm admin hiểu sai khi BE lỗi | Hiện 0 mặc định |
| **Cảnh báo chung một chỗ, thử lại cả ba nguồn** | Một nút cho một việc; nguồn còn lại vẫn dùng được | Một cảnh báo cho mỗi thẻ |
| **Doanh thu cộng dong nguyên** | Không lệch do số lẻ và không suy ra USD khi BE chưa có tổng doanh thu | Cộng USD |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit, data-layer (`useAdmin*`), analytics (`useAdminAnalytics`, `percentChange`). Không module nào phụ thuộc ngược vào đây. Trang không có kho Redux riêng.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `DashboardContent` tính số liệu và dựng bố cục; `AnalyticsSummary` lo riêng phần lưu lượng |
| O | Thêm thẻ KPI = thêm một `KpiCard` |
| L | `DataTable` chế độ tĩnh dùng như bảng thường |
| I | `AnalyticsSummary` chỉ nhận danh sách đơn và cờ tải |
| D | Thành phần phụ thuộc hook, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `admin.dashboard`; tiền qua `MoneyText`/`useMoney`; nhãn trạng thái qua `useOrderStatusLabel`. Test dùng `renderApp` với danh tính thật và `dashboardApi` (BE giả: sản phẩm, đơn, người dùng, `/api/analytics`) trong `dashboard-kit.tsx`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (khách và người mua bị BE từ chối thì không lộ số nào, chỉ báo lỗi; việc chặn trang thuộc admin-shell) · permission = không (trang không kiểm quyền riêng; mỗi API do BE kiểm)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ADB-1 | Thẻ KPI: hỏi 200 mỗi nguồn, doanh thu cộng đơn không hủy, đơn chờ có viền và chấm khi > 0, tổng đơn và sản phẩm lấy từ BE kèm số hoàn tất và đang bán, người dùng, dấu gạch khi đang tải, tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/dashboard/dashboard.test.tsx` |
| ADB-2 | Đơn gần đây: tám đơn đầu, mã, trạng thái có màu, số món, tổng, ngày; cột ẩn trên điện thoại; không có ô tìm; trống nói chưa có đơn | đúng | admin đủ quyền | component | `tests/admin/dashboard/dashboard.test.tsx` |
| ADB-3 | Đơn theo trạng thái: sáu trạng thái, số lượng, thanh theo tỉ lệ của tổng BE làm tròn, 0 khi chưa có đơn, màu từng trạng thái, dòng đang tải | đúng | admin đủ quyền | component | `tests/admin/dashboard/dashboard.test.tsx` |
| ADB-4 | Lưu lượng: hỏi 7 ngày dạng tóm tắt, khách và lượt xem kèm % so với kỳ trước, chuyển đổi từ đơn không hủy trong cửa sổ, đường xu hướng, link sang phân tích, dấu gạch khi đang tải | đúng | admin đủ quyền | component | `tests/admin/dashboard/dashboard.test.tsx` |
| ADB-4E | Lưu lượng chưa cấu hình hoặc lỗi (cả lỗi HTTP): thông báo tương ứng, không có số | lỗi | admin đủ quyền | component | `tests/admin/dashboard/dashboard.test.tsx` |
| ADB-5E | BE lỗi một hay nhiều nguồn: cảnh báo có Thử lại, thẻ hiện gạch thay cho số 0, danh sách và khối trạng thái không giả vờ trống, thử lại tải lại và hết cảnh báo; khách (401) và người mua (403) cũng chỉ thấy cảnh báo | lỗi | khách | component | `tests/admin/dashboard/dashboard.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| BE lỗi cho ra "0 đơn, 0 doanh thu" | Đã sửa: cảnh báo có Thử lại và dấu gạch thay cho số 0 (ADB-5E) |
| Doanh thu, phân bố trạng thái và đơn gần đây chỉ tính trên 200 đơn mới nhất | Khi hơn 200 đơn, doanh thu thấp hơn thực tế; "tổng" lấy từ BE nên không lệch (ADB-1) |
| Nhãn "từ N đơn hàng hoàn tất" nhưng số đếm là đơn không bị hủy | Nhãn và số đếm khác nhau (ADB-1); cần chủ dự án quyết định đổi nhãn hay đổi cách đếm |
| Trạng thái đơn lạ lấy lớp màu `undefined` ở bảng đơn gần đây | Chỉ là màu thiếu, chữ vẫn hiện; bảng trạng thái dùng màu mặc định |
| Chuyển đổi tính trên đơn đã tải | Khi hơn 200 đơn trong 7 ngày thì thấp hơn thực tế (ADB-4) |

Thay đổi nhìn thấy được: khi BE lỗi, trang không còn hiện số 0 mà hiện cảnh báo và dấu gạch.

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 5), kiểm thử đột biến. Sửa `DashboardContent`: lỗi tải một nguồn là cảnh báo có Thử lại và dấu gạch thay cho số 0 (thêm khóa dịch `error.message`, `error.retry`).
