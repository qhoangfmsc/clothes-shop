# 13 — Quy trình test toàn diện (test process)

Cách đưa **mọi module** của FE lên cùng một chuẩn test, chia thành các batch nhỏ để mỗi phiên làm việc gọn, đủ và đo được. Đây là phần "vận hành" của vòng `spec → test → code → docs` (`.agent/rules/quality-loop.md`). Mẫu đã làm trọn: `platform/auth`.

> Nguyên tắc: **trạng thái nằm trong repo, không nằm trong cuộc trò chuyện.** Spec, test, baseline và `scripts/test-batches.json` là bộ nhớ của quy trình. Mỗi phiên bắt đầu bằng một lệnh in ra đúng thứ cần đọc và kết thúc bằng một lệnh kiểm tra đã xong chưa.

## 1. Thế nào là "xong một module" (Definition of Done)

Một module chỉ được tính xong khi `yarn test:progress` hiện ✓, nghĩa là **máy** xác nhận tất cả những điều sau:

| # | Điều kiện | Ai kiểm |
|---|---|---|
| 1 | Có `specs/<module>.md` trạng thái `Implemented`, `Phạm vi: toàn module` | `test:progress` |
| 2 | **Ma trận đủ** (mục 2 dưới đây) | `quality:check`, `test:progress` |
| 3 | Mục 5 của spec đủ bốn mục con (Design pattern, Kiến trúc, SOLID, Conventions) với lý do | `quality:check` |
| 4 | Mỗi luồng trong spec có ít nhất một test; đường dẫn test tồn tại | `quality:check`, `test:progress` |
| 5 | Module đã rời `scripts/quality-baseline.json` | `quality:check` |
| 6 | Doc `docs/` cập nhật, `Cập nhật` đổi | `docs:check --changed` |
| 7 | Tsc, lint, i18n, conventions xanh | `yarn typecheck`, `yarn lint`, … |

Hai điều kiện máy **không** kiểm được, nên người làm phải chứng minh trong báo cáo:

- **Test có bắt được lỗi không**: danh sách đột biến ở `tests/<module>/mutants.json`, chạy `yarn test:mutants <module>` phải bắt **tất cả** (mục 5).
- **Thiết kế đã được cân nhắc**: nợ SOLID/pattern/kiến trúc tìm thấy khi đọc module được ghi vào mục 5 và mục 7 của spec và hoặc đã sửa dưới lưới test hoặc được đưa vào báo cáo để chủ dự án quyết định (mục 6).

## 2. Ma trận test

Mỗi luồng trong bảng mục 6 của spec có hai nhãn:

| Cột | Giá trị | Nghĩa |
|---|---|---|
| Tình huống | `đúng` | Đường đi bình thường. Cả việc "đúng khi bị từ chối" (khách bị chặn đúng chỗ) cũng là `đúng` |
| | `lỗi` | Có gì đó hỏng: API 4xx/5xx, mạng, dữ liệu không hợp lệ, hết phiên, thiếu quyền khi thực hiện hành động, dữ liệu rỗng không mong đợi |
| Danh tính | `khách` | Chưa đăng nhập |
| | `user` | Khách hàng đã đăng nhập |
| | `admin đủ quyền` | Admin có mọi quyền cần cho luồng |
| | `admin thiếu quyền` | Đã vào được admin nhưng **thiếu quyền của luồng này** (`adminLimited` chỉ có `ORDER_ADMIN_VIEW`) |
| | `—` | Không phụ thuộc danh tính (hàm thuần, dữ liệu) |

Hai dòng khai báo ngay trên bảng:

```
**Phạm vi:** toàn module | một phần — <phần đã phủ>
**Chiều kiểm thử:** auth = có | không (<lý do>) · permission = có | không (<lý do>)
```

Gate ép: có luồng `đúng` và luồng `lỗi`; `auth = có` ⇒ có luồng `khách` và luồng của người đã đăng nhập; `permission = có` ⇒ có luồng `admin đủ quyền` và luồng `admin thiếu quyền`; `không` phải kèm lý do. Gợi ý:

| Loại module | auth | permission |
|---|---|---|
| Trang admin | có | có (mỗi nút ghi/xóa/xử lý ứng với một quyền) |
| Trang riêng của khách (giỏ, đơn, tài khoản…) | có (khách thấy màn chặn, user thấy nội dung) | không (không có quyền riêng, ghi lý do) |
| Trang công khai có hành động cần đăng nhập (thêm giỏ, yêu thích) | có | không |
| Trang tĩnh, hàm thuần, token thiết kế | không (lý do) | không (lý do) |

