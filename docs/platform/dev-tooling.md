# Tooling, cấu hình & triển khai

> **Nhóm:** Platform · **Cập nhật:** 2026-10-14
> **Code:** `package.json` · `scripts/i18n.mjs` · `scripts/check-conventions.mjs` · `scripts/check-docs.mjs` · `next.config.ts` · `vercel.json` · `src/app/api/cron/ping/route.ts` · `.env.local` (không commit) · `.agent/` · `.claude/` · `CLAUDE.md`

## 1. Tóm tắt module

Những thứ giúp dự án chạy, kiểm tra và triển khai: script npm, ba bộ kiểm tra tự động (i18n, conventions và docs), cấu hình Next.js, cron của Vercel, danh sách biến môi trường và nơi đặt quy tắc cho AI/dev.

## 2. Phục vụ gì / việc cần làm

- Đảm bảo `yarn build` fail nếu thiếu bản dịch hoặc vi phạm quy ước chung.
- Giữ project Supabase gói free không bị tạm dừng vì không hoạt động (cron ping hằng ngày).
- Tập trung các biến môi trường cần có.

## 3. Submodule & chức năng hiện có

| Submodule | Chức năng | File |
|---|---|---|
| Scripts | `dev`, `build`, `start`, `lint`, `format`, `i18n:sync`, `i18n:check`, `conventions:check` | `package.json` |
| i18n tooling | Sinh registry, kiểm tra đủ khóa | `scripts/i18n.mjs` (xem [i18n](./i18n.md)) |
| Conventions check | Quét `src/**/*.ts(x)` tìm vi phạm quy ước | `scripts/check-conventions.mjs` |
| Docs check | Mỗi file code thuộc một module có doc đúng cấu trúc; module đổi thì doc phải đổi | `scripts/check-docs.mjs` |
| Next config | next-intl plugin, remote image hosts, header cache dev | `next.config.ts` |
| Cron | Ping BE mỗi ngày 00:00 UTC | `vercel.json`, `src/app/api/cron/ping/route.ts` |
| Quy tắc cho AI/dev | Rules, skills, CLAUDE.md | `.agent/rules/`, `.agent/skills/`, `.claude/skills/`, `CLAUDE.md` |

## 4. Chi tiết

### 4.1 Scripts (`package.json`, tên package `doovan-landing`)

| Script | Việc |
|---|---|
| `dev` | `next dev --turbopack` (chạy `predev` = `i18n sync` trước) |
| `build` | `next build` (`prebuild` = `i18n sync` → `i18n check` → `check-conventions` → `check-docs`) |
| `start`, `lint` (`next lint`), `format` (prettier cho `app/**`) | — |
| `i18n:sync`, `i18n:check`, `conventions:check`, `docs:check` | chạy riêng từng bước (`yarn docs:check --changed` kiểm tra doc theo thay đổi) |
| `docs:who <file\|folder\|module>` | in ra module và doc sở hữu đường dẫn đó |

Stack chính: Next 15 (App Router) · React 19 · Tailwind 4 · Redux Toolkit · SWR · next-intl 4 · framer-motion · GSAP · recharts · dnd-kit · `@react-oauth/google` · `@vercel/analytics` + `speed-insights`.

### 4.2 `check-conventions.mjs`

Quét `src/**/*.ts(x)` (bỏ `messages`), bỏ qua comment. Luật:

| Luật | Bắt lỗi |
|---|---|
| `error-message` | Import `errorMessage` trần trong `src/app` (phải dùng `useErrorMessage`) |
| `native-dialog` | `alert/confirm/prompt` (cho phép `confirm` của `useConfirm`) |
| `old-sort-syntax` | `price_asc`, `name_desc`, `"sorts"`… |
| `list-query` | `.set("limit"/"page"/"sort"/"search")` ngoài `list-query.ts` |
| `max-limit` | `limit`/`pageSize` ≥ 3 chữ số vượt 200 |
| `carousel` | `snap-x`, `scroll-snap-type` ngoài `Carousel.tsx` |
| `auto-advance` | `setInterval` ngoài `use-auto-advance.ts` |
| `toast-i18n` | `toast.success("literal")` trong `src/app` |
| `data-table` | `<DataTable>` server mode thiếu `sortOptions` hoặc `searchPlaceholder` (trừ `searchable={false}`) |

Bỏ qua một dòng: `// conventions-ignore: <rule-id> <lý do>` ở dòng đó hoặc dòng trước. Khi thêm một khối dùng chung mới thì thêm luật vào script trong cùng thay đổi.

### 4.3 `check-docs.mjs`

