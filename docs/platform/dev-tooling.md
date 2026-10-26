# Tooling, cấu hình & triển khai

> **Nhóm:** Platform · **Cập nhật:** 2026-10-26
> **Code:** `package.json` · `scripts/i18n.mjs` · `scripts/check-conventions.mjs` · `scripts/check-docs.mjs` · `scripts/check-quality.mjs` · `scripts/quality-lib.mjs` · `scripts/comment-lib.mjs` · `scripts/comment-baseline.json` · `scripts/quality-baseline.json` · `scripts/modules.mjs` · `scripts/progress-lib.mjs` · `scripts/test-progress.mjs` · `scripts/test-mutants.mjs` · `scripts/test-batches.json` · `vitest.config.mts` · `tests/_support/coverage.json` · `playwright.config.ts` · `tests/` · `specs/` · `.github/workflows/ci.yml` · `next.config.ts` · `vercel.json` · `src/app/api/cron/ping/route.ts` · `.env.local` · `.env.e2e.local` · `.env.e2e.example` (không commit `.env.*.local`) · `.agent/` · `.claude/` · `CLAUDE.md`

## 1. Tóm tắt module

Những thứ giúp dự án chạy, kiểm tra và triển khai: script npm, bốn bộ kiểm tra tự động (i18n, conventions, docs và specs + tests), bộ test (Vitest, Playwright), CI, cấu hình Next.js, cron của Vercel, danh sách biến môi trường và nơi đặt quy tắc cho AI/dev.

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
| Quality check | Mỗi module có tech spec đúng cấu trúc và test; module đổi code thì spec và test đổi; danh sách module chưa phủ chỉ ngắn đi | `scripts/check-quality.mjs`, `scripts/quality-lib.mjs`, `scripts/quality-baseline.json` |
| Bản đồ module | `MODULES`: đường dẫn code → doc/spec/thư mục test | `scripts/modules.mjs` |
| Test | Vitest + Testing Library + MSW (unit/integration/component), Playwright (luồng chưa/đã đăng nhập, kiểm tra token), khung render dùng chung `tests/_support/` | `vitest.config.mts`, `playwright.config.ts`, `tests/` |
| Tiến độ test | Chia module thành 8 batch (tối đa 5 module), tính tiến độ từ repo, cổng kết thúc batch, kiểm đột biến | `scripts/progress-lib.mjs`, `scripts/test-progress.mjs`, `scripts/test-mutants.mjs`, `scripts/test-batches.json` |
| CI | Chạy các kiểm tra và test trên mỗi PR/push | `.github/workflows/ci.yml` |
| Next config | next-intl plugin, remote image hosts, header cache dev | `next.config.ts` |
| Cron | Ping BE mỗi ngày 00:00 UTC | `vercel.json`, `src/app/api/cron/ping/route.ts` |
| Quy tắc cho AI/dev | Rules, skills, CLAUDE.md | `.agent/rules/`, `.agent/skills/`, `.claude/skills/`, `CLAUDE.md` |

## 4. Chi tiết

### 4.1 Scripts (`package.json`, tên package `doovan-landing`)

| Script | Việc |
|---|---|
| `dev` | `next dev --turbopack` (chạy `predev` = `i18n sync` trước) |
| `build` | `next build` (`prebuild` = `i18n sync` → `i18n check` → `check-conventions` → `check-docs` → `check-quality`) |
| `start`, `lint` (`next lint --dir src --dir tests`), `format` (prettier cho `app/**`) | — |
| `i18n:sync`, `i18n:check`, `conventions:check`, `docs:check` | chạy riêng từng bước (`yarn docs:check --changed` kiểm tra doc theo thay đổi) |
| `quality:check` | kiểm tra spec + test (`--changed [--base=<ref>]` theo thay đổi); chạy trong `prebuild` sau `docs:check` |
| `test`, `test:watch`, `test:coverage` | Vitest một lần / theo dõi / kèm coverage |
| `test:progress` | bảng tiến độ test của toàn bộ module; `--batch N` bảng làm việc của batch; `--verify N` cổng kết thúc batch; `--json` |
| `test:mutants <nhóm>/<module>` | phá code cố ý theo `tests/<module>/mutants.json` và báo đột biến nào test không bắt |
| `test:e2e` | Playwright (`tests/**/*.e2e.ts`) |
| `typecheck` | `tsc --noEmit` |
| `docs:who <file\|folder\|module>` | in ra module và doc sở hữu đường dẫn đó |

