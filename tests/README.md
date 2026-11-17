# Tests — clothes-shop (FE)

Mọi test của dự án nằm ở đây và **phản chiếu `docs/` và `specs/`**: `tests/<nhóm>/<module>/` (cùng slug với `docs/<nhóm>/<module>.md` và `specs/<nhóm>/<module>.md`; danh sách module ở `scripts/modules.mjs`). Cách viết test: `.agent/skills/10-testing.md`. Quy trình: `.agent/rules/quality-loop.md`.

| Thư mục | Nội dung |
|---|---|
| `tests/<nhóm>/<module>/*.test.ts(x)` | Unit / integration / component (Vitest + Testing Library + MSW) |
| `tests/<nhóm>/<module>/*.e2e.ts` | Trình duyệt thật (Playwright) cho luồng của module đó |
| `tests/e2e/*.e2e.ts` | Hành trình xuyên module (smoke, duyệt → giỏ → checkout) |
| `tests/<nhóm>/<module>/mutants.json` | Danh sách đột biến để kiểm tra test có bắt lỗi (`yarn test:mutants`) |
| `tests/_support/` | Khung dùng chung: `render.tsx`, `identities.ts`, `messages.ts`, `navigation.ts`, `google.ts`, `setup.ts`, `msw-server.ts`, `api.ts`, `e2e.ts`, `e2e-session.ts`, `auth.setup.ts` |

## Chạy

| Lệnh | Việc |
|---|---|
| `yarn test` | Toàn bộ unit / integration / component |
| `yarn test:watch` | Chạy lại khi sửa file |
| `yarn test:coverage` | Kèm coverage; ngưỡng theo file ở `vitest.config.mts` |
| `yarn test:e2e` | Playwright (desktop 1440 + phone Pixel 7). Cần chromium: `npx playwright install chromium` |
| `yarn test:progress [--batch N \| --verify N]` | Bảng tiến độ, bảng làm việc của batch, cổng kết thúc batch (`.agent/skills/13-test-process.md`) |
| `yarn test:mutants <nhóm>/<module>` | Phá code cố ý theo `tests/<module>/mutants.json`, xem test có đỏ không; khôi phục file sau mỗi lần |
| `yarn quality:check [--changed]` | Gate: spec và ma trận hợp lệ, mỗi module có spec + test, module đổi thì spec + test đổi |

## Viết test component với danh tính

```tsx
import { renderApp } from "@/tests/_support/render";
import { msg } from "@/tests/_support/messages";

await renderApp(<AdminGuard><Page /></AdminGuard>, { as: "adminLimited" });   // guest | user | adminFull | adminLimited
expect(screen.getByText(msg("admin.components.guards.denied.title"))).toBeInTheDocument();
```

`tests/_support/`: `render.tsx` (`renderApp`: bản dịch thật + `AuthProvider` thật trả lời bởi MSW + provider theo thứ tự của `layout.tsx`), `identities.ts` (`IDENTITIES`, `signInAs`), `messages.ts` (`MESSAGES`, `msg`), `navigation.ts` (router giả), `google.ts` (popup Google giả), `msw-server.ts`, `api.ts`, `setup.ts`. Chi tiết và cách mở rộng: `.agent/skills/10-testing.md`.

## E2E chạy trên API thật

Hai loại luồng, hai nhóm project của Playwright:

| Loại | Đặt tên | Project | Cần token? |
|---|---|---|---|
| Chưa đăng nhập | `*.e2e.ts` | `desktop` (1440), `phone` (Pixel 7) | Không, luôn chạy |
| Đã đăng nhập | `*.auth.e2e.ts` | `desktop-auth`, `phone-auth` (chạy sau project `setup`) | Có, nếu thiếu thì bị bỏ qua |

### Nơi đặt token: `.env.e2e.local` (ngay ở root, đã nằm trong `.gitignore`)

Mẫu có sẵn ở `.env.e2e.example`. File này **chỉ chứa một dòng token** và là thứ duy nhất chủ dự án phải quản lý: refresh token của một tài khoản **test riêng**. Site và API không cần cấu hình: site là dev server sẵn có (`localhost:3000`), API lấy từ `NEXT_PUBLIC_API_URL` trong `.env.local`; việc chạy test do AI/CI tự làm.

1. Đăng nhập site bằng tài khoản test trên trình duyệt.
2. DevTools → Application → Local Storage → copy giá trị `clothes_shop_refresh_token`.
3. Dán vào `E2E_REFRESH_TOKEN=` trong `.env.e2e.local`.

Access token không cần dán: mỗi lần chạy, project `setup` tự đổi refresh token lấy access token mới. Refresh token sống 30 ngày (BE: `JWT_REFRESH_EXPIRES_IN`, không bị xoay vòng).

### Khi token hết hạn, bạn sẽ được báo thế nào

`yarn test:e2e` luôn kiểm tra token trước khi mở trình duyệt:

| Tình huống | Điều xảy ra |
|---|---|
| Chưa dán token | In cảnh báo, luồng đã đăng nhập được **bỏ qua** (hiện `skipped`), luồng chưa đăng nhập vẫn chạy |
| Còn dưới 5 ngày | Chạy bình thường, in cảnh báo "còn N ngày, nên thay sớm" |
| Đã hết hạn / API từ chối | Project `setup` **fail** với thông báo "E2E_REFRESH_TOKEN đã HẾT HẠN …" kèm cách lấy token mới; các luồng đã đăng nhập không chạy, luồng chưa đăng nhập vẫn chạy |
| Không gọi được API | `setup` fail, báo kiểm tra `E2E_API_URL` / mạng |

Token không bao giờ được in ra; chỉ in email đã che (`m**@example.com`), vai trò và host của API đang kiểm tra.

### Các biến (ghi đè tùy chọn, đặt ở shell hoặc CI, **không** đặt trong file token)

| Biến | Ý nghĩa |
|---|---|
| `E2E_REFRESH_TOKEN` | Token tài khoản test (bí mật duy nhất). Trong CI đặt làm secret cùng tên |
| `E2E_BASE_URL` | Site cần test (bản đã deploy). Bỏ trống: dùng hoặc khởi động `yarn dev` ở `localhost:3000` |
| `E2E_API_URL` | API phía sau site. Bỏ trống: lấy `NEXT_PUBLIC_API_URL` trong `.env.local`. **Bắt buộc** khi đặt `E2E_BASE_URL` |
| `E2E_ALLOW_WRITES=1` | Cho phép test **ghi** dữ liệu thật. Mặc định tắt. Chỉ bật khi API phía sau **không phải dữ liệu production** |

Biến môi trường thật luôn thắng giá trị trong file. Test ghi dữ liệu dùng `test` từ `tests/_support/e2e.ts` và gọi fixture `requireWrites`; dữ liệu tự tạo phải tự dọn và có tiền tố `e2e-<timestamp>-`.

## Module chưa có test

Xem `scripts/quality-baseline.json` (`pending`) và thứ tự làm ở `specs/_roadmap.md`. Chạm vào module trong danh sách thì viết spec + test cho nó và gỡ nó khỏi danh sách.
