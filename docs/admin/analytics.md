# Analytics (lưu lượng & phễu mua hàng)

> **Nhóm:** Admin · **Route:** `/[locale]/admin/analytics` · **API route:** `GET /api/analytics` · **Cập nhật:** 2026-10-18
> **Code:** `(admin)/admin/analytics/` · `src/app/api/analytics/` · `src/hooks/use-admin-analytics.ts` · `src/lib/analytics.ts` · `src/types/analytics.ts` · `src/lib/percent-change.ts` · `src/app/[locale]/_components/VercelTelemetry.tsx`
> **i18n:** `admin.analytics`

## 1. Tóm tắt module

Báo cáo lưu lượng của storefront lấy từ **Vercel Web Analytics API**, kèm phễu mua hàng từ các sự kiện tùy chỉnh. Có ba phần: (1) thu thập — storefront gửi pageview và 4 sự kiện; (2) một route handler Next.js làm BFF giữ token Vercel ở server; (3) trang admin hiển thị.

## 2. Phục vụ gì / việc cần làm

Cho admin biết bao nhiêu người ghé site, trang nào/nguồn nào/thiết bị nào hiệu quả, và khách rơi rụng ở bước nào của phễu `xem sản phẩm → thêm giỏ → bắt đầu thanh toán → mua`. Không cần mở dashboard Vercel (vẫn có nút "Open Vercel").

## 3. Submodule & chức năng hiện có

| Submodule | Chức năng | File |
|---|---|---|
| Thu thập | `<Analytics>` + `<SpeedInsights>` (bỏ `/admin`); `trackEvent` | `VercelTelemetry.tsx`, `src/lib/analytics.ts` |
| BFF | Xác thực admin, đọc env, dựng báo cáo, cache 5 phút | `src/app/api/analytics/route.ts`, `_lib/*` |
| Hook | `useAdminAnalytics(range, view)` (SWR) | `src/hooks/use-admin-analytics.ts` |
| Trang | Chọn khoảng thời gian, KPI, biểu đồ, phễu, 4 thẻ phân tích, trạng thái chưa cấu hình/lỗi | `AnalyticsContent.tsx`, `_components/*` |
| Tóm tắt Dashboard | Xem [dashboard](./dashboard.md) | `_components/AnalyticsSummary.tsx` |

## 4. Chi tiết

### 4.1 Sự kiện thu thập (`src/lib/analytics.ts`)

`trackEvent(name, data)` bọc `track` của `@vercel/analytics` trong `try/catch` (adblock/offline/SSR không được làm hỏng storefront). Tối đa 2 thuộc tính mỗi sự kiện (giới hạn gói Pro), không gửi dữ liệu cá nhân. Số tiền gửi bằng **một** thuộc tính đặt tên theo tiền tệ của ngôn ngữ (`vnd` ở `vi`, `usd` ở ngôn ngữ khác; `moneyProp(money, locale)`), giá trị là field tiền của BE, không quy đổi ở FE.

| Sự kiện | Payload | Gọi ở |
|---|---|---|
| `view_product` | `{ productId, vnd \| usd }` (giá bán) | Chi tiết sản phẩm |
| `add_to_cart` | `{ productId, vnd \| usd }` (đơn giá; BE tính thành tiền dòng sau khi thêm) | Quick Add, chi tiết sản phẩm |
| `begin_checkout` | `{ items, vnd \| usd }` (`subtotal` của báo giá đầu tiên) | Checkout |
| `purchase` | `{ orderId, vnd \| usd }` (`total` của đơn BE trả về) | Checkout (đặt hàng xong) |

`FUNNEL_EVENTS` (thứ tự phễu) dùng chung giữa bộ thu thập và báo cáo. Pageview do `<Analytics>` tự gửi; URL admin bị loại bởi `beforeSend`.

### 4.2 Route handler `GET /api/analytics?range=24h|7d|30d|90d&view=summary|full`