Stack chính: Next 15 (App Router) · React 19 · Tailwind 4 · Redux Toolkit · SWR · next-intl 4 · framer-motion · GSAP · recharts · dnd-kit · `@react-oauth/google` · `@vercel/analytics` + `speed-insights`.

### 4.2 `check-conventions.mjs`

Quét `src/**/*.ts(x)` (bỏ `messages`), bỏ qua comment. Luật:

| Luật | Bắt lỗi |
|---|---|
| `error-message` | Import `errorMessage` trần trong `src/app` (phải dùng `useErrorMessage`) |
| `native-dialog` | `alert/confirm/prompt` (cho phép `confirm` của `useConfirm`) |
| `old-sort-syntax` | `price_asc`, `name_desc`, `"sorts"`… |
| `money-format` | `Intl.NumberFormat`, `.toLocaleString(`, `.toFixed(` và `format.number(…, "price" \| "priceFixed" \| "vnd")` ngoài `src/lib/money.ts` (tiền đi qua `useMoney()` / `MoneyText`, xem [currency](./currency.md)) |
| `list-query` | `.set("limit"/"page"/"sort"/"search")` ngoài `list-query.ts` |
| `max-limit` | `limit`/`pageSize` ≥ 3 chữ số vượt 200 |
| `carousel` | `snap-x`, `scroll-snap-type` ngoài `Carousel.tsx` |
| `auto-advance` | `setInterval` ngoài `use-auto-advance.ts` |
| `toast-i18n` | `toast.success("literal")` trong `src/app` |
| `comment-length` | Khối comment dài hơn 3 dòng (dòng thẻ JSDoc `@param`/`@returns` không tính), hơn 3 dòng `//` liền nhau, hoặc dải `═` trong `src/`, `scripts/`, `tests/`, `vitest.config.mts`, `playwright.config.ts`, `next.config.ts`; file vi phạm phải nằm trong `scripts/comment-baseline.json` (hiện rỗng: không còn file nào được miễn), file đã sạch phải rời danh sách, và `quality:check --changed` không cho thêm file vào đó. Logic ở `scripts/comment-lib.mjs` (bỏ qua chuỗi, template — kể cả phần sau `${…}` — và regex; `/` sau `<` là thẻ đóng JSX chứ không mở regex, và regex không đóng thì dừng ở cuối dòng nên số dòng luôn đúng) |
| `data-table` | `<DataTable>` server mode thiếu `sortOptions` hoặc `searchPlaceholder` (trừ `searchable={false}`) |

Bỏ qua một dòng: `// conventions-ignore: <rule-id> <lý do>` ở dòng đó hoặc dòng trước. Khi thêm một khối dùng chung mới thì thêm luật vào script trong cùng thay đổi.

### 4.3 `check-docs.mjs`

Bản đồ sở hữu `MODULES` (trong `scripts/modules.mjs`, dùng chung với `check-quality.mjs`) gán từng đường dẫn code cho đúng một doc trong `docs/` (ví dụ `src/lib/product-url.ts` thuộc `platform/data-layer`); đường dẫn dài nhất khớp thì thắng. `src/messages/**`, `src/i18n/registry.ts`, file nhị phân/sinh tự động không thuộc module nào. Hiện có 39 module (mỗi module một doc; `PendingCountsProvider.tsx` thuộc `admin/admin-shell`, `PendingActionNotice.tsx` và `InfoHint.tsx` thuộc `platform/ui-kit`, `src/lib/admin-events.ts` và `SignOutButton.tsx` thuộc `platform/auth`), gồm cả `admin/payments`, `admin/refunds`, `admin/returns`, `admin/reviews`, `storefront/customer-returns` và `storefront/customer-reviews`. Đường dẫn liệt kê theo từng file (ví dụ `src/lib/brand.ts` thuộc `platform/seo`), nên file mới trong `src/lib/` phải được thêm vào entry của module sở hữu.

