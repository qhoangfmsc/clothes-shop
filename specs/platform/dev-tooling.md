# Tooling, cấu hình & triển khai — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-26 · **Trạng thái:** Implemented
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
| Quy tắc comment ngắn (`.agent/rules/comments.md`), kiểm bằng `comment-lib.mjs` trong `check-conventions`, baseline `scripts/comment-baseline.json`; rút gọn comment ở các file của đợt refactor này | Rút gọn comment ở 100+ file cũ cùng lúc với việc khác: diff rất lớn; đã làm riêng thành một phần để rà từng file |
| Mục 6 của spec có thêm `Phạm vi`, `Chiều kiểm thử` và hai cột `Tình huống`, `Danh tính`; gate kiểm tra ma trận | Ép mọi module có chiều auth/permission: module không có chiều đó khai `không (lý do)` |
| `scripts/progress-lib.mjs` (hàm thuần, gồm cả logic đột biến) + `scripts/test-progress.mjs` và `scripts/test-mutants.mjs` (CLI) + `scripts/test-batches.json` | Sổ ghi tiến độ viết tay: sẽ lệch khỏi repo. Tiến độ luôn *tính* từ spec, test và baseline |
| Bộ khung render `tests/_support/{render,identities,messages,navigation}` | Khung cho Redux store và `next/navigation`: thêm ở batch đầu tiên cần tới (giỏ hàng, trang có `searchParams`), không dựng trước khi có người dùng |
| `scripts/test-mutants.mjs` + `tests/<module>/mutants.json`: phá code cố ý để biết test có đỏ không | Kiểm thử đột biến tự động trên toàn bộ code (Stryker): chậm và nhiễu ở giai đoạn này; danh sách đột biến chọn tay theo rủi ro đủ để phát hiện test yếu |
| Chạy mọi CLI trên dự án giả trong thư mục tạm (`scripts/gate-env.mjs`: `GATE_ROOT`, `GATE_MODULES`) | Chạy cổng trên chính repo trong test: phụ thuộc trạng thái repo, vòng tròn |
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

**Thay đổi chỉ có comment.** `isCommentOnlyChange(before, after, file)` (`scripts/comment-lib.mjs`) in lại cả hai bản qua bộ in của TypeScript với `removeComments`; bằng nhau nghĩa là chỉ comment, khoảng trắng và định dạng khác. Kiểu, import, chuỗi và JSX vẫn nằm trong bản in nên đổi chúng không bị coi là comment. `check-docs --changed` và `check-quality --changed` bỏ qua file như vậy (đọc bản gốc bằng `git show <base>:<file>`): module không phải cập nhật doc, spec hay test chỉ vì rút gọn comment. Trong JSX, `{/* … */}` rỗng và đoạn chữ chỉ có khoảng trắng kèm xuống dòng bị bỏ khi so sánh vì React không hiển thị chúng. File mới, file bị xoá và file không phải `.ts/.tsx/.mts/.mjs` luôn tính là thay đổi thật.

**Làm nóng trước khi chạy E2E.** `tests/_support/warm-up.ts` là `globalSetup` của Playwright: sau khi server sẵn sàng, mở lần lượt (không song song) tám trang công khai và private (`/vi`, `/en`, `/vi/shop`, `/vi/login`, `/vi/cart`, `/vi/orders`, `/vi/wishlist`, `/vi/account`). Khi `.next` còn lạnh, `next dev` biên dịch nhiều trang private cùng lúc sẽ đọc phải file JSON đang được ghi dở (`SyntaxError: Unexpected non-whitespace character after JSON`) và trả 500 cho cả smoke test. Trang không mở được thì bỏ qua, để chính test báo server không chạy.

**`yarn test:mutants <module>`**: đọc `tests/<module>/mutants.json` (`name`, `file`, `find`, `replace`), áp từng đột biến lên file thật, chạy test của module, **khôi phục file** (cả khi Ctrl-C hoặc lỗi), báo số test đỏ cho từng đột biến. Một đột biến *bị bắt* khi có ít nhất một test đỏ. `find` không còn khớp, hoặc thay thế không đổi gì, là lỗi to chứ không phải "sống sót". Thoát 1 nếu còn đột biến sống sót hoặc danh sách rỗng.