- `maxDuration = 30`. Luôn trả `Cache-Control: private, no-store` (cache thực sự nằm ở lời gọi upstream).
- **Xác thực** (`_lib/admin-auth.ts`): cần header `Authorization: Bearer …`; gọi `GET {API_URL}/api/auth/me`; 401 từ BE → 401 (client tự refresh token rồi thử lại); lỗi khác → 502; role khác `admin` → 403. Thiếu header → 401.
- **Cấu hình** (`_lib/vercel-client.ts`): `WEB_ANALYTICS_TOKEN`, `WEB_ANALYTICS_PROJECT_ID` (bắt buộc), `WEB_ANALYTICS_TEAM_ID` (tùy chọn). Thiếu → HTTP 200 `{ status: "not_configured", missing: [...] }`.
- **Gói Vercel** (`_lib/plans.ts`, env `WEB_ANALYTICS_PLAN`): `hobby` (30 ngày, không custom event, không UTM) — mặc định nếu thiếu/không nhận ra; `pro` (365 ngày, event, không UTM); `pro-plus` và `enterprise` (730 ngày, event, UTM). Range yêu cầu dài hơn gói cho phép bị `clampRange` thu về range lớn nhất vừa gói.
- **Cửa sổ thời gian** (`_lib/range.ts`): bucket theo giờ UTC cho `24h`, theo ngày UTC cho còn lại; `since` tính từ đầu bucket hiện tại lùi `bucketCount − 1`; mốc thời gian làm tròn 5 phút để các request chung một bản cache; kỳ trước = cùng độ dài ngay trước `since`. `fillSeries` điền 0 cho bucket thiếu để trục biểu đồ không đứt.
- **Dựng báo cáo** (`_lib/build-report.ts`): `summary` = totals + series + kỳ trước; `full` thêm 10 breakdown và phễu. Series được chia khối ≤ 60 bucket (Vercel từ chối query > 62 bucket → "invalid_group_by"). Các query phụ (kỳ trước, breakdown, phễu) dùng `orNull` — lỗi một cái chỉ làm thẻ đó rỗng; chỉ khi cả series lẫn totals cùng lỗi mới ném. Nếu totals lỗi nhưng series được, totals được cộng từ series (visitors chỉ xấp xỉ).
- **Phản hồi** (`AnalyticsResponse`): `{ status: "ok", report }`, `{ status: "not_configured", missing }`, hoặc `{ status: "error", reason: "auth" | "plan" | "unavailable" }` (401/403/404 → `auth`; 402/410 → `plan`; còn lại → `unavailable`). Lỗi cấu hình/upstream luôn HTTP 200 để trang hiện thẻ thân thiện; 401/403 thật chỉ dành cho người gọi.
- **Upstream**: `https://api.vercel.com/v1/query/web-analytics/{visits/count|visits/aggregate|events/aggregate}`, `next.revalidate = 300`, timeout 15 s.
- `AnalyticsReport`: `range, granularity, since, capabilities, totals, previousTotals, series, breakdowns, funnel, generatedAt`. Breakdown: `pages (requestPath), routes (route), referrers (referrerHostname), utmSources/Mediums/Campaigns (khi gói cho phép), countries, devices (deviceType), browsers (browserName), systems (osName)` — `null` nếu query lỗi hoặc gói không cho.

### 4.3 Trang admin

- Hook `useAdminAnalytics` gọi `authApi.get(`${origin}/api/analytics?...`)` (URL tuyệt đối vì cùng origin Next, nên vẫn có bearer + refresh). SWR key `["admin-analytics", range, view]`, `dedupingInterval 60 s`, `keepPreviousData`.
- Header: tiêu đề, nút **Refresh**, nút **Open Vercel** (`VERCEL_ANALYTICS_URL`).
- Chọn khoảng: các tab `24h / 7d / 30d / 90d` chỉ hiện những range vừa gói (`maxRangeDays`). Mặc định `7d`; hiển thị theo `report.range` thực tế server trả về.
- Trạng thái: `not_configured` → `StatusCard` hướng dẫn tạo token, đặt env, redeploy (liệt kê env thiếu); `error` → thẻ lỗi theo `reason` + nút Thử lại; lỗi mạng/403 trước khi có dữ liệu → `network`/`forbidden`.
- KPI (`StatTile` ×3): Visitors, Pageviews, Views per visitor, mỗi ô có % thay đổi so với kỳ trước (`percentChange`; `null` khi kỳ trước = 0/không có).
- Biểu đồ `TrafficChart` (Recharts, nạp bằng `dynamic` `ssr:false` để không tăng bundle các trang admin khác): vùng/đường Visitors và Pageviews; nút bật bảng số liệu thay thế; trục thời gian theo `granularity`.
- `FunnelCard` (chỉ khi `report.funnel` có): 4 bước, số lần + % so với bước trước, tỉ lệ tổng cuối/đầu; trống khi bước đầu = 0.
- `BreakdownCard` ×4 (`pages`: pages/routes · `sources`: referrers/UTM · `locations`: countries · `devices`: devices/browsers/systems): có tab, thanh tỉ lệ theo visitors của hàng lớn nhất, quốc gia hiển thị tên + cờ (`Intl.DisplayNames`), `referrer` rỗng = "Direct", rỗng khác = "Unknown". Tab UTM ẩn nếu gói không có UTM.
- Dòng cuối: "Cập nhật lúc …" từ `generatedAt`.
- Màu series (`SERIES_COLORS`: visitors `#B08A3E`, pageviews `#2D6CA2`) chọn riêng để đạt tương phản cho người mù màu, không dùng token thương hiệu.

### 4.4 Biến môi trường

`WEB_ANALYTICS_TOKEN`, `WEB_ANALYTICS_PROJECT_ID`, `WEB_ANALYTICS_TEAM_ID` (tùy chọn), `WEB_ANALYTICS_PLAN`, `NEXT_PUBLIC_API_URL`.

- **Đơn vị kích thước:** các số px trong doc này là giá trị ở gốc 16 px; trong code, chiều dài và cỡ chữ của module viết bằng `rem` (class `…-[…rem]`, token `--text-*` / `--space-*`, style inline `"…rem"`) nên lớn dần từ 1536 px tới 1920 px theo thang gốc `html` ([design-system](../platform/design-system.md) 4.3).