| Chế độ | Việc | Khi chạy |
|---|---|---|
| mặc định | Mỗi file code (`src/`, `scripts/`, `next.config.ts`, `vercel.json`) có module sở hữu; mỗi module có doc và hàng trong `docs/README.md`; `docs/` không chứa file lạ; doc có tiêu đề, dòng `Nhóm … Cập nhật YYYY-MM-DD`, dòng `Code`, đủ bốn mục đúng thứ tự, không có ngôn ngữ lộ trình hay việc tồn đọng (danh sách từ khóa nằm trong script, hằng `BANNED`, so khớp theo ranh giới Unicode nên bắt được cả các từ cấm có dấu); link `.md` và tên file trong dấu backtick đều tồn tại | trong `prebuild` |
| `--changed [--base=<ref>]` | Như trên, và với mọi module có file code đổi so với `HEAD` (hoặc `<ref>`, gồm cả file chưa theo dõi): doc của module phải được sửa và dòng `Cập nhật` phải đổi, hoặc đã mang ngày hôm nay (hay muộn hơn) từ lần sửa trước trong ngày (doc mới hoàn toàn thì bỏ qua kiểm tra ngày). File chỉ đổi comment, khoảng trắng hoặc định dạng không tính là thay đổi (xem 4.3a) | trước khi kết thúc một task |
| `--who <đường dẫn\|tên module>` | In doc sở hữu và toàn bộ đường dẫn module đó sở hữu | trước khi sửa |

Thêm module mới = thêm entry vào `MODULES` (`scripts/modules.mjs`), tạo doc, thêm hàng README (và spec + test, xem 4.3b). Quy trình đầy đủ: `.agent/rules/module-docs.md`.

### 4.3a Gốc dự án của các CLI (`scripts/gate-env.mjs`)

`check-docs`, `check-quality`, `check-conventions`, `test-progress`, `test-mutants` và `i18n` cùng đọc `ROOT`, bản đồ module và `ownerOf(file)` (đường dẫn dài nhất thắng; đường dẫn kết thúc bằng `/` sở hữu cả thư mục, đường dẫn khác chỉ sở hữu đúng file) từ file này. `ROOT` mặc định là thư mục cha của `scripts/` (hoặc thư mục làm việc khi chạy dưới trình chạy test); biến `GATE_ROOT` trỏ nó sang một dự án khác và `GATE_MODULES` trỏ bản đồ module sang file khác (mặc định `<ROOT>/scripts/modules.mjs`). `isCommentOnlyAt(file, base)` đọc bản của `file` ở `<base>` bằng `git show` và hỏi `isCommentOnlyChange` (`scripts/comment-lib.mjs`) xem hai bản có khác nhau ngoài comment không: cả hai được phân tích bằng `typescript` rồi in lại với `removeComments`, bản in giống nhau nghĩa là chỉ comment, khoảng trắng hay bố cục khác. Kiểu, import, chuỗi và JSX nằm trong bản in nên đổi chúng vẫn là thay đổi thật; trong JSX, biểu thức rỗng `{/* … */}` và đoạn chữ chỉ có khoảng trắng kèm xuống dòng bị bỏ khi so sánh (React không hiển thị chúng), nên xoá một dòng comment JSX không tính là thay đổi, còn khoảng trắng nằm trong một dòng thì vẫn tính; file mới, file xoá, file `.css`/`.json` và mọi file không phải `.ts/.tsx/.mts/.mjs` luôn là thay đổi thật. `check-docs --changed` và `check-quality --changed` bỏ qua file chỉ đổi comment. Test dựng một dự án giả trong thư mục tạm (`tests/_support/gate-fixture.ts`: một module `g/m` có code, doc, spec, test; `git init` khi cần `--changed`) và chạy các CLI thật trên đó.

