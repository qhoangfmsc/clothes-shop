# 11 — Design pattern · Kiến trúc · Conventions · SOLID (áp dụng ở dự án này)

Bốn kỹ thuật này được **ưu tiên khi code, khi viết spec (mục 5) và khi review**. Rule bắt buộc: `.agent/rules/quality-loop.md`. Mỗi mục dưới đây có: ý tưởng, cách dùng *ở repo này* (file thật), khi nào không dùng, và lỗi hay gặp. Kèm một quy trình quyết định ngắn ở mục 5 và checklist review ở `12-review-checklist.md`.

> Nguyên tắc chung: **thiết kế đơn giản nhất thỏa mãn các nguyên tắc.** Pattern và SOLID là công cụ để giảm trùng lặp, giảm phụ thuộc và làm code dễ test; không phải mục tiêu. Mỗi abstraction phải trả lời được "nó bớt đau chỗ nào, được chứng minh bằng test nào".

---

## 1. Kiến trúc (code nằm ở đâu, ai được phụ thuộc ai)

**Module-first, hướng phụ thuộc một chiều.**

```
page.tsx (server: metadata, SEO) → <Module>Content.tsx (client: tương tác)
        → _components/ (UI riêng)        → _common/ (slice, types, constants, hook riêng)
        → hooks/ , lib/ , store/ , types/  (chỉ code dùng chung ≥ 2 module)
lib/ không import từ src/app (đúng hiện nay); hooks/ chỉ nên import lib/ và types/.
```

- **Quy tắc ≥ 2**: code lên `src/` root chỉ khi ≥ 2 module dùng. Dùng riêng thì ở trong module (`.agent/rules/coding.md` rule 8). Ví dụ: `src/lib/session.ts` có mặt ở root vì auth, data-layer, cart, wishlist đều đi qua.
- **Phân loại state trước khi chọn công cụ**:

  | Loại | Ví dụ ở repo | Công cụ |
  |---|---|---|
  | Server state (dữ liệu BE) | danh sách sản phẩm admin | SWR (`use-admin-api.ts`) hoặc thunk — **chọn một** cho mỗi loại, xem lưu ý dưới |
  | Client state toàn cục | giỏ hàng, wishlist, user | Redux slice / Context |
  | UI state cục bộ | modal mở/đóng, tab đang chọn | `useState` |
  | URL state | filter, sort, trang | `searchParams` |

- **Server vs client**: `page.tsx` là server component (metadata, dữ liệu SEO); `"use client"` chỉ ở chỗ cần tương tác.
- **Cross-cutting ở một nơi**: i18n (`next-intl`), lỗi/toast (`useErrorMessage`, `toast.*`), tiền (`useMoney`), quyền (`RoleGuard`), phiên (`session.ts`). Thêm cách thứ hai cho cùng việc là lỗi kiến trúc.
- **Không `index.ts` barrel** (rule 7): hỏng tree-shaking, dễ vòng import.

**Nợ kiến trúc đã biết** (xử lý theo `specs/_roadmap.md`, không sửa lặt vặt): `hooks/use-api.ts` và `hooks/use-auth-action.ts` import *type* từ `src/app` (ngược hướng phụ thuộc; kiểu nên nằm ở `types/` hoặc hook nên nằm trong module); hai chiến lược server-state song song cho admin (thunk và SWR); `items`/`page`/`limit` trong slice admin mà UI không đọc (danh sách nằm trong state của `DataTable`); `store/index.ts` import ngược vào từng module (không tránh được với Redux, nhưng đừng thêm logic vào đó).

## 2. Design pattern (giải pháp có tên cho vấn đề lặp lại)

Dùng khi **thấy đau thật** (trùng code, khó test, khó đổi), không phải để cho "đúng sách". Bảng dưới là các pattern đang sống trong repo, theo vấn đề:

| Vấn đề | Pattern | Ví dụ trong repo | Khi KHÔNG dùng |
|---|---|---|---|
| Logic có state/effect dùng ≥ 2 chỗ | **Custom hook** | `use-debounce.ts`, `use-money.ts` | Logic chỉ dùng một chỗ và ngắn: để inline |
| Callback đổi liên tục nhưng effect không được chạy lại | **Latest-ref** | `advanceRef` trong `use-auto-advance.ts` | Khi cần chạy lại effect theo giá trị đó thì đưa vào deps |
| Nhiều client HTTP giống nhau ở phần "phiên", khác ở phần còn lại | **Higher-order function / Strategy** | `requestWithSession(send)` trong `session.ts`: client truyền *cách gửi* | Chỉ có một caller |
| Che giao thức, đổi nguồn mà chỗ gọi không đổi | **Facade** | `authApi.get/post/…`, `api.ts`; `useMoney()` che VND/USD | Facade chỉ chuyển tiếp một-một, không che gì |
| Một nơi biết hình dạng dữ liệu bên ngoài | **Factory / Adapter** | `toApiError(res)`; `ServerCart` → `CartItem` trong cart slice | Dữ liệu đã đúng dạng |
| Hai thành phần không biết nhau nhưng cần báo tin | **Observer / pub-sub** | `admin-events.ts`; `SESSION_EXPIRED_EVENT` giữa `session.ts` và `AuthProvider` | Hai thành phần trong cùng một component: dùng props/callback |
| Phản hồi tức thì khi chờ server | **Optimistic update + đối soát** | giỏ hàng: `pendingAddKeys`, `pendingSync` trong `cart/_common/moduleSlice.ts` | Thao tác không thể hoàn tác an toàn (tiền) |
| Cùng khung, nhiều biến thể UI/dữ liệu | **Component dựa trên cấu hình** + **Compound** | `DataTable` (`columns`, `fetchData`/`rows`), `AdminFormKit` | Biến thể thứ nhất: viết thẳng, tổng quát hóa khi có biến thể thứ ba |
| Dữ liệu một lần cho cả cây | **Provider / Context** | `AuthProvider`, `StoreProvider` | Dữ liệu đổi nhiều (render lại cả cây): dùng store có selector |

**Pattern/abstraction không làm việc ở repo này** (ví dụ phản diện, để nhận ra):
- `baseCrudReducers` (`src/store/baseSlice.ts`) được trải vào 11 slice nhưng các action `createStart/createSuccess/…` không nơi nào dispatch (thunk + `extraReducers` mới là cái chạy): một factory sinh code chết.
- Mỗi slice admin tự viết ba `addCase` (pending/fulfilled/rejected) cho mỗi thunk: lặp 11 lần, nên là một factory hoặc matcher.
- Ba khối `try { localStorage.setItem } catch` gần giống nhau cho cart/wishlist trong `store/index.ts`: nên là một hàm `persistSlice`.

**Rule of three**: lần 1 viết thẳng, lần 2 chấp nhận trùng và đánh dấu, lần 3 mới rút abstraction. Rút sớm thì sai hình dạng.

## 3. Coding conventions (để cả team viết như một người, và máy kiểm tra được)

Ba tầng, tầng sau bắt thứ tầng trước không bắt được:

1. **Formatter** (Prettier): mọi tranh cãi về dấu cách = 0. Cấu hình `.prettierrc`.
2. **Linter** (ESLint `next/core-web-vitals`): lỗi cú pháp/hook/a11y.
3. **Kiểm tra riêng của dự án**: `check-conventions.mjs` (quy ước nghiệp vụ), `i18n.mjs check` (đủ khóa bản dịch), `check-docs.mjs`, `check-quality.mjs`. Quy ước nào bị vi phạm lặp lại thì **thêm rule vào script** thay vì nhắc bằng lời (cách làm ở cuối `components.md`).

Quy ước hiện hành: xem `.agent/rules/coding.md`, `components.md`, và các skill 03–08 (Tailwind-first, i18n, list pages, lỗi & toast, responsive). Thêm vào đó:

- **Tên**: component `PascalCase.tsx`; hook `use-xxx.ts`/`useXxx`; test `<tên>.test.ts(x)`, E2E `<tên>.e2e.ts`; hằng `UPPER_SNAKE`.
- **Kiểu**: không `any`; `unknown` ở biên dữ liệu chưa kiểm chứng; kiểu của module ở `_common/types.ts`.
- **Comment ít và ngắn** (`.agent/rules/comments.md`): chỉ khi có một *vì sao* không hiển nhiên, một dòng nếu được, tối đa 3 dòng; không banner, không ví dụ sử dụng, không lịch sử, không lặp lại code. Máy kiểm tra bằng `yarn conventions:check` (rule `comment-length`).
- **Ngoại lệ phải có lý do** viết ngay tại dòng: `// conventions-ignore: <rule-id> <lý do>`, `eslint-disable-next-line … -- <lý do>`.
- **Một cách làm cho mỗi việc**: tiền → `useMoney`, lỗi → `useErrorMessage`, phiên → `session.ts`, list → `buildListQuery`. Thấy cách thứ hai là dấu hiệu cần gộp, không phải cần thêm.