**Gốc dự án của các CLI.** `scripts/gate-env.mjs` xuất `ROOT` (biến `GATE_ROOT`, mặc định thư mục cha của `scripts/`), bản đồ module (đọc từ `GATE_MODULES` nếu có, mặc định `scripts/modules.mjs`) và `ownerOf(file)` (đường dẫn dài nhất thắng). Mọi CLI (`check-docs`, `check-quality`, `check-conventions`, `test-progress`, `test-mutants`, `i18n`) dùng nó, nên chạy được trên một dự án giả.

**Dữ liệu tách khỏi cấu hình.** Tập file tính coverage và ngưỡng theo file nằm ở `tests/_support/coverage.json` (`vitest.config.mts` chỉ đọc nó). Thư mục có ngoặc đơn như `(private)` phải viết `\\(private\\)` trong `include` và khóa ngưỡng: ngoặc trần là nhóm glob nên không khớp thư mục thật (mục `(auth)/login/**` từng im lặng không khớp file nào); `coverage-config.test.ts` bắt trường hợp viết trần. Hai baseline (`scripts/quality-baseline.json`, `scripts/comment-baseline.json`) là dữ liệu nên không thuộc module nào. Nhờ vậy hoàn thành một module (gỡ khỏi baseline, thêm ngưỡng) không buộc sửa spec và doc của `platform/dev-tooling`.

**Bộ khung render** (`tests/_support/`):

```ts
IDENTITIES: { guest, user, adminFull, adminLimited }   // fixture; adminLimited chỉ có ORDER_ADMIN_VIEW
renderApp(ui, { as?: Identity, locale?: "vi" | "en", waitForAuth?: boolean }): Promise<RenderResult & { user: AuthUser | null }>
signInAs(identity): AuthUser | null    // đặt token + handler MSW cho GET /api/auth/me
navigation: { pathname, searchParams, router: { push, replace, back, … } }   // giả `@/src/i18n/navigation`
MESSAGES: { vi, en }                    // toàn bộ bản dịch thật
```

Từ batch 2 `renderApp` còn nhận `store` (state ban đầu của Redux, ví dụ `{ cart: { items } }`) và trả về `store` của chính lần render đó: mỗi lần render là một store mới (`makeStore`) có bộ ghi `localStorage` như app thật, nên test đọc state qua `result.store.getState()` và không phải dọn gì. Mỗi lần render cũng có bộ nhớ đệm SWR riêng (`SWRConfig` với `provider: () => new Map()`), nên dữ liệu SWR của test trước không lọt sang test sau. `navigation` có thêm `searchParams` (đối tượng `URLSearchParams`) và `params` (tham số động của route) cho `useSearchParams` / `useParams` của `next/navigation`, và `notFound()` ném lỗi như Next; cả hai được cài toàn cục ở `setup.ts` và `reset()` sau mỗi test.