### 4.3b `check-quality.mjs`

Mỗi module (entry của `MODULES`) sở hữu một spec `specs/<doc>.md` và một thư mục test `tests/<doc>/`. Logic kiểm tra thuần nằm ở `scripts/quality-lib.mjs` (`validateSpec`, `validateCriticalFlows`, `validateBaseline`); `check-quality.mjs` lo duyệt file và git.

| Chế độ | Việc |
|---|---|
| mặc định (trong `prebuild`) | `scripts/test-batches.json` đặt mỗi module đúng một lần (trong `done` hoặc một batch, 1 đến 5 module mỗi batch); `specs/` chỉ chứa `README.md`, `_*.md` và spec của module; `tests/` chỉ chứa `README.md`, `_support/`, `e2e/` và thư mục module; mỗi spec có header `Nhóm … Cập nhật … Trạng thái (Draft/Approved/Implemented)`, dòng `Doc` và `Test`, tám mục đúng thứ tự, mục 5 đủ bốn mục con không rỗng (Design pattern, Kiến trúc, SOLID, Conventions), mục 6 có hai dòng `Phạm vi` (`toàn module` hoặc `một phần — …`) và `Chiều kiểm thử` (`auth = có|không (lý do) · permission = có|không (lý do)`), và bảng luồng có cột `Tình huống` (`đúng`/`lỗi`) và `Danh tính` (`khách`, `user`, `admin đủ quyền`, `admin thiếu quyền`, `—`); ma trận phải có luồng đúng và lỗi, khi auth = có thì có luồng khách và luồng của người đã đăng nhập, khi permission = có thì có luồng admin đủ quyền và admin thiếu quyền (và permission = có cần auth = có); mọi đường dẫn `tests/…` ở ô cuối của bảng tồn tại; `specs/_critical-flows.md` có tier `P0`/`P1`, module hợp lệ, test tồn tại; module vừa có spec vừa có file test (`*.test.ts(x)` hoặc `*.e2e.ts`) thì không được còn trong `pending` của `scripts/quality-baseline.json`, module thiếu một trong hai thì phải có trong `pending` |
| `--changed [--base=<ref>]` | Với mọi module có code đổi (cùng định nghĩa file code với `check-docs`, và cũng bỏ qua file chỉ đổi comment): spec phải được sửa và dòng `Cập nhật` đổi (hoặc đã mang ngày hôm nay), và một file test dưới `tests/<doc>/` phải được thêm/đổi, trừ khi diff của spec thêm một dòng chứa `no-test: <lý do>`; `pending` không được thêm mục so với `<ref>` |

`scripts/quality-baseline.json` liệt kê các module chưa có spec và test (xem `yarn test:progress` để biết số hiện tại). Cả phần luật (`quality-lib.mjs`, `tests/platform/dev-tooling/quality-lib.test.ts`) lẫn phần duyệt file và git (`quality-cli.test.ts`, chạy CLI thật, kể cả `--changed` trên kho git tạm) đều có test.

### 4.3c Test

