# Tooling, cấu hình & triển khai — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-21 · **Trạng thái:** Implemented
> **Doc:** [platform/dev-tooling](../../docs/platform/dev-tooling.md) · **Test:** `tests/platform/dev-tooling/`

## 1. Bối cảnh & mục tiêu

**Vấn đề.** Sau đợt dựng vòng spec → test → code → docs, còn ba chỗ hở:

1. "Hoàn thành một module" mới được kiểm ở mức *có spec và có test*. Chưa có gì ép test phải phủ cả luồng **đúng lẫn lỗi**, cả **khách lẫn đã đăng nhập**, cả **có quyền lẫn thiếu quyền**. Một module có thể qua gate chỉ với vài test đường vui.
2. 38 module còn lại (hoặc mới phủ một phần) phải làm dần. Làm nhiều module trong một phiên thì ngữ cảnh phình to và dễ sót; chưa có cách chia việc và đo tiến độ mà không phải đọc lại cả dự án.
3. Test component cần dựng lại provider (i18n, đăng nhập, điều hướng) ở từng file; không có bộ khung chung nên mỗi batch sẽ chép lại và lệch nhau.

4. Comment quá dài: 134 khối dài hơn 3 dòng ở 113 file (922 dòng), 88 khối trang trí bằng `═══`, nhiều khối là đoạn văn hoặc ví dụ sử dụng mà `docs/` và skill đã có. Người đọc phải lội qua chữ để tới code.

**Mục tiêu.**
- **Ma trận test bắt buộc, máy kiểm tra**: mỗi spec khai báo module có chiều auth / permission hay không (kèm lý do nếu không), và bảng luồng gán *tình huống* (đúng / lỗi) và *danh tính* (khách / user / admin đủ quyền / admin thiếu quyền) cho từng luồng. Gate từ chối spec thiếu ô bắt buộc.
- **Quy trình test chia batch**: kế hoạch 8 batch (tối đa 5 module mỗi batch, theo rủi ro × giá trị) lưu trong repo; lệnh `yarn test:progress` tính tiến độ từ chính repo (không có sổ ghi tay) và in bảng làm việc gọn cho từng batch; `--verify` là cổng kết thúc batch.
- **Bộ khung render** dùng chung (`tests/_support/`): dựng component với i18n thật, đăng nhập thật qua MSW theo danh tính, điều hướng giả.
- **Comment ngắn**: chỉ viết khi code không tự nói được *vì sao*; tối đa 3 dòng; không trang trí, không ví dụ sử dụng, không lịch sử. Máy kiểm tra, file cũ vi phạm nằm trong baseline chỉ được ngắn đi.
- Quy trình được ghi thành skill để mỗi phiên làm một batch mà không phải nạp lại toàn bộ bối cảnh.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Quy tắc comment ngắn (`.agent/rules/comments.md`), kiểm bằng `comment-lib.mjs` trong `check-conventions`, baseline `scripts/comment-baseline.json`; rút gọn comment ở các file của đợt refactor này | Rút gọn comment ở 100+ file cũ trong một lần: diff rất lớn, tách thành một phần riêng để rà từng file |
| Mục 6 của spec có thêm `Phạm vi`, `Chiều kiểm thử` và hai cột `Tình huống`, `Danh tính`; gate kiểm tra ma trận | Ép mọi module có chiều auth/permission: module không có chiều đó khai `không (lý do)` |
| `scripts/progress-lib.mjs` (hàm thuần, gồm cả logic đột biến) + `scripts/test-progress.mjs` và `scripts/test-mutants.mjs` (CLI) + `scripts/test-batches.json` | Sổ ghi tiến độ viết tay: sẽ lệch khỏi repo. Tiến độ luôn *tính* từ spec, test và baseline |
| Bộ khung render `tests/_support/{render,identities,messages,navigation}` | Khung cho Redux store và `next/navigation`: thêm ở batch đầu tiên cần tới (giỏ hàng, trang có `searchParams`), không dựng trước khi có người dùng |
| `scripts/test-mutants.mjs` + `tests/<module>/mutants.json`: phá code cố ý để biết test có đỏ không | Kiểm thử đột biến tự động trên toàn bộ code (Stryker): chậm và nhiễu ở giai đoạn này; danh sách đột biến chọn tay theo rủi ro đủ để phát hiện test yếu |
| Skill `test-process` (`.agent/skills/13-test-process.md`) và cập nhật rule/skill liên quan | Tự động sinh test: test phải do người nghĩ ra từ hợp đồng trong spec |
| Đưa `platform/auth` lên đủ chuẩn mới làm mẫu (spec `platform/auth`) | Chạy batch 1 trong cùng đợt: mỗi batch một phiên riêng |