`tests/_support/fixtures.ts` dựng dữ liệu mẫu dùng chung: `product(over?)` (đủ trường của `Product`, sản phẩm mua được), `cartLine(over?)` (một dòng giỏ size M màu Red, số lượng 1, thành tiền đã được BE tính), `cartState(lines, over?)` (state ban đầu cho `renderApp({ store: { cart } })`) `quote(over?)` (báo giá `POST /api/orders/quote`), `shippingInfo(over?)` (`GET /api/shipping`, ba phương thức), `paymentSession(over?)` (phiên VietQR đang chờ, hạn rất xa), `order(over?)` / `orderItem(over?)` (đơn đang chờ chưa trả, một dòng), `pendingReview(over?)` (dòng chờ đánh giá của `orderItem()`), `publicReview(over?)` / `authorReview(over?)` / `reviewSummary(over?)` (đánh giá công khai, đánh giá của tác giả, tổng hợp 1–5 sao), `sizeGuide(over?)` (bảng size), `categoryOf(over?)` / `subcategoryOf(over?)` (danh mục như `GET /api/categories`), `returnRequest(over?)` / `eligibility(over?)` (yêu cầu trả hàng và điều kiện trả của cùng đơn), `wishlistItem(over?)` / `wishlistState(items, over?)` và `serverCart(lines)` (thân phản hồi `GET /api/cart` và các lệnh ghi giỏ, mỗi dòng có id `si-<productId>-<size>-<color>` nếu chưa có `serverItemId`). `tests/_support/media-query.ts` thay `window.matchMedia` (jsdom không có) bằng bản giả luôn trả `matches = false` và `window.scrollTo` (jsdom chỉ báo lỗi) bằng hàm rỗng; test đặt `media.matching = (query) => …` để giả lập một cỡ màn hình, và `reset()` chạy sau mỗi test. `tests/_support/pointer-event.ts` thêm `PointerEvent` (jsdom không có) mang `pointerType` và `pointerId`, nên `fireEvent.pointerDown(el, { pointerType: "touch" })` đến được handler với đúng loại con trỏ. `tests/_support/browser-apis.ts` thay `ResizeObserver`, `IntersectionObserver` và `Element.scrollTo` (jsdom không có) bằng bản giả: `observers.resize[i].trigger()`, `observers.intersection[i].trigger(isIntersecting)`, `scrolls` ghi từng lần `scrollTo` (đồng thời đổi `scrollLeft` và bắn `scroll`), `resetBrowserApis()` chạy sau mỗi test. `tests/_support/carousel-layout.ts` (`carouselLayout({ trackWidth, slideWidth, gap })`) cho các slide của một carousel vị trí và kích thước như trình duyệt thật, và trả hàm khôi phục jsdom.