- **Vitest** (`vitest.config.mts`): môi trường `jsdom`, plugin React, alias `@/` → gốc repo, `server.deps.inline: ["next-intl"]` (để Vite nạp được `next-intl/navigation` và `next-intl/server`; import `coverage.json` dùng `with { type: "json" }`), `NEXT_PUBLIC_API_URL=http://api.test`, `restoreMocks`, bao gồm `tests/**/*.test.{ts,tsx}` (bỏ `tests/e2e/**`). Coverage `v8`: tập file tính coverage (`include`) và ngưỡng theo file (dòng / nhánh / hàm) nằm ở `tests/_support/coverage.json`, `vitest.config.mts` chỉ đọc nó (thư mục có ngoặc đơn như `(private)` viết `\\(private\\)` vì ngoặc trần là nhóm glob; `coverage-config.test.ts` kiểm); gồm lõi phiên và quyền của auth, guard và màn của auth, currency, toàn bộ data layer và toàn bộ i18n. Khóa dạng `**/Tên.tsx` vì đường dẫn có `[locale]` bị hiểu là lớp ký tự trong glob. `tests/platform/dev-tooling/coverage-config.test.ts` kiểm mỗi mục trỏ tới file có thật và mỗi ngưỡng là số trong 0–100. Hai baseline (`scripts/quality-baseline.json`, `scripts/comment-baseline.json`) là dữ liệu: nằm trong `IGNORED` của `scripts/modules.mjs`, không thuộc module nào.
- **Helper dùng chung** (`tests/_support/`): `admin.ts` (`unlockSystem`, `countsApi` cho test khu admin), `pointer-event.ts` (`PointerEvent` giả mang `pointerType`), `browser-apis.ts` (`ResizeObserver`, `IntersectionObserver`, `scrollTo` giả; `observers` kèm `triggerFor(isIntersecting, phần tử)`, `scrolls`), `intl-server.ts` (thế `next-intl/server` bằng bản dịch thật: `setRequestLocale`, `getLocale`, `getMessages`, `getTranslations`; cài cho mọi test để gọi thẳng được hàm trang server), `carousel-layout.ts` (hình học slide cho carousel), `setup.ts` (jest-dom, MSW `listen({ onUnhandledFrame: "error" })` nên request không có handler làm test đỏ, cài bản giả của `@/src/i18n/navigation`, `next/navigation` và `@react-oauth/google` cho mọi test, dọn `localStorage`/`sessionStorage`/handler/DOM/router/Google sau mỗi test), `render.tsx` (`renderApp(ui, { as, locale, waitForAuth, store })`: `NextIntlClientProvider` với bản dịch thật, `StoreProvider` với một Redux store mới cho mỗi lần render (`makeStore(store)`, có bộ ghi `localStorage` như app), `SWRConfig` với bộ nhớ đệm mới cho mỗi lần render, `AuthProvider` thật, `ToastProvider`, `ConfirmProvider`, `SystemPasswordPromptProvider`, `LoginPromptProvider` đúng thứ tự của `app/[locale]/layout.tsx`; chờ phiên xác định rồi mới hiện `ui`; trả `user`, `store` (store component đang dùng) và `rerender` giữ provider), `identities.ts` (`IDENTITIES`: `guest`, `user`, `adminFull`, `adminLimited` chỉ có `ORDER_ADMIN_VIEW`; `adminWith(...quyền)` là admin chỉ có các quyền đã cho; `signInAs` đặt token và handler `GET /api/auth/me` chỉ chấp nhận token đã lưu; `guest` xóa phiên cũ), `messages.ts` (`MESSAGES` vi/en nạp bằng `import.meta.glob`, `msg("namespace.key")`, `msgf(key, values)` điền `{chỗ}` của bản dịch thật, `dateText(iso, style, locale)` định dạng ngày như app trong múi giờ của site), `fixtures.ts` (dữ liệu mẫu: `product`, `cartLine`, `cartState`, `serverCart`, `quote`, `shippingInfo`, `paymentSession`, `wishlistItem`, `wishlistState`, `serverWishlist`, `orderItem`, `order`, `pendingReview`, `returnRequest`, `eligibility`, `productSummary`), `media-query.ts` (`window.matchMedia` giả, `media.matching`, và `window.scrollTo` rỗng), `navigation.ts` (`navigation.pathname`, `searchParams`, `params`, `router.push/replace/…`, `redirects`; bản giả của `useSearchParams`, `useParams`, `notFound` cho `next/navigation`; `reset()` sau mỗi test; file test cần `next-intl/navigation` thật gọi `vi.unmock("next/navigation")`, như `tests/platform/i18n/navigation.test.ts`), `google.ts` (`google.succeed(code)`, `google.fail()`), `msw-server.ts`, `api.ts` (`API`, khóa token, `seedSession`), `e2e.ts` (`test` có fixture `requireWrites`, `expect`, `ALLOW_WRITES`, `readAuthMeta`, `refreshTokenFromEnv`, khóa token), `e2e-session.ts` (`readJwtExp`, `checkSession`, `explainCheck`, `maskEmail`, `loadE2EEnv`), `auth.setup.ts` (project `setup`).
- **Playwright** (`playwright.config.ts`): `testDir: tests`; năm project: `desktop` (1440×900) và `phone` (Pixel 7) chạy `*.e2e.ts` (trừ `*.auth.e2e.ts`) không cần đăng nhập; `setup` chạy `tests/_support/auth.setup.ts`; `desktop-auth` và `phone-auth` chạy `*.auth.e2e.ts`, phụ thuộc `setup`, dùng `storageState` `.auth/user.json`. `baseURL` = `E2E_BASE_URL` hoặc `http://localhost:3000` (khi không đặt `E2E_BASE_URL` thì dùng/khởi động `yarn dev`, gọi API trong `.env.local`); cấu hình nạp `.env.e2e.local` qua `loadE2EEnv()`; trace và ảnh chụp khi lỗi; CI: 1 retry, 2 worker, reporter `github` + `html`. `globalSetup` là `tests/_support/warm-up.ts`: sau khi server sẵn sàng nó mở lần lượt `/vi`, `/en`, `/vi/shop`, `/vi/login`, `/vi/cart`, `/vi/orders`, `/vi/wishlist`, `/vi/account` (lỗi từng trang bị bỏ qua), vì `next dev` với `.next` lạnh trả 500 khi biên dịch song song nhiều trang private. Test chạy trên API thật và chỉ đọc; fixture `requireWrites` bỏ qua test ghi dữ liệu trừ khi `E2E_ALLOW_WRITES=1`.
- **Token của luồng đã đăng nhập:** một giá trị `E2E_REFRESH_TOKEN` (refresh token của tài khoản test, sống 30 ngày vì BE không xoay vòng) trong `.env.e2e.local` ở root (gitignore; mẫu `.env.e2e.example`) hoặc biến môi trường thật (biến thật thắng; giá trị rỗng trong file bị bỏ qua). `auth.setup.ts` ghi `.auth/user.json` (trạng thái localStorage của trình duyệt) và `.auth/session.json` (`status`, email, vai trò, số ngày còn lại), cả hai gitignore. Kết quả kiểm tra: thiếu token → in cảnh báo, luồng đã đăng nhập `skipped`; còn dưới 5 ngày → cảnh báo, vẫn chạy; token hết hạn (ngày `exp` của JWT) hoặc API từ chối `POST /api/auth/refresh` hoặc không gọi được API → `setup` fail với thông báo tiếng Việt kèm cách lấy token mới, các project đã đăng nhập không chạy. Email trong log được che, token không in. Khi đặt `E2E_BASE_URL` thì phải đặt cả `E2E_API_URL`; không thì API lấy từ `NEXT_PUBLIC_API_URL` trong `.env.local` (mặc định `http://localhost:7001`).
- Test của chính module này ở `tests/platform/dev-tooling/`: luật (`quality-lib`, `matrix`, `progress`, `comment-lib`, `e2e-session`, `coverage-config`), khung render (`harness`) và các CLI chạy thật trên dự án giả (`docs-cli`, `quality-cli`, `conventions-cli`, `progress-cli`, `mutants-cli`, `i18n-cli`), cộng `modules-map`, `cron-route`, `next-config`. `mutants.json` ở đó có đột biến cho từng script, mỗi đột biến chỉ chạy file test liên quan.