Với mỗi **nút hoặc hành động** của trang admin hãy tự hỏi: ai thấy nút này? ai bấm được? bấm thì API trả gì khi lỗi? Mỗi câu trả lời là một ô của ma trận.

## 3. Chia batch

`scripts/test-batches.json` chia 38 module (trừ module đã xong) thành **8 batch, tối đa 5 module**, theo rủi ro × giá trị và theo module dùng chung công cụ. Xem tình hình bất cứ lúc nào:

```
yarn test:progress                 # bảng tổng: mỗi batch xong bao nhiêu, thiếu gì
yarn test:progress --batch N       # bảng làm việc của batch N
yarn test:progress --verify N      # cổng kết thúc batch: thoát 1 nếu chưa xong hết
```

**Mỗi phiên làm đúng một batch, rồi dừng.** Không mở batch kế trong cùng phiên. Lý do: ngữ cảnh của năm module đã đủ lớn; làm thêm thì bắt đầu sót, và trạng thái đã được lưu trong repo nên phiên sau bắt đầu lại không mất gì.

## 4. Vòng lặp cho MỘT module (làm lần lượt, xong module này mới sang module sau)

1. **Nạp đúng thứ cần**: lấy từ bảng làm việc doc, spec (nếu có), thư mục test, file lớn nhất. Đọc `docs/<module>.md`, rồi code của module (`page`, `*Content`, `_common/*`, `_components/*`, hook/lib nó gọi). Code thắng doc; sai thì sửa doc trước. **Chỉ module đang làm**, không nạp module khác (trừ thứ nó gọi).
2. **Liệt kê luồng bằng cách đọc code**: mọi nhánh `if`, `catch`, trạng thái tải/rỗng/lỗi, mọi nút, mọi chỗ đọc `useAuth()`/`hasPermission`/`requireAuth`. Quyết định `auth`/`permission` có hay không. Chưa viết test.
3. **Spec trước** (`09-tech-specs.md`): điền mục 1–6 theo **thiết kế hiện tại** (đây là characterization); mục 5 ghi pattern/kiến trúc/SOLID/conventions *đang có* và nợ tìm thấy; mục 6 là ma trận. `Trạng thái: Approved`.
4. **Hạ tầng test còn thiếu**: nếu module cần thứ harness chưa có (Redux store, `next/navigation`, SWR, upload…), mở rộng `tests/_support/` **một lần, dùng chung**, kèm test cho phần mở rộng (thuộc spec `platform/dev-tooling`). Không dựng riêng trong file test.
5. **Characterization test** (`10-testing.md`): viết test cho từng ô của ma trận; **chạy xanh trên code cũ**. Hành vi đáng ngờ nhưng không chắc là lỗi (ví dụ: tài khoản bị khóa vẫn qua guard phía FE) thì **khóa lại bằng test, ghi vào mục 7 của spec, đưa vào báo cáo**, không tự đổi.
6. **Phá cố ý**: ghi 6–15 đột biến vào `tests/<module>/mutants.json` (ưu tiên quyền, tiền, phiên, điều kiện biên, nhánh lỗi), chạy `yarn test:mutants <module>`. Đột biến nào *sống sót* là lỗ hổng test: thêm test rồi chạy lại. Đột biến tương đương (hành vi không đổi) thì bỏ khỏi danh sách và ghi lý do.
7. **Refactor dưới lưới an toàn** (`11-design-principles.md`) *chỉ khi* mục 5/7 của spec chỉ ra nợ đáng sửa và đã có test của phần đó. Mỗi refactor: cập nhật spec (quyết định + phương án đã bỏ), giữ test xanh, chạy lại `test:mutants`. Refactor lớn (tách một component 900 dòng) làm thành bước riêng sau khi cả batch đã có test; đừng gộp vào lượt phủ test.
8. **Sửa lỗi thật**: lỗi rõ ràng (hành vi sai so với doc/hợp đồng) → test đỏ tái hiện (luồng `lỗi`) → sửa → xanh. Ghi một dòng vào *Lịch sử thay đổi* của spec.
9. **Chốt module**: thêm ngưỡng coverage cho file lõi vào `vitest.config.mts` (T0 ≥ 90%, T1 ≥ 75%); cập nhật `docs/` (có link tới spec, danh sách test); cập nhật `specs/_critical-flows.md`; spec → `Implemented`; **xóa module khỏi `scripts/quality-baseline.json`**.
10. **Cổng riêng module**: `npx tsc --noEmit`, `yarn lint`, `yarn test tests/<module>`, `yarn test:mutants <module>`, `yarn quality:check`, `yarn docs:check --changed`, `yarn test:progress` hiện ✓.

