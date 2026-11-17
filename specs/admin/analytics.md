# Analytics admin (lưu lượng & phễu mua hàng) — Tech spec

> **Nhóm:** Admin · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [admin/analytics](../../docs/admin/analytics.md) · **Test:** `tests/admin/analytics/`

## 1. Bối cảnh & mục tiêu

Báo cáo lưu lượng của storefront lấy từ Vercel Web Analytics, kèm phễu mua hàng từ bốn sự kiện tùy chỉnh. Có ba phần: (1) thu thập — storefront gửi sự kiện qua `trackEvent`; (2) một route handler Next.js làm BFF, giữ token Vercel ở server, chỉ cho admin vào, dựng báo cáo; (3) trang admin hiển thị. Sai ở đây là cho người lạ đọc số liệu, lộ token Vercel, hoặc admin tin vào con số sai (bucket lệch, khoảng thời gian vượt gói). Module gồm `AnalyticsContent.tsx` và `_components/{StatTile,StatusCard,FunnelCard,BreakdownCard,TrafficChart}.tsx`, `_common/constants.ts`, route `src/app/api/analytics/route.ts` với `_lib/{admin-auth,plans,range,vercel-client,build-report}.ts`, hook `src/hooks/use-admin-analytics.ts`, `src/lib/analytics.ts` và `src/lib/percent-change.ts`. [dashboard](./dashboard.md) dùng lại hook và `percentChange`.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho admin đủ quyền và admin thiếu quyền, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Route `/api/analytics` (xác thực admin, đọc cấu hình, gói Vercel, cửa sổ thời gian, dựng báo cáo, cache), hook SWR, trang với tab khoảng thời gian, thẻ KPI, biểu đồ, phễu, bốn thẻ phân tích, thẻ trạng thái | Bản thân `<Analytics>` và `<SpeedInsights>` gắn ở layout: thuộc [app-shell](../platform/app-shell.md) |
| `trackEvent`, `moneyProp`, `FUNNEL_EVENTS` (phía gửi sự kiện) | Nơi các trang storefront gọi `trackEvent`: thuộc từng module storefront |
| Quyền: route chỉ nhận vai trò `admin` (không dùng quyền chi tiết) | Chặn người không phải admin ở trang: thuộc [admin-shell](./admin-shell.md); ở đây route tự kiểm lần nữa |

## 3. Hợp đồng