## 3. Hợp đồng

**Mục 6 của spec (định dạng):**

```
**Phạm vi:** toàn module | một phần — <phần đã phủ>
**Chiều kiểm thử:** auth = có | không (<lý do>) · permission = có | không (<lý do>)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
```

- `Tình huống` ∈ `đúng`, `lỗi`. `Danh tính` ∈ `khách`, `user`, `admin đủ quyền`, `admin thiếu quyền`, `—` (không phụ thuộc danh tính). `Test` là ô cuối, chứa đường dẫn `tests/…` tồn tại.
- **Ô bắt buộc**: ít nhất một luồng `đúng` và một luồng `lỗi`. `auth = có` ⇒ có luồng `khách` và có luồng của một danh tính đã đăng nhập (`user`, `admin đủ quyền` hoặc `admin thiếu quyền`). `permission = có` ⇒ `auth = có` và có luồng `admin đủ quyền` và luồng `admin thiếu quyền`. `không` bắt buộc có lý do trong ngoặc.
- `Phạm vi: một phần` cho phép module qua gate nhưng **chưa tính là xong** trong `test:progress`.

**Một module "xong"** (theo `test:progress`) khi: có spec trạng thái `Implemented` với phạm vi `toàn module`, ma trận đầy đủ, có thư mục test với ít nhất một test cho mỗi luồng (số test ≥ số luồng), và không còn trong `pending` của `scripts/quality-baseline.json`.

**`yarn test:progress`**: không tham số → bảng tổng (theo batch: số module xong / tổng, từng module một dòng với trạng thái và thiếu gì). `--batch N` → bảng làm việc của batch: mỗi module có doc, spec, thư mục test, 8 file lớn nhất (số dòng), gợi ý chiều auth/permission theo vị trí, các ô còn thiếu. `--verify N` → mã thoát 1 nếu còn module chưa xong, in báo cáo ngắn để dán vào cuối phiên. `--json` → cùng dữ liệu dạng JSON.

**`scripts/test-batches.json`**: `{ "done": [...], "batches": [{ "id", "title", "why", "focus", "modules": [...] }] }`. Hợp lệ khi mọi module của `MODULES` xuất hiện đúng một lần (trong `done` hoặc một batch) và mỗi batch có từ 1 đến 5 module.

**Quy tắc comment** (`scripts/comment-lib.mjs`, chạy trong `yarn conventions:check` cho `src/`, `scripts/`, `tests/` và hai file cấu hình): vi phạm khi một khối `/* … */` hoặc `/** … */` dài hơn 3 dòng, khi có hơn 3 dòng `//` liền nhau, hoặc khi một dòng comment chứa dải trang trí (5 ký tự `═` liền nhau). Các chỉ thị (`eslint-…`, `@ts-…`, `conventions-ignore`) không tính. File vi phạm phải nằm trong `scripts/comment-baseline.json`; file không vi phạm mà còn trong baseline phải bị gỡ; baseline không được thêm mục (`quality:check --changed`).