`renderApp` bọc component trong `NextIntlClientProvider` (bản dịch thật), `StoreProvider` (store riêng), `AuthProvider` thật, `ToastProvider`, `ConfirmProvider`, `SystemPasswordPromptProvider`, `LoginPromptProvider` (đúng thứ tự của `app/[locale]/layout.tsx`). Mặc định chờ phiên xác định xong rồi mới hiển thị `ui` (`waitForAuth: false` để thấy trạng thái đang tải).

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
| **Store mới cho mỗi lần render** (`makeStore`) thay vì dùng singleton rồi dọn | Không có trạng thái rò giữa các test và không phụ thuộc thứ tự chạy; test thấy đúng store mà component dùng | Dispatch `clearCart()` ở `afterEach` (quên một slice là rò trạng thái) |
| **Tách dữ liệu khỏi mã** (`coverage.json`, hai baseline) | Dữ liệu đổi theo từng module, mã cấu hình đổi hiếm; tách ra thì gate không bắt sửa spec của công cụ mỗi lần một module xong | Giữ ngưỡng trong `vitest.config.mts` (mỗi module chạm vào dev-tooling) |
| **Dependency injection qua môi trường** (`GATE_ROOT`, `GATE_MODULES`) | CLI test được như người dùng chạy thật, không mock hệ thống file hay git | Mock `fs` và `child_process` (test gắn chặt cài đặt) |
| **Một chỗ cho quyền sở hữu** (`gate-env.ownerOf`) | Ba CLI từng chép riêng cùng một hàm | Giữ ba bản chép |
| **So sánh cây cú pháp đã bỏ comment** để nhận ra thay đổi chỉ có comment | Rút gọn comment không đổi hành vi nên không đáng buộc doc, spec và test của từng module; so cây cú pháp thì đổi kiểu hay đổi code vẫn bị bắt | Cờ miễn trừ trong spec (module chưa có spec thì không có chỗ ghi); so văn bản đã xoá comment bằng regex (sai với chuỗi và regex literal); `ts.transpileModule` (xoá kiểu nên bỏ sót thay đổi kiểu) |
| **Làm nóng tuần tự ở `globalSetup`** thay vì thử lại hoặc giảm số worker | Gốc lỗi là biên dịch lạnh song song, nên tránh nó thay vì che bằng retry; chi phí vài giây một lần, không đổi test nào | `retries` (che lỗi thật bằng lần chạy lại), `workers: 1` (chậm cả bộ test), một test setup riêng (chỉ một project phụ thuộc vào nó) |
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

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (công cụ build/test, không có người dùng cuối) · permission = không (không có quyền nào ở tầng công cụ)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| QG-1 | Spec đủ cấu trúc, đủ mục, header hợp lệ và doc tồn tại thì qua | đúng | — | unit | `tests/platform/dev-tooling/quality-lib.test.ts` |
| QG-2 | Mục 5 thiếu bốn mục con hoặc mục con rỗng → lỗi | lỗi | — | unit | `tests/platform/dev-tooling/quality-lib.test.ts` |
| QG-3 | Luồng không nêu test, test không tồn tại, ID trùng, không có luồng → lỗi | lỗi | — | unit | `tests/platform/dev-tooling/quality-lib.test.ts` |
| QG-4 | Baseline: module đủ spec+test phải rời danh sách, module thiếu phải ở trong; bảng luồng sống còn hợp lệ | lỗi | — | unit | `tests/platform/dev-tooling/quality-lib.test.ts` |
| QG-10 | Đột biến: áp thay thế đầu tiên; từ chối khi `find` không khớp hoặc không đổi gì; tổng kết bắt được / sống sót; danh sách rỗng không tính là đạt | lỗi | — | unit | `tests/platform/dev-tooling/progress.test.ts` |
| QG-11 | Quy tắc comment: khối dài hơn 3 dòng, hơn 3 dòng `//` liền nhau và dải `═` bị phát hiện (kèm số dòng); comment ngắn, chỉ thị và chuỗi chứa `//` hoặc `/*` thì không; baseline: vi phạm mới → lỗi, file đã sạch còn trong baseline → lỗi | lỗi | — | unit | `tests/platform/dev-tooling/comment-lib.test.ts` |
| QG-12 | Cấu hình coverage: mỗi ngưỡng và mỗi mục `include` trỏ tới file có thật, ngưỡng là số trong 0–100 | lỗi | — | unit | `tests/platform/dev-tooling/coverage-config.test.ts` |
| GATE-1 | Bản đồ module: mỗi module có đường dẫn tồn tại, doc/spec/thư mục test cùng slug, `ownerOf` chọn đường dẫn dài nhất; baseline và kế hoạch batch khớp bản đồ | đúng | — | unit | `tests/platform/dev-tooling/modules-map.test.ts` |
| GATE-1E | File không thuộc module nào và file bị bỏ qua (`IGNORED`) | lỗi | — | unit | `tests/platform/dev-tooling/modules-map.test.ts` |
| GATE-2 | `check-conventions`: mã sạch, mã nằm trong comment, `conventions-ignore` và các dạng hợp lệ của từng luật đều qua | đúng | — | integration | `tests/platform/dev-tooling/conventions-cli.test.ts` |
| GATE-2E | `check-conventions`: mỗi luật (`error-message`, `money-format`, `native-dialog`, `old-sort-syntax`, `list-query`, `max-limit`, `carousel`, `auto-advance`, `toast-i18n`, `data-table`, `comment-length`) bắt đúng vi phạm kèm file:dòng và thoát 1 | lỗi | — | integration | `tests/platform/dev-tooling/conventions-cli.test.ts` |
| GATE-3 | `check-docs`: dự án nhất quán qua; `--who` in doc sở hữu; `--changed` qua khi doc đổi cùng code | đúng | — | integration | `tests/platform/dev-tooling/docs-cli.test.ts` |
| GATE-3E | `check-docs`: file không có chủ, doc thiếu/thừa, tiêu đề hoặc mục sai, từ kế hoạch, link và tên file hỏng, thiếu hàng README, module đổi mà doc không đổi hoặc không bump ngày | lỗi | — | integration | `tests/platform/dev-tooling/docs-cli.test.ts` |
| GATE-4 | `check-quality`: dự án nhất quán qua; `--changed` qua khi spec, ngày và test cùng đổi; miễn trừ `no-test` và `baseline-grow` | đúng | — | integration | `tests/platform/dev-tooling/quality-cli.test.ts` |
| GATE-4E | `check-quality`: thiếu spec/test (trừ module trong baseline), module đủ mà còn trong baseline, file lạ trong `specs/` và `tests/`, spec hỏng, kế hoạch batch hỏng, `--changed` thiếu spec hoặc test hoặc ngày, baseline tăng | lỗi | — | integration | `tests/platform/dev-tooling/quality-cli.test.ts` |
| GATE-5 | `test-progress`: bảng tổng, bảng làm việc của batch, `--verify` thoát 0 khi batch xong, `--json` | đúng | — | integration | `tests/platform/dev-tooling/progress-cli.test.ts` |
| GATE-5E | `test-progress`: kế hoạch hỏng, batch không tồn tại, `--verify` thoát 1 và nêu chỗ thiếu | lỗi | — | integration | `tests/platform/dev-tooling/progress-cli.test.ts` |
| GATE-6 | `test-mutants`: đột biến bị bắt thì thoát 0 và file nguồn được khôi phục | đúng | — | integration | `tests/platform/dev-tooling/mutants-cli.test.ts` |
| GATE-6E | `test-mutants`: đột biến sống sót thoát 1; `find` không khớp bị báo; file luôn được khôi phục; thiếu module hoặc thiếu danh sách | lỗi | — | integration | `tests/platform/dev-tooling/mutants-cli.test.ts` |
| GATE-7 | `i18n.mjs`: `sync` ghi registry theo thư mục `en`; `check` qua khi các ngôn ngữ khớp | đúng | — | integration | `tests/platform/dev-tooling/i18n-cli.test.ts` |
| GATE-7E | `i18n.mjs`: thiếu file, thừa file, thiếu khóa, khác placeholder, registry cũ → thoát 1; lệnh lạ | lỗi | — | integration | `tests/platform/dev-tooling/i18n-cli.test.ts` |
| GATE-8 | Cron `/api/cron/ping`: có và không có `CRON_SECRET`, API trả ok | đúng | — | integration | `tests/platform/dev-tooling/cron-route.test.ts` |
| GATE-8E | Cron: sai secret → 401; API không ok hoặc lỗi mạng → 502 | lỗi | — | integration | `tests/platform/dev-tooling/cron-route.test.ts` |
| GATE-10 | Thay đổi chỉ có comment, khoảng trắng hoặc định dạng không bắt cập nhật doc, spec, test; `isCommentOnlyChange` đúng cho `.ts`, `.tsx`, `.mjs` | đúng | — | integration | `tests/platform/dev-tooling/comment-lib.test.ts`, `tests/platform/dev-tooling/docs-cli.test.ts`, `tests/platform/dev-tooling/quality-cli.test.ts` |
| GATE-10E | Đổi code, kiểu, chuỗi, JSX, import; file mới; file xoá; file không phải mã TypeScript vẫn bị coi là thay đổi thật và gate vẫn đỏ | lỗi | — | integration | `tests/platform/dev-tooling/comment-lib.test.ts`, `tests/platform/dev-tooling/docs-cli.test.ts`, `tests/platform/dev-tooling/quality-cli.test.ts` |
| GATE-11 | Làm nóng: mở đủ tám trang theo đúng thứ tự, từng trang một, từ địa chỉ gốc được cấu hình | đúng | — | unit | `tests/platform/dev-tooling/warm-up.test.ts` |
| GATE-11E | Làm nóng: một trang lỗi mạng hoặc trả 500 không làm dừng, các trang sau vẫn được mở | lỗi | — | unit | `tests/platform/dev-tooling/warm-up.test.ts` |
| QG-13 | Khung render: mỗi lần render có store riêng (state ban đầu được áp, hai lần render không chia sẻ state) và bộ nhớ đệm SWR riêng, thay đổi giỏ được ghi vào `localStorage`, `result.store` là store component đang dùng | đúng | khách | component | `tests/platform/dev-tooling/harness-store.test.tsx` |
| QG-14 | `navigation.searchParams` / `params` đến được `useSearchParams` / `useParams`, `notFound()` ném lỗi, và `reset()` trả về trạng thái sạch sau mỗi test | đúng | — | component | `tests/platform/dev-tooling/harness-store.test.tsx` |
| QG-14E | Component dùng `useSearchParams` mà test không đặt gì thì thấy query rỗng (không lỗi); `redirect` ghi lại đích rồi ném | lỗi | — | component | `tests/platform/dev-tooling/harness-store.test.tsx` |
| QG-15 | Dữ liệu mẫu: `product`, `cartLine`, `cartState`, `serverCart` cho ra đúng hình dạng mà code của app đọc (dòng giỏ đi qua `fetchCart` ra lại đúng dòng đó), ghi đè từng trường được | đúng | — | unit | `tests/platform/dev-tooling/harness-fixtures.test.tsx` |
| QG-15E | `matchMedia` giả: mặc định không khớp, test đặt được kết quả theo câu hỏi, `reset()` trả về mặc định sau mỗi test | lỗi | — | component | `tests/platform/dev-tooling/harness-fixtures.test.tsx` |
| QG-16 | Sự kiện con trỏ giả mang đúng `pointerType` và `pointerId` (mặc định rỗng và 0) và đến được handler của React qua `fireEvent` | đúng | — | component | `tests/platform/dev-tooling/harness-fixtures.test.tsx` |
| QG-18 | Hàm hỗ trợ cho test khu admin: `adminWith(...quyền)` là admin chỉ có các quyền đó, `unlockSystem(tuổi)` mở cổng mật khẩu hệ thống như vừa nhập (hoặc đã nhập từ lâu), `countsApi(đáp)` giả `GET /api/admin/pending-counts` và đếm số lần hỏi, `adminOrder()` là đơn của khách kèm tài khoản đặt | đúng | — | unit | `tests/platform/dev-tooling/harness-admin.test.tsx` |
| QG-17 | Bản giả của `ResizeObserver`, `IntersectionObserver`, `scrollTo` và hình học carousel: nhớ phần tử được theo dõi, trả lời theo lệnh của test, ghi lại cuộn, khôi phục sau mỗi test và không đo gì ngoài carousel | đúng | — | component | `tests/platform/dev-tooling/harness-browser.test.tsx` |
| GATE-9 | `next.config`: tiêu đề không cache chỉ ở dev, các host ảnh, plugin `next-intl`; `vercel.json` trỏ đúng route cron | đúng | — | unit | `tests/platform/dev-tooling/next-config.test.ts` |
| QG-5 | Token E2E: đọc `exp`, phân loại thiếu / hết hạn / bị từ chối / không gọi được / sắp hết; che email; nạp `.env.e2e.local` | lỗi | — | unit | `tests/platform/dev-tooling/e2e-session.test.ts` |
| QG-6 | Ma trận: thiếu `Phạm vi` / `Chiều kiểm thử`, giá trị lạ, `không` không lý do, thiếu hàng đúng/lỗi, thiếu khách hoặc đã đăng nhập khi auth = có, thiếu có quyền hoặc thiếu quyền khi permission = có → lỗi; đủ thì qua | lỗi | — | unit | `tests/platform/dev-tooling/matrix.test.ts` |
| QG-7 | Tiến độ: phân loại pending / partial / done, liệt kê ô còn thiếu; kế hoạch batch phải phủ đúng mọi module, mỗi batch ≤ 5; `--verify` chỉ qua khi cả batch xong | lỗi | — | unit | `tests/platform/dev-tooling/progress.test.ts` |
| QG-8 | Khung render: bốn danh tính dựng đúng; `renderApp` chờ phiên xác định, đặt token và handler `/me`, dùng bản dịch thật vi/en, điều hướng giả ghi lại lời gọi | đúng | khách | component | `tests/platform/dev-tooling/harness.test.tsx` |
| QG-9 | Khung render: danh tính đã đăng nhập (user, admin đủ quyền, admin thiếu quyền) nhận đúng `role` và `permissions` qua `useAuth()`; `/me` lỗi thì thành khách | đúng | admin thiếu quyền | component | `tests/platform/dev-tooling/harness.test.tsx` |