Bản đồ sở hữu `MODULES` (trong chính script) gán từng đường dẫn code cho đúng một doc trong `docs/`; đường dẫn dài nhất khớp thì thắng. `src/messages/**`, `src/i18n/registry.ts`, file nhị phân/sinh tự động không thuộc module nào. Hiện có 38 module (mỗi module một doc; `PendingCountsProvider.tsx` thuộc `admin/admin-shell`, `PendingActionNotice.tsx` thuộc `platform/ui-kit`, `src/lib/admin-events.ts` thuộc `platform/auth`), gồm cả `admin/payments`, `admin/refunds`, `admin/returns`, `admin/reviews`, `storefront/customer-returns` và `storefront/customer-reviews`. Đường dẫn liệt kê theo từng file (ví dụ `src/lib/brand.ts` thuộc `platform/seo`), nên file mới trong `src/lib/` phải được thêm vào entry của module sở hữu.

| Chế độ | Việc | Khi chạy |
|---|---|---|
| mặc định | Mỗi file code (`src/`, `scripts/`, `next.config.ts`, `vercel.json`) có module sở hữu; mỗi module có doc và hàng trong `docs/README.md`; `docs/` không chứa file lạ; doc có tiêu đề, dòng `Nhóm … Cập nhật YYYY-MM-DD`, dòng `Code`, đủ bốn mục đúng thứ tự, không có ngôn ngữ lộ trình hay việc tồn đọng (danh sách từ khóa nằm trong script, hằng `BANNED`); link `.md` và tên file trong dấu backtick đều tồn tại | trong `prebuild` |
| `--changed [--base=<ref>]` | Như trên, và với mọi module có file code đổi so với `HEAD` (hoặc `<ref>`, gồm cả file chưa theo dõi): doc của module phải được sửa và dòng `Cập nhật` phải đổi, hoặc đã mang ngày hôm nay (hay muộn hơn) từ lần sửa trước trong ngày (doc mới hoàn toàn thì bỏ qua kiểm tra ngày) | trước khi kết thúc một task |
| `--who <đường dẫn\|tên module>` | In doc sở hữu và toàn bộ đường dẫn module đó sở hữu | trước khi sửa |

Thêm module mới = thêm entry vào `MODULES`, tạo doc, thêm hàng README. Quy trình đầy đủ: `.agent/rules/module-docs.md`.

### 4.4 Next config

- Plugin `next-intl` trỏ `./src/i18n/request.ts`.
- `images.remotePatterns`: `images.higgs.ai`, `lh3.googleusercontent.com` (avatar Google), `d8j0ntlcm91z4.cloudfront.net`.
- Chỉ ở dev: header `Cache-Control: no-store` cho `/_next/static/media/*` (tránh trình duyệt giữ font cũ).

### 4.5 Cron

`vercel.json`: `GET /api/cron/ping` lúc `0 0 * * *`. Route handler (`force-dynamic`, `maxDuration 60`): nếu có `CRON_SECRET` thì yêu cầu header `Authorization: Bearer <secret>`; gọi `GET {API_URL}/api/categories?limit=1` (timeout 60 s) và trả `{ ok, status, durationMs }` (200 nếu BE ok, 502 nếu lỗi). Mục đích: đọc dữ liệu thật để project Supabase free không bị pause.

### 4.6 Biến môi trường

| Biến | Dùng ở | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | mọi client/server fetch | mặc định `http://localhost:7001` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `Providers` | Google OAuth |
| `NEXT_PUBLIC_SITE_URL` | `src/lib/site-url.ts` | mặc định `http://localhost:3000`; dùng cho metadata, sitemap, robots, JSON-LD |
| `MEDIA_STORAGE_ORIGIN` | `/media/[...path]` | chỉ server |
| `CRON_SECRET` | cron ping | tùy chọn |
| `WEB_ANALYTICS_TOKEN`, `WEB_ANALYTICS_PROJECT_ID`, `WEB_ANALYTICS_TEAM_ID`, `WEB_ANALYTICS_PLAN` | `/api/analytics` | xem [analytics](../admin/analytics.md) |
| `VERCEL_ENV` | `robots.ts` | do Vercel đặt |

### 4.7 Nơi đặt quy tắc

- `CLAUDE.md`: quy tắc dự án (vòng lặp docs → feature → docs, code tiếng Anh/UI qua i18n, list/error/toast chuẩn hóa, dùng lại component chung).
- `.agent/rules/` (`coding.md`, `components.md`, `design-system.md`, `module-docs.md`) — luôn bật; `.agent/skills/01…07-*.md` — hướng dẫn chi tiết; `.claude/skills/<tên>/SKILL.md` — bản rút gọn trỏ về skill tương ứng.
- Đường dẫn BE để đối chiếu: `/Users/quochoang/Documents/Projects/clothes-shop-api/` (không sửa code BE từ repo này).