### 4.3e Quy trình test theo batch

- **`scripts/test-batches.json`**: `done` (module đã xong lúc lập danh sách) và 8 batch `{ id, title, why, focus, modules }`; mỗi module của `MODULES` xuất hiện đúng một lần, mỗi batch có 1 đến 5 module (hằng `MAX_BATCH_SIZE` trong `scripts/progress-lib.mjs`). Thứ tự: batch 1 hàm thuần và nền dữ liệu, 2 giỏ hàng/checkout/đơn của khách, 3 phần dùng chung của admin và trang admin chuyển tiền, 4 admin hậu mãi và người dùng, 5 admin còn lại, 6 storefront duyệt và mua, 7 storefront tài khoản/đánh giá/nội dung, 8 khung giao diện.
- **`yarn test:progress`**: tiến độ luôn được tính từ repo (spec, thư mục test, `scripts/quality-baseline.json`), không có sổ ghi tay. Mỗi module có trạng thái `done` (spec `Implemented` với phạm vi `toàn module`, ma trận đủ, số test không ít hơn số luồng, đã rời baseline), `partial` (có spec và test nhưng còn thiếu, kèm danh sách thiếu) hoặc `pending` (chưa có spec hoặc test, hoặc còn trong baseline). `--batch N` in bảng làm việc: lý do và trọng tâm của batch, và với mỗi module: số file và số dòng code, đường dẫn doc/spec/test, số luồng và số test (đếm `it(`/`test(`, một bảng `it.each` tính một), gợi ý chiều auth/permission theo vị trí (`admin/` → có cả hai; trang riêng của khách → auth; trang công khai → xem có `requireAuth` không), 8 file lớn nhất, các ô còn thiếu. `--verify N` thoát 1 nếu batch N còn module chưa `done`.
- **`yarn test:mutants <module>`**: áp từng phần tử của `tests/<module>/mutants.json` lên file thật (thay lần xuất hiện đầu tiên của `find` bằng `replace`), chạy `vitest run` trên các file test của đột biến (trường `tests`, mặc định cả `tests/<module>`) với báo cáo JSON, khôi phục file (cả khi nhận SIGINT/SIGTERM hoặc thoát), in số test đỏ; thoát 1 nếu có đột biến không làm test nào đỏ, `find` không khớp, hoặc danh sách rỗng. `platform/auth` có 14 đột biến và bắt cả 14.
- Quy trình đầy đủ cho một phiên: `.agent/skills/13-test-process.md` (skill `test-process`).

