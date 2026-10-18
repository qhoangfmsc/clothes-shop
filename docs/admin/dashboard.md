# Dashboard

> **Nhóm:** Admin · **Route:** `/[locale]/admin` · **Cập nhật:** 2026-10-17
> **Code:** `(admin)/admin/page.tsx` · `(admin)/admin/DashboardContent.tsx` · `(admin)/admin/_components/AnalyticsSummary.tsx`
> **i18n:** `admin.dashboard`

## 1. Tóm tắt module

Trang tổng quan của admin: các chỉ số KPI (doanh thu, đơn đang xử lý, tổng đơn, sản phẩm, người dùng), tóm tắt lưu lượng 7 ngày gần nhất từ Vercel Analytics, danh sách 8 đơn gần đây và phân bố đơn theo trạng thái.

## 2. Phục vụ gì / việc cần làm

Cho admin nhìn nhanh tình hình cửa hàng khi đăng nhập: có bao nhiêu đơn đang chờ, doanh thu, có bao nhiêu sản phẩm đang bán, lượng khách ghé thăm và tỉ lệ chuyển đổi — rồi nhảy sang module chi tiết.

## 3. Submodule & chức năng hiện có

| Khối | Chức năng |
|---|---|
| KPI cards (5) | Doanh thu · Đang xử lý · Tổng đơn · Sản phẩm · Người dùng |
| Analytics summary | Visitors, pageviews (kèm % thay đổi), conversion, sparkline; link tới `/admin/analytics` |
| Recent orders | `DataTable` tĩnh 8 đơn mới nhất |
| Order status | Thanh tiến trình số đơn theo từng trạng thái |

## 4. Chi tiết

### 4.1 Nguồn dữ liệu

Ba hook SWR admin (xem [data-layer](../platform/data-layer.md)), mỗi hook `limit: LIST_MAX_LIMIT` (200):

- `useAdminProducts` → `products`, `total`
- `useAdminOrders` → `orders`, `total`
- `useAdminUsers` → `total`

Số liệu tính ở client từ tối đa 200 bản ghi gần nhất (theo sort mặc định `-createdAt` của BE). Các con số "tổng" dùng `total` của BE; các con số tính từ danh sách (doanh thu, phân bố trạng thái, sản phẩm active) chỉ phản ánh những bản ghi đã tải.

### 4.2 KPI

| Thẻ | Giá trị | Phụ đề |
|---|---|---|
| Revenue | Tổng `totalVnd` của các đơn **không** `cancelled`, hiện bằng VND (cộng số nguyên VND nên không lệch; không suy ra USD vì BE chưa có tổng doanh thu) | Số đơn hợp lệ |
| Processing | Số đơn `pending` (thẻ nhấp nháy khi > 0) | Cố định |
| Orders | `total` đơn | Số đơn `completed` |
| Products | `total` sản phẩm | Số `active` / không active (`total − active`) |
| Users | `total` user | Cố định |

Trong lúc tải hiện `—`. Accent màu: vàng, honey, xanh, sage, lavender.

### 4.3 Analytics summary (`AnalyticsSummary`)

- Gọi `useAdminAnalytics("7d", "summary")` (xem [analytics](./analytics.md)).
- Hiển thị Visitors và Pageviews (kèm `percentChange` so với kỳ trước), Conversion = số đơn không bị hủy có `createdAt` ≥ `report.since` ÷ số visitors; ghi chú số đơn tính được, và `Sparkline` SVG thuần của visitors theo ngày.
- Chưa cấu hình → thông báo `notConfigured`; lỗi → `unavailable`.

### 4.4 Recent orders

`DataTable` chế độ static, 8 đơn đầu của danh sách; cột: mã đơn (`#id`), trạng thái (badge màu + icon), số món (ẩn < sm), tổng, ngày (ẩn < sm).

### 4.5 Order status

Với từng trạng thái trong `pending, confirmed, shipping, delivered, completed, cancelled`: icon, nhãn (`useOrderStatusLabel`), thanh phần trăm `count / total orders`, số lượng. Màu: pending honey, confirmed xanh, shipping lavender, delivered sage, completed vàng, cancelled hồng.

### 4.6 Hiện trạng

- Trang không có kiểm tra permission riêng (mọi người vào được admin đều thấy), nhưng các API admin tương ứng do BE kiểm tra quyền.
- Bố cục đáy cố định `grid-cols-[2fr_1fr]`.