**`yarn test:mutants <module>`**: đọc `tests/<module>/mutants.json` (`name`, `file`, `find`, `replace`), áp từng đột biến lên file thật, chạy test của module, **khôi phục file** (cả khi Ctrl-C hoặc lỗi), báo số test đỏ cho từng đột biến. Một đột biến *bị bắt* khi có ít nhất một test đỏ. `find` không còn khớp, hoặc thay thế không đổi gì, là lỗi to chứ không phải "sống sót". Thoát 1 nếu còn đột biến sống sót hoặc danh sách rỗng.

**Bộ khung render** (`tests/_support/`):

```ts
IDENTITIES: { guest, user, adminFull, adminLimited }   // fixture; adminLimited chỉ có ORDER_ADMIN_VIEW
renderApp(ui, { as?: Identity, locale?: "vi" | "en", waitForAuth?: boolean }): Promise<RenderResult & { user: AuthUser | null }>
signInAs(identity): AuthUser | null    // đặt token + handler MSW cho GET /api/auth/me
navigation: { pathname, searchParams, router: { push, replace, back, … } }   // giả `@/src/i18n/navigation`
MESSAGES: { vi, en }                    // toàn bộ bản dịch thật
```

`renderApp` bọc component trong `NextIntlClientProvider` (bản dịch thật), `AuthProvider` thật, `ToastProvider`, `ConfirmProvider`, `SystemPasswordPromptProvider`, `LoginPromptProvider` (đúng thứ tự của `app/[locale]/layout.tsx`). Mặc định chờ phiên xác định xong rồi mới hiển thị `ui` (`waitForAuth: false` để thấy trạng thái đang tải).

## 4. Thiết kế

```
specs/<m>.md (§6 ma trận) ──► quality-lib.validateSpec ──► check-quality.mjs (cổng)
                                   └─ parseSpec ──► progress-lib ──► test-progress.mjs (bảng, --verify)
scripts/test-batches.json ─────────────────────────────┘      (đọc thêm baseline, thư mục tests/, MODULES)
tests/_support/{identities,messages,navigation,render}.tsx ◄── mọi tests/<m>/*.test.tsx
```

- `quality-lib.mjs` có thêm `parseSpec` (trích trạng thái, phạm vi, chiều, các hàng luồng) dùng chung cho cổng và tiến độ, và `validateMatrix`.
- `progress-lib.mjs` chỉ nhận dữ liệu đã đọc (spec đã phân tích, đếm test, baseline) và trả trạng thái; không đọc đĩa.
- Điều hướng giả được cài **toàn cục** trong `tests/_support/setup.ts` (module `@/src/i18n/navigation`), vì mọi component của dự án dùng nó và không chạy được nếu thiếu router của Next.

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Trạng thái suy ra (derived state)**: tiến độ tính từ spec, test, baseline | Một nguồn sự thật; không bao giờ lệch khỏi repo | File sổ tiến độ viết tay |
| **Fixture / test data builder** cho danh tính (`IDENTITIES`) | Cùng một khách/user/admin ở mọi test, đổi một chỗ khi hình dạng user đổi | Mỗi test tự dựng object user |
| **Fake ở biên mạng** (MSW cho `/api/auth/me`) thay vì mock `useAuth` | Component chạy qua `AuthProvider` thật, gần với production; test phát hiện được lỗi nối dây | Mock `useAuth` từng test (nhanh nhưng không kiểm tra provider) |
| **Provider composition** trong `renderApp` mô phỏng `layout.tsx` | Một chỗ duy nhất biết thứ tự provider | Mỗi test tự bọc provider |
| **Functional core** (`quality-lib`, `progress-lib`) | Luật kiểm tra test được không cần dựng cây thư mục | Đọc file lẫn trong luật |

### Kiến trúc