- **Sự kiện.** `trackEvent(name, data)` bọc `track` của Vercel trong `try/catch` (adblock, offline, SSR không được làm hỏng storefront). Số tiền gửi bằng **một** thuộc tính theo tiền tệ của ngôn ngữ (`vnd` ở `vi`, `usd` ở ngôn ngữ khác; `moneyProp`), giá trị là trường tiền của BE. Thứ tự phễu `FUNNEL_EVENTS` = `view_product, add_to_cart, begin_checkout, purchase`.
- **Route `GET /api/analytics?range=24h|7d|30d|90d&view=summary|full`** (`maxDuration = 30`). Xác thực (`requireAdmin`): cần `Authorization: Bearer …` (thiếu hoặc kiểu khác → 401, không hỏi BE); hỏi `GET {API}/api/auth/me`: 401 của BE → 401 (client tự refresh rồi thử lại); lỗi khác hoặc không tới được → 502; vai trò khác `admin` hoặc không đọc được → 403. Thiếu `WEB_ANALYTICS_TOKEN` hoặc `WEB_ANALYTICS_PROJECT_ID` → 200 `{status:"not_configured", missing}`. Range lạ = `7d`; range vượt gói bị thu về range lớn nhất vừa gói (`clampRange`); view khác `full` = `summary`. Thành công → 200 `{status:"ok", report}`; lỗi dựng báo cáo → 200 `{status:"error", reason}` với `reason` = `auth` (401/403/404 của Vercel), `plan` (402/410), `unavailable` (còn lại, kể cả không tới được). Luôn `Cache-Control: private, no-store`.
- **Gói Vercel** (`WEB_ANALYTICS_PLAN`, bỏ khoảng trắng và hoa thường; thiếu hoặc lạ = hobby): hobby 30 ngày không sự kiện không UTM; pro 365 ngày có sự kiện; pro-plus và enterprise 730 ngày có sự kiện và UTM.
- **Cửa sổ thời gian.** Bucket UTC: giờ cho `24h` (24 bucket), ngày cho còn lại; `since` = đầu bucket hiện tại lùi `bucketCount − 1`; mốc kết thúc làm tròn xuống 5 phút để các request chung một bản cache; kỳ trước = cùng độ dài ngay trước `since`. `fillSeries` điền 0 cho bucket thiếu, đặt dòng vào bucket chứa nó, bỏ dòng không đọc được thời gian.
- **Dựng báo cáo.** `summary` = tổng + chuỗi theo bucket + kỳ trước; `full` thêm mười danh sách (ba UTM chỉ khi gói có) và phễu (chỉ khi gói có sự kiện; bước không có dòng = 0). Chuỗi chia khối ≤ 60 bucket (Vercel từ chối > 62). Các truy vấn phụ (kỳ trước, từng danh sách, phễu) lỗi chỉ làm phần đó rỗng (`null`); chỉ khi cả chuỗi lẫn tổng lỗi mới ném (lỗi của chuỗi); chỉ tổng lỗi thì cộng từ chuỗi (số khách chỉ xấp xỉ); chỉ chuỗi lỗi thì chuỗi toàn 0.
- **Trang.** Mở ở `7d`, báo cáo `full`. Các tab khoảng chỉ hiện những range vừa gói (trước khi có báo cáo hiện cả bốn); tab được chọn theo `report.range` mà server trả về. Chưa cấu hình → thẻ hướng dẫn bốn bước kèm tên biến còn thiếu; lỗi theo `reason` → thẻ lỗi có Thử lại; lỗi trước khi có dữ liệu → `forbidden` (403) hoặc `network`; refresh lỗi khi đã có báo cáo thì giữ báo cáo cũ. KPI: khách, lượt xem, lượt xem mỗi khách, mỗi ô kèm % thay đổi so với kỳ trước (mũi tên lên hoặc xuống, nhãn đọc được, không có khi kỳ trước bằng 0). Biểu đồ hai đường, nút chuyển sang bảng số; không có lượt xem nào thì nói chưa ghi nhận. Phễu: số lần, % so với bước trước, tỉ lệ cuối/đầu; bước đầu bằng 0 thì nói chưa ghi nhận. Bốn thẻ danh sách có tab, thanh theo hàng lớn nhất, quốc gia kèm cờ và tên theo ngôn ngữ, nguồn rỗng = "truy cập trực tiếp", rỗng khác = "không rõ", loại thiết bị dịch được; danh sách `null` = "chưa tải được". Dòng cuối ghi giờ tạo báo cáo.

## 4. Thiết kế

