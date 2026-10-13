# Tài liệu module — clothes-shop (FE)

Thư mục này là bản mô tả **hiện trạng thật** của từng module trong dự án FE: module làm gì, có những chức năng nào, và chi tiết bên trong (route, file, dữ liệu, API, state, quyền, i18n). Mỗi module một file, viết theo bốn mục cố định:

1. **Tóm tắt module** — nó là gì.
2. **Phục vụ gì / việc cần làm** — nó giải quyết việc gì cho ai.
3. **Submodule & chức năng hiện có** — bảng các phần con và chức năng.
4. **Chi tiết** — mọi thứ còn lại của module.

Chỉ ghi những gì **đã có trong code**. Không viết kế hoạch, chuẩn hóa, bàn luận hay việc cần làm ở đây.

**Vòng lặp bắt buộc:** đọc doc của module (`yarn docs:who <đường dẫn>`) → hiểu module → làm feature → cập nhật doc → `yarn docs:check --changed` phải pass. Doc là điểm bắt đầu và điểm kết thúc của mọi task trên module. Quy trình: `.agent/rules/module-docs.md` (luôn bật) và `.agent/skills/07-module-docs.md` (skill `module-docs`); bản đồ "file nào thuộc doc nào" nằm ở `MODULES` trong `scripts/check-docs.mjs`.

## Platform — hạ tầng dùng chung

| Module | Nội dung | File |
|---|---|---|
| App shell | Layout gốc, provider, route group, 404/500, chuyển trang, con trỏ | [platform/app-shell.md](platform/app-shell.md) |
| Site chrome | Header, mega menu, burger menu, tìm kiếm, footer, giỏ nổi | [platform/site-chrome.md](platform/site-chrome.md) |
| Auth | Đăng nhập Google, token, phân quyền, guard, mật khẩu hệ thống | [platform/auth.md](platform/auth.md) |
| i18n | `next-intl`, locale, message, metadata, lỗi theo mã | [platform/i18n.md](platform/i18n.md) |
| Data layer | HTTP client, SWR, Redux, list-query, proxy `/media` | [platform/data-layer.md](platform/data-layer.md) |
| UI kit | `DataTable`, `AdminFormKit`, toast, confirm, carousel, banner… | [platform/ui-kit.md](platform/ui-kit.md) |
| Design system | Token CSS, font, style toàn cục | [platform/design-system.md](platform/design-system.md) |
| SEO | Metadata, sitemap, robots, JSON-LD | [platform/seo.md](platform/seo.md) |
| Tooling & deploy | Scripts, kiểm tra conventions/i18n, cron, biến môi trường | [platform/dev-tooling.md](platform/dev-tooling.md) |

## Admin — khu quản trị (`/admin`)

| Module | Route | File |
|---|---|---|
| Admin shell | `/admin/*` (layout, sidebar, cổng vào) | [admin/admin-shell.md](admin/admin-shell.md) |
| Dashboard | `/admin` | [admin/dashboard.md](admin/dashboard.md) |
| Analytics | `/admin/analytics` + `/api/analytics` | [admin/analytics.md](admin/analytics.md) |
| Products | `/admin/products` | [admin/products.md](admin/products.md) |
| Categories | `/admin/categories` | [admin/categories.md](admin/categories.md) |
| Collections | `/admin/collections` | [admin/collections.md](admin/collections.md) |
| Orders | `/admin/orders` | [admin/orders.md](admin/orders.md) |
| Payments | `/admin/payments` | [admin/payments.md](admin/payments.md) |
| Users | `/admin/users` | [admin/users.md](admin/users.md) |
| Media | `/admin/media` | [admin/media.md](admin/media.md) |
| Site config | `/admin/site-config` | [admin/site-config.md](admin/site-config.md) |

## Storefront — trang cho khách

| Module | Route | File |
|---|---|---|
| Landing page | `/` | [storefront/landing-page.md](storefront/landing-page.md) |
| Shop | `/shop`, `/shop/[category]`, `/shop/[category]/[subcategory]` | [storefront/shop.md](storefront/shop.md) |
| Product detail | `/shop/[category]/[subcategory]/[productId]` | [storefront/product-detail.md](storefront/product-detail.md) |
| Collections | `/collections`, `/collections/[slug]` | [storefront/collections.md](storefront/collections.md) |
| New In | `/new-in` | [storefront/new-in.md](storefront/new-in.md) |
| About | `/about` | [storefront/about.md](storefront/about.md) |
| Contact / Custom order | `/contact` | [storefront/contact.md](storefront/contact.md) |
| Legal | `/terms`, `/privacy`, `/shipping-returns`, `/legal` | [storefront/legal.md](storefront/legal.md) |
| Cart | `/cart` (+ Quick Add, giỏ nổi) | [storefront/cart.md](storefront/cart.md) |
| Wishlist | `/wishlist` | [storefront/wishlist.md](storefront/wishlist.md) |
| Checkout | `/checkout` | [storefront/checkout.md](storefront/checkout.md) |
| Customer orders | `/orders`, `/orders/[orderId]` | [storefront/customer-orders.md](storefront/customer-orders.md) |
| Account | `/account` | [storefront/account.md](storefront/account.md) |

Trang đăng nhập `/login` thuộc module [Auth](platform/auth.md).