**Sai lệch đã biết**: nhiều file còn `style={{…}}` (≈ 329 chỗ, ví dụ `LoginContent.tsx`) trong khi quy ước là Tailwind-first; `yarn format` trỏ vào `app/**` thay vì `src/**`. Xử lý theo roadmap, không trộn vào thay đổi không liên quan.

## 4. SOLID (đọc theo ngữ cảnh React)

| Nguyên tắc | Nghĩa trong React/TS | Đang tốt ở đâu | Dấu hiệu vi phạm ở repo |
|---|---|---|---|
| **S** — Một lý do để thay đổi | Mỗi component/hook/module một trách nhiệm: logic → hook, bố cục → component, cấu hình tĩnh → `constants.ts` | `session.ts` chỉ lo vòng đời phiên; `useDebounce` chỉ trì hoãn giá trị | `HamburgerMenu.tsx` 997 dòng/15 hook, `ProductDetailClient.tsx` 686 dòng/16 hook, `ProductsContent.tsx` 846 dòng trộn bảng, form, màu, tag, ảnh |
| **O** — Mở để mở rộng, đóng để sửa | Thêm biến thể bằng prop/slot/render prop, không sửa lõi | `DataTable`: "thêm prop tùy chọn chung, không thêm hành vi riêng của một bảng" (`components.md`) | `if (tableName === …)` bên trong component dùng chung |
| **L** — Thay thế được | Component bọc phần tử gốc giữ được hợp đồng của nó; các biến thể cùng ngữ nghĩa | Mọi lỗi HTTP là `ApiError` nên đổi client không đổi cách `catch` | Component đổi nghĩa của prop quen thuộc (ví dụ `Checkbox` đổi `onChange` thành `onCheckedChange`: chấp nhận được khi có chủ đích và ghi trong doc) |
| **I** — Giao diện nhỏ | Props/tham số chỉ gồm cái cần; dùng `Pick<>` | `cartItemKey(item: Pick<CartItem, "productId" | "size" | "color">)` | Truyền cả object `Product` để đọc hai trường; component 16+ props |
| **D** — Phụ thuộc vào abstraction | Component phụ thuộc hook/hàm, hook phụ thuộc client; test thay được phần dưới | Component gọi `dispatch(thunk)`/`authApi`, không gọi `fetch`; `AuthProvider` dùng `session.ts` | Hai bản `doRefresh` ở hai nơi (đã gộp, `specs/platform/auth.md`) |

SOLID giúp test: nơi nào phụ thuộc vào abstraction thì test bằng MSW/props thay vì mock từng module; nơi nào một trách nhiệm thì một test chỉ hỏng vì một lý do.

**Đừng quá tay**: tách file chỉ vì dài sinh ra nhiều mảnh khó theo dõi. `DataTable` 775 dòng nhưng gắn kết chặt (tìm, lọc, sắp xếp, phân trang, kéo thả, chọn dòng) nên chấp nhận được; `HamburgerMenu` thì trộn điều hướng, animation, cử chỉ và nội dung nên cần tách.

## 5. Quy trình quyết định khi thiết kế một thay đổi

1. **Đặt nó ở đâu?** (kiến trúc) — dùng riêng module hay ≥ 2 module? loại state nào? server hay client?
2. **Đã có cách làm trong repo chưa?** (conventions) — `components.md`, skill 05/06, `useMoney`, `session.ts`. Có thì dùng; không thì hỏi: có nên thành cách chung?
3. **Có đau thật chưa?** (pattern) — trùng ≥ 3 chỗ? khó test? Nếu chưa, viết thẳng.
4. **Mỗi đơn vị có một lý do để đổi không?** (S) — nếu mô tả nó cần chữ "và", tách.
5. **Thêm biến thể mới sửa chỗ nào?** (O) — nếu phải sửa lõi, đưa biến thể ra prop/hàm.
6. **Chỗ gọi phụ thuộc vào cái gì?** (D, I) — hook/hàm nhỏ, không phải chi tiết cài đặt.
7. **Ghi lại** quyết định và phương án đã bỏ vào mục 5 của spec; **chứng minh** bằng test (đặc biệt khi refactor: characterization test trước).
8. **Báo cáo** cuối task bằng ghi chú "Vì sao" ngắn (rule `quality-loop.md` bước 7).