```
Storefront ─► trackEvent ─► @vercel/analytics

AnalyticsContent / AnalyticsSummary ─► useAdminAnalytics (SWR) ─► authApi ─► GET /api/analytics
route.ts ─► requireAdmin (admin-auth) ─► BE /api/auth/me
         ─► readCredentials · getCapabilities (plans) · clampRange (range)
         ─► buildReport (build-report) ─► vercel-client ─► api.vercel.com/v1/query/web-analytics
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Backend-for-frontend** (route handler) | Token Vercel không rời server; chỉ admin vào; trang nhận một hình dạng báo cáo ổn định | Gọi Vercel từ trình duyệt |
| **Lỗi cấu hình và upstream trả HTTP 200 kèm `status`/`reason`** | Trang hiện thẻ thân thiện; 401/403 thật chỉ dành cho người gọi | Ném HTTP lỗi cho mọi trường hợp |
| **Truy vấn phụ không bao giờ ném** (`orNull`) | Một thẻ hỏng không làm trống cả trang | Hỏng một là hỏng hết |
| **Làm tròn mốc 5 phút và cache upstream 5 phút** | Nhiều admin, nhiều lần mở cùng dùng một câu trả lời, đỡ hạn mức Vercel | Hỏi lại mỗi lần |
| **Chia khối ≤ 60 bucket** | Vercel từ chối truy vấn hơn 62 bucket; khoảng 90 ngày hỏi hai lần rồi ghép | Một truy vấn dài |
| **Gói Vercel khai bằng biến môi trường** | API không cho biết gói; thiếu thì coi là hobby để không bao giờ hỏi dữ liệu gói không có | Đoán theo lỗi |
| **Biểu đồ nạp lười, không SSR** (`dynamic`) | Recharts nặng, không kéo vào các trang admin khác | Nạp cùng bundle |

### Kiến trúc

Trang phụ thuộc xuống: ui-kit (thẻ, tab), data layer (`authApi`), hook `useAdminAnalytics`. Route phụ thuộc BE (xác thực) và Vercel (số liệu), không phụ thuộc trang. [dashboard](./dashboard.md) phụ thuộc hook và `percentChange`; ngược lại không. Không có kho Redux: dữ liệu ở cache SWR.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi file `_lib` một việc: xác thực, gói, cửa sổ, client Vercel, dựng báo cáo; mỗi thẻ trên trang một việc |
| O | Thêm danh sách phân tích = thêm cột trong `loadBreakdowns`, tab trong hằng số và bản dịch |
| L | `BreakdownCard` dùng cho mọi danh sách |
| I | Thẻ nhận đúng phần dữ liệu của nó, không nhận cả báo cáo |
| D | `buildReport` nhận `credentials` và `capabilities` vào, không tự đọc môi trường |

### Conventions

Chuỗi qua `admin.analytics`; số và ngày qua `useFormatter`; tên quốc gia qua `Intl.DisplayNames`. Test dùng MSW cho BE (`/api/auth/me`) và Vercel, gọi thẳng `GET` của route, `renderApp` với danh tính thật cho trang và `analyticsApi` (route giả) trong `analytics-kit.tsx`; `recharts` được thế `ResponsiveContainer` có kích thước cố định vì jsdom không đo được.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (route đòi token admin; trang báo lỗi 403 cho tài khoản không phải admin) · permission = không (route chỉ xét vai trò `admin`, không có quyền chi tiết)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ANA-1 | Xác thực: admin có token đi qua và BE được hỏi bằng đúng token | đúng | admin đủ quyền | integration | `tests/admin/analytics/analytics-bff.test.ts` |
| ANA-1E | Xác thực: không có token hoặc kiểu khác → 401 và không hỏi BE; BE 401 → 401; người mua → 403; câu trả lời hỏng → 403; BE lỗi hoặc không tới được → 502 | lỗi | khách | integration | `tests/admin/analytics/analytics-bff.test.ts` |
| ANA-1U | Xác thực: tài khoản người mua đã đăng nhập → 403 | lỗi | user | integration | `tests/admin/analytics/analytics-bff.test.ts` |
| ANA-2 | Gói Vercel: bốn gói, bỏ khoảng trắng và hoa thường, thiếu hoặc lạ = hobby | đúng | — | unit | `tests/admin/analytics/analytics-bff.test.ts` |
| ANA-3 | Cửa sổ thời gian: range lạ = 7 ngày, thu range vượt gói, bucket UTC giờ hoặc ngày, mốc 5 phút, kỳ trước, điền bucket thiếu | đúng | — | unit | `tests/admin/analytics/analytics-bff.test.ts` |
| ANA-4 | Đọc cấu hình Vercel: bỏ khoảng trắng, team tùy chọn, liệt kê biến còn thiếu theo thứ tự | đúng | — | unit | `tests/admin/analytics/analytics-bff.test.ts` |
| ANA-5 | Gọi Vercel: token, project, team, khoảng thời gian, cột nhóm, giới hạn dòng; trả lại phần `data` | đúng | — | integration | `tests/admin/analytics/analytics-bff.test.ts` |
| ANA-5E | Vercel trả lỗi: ném lỗi mang mã trạng thái và không có lời | lỗi | — | integration | `tests/admin/analytics/analytics-bff.test.ts` |
| ANA-6 | Lý do hiện cho admin theo mã Vercel: auth, plan, unavailable | lỗi | — | unit | `tests/admin/analytics/analytics-bff.test.ts` |
| ANA-7 | Dựng báo cáo: tóm tắt và đầy đủ, 24 giờ, 90 ngày chia hai khối, mười danh sách, phễu, UTM và sự kiện theo gói, giá trị thiếu = 0 | đúng | — | integration | `tests/admin/analytics/analytics-bff.test.ts` |
| ANA-7E | Dựng báo cáo khi truy vấn lỗi: một thẻ lỗi chỉ làm thẻ đó rỗng; thiếu kỳ trước; chỉ tổng lỗi thì cộng từ chuỗi; chỉ chuỗi lỗi thì toàn 0; cả hai lỗi thì ném | lỗi | — | integration | `tests/admin/analytics/analytics-bff.test.ts` |
| ANA-8 | Route: 30 giây, không cache, 200 kèm cấu hình thiếu, 200 kèm báo cáo, theo range và view, thu range vượt gói, 200 kèm `reason` khi Vercel lỗi hoặc không tới được | đúng | admin đủ quyền | integration | `tests/admin/analytics/analytics-route.test.ts` |
| ANA-8E | Route từ chối khách (401) và người mua (403), không chạm Vercel | lỗi | khách | integration | `tests/admin/analytics/analytics-route.test.ts` |
| ANA-9 | `trackEvent` gửi đúng tên và dữ liệu, không làm hỏng trang khi lỗi; `moneyProp` theo ngôn ngữ; thứ tự phễu | đúng | — | unit | `tests/admin/analytics/analytics-lib.test.ts` |
| ANA-10 | `percentChange`: tăng, giảm, không đổi, không có gì để so | đúng | — | unit | `tests/admin/analytics/analytics-lib.test.ts` |
| ANA-11 | Trang: tiêu đề, Làm mới, link Vercel mở tab mới an toàn, hỏi 7 ngày dạng đầy đủ kèm token, tiếng Anh | đúng | admin đủ quyền | component | `tests/admin/analytics/analytics-page.test.tsx` |
| ANA-12 | Tab khoảng thời gian: bốn tab đến khi biết gói, theo `report.range` của server, bấm để hỏi range khác | đúng | admin đủ quyền | component | `tests/admin/analytics/analytics-page.test.tsx` |
| ANA-13 | KPI, biểu đồ, phễu, bốn danh sách (tab UTM theo gói) và giờ tạo báo cáo; dấu gạch khi chưa có báo cáo | đúng | admin đủ quyền | component | `tests/admin/analytics/analytics-page.test.tsx` |
| ANA-14E | Không có báo cáo: hướng dẫn kết nối, thẻ lỗi theo lý do kèm Thử lại, 403 cho người không phải admin, lỗi mạng, giữ báo cáo cũ khi làm mới lỗi | lỗi | user | component | `tests/admin/analytics/analytics-page.test.tsx` |
| ANA-15 | Ô số liệu: tăng hoặc giảm với mũi tên, màu và nhãn đọc được; không đổi dấu trừ; dấu gạch khi đang tải | đúng | — | component | `tests/admin/analytics/analytics-cards.test.tsx` |
| ANA-16 | Phễu: các bước theo thứ tự, % so với bước trước, tỉ lệ cuối/đầu, thanh không vượt 100%, trạng thái trống | đúng | — | component | `tests/admin/analytics/analytics-cards.test.tsx` |
| ANA-17 | Danh sách xếp hạng: tab, thanh theo hàng lớn nhất, cờ và tên quốc gia theo ngôn ngữ, trực tiếp và không rõ, loại thiết bị, trống và không tải được | đúng | — | component | `tests/admin/analytics/analytics-cards.test.tsx` |
| ANA-18E | Thẻ thay cho báo cáo: bốn bước kết nối với link token và tên biến, dòng còn thiếu, năm lý do lỗi kèm Thử lại | lỗi | — | component | `tests/admin/analytics/analytics-cards.test.tsx` |
| ANA-19 | Biểu đồ lưu lượng: chú giải có màu, chuyển bảng/biểu đồ, giờ và ngày, trạng thái trống | đúng | — | component | `tests/admin/analytics/analytics-cards.test.tsx` |
| ANA-19B | Những gì biểu đồ đưa cho thư viện vẽ: khu vực khách và đường lượt xem đúng màu, trục thời gian theo ngày hoặc giờ, trục số rút gọn, hộp khi rê chuột có giờ đầy đủ và hai số, không có gì khi không rê | đúng | — | component | `tests/admin/analytics/analytics-chart.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Lộ token Vercel hoặc số liệu cho người không phải admin | Token chỉ ở server; route tự xác thực với BE; test từ chối khách, người mua và token sai (ANA-1E, ANA-8E) |
| Hỏi dữ liệu mà gói Vercel không có làm cả báo cáo lỗi | Gói khai bằng `WEB_ANALYTICS_PLAN`, thiếu = hobby; UTM và sự kiện chỉ hỏi khi gói có (ANA-2, ANA-7) |
| Khoảng 90 ngày bị Vercel từ chối (> 62 bucket) | Chia khối 60 bucket (ANA-7) |
| Số khách chỉ xấp xỉ khi truy vấn tổng lỗi | Cộng từ chuỗi theo ngày nên khách có thể đếm trùng; có ghi chú trong mã (ANA-7E) |
| Nhãn nút "Open Vercel" trỏ tới dự án cố định | Địa chỉ nằm trong hằng số `VERCEL_ANALYTICS_URL`; đổi dự án phải sửa hằng số |
| Biểu đồ Recharts không đo được trong jsdom | Test thế các mảnh của Recharts bằng hàm giả gọi lại các hàm định dạng và hộp rê chuột (ANA-19B); hình vẽ thật chỉ kiểm bằng mắt |

Thay đổi nhìn thấy được: không (không đổi hành vi nhìn thấy).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 5), kiểm thử đột biến. Không đổi code của module.