Công cụ tách khỏi `src/`: `scripts/` (cổng và tiến độ), `tests/_support/` (khung test), `specs/` (thiết kế). Khung test chỉ import từ `src/` (không ngược lại). State thuộc loại **dữ liệu dẫn xuất**; không có kho trạng thái mới.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `parseSpec` chỉ phân tích; `validateMatrix` chỉ kiểm luật; `progress-lib` chỉ đánh giá trạng thái; `test-progress.mjs` chỉ đọc đĩa và in |
| O | Thêm danh tính mới = thêm vào `IDENTITIES` và vào tập giá trị hợp lệ của cột `Danh tính`; thêm luật = thêm một hàm kiểm tra, không sửa luật cũ |
| L | Các hàm `validate*` cùng trả `string[]`; mọi danh tính là `AuthUser \| null` nên `renderApp` xử lý như nhau |
| I | `renderApp` nhận tùy chọn nhỏ (`as`, `locale`, `waitForAuth`); `progress-lib` nhận dữ liệu thuần, không nhận hệ thống file |
| D | Luật phụ thuộc văn bản và `fileExists` truyền vào; component phụ thuộc `useAuth()` và để MSW quyết định phản hồi |

### Conventions

Tiếng Anh cho code, thông báo lỗi của script và comment; spec và tài liệu bằng tiếng Việt. Test đặt tên theo ID luồng. Không barrel. Không `.css` mới. Mọi ngoại lệ có lý do tại dòng.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** một phần — luật cổng spec/test, tiến độ batch, token E2E, bộ khung render; chưa phủ `check-conventions.mjs`, `check-docs.mjs`, `i18n.mjs`, cron và next config
**Chiều kiểm thử:** auth = không (công cụ build/test, không có người dùng cuối) · permission = không (không có quyền nào ở tầng công cụ)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| QG-1 | Spec đủ cấu trúc, đủ mục, header hợp lệ và doc tồn tại thì qua | đúng | — | unit | `tests/platform/dev-tooling/quality-lib.test.ts` |
| QG-2 | Mục 5 thiếu bốn mục con hoặc mục con rỗng → lỗi | lỗi | — | unit | `tests/platform/dev-tooling/quality-lib.test.ts` |
| QG-3 | Luồng không nêu test, test không tồn tại, ID trùng, không có luồng → lỗi | lỗi | — | unit | `tests/platform/dev-tooling/quality-lib.test.ts` |
| QG-4 | Baseline: module đủ spec+test phải rời danh sách, module thiếu phải ở trong; bảng luồng sống còn hợp lệ | lỗi | — | unit | `tests/platform/dev-tooling/quality-lib.test.ts` |
| QG-10 | Đột biến: áp thay thế đầu tiên; từ chối khi `find` không khớp hoặc không đổi gì; tổng kết bắt được / sống sót; danh sách rỗng không tính là đạt | lỗi | — | unit | `tests/platform/dev-tooling/progress.test.ts` |
| QG-11 | Quy tắc comment: khối dài hơn 3 dòng, hơn 3 dòng `//` liền nhau và dải `═` bị phát hiện (kèm số dòng); comment ngắn, chỉ thị và chuỗi chứa `//` hoặc `/*` thì không; baseline: vi phạm mới → lỗi, file đã sạch còn trong baseline → lỗi | lỗi | — | unit | `tests/platform/dev-tooling/comment-lib.test.ts` |
| QG-5 | Token E2E: đọc `exp`, phân loại thiếu / hết hạn / bị từ chối / không gọi được / sắp hết; che email; nạp `.env.e2e.local` | lỗi | — | unit | `tests/platform/dev-tooling/e2e-session.test.ts` |
| QG-6 | Ma trận: thiếu `Phạm vi` / `Chiều kiểm thử`, giá trị lạ, `không` không lý do, thiếu hàng đúng/lỗi, thiếu khách hoặc đã đăng nhập khi auth = có, thiếu có quyền hoặc thiếu quyền khi permission = có → lỗi; đủ thì qua | lỗi | — | unit | `tests/platform/dev-tooling/matrix.test.ts` |
| QG-7 | Tiến độ: phân loại pending / partial / done, liệt kê ô còn thiếu; kế hoạch batch phải phủ đúng mọi module, mỗi batch ≤ 5; `--verify` chỉ qua khi cả batch xong | lỗi | — | unit | `tests/platform/dev-tooling/progress.test.ts` |
| QG-8 | Khung render: bốn danh tính dựng đúng; `renderApp` chờ phiên xác định, đặt token và handler `/me`, dùng bản dịch thật vi/en, điều hướng giả ghi lại lời gọi | đúng | khách | component | `tests/platform/dev-tooling/harness.test.tsx` |
| QG-9 | Khung render: danh tính đã đăng nhập (user, admin đủ quyền, admin thiếu quyền) nhận đúng `role` và `permissions` qua `useAuth()`; `/me` lỗi thì thành khách | đúng | admin thiếu quyền | component | `tests/platform/dev-tooling/harness.test.tsx` |