### 4.3d CI

`.github/workflows/ci.yml` chạy trên PR và push `main`. Job `checks` (Node 22, `yarn install --frozen-lockfile`): `i18n:check`, `conventions:check`, `docs:check`, `quality:check`, và trên PR thêm `docs:check --changed` và `quality:check --changed` với `--base=origin/<nhánh đích>`, rồi `typecheck`, `lint`, `test:coverage`. Job `e2e` chỉ chạy khi biến repo `E2E_BASE_URL` được đặt; nhận biến `E2E_BASE_URL`, `E2E_API_URL` và secret `E2E_REFRESH_TOKEN`; không bật `E2E_ALLOW_WRITES`; tải báo cáo Playwright khi lỗi.

### 4.4 Next config

- Plugin `next-intl` trỏ `./src/i18n/request.ts`.
- `images.remotePatterns`: `images.higgs.ai`, `lh3.googleusercontent.com` (avatar Google), `d8j0ntlcm91z4.cloudfront.net` và `azpwtyyzbhidsunngllq.supabase.co` (Supabase của dự án), đều qua https.
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
| `E2E_REFRESH_TOKEN`, `E2E_API_URL`, `E2E_BASE_URL`, `E2E_ALLOW_WRITES` | Playwright | chỉ cho `yarn test:e2e`; đặt trong `.env.e2e.local` hoặc môi trường; xem 4.3c |

### 4.7 Nơi đặt quy tắc

- `CLAUDE.md`: quy tắc dự án (vòng lặp spec → test → code → docs, nguyên tắc thiết kế, docs là sự thật về code, code tiếng Anh/UI qua i18n, list/error/toast chuẩn hóa, dùng lại component chung).
- `.agent/rules/` (`coding.md`, `components.md`, `design-system.md`, `module-docs.md`, `quality-loop.md`, `responsive.md`) — luôn bật; `.agent/skills/01…12-*.md` — hướng dẫn chi tiết (`09-tech-specs`, `10-testing`, `11-design-principles`, `12-review-checklist`); `.claude/skills/<tên>/SKILL.md` — bản rút gọn trỏ về skill tương ứng.
- Đường dẫn BE để đối chiếu: `/Users/quochoang/Documents/Projects/clothes-shop-api/` (không sửa code BE từ repo này).