Các CLI (cổng và công cụ) được test bằng cách chạy chúng thật trên một dự án giả trong thư mục tạm (`GATE_ROOT`, `GATE_MODULES`), kể cả `--changed` trên một kho git tạm. Phần Playwright của `auth.setup.ts` được kiểm bằng cách chạy `yarn test:e2e` với token thiếu, hết hạn và bị từ chối; luồng đã đăng nhập với token thật chạy được khi chủ dự án cung cấp token.

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

Phát hiện khi phủ test:

| Phát hiện | Hành vi hiện tại |
|---|---|
| `next.config.ts` cho phép ảnh từ bốn host, doc ghi ba | Host Supabase của dự án có trong cấu hình; doc được sửa |
| `ownerOf` bị chép ở ba CLI | Gom vào `scripts/gate-env.mjs` (đã làm cùng đợt này, có test) |

Thay đổi nhìn thấy được: `yarn build` kiểm thêm ma trận và kế hoạch batch; thêm lệnh `yarn test:progress`.

## 8. Lịch sử thay đổi

- 2026-10-21 · Thêm vòng spec → test → code → docs: `modules.mjs`, `check-quality.mjs`, `quality-lib.mjs`, `quality-baseline.json`, Vitest + MSW, Playwright, CI, rules/skills 09–12.
- 2026-10-21 · Thêm luồng E2E chưa đăng nhập / đã đăng nhập và kiểm tra token (`.env.e2e.local`, `auth.setup.ts`, `e2e-session.ts`); chỉ cần `E2E_REFRESH_TOKEN` vì BE không xoay vòng refresh token.
- 2026-10-21 · Thêm quy trình test chia batch: ma trận bắt buộc (đúng/lỗi × khách/user/admin đủ quyền/admin thiếu quyền), `progress-lib`, `test-progress`, `test-batches.json`, bộ khung render, skill `test-process`.
- 2026-10-21 · Thêm quy tắc comment ngắn có máy kiểm tra và baseline chỉ ngắn đi; rút gọn comment ở các file của đợt refactor này.
- 2026-10-21 · Tách dữ liệu coverage ra `tests/_support/coverage.json` và coi hai baseline là dữ liệu không thuộc module (không còn buộc sửa spec/doc của công cụ khi một module xong).
- 2026-10-21 · Sửa bộ quét comment: bỏ sót một ký tự sau `${…}` trong template nên hiểu sai phần còn lại của file; thêm test tái hiện. baseline-grow: baseline comment tăng từ 137 lên 142 vì 5 file cũ trước đó bị bỏ sót nay mới được phát hiện (sửa bộ phát hiện, không phải thêm vi phạm mới).
- 2026-10-22 · Phủ toàn module (batch 1): thêm `scripts/gate-env.mjs` (gốc dự án, bản đồ module và `ownerOf` dùng chung, ghi đè được bằng `GATE_ROOT`/`GATE_MODULES`) và test chạy thật mọi CLI trên dự án giả; test cron, next config, bản đồ module. Đổi `ownerOf` từ ba bản chép thành một.
- 2026-10-22 · `vitest.config.mts` cho Vite nạp `next-intl` (`server.deps.inline`) và import JSON với `with { type: "json" }`; `scripts/modules.mjs` thêm `scripts/i18n-lib.mjs` vào module i18n. no-test: chỉ đổi cấu hình, các test của batch 1 đang chạy qua cấu hình này.
- 2026-10-22 · Kiểm thử đột biến 81/81 (79 ở lần chạy đầu; hai đột biến sống sót đã được vá bằng test: giới hạn 5 module của batch và việc harness chỉ chấp nhận đúng token). Phát hiện qua test và đã sửa: cổng docs không bắt từ cấm có dấu (`đề xuất`) vì `\b` của JavaScript chỉ hiểu chữ ASCII; bộ quét comment nuốt ký tự xuống dòng sau dấu nháy đơn lẻ (chữ `Don't` trong JSX). `test-mutants` nhận trường `tests` cho từng đột biến.
- 2026-10-22 · Cổng `--changed` của docs và quality bỏ qua file chỉ đổi comment (`isCommentOnlyChange`), để rút gọn comment toàn dự án không buộc từng module có doc, spec và test mới. Có test đơn vị, test CLI và đột biến.
- 2026-10-22 · Sửa bộ quét comment lần nữa: `/` sau `<` (thẻ đóng JSX như `</div>`) bị hiểu là mở regex nên nuốt ký tự xuống dòng, làm số dòng lệch dần và bỏ sót comment cùng dòng; test tái hiện. Rút gọn xong toàn bộ comment trong baseline (141 file): `scripts/comment-baseline.json` rỗng. Không file nào ngoài baseline bị phát hiện thêm nên baseline không tăng.
- 2026-10-22 · Thêm `tests/_support/warm-up.ts` làm `globalSetup` của Playwright: `next dev` với `.next` lạnh trả 500 khi nhiều trang private được biên dịch cùng lúc (tái hiện được trên commit trước đó), nên các trang được mở tuần tự trước khi test chạy.
- 2026-10-22 · Khung render nhận thêm Redux store (mới cho mỗi lần render) và `next/navigation` (`useSearchParams`, `useParams`, `notFound`) cho batch 2.
- 2026-10-22 · Thêm `tests/_support/fixtures.ts` (dữ liệu mẫu sản phẩm, dòng giỏ, giỏ từ BE) và `media-query.ts` (`matchMedia` giả) cho batch 2.
- 2026-10-22 · Sửa `tests/_support/coverage.json`: mục `src/app/[locale]/(auth)/login/**` không khớp file nào vì ngoặc trần là nhóm glob; viết `\\(auth\\)`. Test cấu hình coverage hiểu ký tự escape và cấm ngoặc trần.
- 2026-10-22 · Batch 2: khung render có bộ nhớ đệm SWR riêng cho mỗi lần render; `messages.ts` thêm `msgf` và `dateText`; `fixtures.ts` mở rộng cho thanh toán, đơn hàng, trả hàng; `window.scrollTo` giả. Đột biến của dev-tooling: 107/107 bị bắt.
- 2026-10-23 · Batch 3: thêm `pointer-event.ts`, `browser-apis.ts` và `carousel-layout.ts` vào `tests/_support/` (jsdom không có `PointerEvent`, `ResizeObserver`, `IntersectionObserver`, `Element.scrollTo` và hình học).
- 2026-10-24 · Batch 3: thêm `tests/_support/admin.ts` (`unlockSystem`, `countsApi`), `adminWith` ở `identities.ts` và `adminOrder` ở `fixtures.ts` cho test khu admin.
- 2026-10-25 · Batch 4 và 5: thêm `src/lib/slugify.ts` vào bản đồ `MODULES` (thuộc `platform/data-layer`); khung test không đổi.
- 2026-10-25 · no-test: chỉ thêm một đường dẫn vào bản đồ `MODULES`; hành vi của công cụ không đổi.
- 2026-10-26 · Batch 6: thêm `tests/_support/intl-server.ts` (thế `next-intl/server`, cài trong `setup.ts` cùng `installMatchMedia()` lúc nạp vì ScrollTrigger đọc `matchMedia` khi import), `triggerFor` ở `browser-apis.ts` và thêm dữ liệu mẫu ở `fixtures.ts`; công cụ không đổi.
- 2026-10-26 · Batch 7: `intl-server.ts` thêm `getFormatter`; thêm `tests/_support/server-tree.tsx` (`resolveServerTree`) để vẽ trang pháp lý gồm thành phần server không đồng bộ; công cụ không đổi.
- 2026-10-26 · no-test: chỉ đổi tên một đường dẫn trong bản đồ module (`tests/platform/dev-tooling` đã kiểm bản đồ). `modules.mjs`: `UserMenu.tsx` của `platform/site-chrome` đổi tên thành `UserAvatar.tsx` (batch 8); `tests/_support/server-tree.tsx` và `intl-server.ts` đã mô tả trong doc.