Gặp việc ngoài phạm vi (lỗi ở module khác, nợ lớn) thì ghi vào mục 7 spec của module liên quan hoặc vào báo cáo; không nhảy sang làm.

## 5. Tự đong đếm

| Số đo | Lấy ở đâu | Ý nghĩa |
|---|---|---|
| Module xong / tổng, theo batch | `yarn test:progress` | Tiến độ chương trình |
| Số luồng, số test | bảng làm việc (`flows`, `~tests`) | Mỗi luồng ≥ 1 test |
| Ô ma trận thiếu | `gaps` trong bảng | Danh sách cụ thể phải làm |
| Đột biến bắt được / tổng | `yarn test:mutants <module>` | Test có thật sự bắt lỗi |
| Coverage file lõi | `yarn test:coverage` (ngưỡng trong `vitest.config.mts`) | Tín hiệu, không phải mục tiêu |

Mẫu đã làm, `platform/auth`: 53 luồng, 13 file test (167 ca), 14/14 đột biến bị bắt, ngưỡng coverage cho `session.ts`, `auth-api.ts`, `api.ts`, `use-api-auth.ts`, `auth-context.tsx`.

## 6. Kết thúc batch

1. `yarn test:progress --verify N` phải thoát 0 (mọi module ✓).
2. Chạy toàn bộ cổng: `npx tsc --noEmit`, `yarn lint`, `yarn i18n:check`, `yarn conventions:check`, `yarn docs:check --changed`, `yarn quality:check`, `yarn test:coverage`, `yarn test:e2e`.
3. Dừng. **Báo cáo theo mẫu** (ngắn, cho chủ dự án đọc):

```
Batch N — <tên>: k/k module xong
Mỗi module: <số luồng> luồng · <số test> test · đột biến a/b · refactor đã làm (nếu có)
Phát hiện cần bạn quyết định: <hành vi đáng ngờ đã khóa bằng test, nợ chưa sửa>
Hạ tầng test thêm/đổi: <nếu có>
Cổng: <đã chạy gì, kết quả; nói rõ cái nào chưa chạy>
Vì sao: <pattern/nguyên tắc đã áp dụng, ở đâu, tại sao>  (2–6 dòng)
Batch kế: yarn test:progress --batch N+1
```

## 7. Giữ ngữ cảnh gọn

- Bắt đầu phiên bằng `yarn test:progress --batch N`, không đọc cả dự án. Đọc từng module khi tới lượt.
- Ghi vào repo ngay khi có kết quả (spec, test, mutants), không giữ trong đầu hay trong chat.
- Mỗi module xong thì chạy cổng riêng của nó trước khi sang module sau; lỗi được phát hiện sớm thì rẻ.
- Khi cảm thấy ngữ cảnh đã dài hoặc đã đọc quá nhiều file, **dừng sau module vừa chốt** và báo; phiên sau tiếp tục từ `test:progress`.
- Không lặp lại nội dung doc/spec trong chat; chỉ trỏ tới file.

## 8. Những bẫy đã gặp (đọc trước khi bắt đầu)

- **Test xanh vì sai lý do**: MSW 3 mặc định chỉ cảnh báo request thiếu handler (`onUnhandledFrame`); harness đặt `error`. Luôn thử phá code để thấy test đỏ.
- **Harness lệch**: một lần render "khách" đã để lại token của lần render trước; `signInAs("guest")` giờ xóa phiên. Nếu kết quả test lạ, nghi harness trước.
- **Trạng thái dùng chung giữa test**: store Redux, `localStorage`, biến mức module. Dọn trong `setup.ts` hoặc cung cấp hàm reset; đừng phụ thuộc thứ tự chạy.
- **Bản địa hóa**: lấy chữ từ `msg("namespace.key")` thay vì viết cứng tiếng Việt trong test.
- **Mock quá tay**: mock `useAuth` hay `fetch` làm test không còn kiểm tra nối dây. Mock ở biên (MSW, router, popup Google).
- **Chạy lặp trong cùng test**: gọi `renderApp` hai lần trong một test thì cái trước vẫn còn trong DOM; gọi `cleanup()` hoặc `unmount()` trước.
- **Hành vi cũ có vẻ sai**: đừng sửa lặng lẽ trong lượt phủ test. Khóa lại, ghi lại, hỏi.