Phần Playwright của `auth.setup.ts` được kiểm bằng cách chạy `yarn test:e2e` với token thiếu, hết hạn và bị từ chối; luồng đã đăng nhập với token thật chạy được khi chủ dự án cung cấp token. Phần duyệt file và git của `check-quality.mjs` và phần in của `test-progress.mjs` được kiểm bằng chính việc chạy chúng; chưa có test tự động cho phần này.

## 7. Rủi ro & triển khai

| Rủi ro | Phát hiện | Quay lui |
|---|---|---|
| Ma trận làm người viết spec "tick cho đủ" mà test không thật | Cổng chỉ kiểm có hàng và có file; chất lượng test còn phụ thuộc review và kiểm thử đột biến thủ công (skill `testing`) | Siết luật trong `quality-lib.mjs` có test |
| Cổng quá chặt làm nghẽn thay đổi nhỏ | Dòng `no-test:` bị lạm dụng | Rà `no-test:` trong review |
| `--changed` tính cả file cấu hình (`vitest.config.mts`, `playwright.config.ts`) là code của `platform/dev-tooling` | Đổi cấu hình test mà không đụng spec thì gate đỏ | Cố ý: cấu hình công cụ cũng là thiết kế |
| E2E trên API thật làm bẩn dữ liệu | Mặc định chỉ đọc; ghi cần `E2E_ALLOW_WRITES=1` | Dọn tay theo tiền tố `e2e-` |
| Token E2E hết hạn hoặc lộ | `setup` báo bằng câu rõ ràng; file token và `.auth/` nằm trong `.gitignore`; token không in ra | Lấy token mới, khóa tài khoản test |
| Điều hướng giả toàn cục che lỗi tích hợp router thật | E2E phủ điều hướng thật | Test cần router thật dùng `vi.unmock` ở file đó |
| Phiên bản công cụ đổi API (MSW 3: `onUnhandledFrame`) | Test chứng minh request thiếu handler làm test đỏ | Ghim phiên bản, đọc `.d.ts` khi nâng |

Thay đổi nhìn thấy được: `yarn build` kiểm thêm ma trận và kế hoạch batch; thêm lệnh `yarn test:progress`.

## 8. Lịch sử thay đổi

- 2026-10-21 · Thêm vòng spec → test → code → docs: `modules.mjs`, `check-quality.mjs`, `quality-lib.mjs`, `quality-baseline.json`, Vitest + MSW, Playwright, CI, rules/skills 09–12.
- 2026-10-21 · Thêm luồng E2E chưa đăng nhập / đã đăng nhập và kiểm tra token (`.env.e2e.local`, `auth.setup.ts`, `e2e-session.ts`); chỉ cần `E2E_REFRESH_TOKEN` vì BE không xoay vòng refresh token.
- 2026-10-21 · Thêm quy trình test chia batch: ma trận bắt buộc (đúng/lỗi × khách/user/admin đủ quyền/admin thiếu quyền), `progress-lib`, `test-progress`, `test-batches.json`, bộ khung render, skill `test-process`.
- 2026-10-21 · Thêm quy tắc comment ngắn có máy kiểm tra và baseline chỉ ngắn đi; rút gọn comment ở các file của đợt refactor này.
